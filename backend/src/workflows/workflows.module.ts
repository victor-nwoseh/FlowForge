import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

import { Workflow, WorkflowSchema } from './schemas/workflow.schema';
import { WorkflowsController } from './workflows.controller';
import { WebhookController } from './controllers/webhook.controller';
import { WorkflowsService } from './workflows.service';
import { ExecutionsModule } from '../executions/executions.module';
import { HttpRequestHandler } from './handlers/http-request.handler';
import { DelayHandler } from './handlers/delay.handler';
import { ConditionHandler } from './handlers/condition.handler';
import { VariableHandler } from './handlers/variable.handler';
import { SlackHandler } from './handlers/slack.handler';
import { EmailHandler } from './handlers/email.handler';
import { SheetsHandler } from './handlers/sheets.handler';
import { WebhookHandler } from './handlers/webhook.handler';
import { NodeHandlerRegistryService } from './services/node-handler-registry.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { WorkflowExecutionProcessor } from './processors/workflow-execution.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
    ]),
    BullModule.registerQueue({
      name: 'workflow-execution',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    ExecutionsModule,
  ],
  controllers: [WorkflowsController, WebhookController],
  providers: [
    WorkflowsService,
    HttpRequestHandler,
    DelayHandler,
    ConditionHandler,
    VariableHandler,
    SlackHandler,
    EmailHandler,
    SheetsHandler,
    WebhookHandler,
    NodeHandlerRegistryService,
    WorkflowExecutorService,
    WorkflowExecutionProcessor,
  ],
  exports: [WorkflowsService, WorkflowExecutorService],
})
export class WorkflowsModule {}

