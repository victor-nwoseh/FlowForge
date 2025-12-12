import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model } from 'mongoose';
import { Queue } from 'bull';
import * as cronParser from 'cron-parser';

import { Schedule, ScheduleDocument } from './schemas/schedule.schema';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(Schedule.name) private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectQueue('workflow-execution') private readonly workflowQueue: Queue,
  ) {}

  private validateCronExpression(cron: string) {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new BadRequestException('Invalid cron expression format');
    }
  }

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

  async findAllByUser(userId: string): Promise<Schedule[]> {
    const schedules = await this.scheduleModel
      .find({ userId })
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .exec();

    return Promise.all(schedules.map((s) => this.hydrateScheduleTimes(s)));
  }

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

