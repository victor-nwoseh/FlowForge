import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

import { WorkflowExecutorService } from '../services/workflow-executor.service';

@Processor('workflow-execution')
export class WorkflowExecutionProcessor {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name);

  constructor(
    private readonly workflowExecutorService: WorkflowExecutorService,
  ) {}

  @Process()
  async handleExecution(
    job: Job<{ workflowId: string; userId: string; triggerData?: any }>,
  ): Promise<void> {
    const { workflowId, userId, triggerData = {} } = job.data;

    this.logger.log(
      `[Job ${job.id}] Processing workflow execution for workflow ${workflowId}`,
    );

    try {
      await this.workflowExecutorService.executeWorkflow(
        workflowId,
        userId,
        triggerData,
      );
      this.logger.log(`[Job ${job.id}] Workflow execution completed`);
    } catch (error: any) {
      this.logger.error(
        `[Job ${job.id}] Workflow execution failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}


