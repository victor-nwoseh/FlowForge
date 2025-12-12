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
    job: Job<{
      workflowId: string;
      userId: string;
      triggerData?: any;
      triggerSource?: 'manual' | 'webhook' | 'scheduled';
    }>,
  ): Promise<void> {
    const { workflowId, userId, triggerData = {}, triggerSource } = job.data;

    if (job.attemptsMade > 0) {
      this.logger.warn(
        `[Job ${job.id}] Retry attempt ${job.attemptsMade} for workflow ${workflowId}`,
      );
    } else {
      this.logger.log(
        `[Job ${job.id}] Processing workflow execution for workflow ${workflowId}`,
      );
    }

    try {
      await this.workflowExecutorService.executeWorkflow(
        workflowId,
        userId,
        triggerData,
        job.attemptsMade + 1,
        job.id?.toString(),
        triggerSource ?? 'manual',
      );
      this.logger.log(`[Job ${job.id}] Workflow execution completed`);
    } catch (error: any) {
      this.logger.error(
        `[Job ${job.id}] Workflow execution failed: ${error.message}`,
        error.stack,
      );
      if (
        job.attemptsMade >= (job.opts.attempts ?? 1) &&
        (job.opts.attempts ?? 1) > 0
      ) {
        this.logger.error(
          `[Job ${job.id}] All retry attempts exhausted for workflow ${workflowId}`,
        );
      }
      throw error;
    }
  }
}


