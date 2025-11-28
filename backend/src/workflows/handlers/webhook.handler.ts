import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import {
  replaceVariables,
  replaceVariablesInObject,
} from '../utils/variable-replacement.util';

@Injectable()
export class WebhookHandler implements INodeHandler {
  private readonly logger = new Logger(WebhookHandler.name);

  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    try {
      const config = nodeData?.config ?? {};
      const { url, method = 'POST', payload } = config;

      if (typeof url !== 'string' || url.trim().length === 0) {
        throw new Error('Webhook "url" must be a non-empty string.');
      }

      if (typeof payload === 'undefined') {
        throw new Error('Webhook "payload" is required.');
      }

      const processedUrl = replaceVariables(url, context);
      const processedPayload = replaceVariablesInObject(payload, context);
      const requestMethod =
        typeof method === 'string' && method.trim().length > 0
          ? method.trim().toUpperCase()
          : 'POST';

      const response = await axios({
        method: requestMethod as any,
        url: processedUrl,
        data: processedPayload,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Webhook request to ${processedUrl} succeeded`);
      return {
        success: true,
        output: { sent: true, response: response.data },
      };
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Webhook request failed.';
      this.logger.error(`Webhook handler error: ${errorMessage}`, error?.stack);

      return {
        success: false,
        output: null,
        error: errorMessage,
      };
    }
  }
}


