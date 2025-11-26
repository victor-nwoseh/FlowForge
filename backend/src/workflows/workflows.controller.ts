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
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowsService } from './workflows.service';
import { validateWorkflowStructure } from './utils/workflow-validation.util';

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

      const validation = validateWorkflowStructure(workflow);
      if (!validation.valid) {
        throw new HttpException(
          `Invalid workflow: ${validation.errors.join(', ')}`,
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
      if (error instanceof NotFoundException) {
        throw new HttpException(
          'Workflow not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }

      if (error instanceof HttpException) {
        const status = error.getStatus();
        if (status === HttpStatus.BAD_REQUEST) {
          throw new HttpException(
            `Invalid workflow: ${error.message}`,
            HttpStatus.BAD_REQUEST,
          );
        }
        throw error;
      }

      if (
        error.status === HttpStatus.NOT_FOUND ||
        error?.response?.status === HttpStatus.NOT_FOUND
      ) {
        throw new HttpException(
          'Workflow not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }

      if (
        error.status === HttpStatus.BAD_REQUEST ||
        error?.response?.status === HttpStatus.BAD_REQUEST
      ) {
        throw new HttpException(
          `Invalid workflow: ${error.message ?? 'Validation failed'}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        `Failed to start workflow execution: ${error.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

