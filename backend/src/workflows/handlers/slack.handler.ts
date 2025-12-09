import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import { replaceVariables } from '../utils/variable-replacement.util';
import { ConnectionsService } from '../../connections/connections.service';

@Injectable()
export class SlackHandler implements INodeHandler {
  private readonly logger = new Logger(SlackHandler.name);

  constructor(private readonly connectionsService: ConnectionsService) {}

  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    try {
      const userId = context.userId;
      if (!userId) {
        return {
          success: false,
          output: null,
          error: 'User ID missing from execution context',
        };
      }

      const connection = await this.connectionsService.findByUserAndService(
        userId,
        'slack',
      );

      if (!connection) {
        return {
          success: false,
          output: null,
          error:
            'Slack not connected. Please authorize Slack in Integrations page.',
        };
      }

      const config = nodeData?.config ?? {};
      const rawMessage = config.message;
      if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
        throw new Error('Slack message must be a non-empty string.');
      }

      const channel =
        typeof config.channel === 'string' && config.channel.trim().length > 0
          ? config.channel.trim()
          : '#general';

      const processedMessage = replaceVariables(rawMessage, context);
      const payload: Record<string, any> = {
        channel,
        text: processedMessage,
      };

      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        payload,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data?.ok) {
        const errorMsg =
          response.data?.error || 'Slack API returned an error response';
        throw new Error(errorMsg);
      }

      this.logger.log('Slack message sent successfully');
      return {
        success: true,
        output: { sent: true, message: processedMessage },
      };
    } catch (error: any) {
      const errorMessage =
        error?.message ?? 'Failed to send Slack message via webhook.';
      this.logger.error(`Slack handler error: ${errorMessage}`, error?.stack);

      return {
        success: false,
        output: null,
        error: errorMessage,
      };
    }
  }
}


