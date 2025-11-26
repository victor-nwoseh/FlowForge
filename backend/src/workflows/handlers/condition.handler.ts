import { Injectable } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import { replaceVariables } from '../utils/variable-replacement.util';

const OPERATORS = ['>=', '<=', '==', '!=', '>', '<'] as const;
type Operator = (typeof OPERATORS)[number];

@Injectable()
export class ConditionHandler implements INodeHandler {
  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    const expression = nodeData?.config?.expression;

    if (!expression || typeof expression !== 'string') {
      return {
        success: false,
        output: { condition: false },
        error: 'Condition expression is required',
      };
    }

    try {
      const processedExpression = replaceVariables(expression, context);
      const { left, operator, right } = this.parseExpression(processedExpression);
      const result = this.evaluate(left, operator, right);

      return {
        success: true,
        output: { condition: result },
      };
    } catch {
      return {
        success: false,
        output: { condition: false },
        error: 'Invalid expression',
      };
    }
  }

  private parseExpression(expression: string): {
    left: string;
    operator: Operator;
    right: string;
  } {
    for (const operator of OPERATORS) {
      const parts = expression.split(operator);

      if (parts.length === 2) {
        const [left, right] = parts.map((part) => part.trim());

        if (left && right) {
          return { left, operator, right };
        }
      }
    }

    throw new Error('Unsupported expression');
  }

  private evaluate(leftRaw: string, operator: Operator, rightRaw: string): boolean {
    const left = this.parseValue(leftRaw);
    const right = this.parseValue(rightRaw);

    switch (operator) {
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      default:
        throw new Error('Unsupported operator');
    }
  }

  private parseValue(value: string): any {
    const trimmed = value.trim();

    if (!Number.isNaN(Number(trimmed))) {
      return Number(trimmed);
    }

    if (trimmed.toLowerCase() === 'true') {
      return true;
    }

    if (trimmed.toLowerCase() === 'false') {
      return false;
    }

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }
}


