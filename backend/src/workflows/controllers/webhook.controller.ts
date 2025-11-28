import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { WorkflowsService } from '../workflows.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly workflowsService: WorkflowsService,
    @InjectQueue('workflow-execution')
    private readonly workflowQueue: Queue,
  ) {}

  @Post(':workflowId')
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() body: Record<string, any>,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const workflow = await this.workflowsService.findOne(workflowId);

      if (!workflow) {
        throw new NotFoundException(
          `Workflow with id ${workflowId} could not be found.`,
        );
      }

      const triggerData = {
        source: 'webhook',
        body,
        headers,
        timestamp: new Date().toISOString(),
      };

      await this.workflowQueue.add({
        workflowId,
        userId: workflow.userId,
        triggerData,
      });

      this.logger.log(`Workflow ${workflowId} triggered via webhook`);

      return {
        message: 'Workflow triggered via webhook',
        workflowId,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to trigger workflow ${workflowId} via webhook: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }
}


