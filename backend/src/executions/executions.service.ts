import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Execution, ExecutionDocument } from './schemas/execution.schema';
import {
  ExecutionStatus,
  NodeExecutionLog,
} from './interfaces/execution.interface';

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
  ) {}

  async create(
    workflowId: string,
    userId: string,
    triggerData: any = {},
  ): Promise<Execution> {
    const execution = new this.executionModel({
      workflowId,
      userId,
      triggerData,
      status: 'pending',
    });

    return execution.save();
  }

  async findAll(userId: string, workflowId?: string): Promise<Execution[]> {
    const query: Record<string, any> = { userId };

    if (workflowId) {
      query.workflowId = workflowId;
    }

    return this.executionModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<Execution> {
    const execution = await this.executionModel.findOne({ _id: id, userId }).exec();

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return execution;
  }

  async updateStatus(id: string, status: ExecutionStatus): Promise<Execution> {
    const execution = await this.executionModel.findById(id).exec();

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    execution.status = status;

    if (status === 'running') {
      execution.startTime = new Date();
      execution.endTime = undefined;
      execution.duration = undefined;
    }

    if (status === 'success' || status === 'failed') {
      execution.endTime = new Date();
      if (execution.startTime) {
        execution.duration =
          execution.endTime.getTime() - execution.startTime.getTime();
      }
    }

    await execution.save();

    return execution;
  }

  async addLog(id: string, log: NodeExecutionLog): Promise<Execution> {
    const execution = await this.executionModel
      .findByIdAndUpdate(
        id,
        {
          $push: { logs: log },
        },
        { new: true },
      )
      .exec();

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return execution;
  }

  async setError(id: string, error: string): Promise<Execution> {
    const execution = await this.executionModel.findById(id).exec();

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    execution.error = error;
    execution.status = 'failed';
    execution.endTime = new Date();

    if (execution.startTime) {
      execution.duration =
        execution.endTime.getTime() - execution.startTime.getTime();
    }

    await execution.save();

    return execution;
  }
}


