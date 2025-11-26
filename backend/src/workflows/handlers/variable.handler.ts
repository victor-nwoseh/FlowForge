import { Injectable } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import { replaceVariables } from '../utils/variable-replacement.util';

@Injectable()
export class VariableHandler implements INodeHandler {
  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    const key = nodeData?.config?.key;
    const hasValue = Object.prototype.hasOwnProperty.call(
      nodeData?.config ?? {},
      'value',
    );
    const value = nodeData?.config?.value;

    if (!key || typeof key !== 'string' || !key.trim()) {
      return {
        success: false,
        output: null,
        error: 'Key is required for variable node',
      };
    }

    if (!hasValue) {
      return {
        success: false,
        output: null,
        error: 'Value is required for variable node',
      };
    }

    const processedValue =
      typeof value === 'string' ? replaceVariables(value, context) : value;

    context.variables[key] = processedValue;

    return {
      success: true,
      output: { key, value: processedValue },
    };
  }
}


