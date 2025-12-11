import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model } from 'mongoose';
import { Queue } from 'bull';

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

    const schedule = await this.scheduleModel.create({
      workflowId,
      userId,
      cronExpression,
      isActive: true,
      repeatableJobId,
    });

    return schedule;
  }

  async findAllByUser(userId: string): Promise<Schedule[]> {
    return this.scheduleModel
      .find({ userId })
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(scheduleId: string, userId: string): Promise<Schedule> {
    const schedule = await this.scheduleModel
      .findOne({ _id: scheduleId, userId })
      .populate('workflowId', 'name')
      .exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
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
    }

    schedule.isActive = isActive;
    schedule.updatedAt = new Date();
    await schedule.save();

    return schedule;
  }

  async updateLastRun(workflowId: string): Promise<void> {
    await this.scheduleModel.updateOne(
      { workflowId },
      { $set: { lastRunAt: new Date() } },
    );
  }
}

