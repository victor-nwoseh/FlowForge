import { Injectable, Logger } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';

@Injectable()
export class WebhookHandler implements INodeHandler {
  private readonly logger = new Logger(WebhookHandler.name);

  async execute(
    _nodeData: any,
    _context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    this.logger.log('Webhook handler called (stub implementation)');

    return {
      success: true,
      output: { message: 'Webhook would be triggered here (Week 4)' },
    };
  }
}


