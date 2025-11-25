import { Injectable, Logger } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';

@Injectable()
export class EmailHandler implements INodeHandler {
  private readonly logger = new Logger(EmailHandler.name);

  async execute(
    _nodeData: any,
    _context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    this.logger.log('Email handler called (stub implementation)');

    return {
      success: true,
      output: { message: 'Email would be sent here (Week 4)' },
    };
  }
}


