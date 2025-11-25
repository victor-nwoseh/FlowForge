import { Injectable, Logger } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';

@Injectable()
export class SheetsHandler implements INodeHandler {
  private readonly logger = new Logger(SheetsHandler.name);

  async execute(
    _nodeData: any,
    _context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    this.logger.log('Sheets handler called (stub implementation)');

    return {
      success: true,
      output: {
        message: 'Google Sheets operation would happen here (Week 4)',
      },
    };
  }
}


