import { Injectable, Logger } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';

@Injectable()
export class SlackHandler implements INodeHandler {
  private readonly logger = new Logger(SlackHandler.name);

  async execute(
    _nodeData: any,
    _context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    this.logger.log('Slack handler called (stub implementation)');

    return {
      success: true,
      output: { message: 'Slack message would be sent here (Week 4)' },
    };
  }
}


