import { Injectable, Logger } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';

@Injectable()
export class DelayHandler implements INodeHandler {
  private readonly logger = new Logger(DelayHandler.name);

  async execute(
    nodeData: any,
    _context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    let durationSeconds = Number(nodeData?.config?.duration);

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      this.logger.warn(
        `Invalid delay duration provided (${durationSeconds}). Defaulting to 1 second.`,
      );
      durationSeconds = 1;
    }

    const durationMs = durationSeconds * 1000;

    await new Promise((resolve) => setTimeout(resolve, durationMs));

    return {
      success: true,
      output: {
        delayed: true,
        duration: durationSeconds,
      },
    };
  }
}


