import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowsService } from './workflows.service';

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    @InjectQueue('workflow-execution')
    private readonly workflowQueue: Queue,
  ) {}

  @Post()
  create(@Body() createWorkflowDto: CreateWorkflowDto, @Request() req: any) {
    return this.workflowsService.create(req.user.id, createWorkflowDto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.workflowsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
    @Request() req: any,
  ) {
    return this.workflowsService.update(id, req.user.id, updateWorkflowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.delete(id, req.user.id);
  }

  @Post(':id/execute')
  async executeWorkflow(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    try {
      const workflow = await this.workflowsService.findOne(id, req.user.id);

      if (!workflow.nodes || workflow.nodes.length === 0) {
        throw new HttpException(
          'Workflow has no nodes to execute',
          HttpStatus.BAD_REQUEST,
        );
      }

      const job = await this.workflowQueue.add({
        workflowId: id,
        userId: req.user.id,
        triggerData: body?.triggerData || {},
      });

      return {
        message: 'Workflow execution started',
        jobId: job.id,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.status === HttpStatus.NOT_FOUND || error?.response?.status === HttpStatus.NOT_FOUND) {
        throw new HttpException(
          error.message || 'Workflow not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (error.status === HttpStatus.BAD_REQUEST) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        error.message || 'Failed to start workflow execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

