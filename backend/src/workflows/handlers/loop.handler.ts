import { Injectable } from '@nestjs/common';

import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import { ExecutionContext } from '../../executions/interfaces/execution.interface';

@Injectable()
export class LoopHandler implements INodeHandler {
  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    const arraySource = nodeData?.config?.arraySource;
    const loopVariable = nodeData?.config?.loopVariable || 'item';

    if (!arraySource || typeof arraySource !== 'string' || !arraySource.trim()) {
      return {
        success: false,
        output: {},
        error: 'Array source not configured',
      };
    }

    const resolvedArray = this.resolveArrayFromContext(arraySource, context);

    if (!Array.isArray(resolvedArray)) {
      return {
        success: false,
        output: {},
        error: 'Array source is not an array',
      };
    }

    if (resolvedArray.length === 0) {
      return {
        success: true,
        output: { itemCount: 0, message: 'No items to loop over' },
      };
    }

    const loopState = {
      items: resolvedArray,
      currentIndex: 0,
      currentItem: null,
      loopVariable,
      arraySource,
    };

    const loopStack = (context as any)._loopStack ?? [];
    loopStack.push(loopState);
    (context as any)._loopStack = loopStack;
    context.loop = loopState;

    return {
      success: true,
      output: {
        itemCount: resolvedArray.length,
        loopInitiated: true,
        arraySource,
      },
    };
  }

  private resolveArrayFromContext(source: string, context: ExecutionContext): any {
    const trimmed = source.trim();

    // node reference: nodeId.output
    const parts = trimmed.split('.');
    if (parts.length >= 2 && parts[0].startsWith('node_')) {
      const nodeId = parts[0];
      const field = parts.slice(1).join('.');
      const nodeOutput = context[nodeId];
      if (nodeOutput && typeof nodeOutput === 'object') {
        return field.split('.').reduce<any>((acc, key) => (acc ? acc[key] : undefined), nodeOutput);
      }
      return undefined;
    }

    return context.variables?.[trimmed];
  }
}

