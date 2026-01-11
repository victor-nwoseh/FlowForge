import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model } from 'mongoose';
import { Queue } from 'bull';
import * as cronParser from 'cron-parser';

import { Schedule, ScheduleDocument } from './schemas/schedule.schema';

/**
 * SchedulesService - Manages cron-based workflow scheduling via Bull repeatable jobs.
 *
 * This service handles:
 * - Creating scheduled triggers for workflows using cron expressions
 * - Managing Bull queue repeatable jobs (create, remove, toggle)
 * - Tracking last run and next run times for schedules
 * - Per-user schedule isolation
 *
 * How it works:
 * - When a schedule is created, a Bull repeatable job is registered with the cron expression
 * - Bull automatically triggers the job at the scheduled times
 * - The job processor (WorkflowExecutionProcessor) picks up the job and executes the workflow
 * - After execution, updateLastRun() is called to track timing
 *
 * @example
 * // Create a schedule that runs every day at 9am
 * const schedule = await schedulesService.create(userId, workflowId, '0 9 * * *');
 *
 * // Toggle schedule off (pauses the Bull job)
 * await schedulesService.toggle(scheduleId, userId, false);
 */
@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(Schedule.name) private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectQueue('workflow-execution') private readonly workflowQueue: Queue,
  ) {}

  /**
   * Validates that a cron expression has exactly 5 parts (minute hour day month weekday).
   * @throws BadRequestException if format is invalid
   */
  private validateCronExpression(cron: string) {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new BadRequestException('Invalid cron expression format');
    }
  }

  /**
   * Computes the next run time for a cron expression.
   * Uses cron-parser to calculate when the cron will next trigger.
   * @returns Next run date, or null if parsing fails
   */
  private computeNextRun(cronExpression: string, fromDate?: Date): Date | null {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: fromDate ?? new Date(),
      });
      return interval.next().toDate();
    } catch (err) {
      return null;
    }
  }

  /**
   * Ensures nextRunAt is populated for active schedules.
   * Computes from lastRunAt if available, otherwise from current time.
   */
  private async hydrateScheduleTimes(schedule: ScheduleDocument): Promise<ScheduleDocument> {
    // Ensure nextRunAt is present for active schedules; compute from lastRunAt or now.
    if (schedule.isActive) {
      const basisDate = schedule.lastRunAt ?? new Date();
      const next = this.computeNextRun(schedule.cronExpression, basisDate);
      if (next) {
        const needsSave =
          !schedule.nextRunAt || schedule.nextRunAt.getTime() !== next.getTime();
        schedule.nextRunAt = next;
        if (needsSave) {
          await schedule.save();
        }
      }
    }
    return schedule;
  }

  /**
   * Creates a new scheduled trigger for a workflow.
   *
   * Registers a Bull repeatable job that will trigger at the specified cron schedule.
   * Only one schedule per workflow per user is allowed.
   *
   * @param userId - Owner's user ID
   * @param workflowId - The workflow to schedule
   * @param cronExpression - Standard 5-part cron expression (e.g., '0 9 * * *' for 9am daily)
   * @returns The created schedule document
   * @throws BadRequestException if cron is invalid or schedule already exists
   */
  async create(userId: string, workflowId: string, cronExpression: string): Promise<Schedule> {
    this.validateCronExpression(cronExpression);

    const existing = await this.scheduleModel.findOne({ workflowId, userId });
    if (existing) {
      throw new BadRequestException('Schedule already exists for this workflow');
    }

    const job = await this.workflowQueue.add(
      { workflowId, userId, triggerSource: 'scheduled' },
      { repeat: { cron: cronExpression }, jobId: `schedule_${workflowId}` },
    );

    const repeatableJobId = job.opts.repeat?.key;
    const nextRunAt = this.computeNextRun(cronExpression) || undefined;

    const schedule = await this.scheduleModel.create({
      workflowId,
      userId,
      cronExpression,
      isActive: true,
      repeatableJobId,
      nextRunAt,
    });

    return schedule;
  }

  /** Lists all schedules for a user with populated workflow names */
  async findAllByUser(userId: string): Promise<Schedule[]> {
    const schedules = await this.scheduleModel
      .find({ userId })
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .exec();

    return Promise.all(schedules.map((s) => this.hydrateScheduleTimes(s)));
  }

  /** Retrieves a single schedule by ID (with user ownership check) */
  async findOne(scheduleId: string, userId: string): Promise<Schedule> {
    const schedule = await this.scheduleModel
      .findOne({ _id: scheduleId, userId })
      .populate('workflowId', 'name')
      .exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return this.hydrateScheduleTimes(schedule);
  }

  /**
   * Deletes a schedule and removes its Bull repeatable job.
   * @throws NotFoundException if schedule doesn't exist
   */
  async delete(scheduleId: string, userId: string): Promise<void> {
    const schedule = await this.scheduleModel.findOne({ _id: scheduleId, userId });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.repeatableJobId) {
      await this.workflowQueue.removeRepeatableByKey(schedule.repeatableJobId);
    }

    await this.scheduleModel.deleteOne({ _id: scheduleId, userId });
  }

  /**
   * Toggles a schedule's active status.
   *
   * When disabling: removes the Bull repeatable job (pauses scheduling)
   * When enabling: creates a new Bull repeatable job (resumes scheduling)
   *
   * @param scheduleId - The schedule to toggle
   * @param userId - Owner's user ID (for authorization)
   * @param isActive - New active state
   * @returns Updated schedule document
   */
  async toggle(scheduleId: string, userId: string, isActive: boolean): Promise<Schedule> {
    const schedule = await this.scheduleModel.findOne({ _id: scheduleId, userId });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (!isActive && schedule.repeatableJobId) {
      await this.workflowQueue.removeRepeatableByKey(schedule.repeatableJobId);
      schedule.repeatableJobId = undefined;
    }

    if (isActive) {
      const job = await this.workflowQueue.add(
        { workflowId: schedule.workflowId, userId, triggerSource: 'scheduled' },
        { repeat: { cron: schedule.cronExpression }, jobId: `schedule_${schedule.workflowId}` },
      );
      schedule.repeatableJobId = job.opts.repeat?.key;
      schedule.nextRunAt = this.computeNextRun(schedule.cronExpression) || undefined;
    }

    schedule.isActive = isActive;
    schedule.updatedAt = new Date();
    await schedule.save();

    return schedule;
  }

  /**
   * Updates the lastRunAt timestamp after a scheduled execution completes.
   * Also recalculates the nextRunAt based on the new lastRunAt.
   * Called by WorkflowExecutorService after scheduled workflow completion.
   */
  async updateLastRun(workflowId: string): Promise<void> {
    const schedules = await this.scheduleModel.find({ workflowId }).exec();
    for (const sched of schedules) {
      sched.lastRunAt = new Date();
      const next = this.computeNextRun(sched.cronExpression, sched.lastRunAt);
      sched.nextRunAt = next || undefined;
      await sched.save();
    }
  }
}

