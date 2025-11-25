import { Injectable } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';

@Injectable()
export class VariableHandler implements INodeHandler {
  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    const key = nodeData?.config?.key;
    const value = nodeData?.config?.value;

    if (!key || typeof key !== 'string') {
      return {
        success: false,
        output: null,
        error: 'Variable key is required',
      };
    }

    context.variables[key] = value;

    return {
      success: true,
      output: { key, value },
    };
  }
}


