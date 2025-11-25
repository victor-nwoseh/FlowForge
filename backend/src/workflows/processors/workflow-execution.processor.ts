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
      `Processing workflow execution job ${job.id} for workflow ${workflowId}`,
    );

    try {
      await this.workflowExecutorService.executeWorkflow(
        workflowId,
        userId,
        triggerData,
      );
      this.logger.log(`Workflow execution job completed: ${job.id}`);
    } catch (error: any) {
      this.logger.error(
        `Workflow execution job failed (${job.id}): ${error.message}`,
      );
      throw error;
    }
  }
}


