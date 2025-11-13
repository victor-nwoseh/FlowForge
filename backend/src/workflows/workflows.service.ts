import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { Workflow, WorkflowDocument } from './schemas/workflow.schema';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
  ) {}

  async create(userId: string, createWorkflowDto: CreateWorkflowDto) {
    const workflow = new this.workflowModel({
      ...createWorkflowDto,
      userId,
    });

    return workflow.save();
  }

  async findAll(userId: string) {
    return this.workflowModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string) {
    const workflow = await this.workflowModel
      .findOne({ _id: id, userId })
      .exec();

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

    return workflow;
  }

  async delete(id: string, userId: string) {
    const result = await this.workflowModel
      .deleteOne({ _id: id, userId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Workflow not found');
    }

    return { message: 'Workflow deleted successfully' };
  }
}

