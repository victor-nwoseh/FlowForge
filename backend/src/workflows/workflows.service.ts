import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { Workflow, WorkflowDocument } from './schemas/workflow.schema';
import { SchedulesService } from '../schedules/schedules.service';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    private readonly schedulesService: SchedulesService,
  ) {}

  private getScheduledTrigger(workflow: Workflow) {
    const triggerNode = workflow?.nodes?.find((node) => node?.data?.type === 'trigger');
    if (!triggerNode) return null;
    const cfg = triggerNode.data?.config || {};
    if (cfg.scheduled === true && cfg.cronExpression) {
      return { node: triggerNode, cronExpression: cfg.cronExpression };
    }
    return null;
  }

  async create(userId: string, createWorkflowDto: CreateWorkflowDto) {
    const workflow = new this.workflowModel({
      ...createWorkflowDto,
      userId,
    });

    const saved = await workflow.save();

    const workflowIdStr = String((saved as any)._id);
    const scheduledTrigger = this.getScheduledTrigger(saved as any);
    if (scheduledTrigger) {
      await this.schedulesService.create(userId, workflowIdStr, scheduledTrigger.cronExpression);
    }

    return saved;
  }

  async findAll(userId: string) {
    return this.workflowModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOne(id: string, userId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Workflow not found');
    }

    const query: Record<string, any> = { _id: id };

    if (userId) {
      query.userId = userId;
    }

    const workflow = await this.workflowModel.findOne(query).exec();

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async update(
    id: string,
    userId: string,
    updateWorkflowDto: UpdateWorkflowDto,
  ) {
    const workflow = await this.workflowModel
      .findOneAndUpdate(
        { _id: id, userId },
        { ...updateWorkflowDto, updatedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Sync schedule
    const workflowIdStr = String((workflow as any)._id);
    const scheduledTrigger = this.getScheduledTrigger(workflow as any);
    const existingSchedule = await this.schedulesService.findAllByUser(userId).then((all) =>
      all.find((s: any) => {
        const wfId = typeof s.workflowId === 'object' && s.workflowId?._id ? s.workflowId._id : s.workflowId;
        return String(wfId) === workflowIdStr;
      }),
    );

    if (scheduledTrigger && !existingSchedule) {
      await this.schedulesService.create(userId, workflowIdStr, scheduledTrigger.cronExpression);
    } else if (!scheduledTrigger && existingSchedule) {
      const schedId = (existingSchedule as any)._id?.toString?.() ?? (existingSchedule as any)._id;
      await this.schedulesService.delete(schedId, userId);
    } else if (
      scheduledTrigger &&
      existingSchedule &&
      existingSchedule.cronExpression !== scheduledTrigger.cronExpression
    ) {
      const schedId = (existingSchedule as any)._id?.toString?.() ?? (existingSchedule as any)._id;
      await this.schedulesService.delete(schedId, userId);
      await this.schedulesService.create(userId, workflowIdStr, scheduledTrigger.cronExpression);
    }

    return workflow;
  }

  async delete(id: string, userId: string) {
    const workflow = await this.workflowModel.findOne({ _id: id, userId }).exec();
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Remove schedule if exists
    const workflowIdStr = String((workflow as any)._id);
    const existingSchedule = await this.schedulesService.findAllByUser(userId).then((all) =>
      all.find((s: any) => {
        const wfId = typeof s.workflowId === 'object' && s.workflowId?._id ? s.workflowId._id : s.workflowId;
        return String(wfId) === workflowIdStr;
      }),
    );

    if (existingSchedule) {
      const schedId = (existingSchedule as any)._id?.toString?.() ?? (existingSchedule as any)._id;
      await this.schedulesService.delete(schedId, userId);
    }

    const result = await this.workflowModel.deleteOne({ _id: id, userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Workflow not found');
    }

    return { message: 'Workflow deleted successfully' };
  }
}

