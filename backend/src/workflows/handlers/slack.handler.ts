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

      const channelInput =
        typeof config.channel === 'string' && config.channel.trim().length > 0
          ? config.channel.trim()
          : '#general';
      const channelName = channelInput.replace(/^#/, '');

      const processedMessage = replaceVariables(rawMessage, context);
      const payload: Record<string, any> = {
        channel: channelInput,
        text: processedMessage,
      };

      const headers = {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      };

      const postMessage = async (channelTarget: string) => {
        const resp = await axios.post(
          'https://slack.com/api/chat.postMessage',
          { ...payload, channel: channelTarget },
          { headers },
        );
        return resp;
      };

      let response = await postMessage(channelInput);

      // If the bot is not in the channel, try to join public channels and retry
      if (response.data?.error === 'not_in_channel') {
        // Fetch public channels to find the channel ID
        const listResp = await axios.get('https://slack.com/api/conversations.list', {
          headers,
          params: { types: 'public_channel', limit: 200 },
        });

        const channelMatch = listResp.data?.channels?.find(
          (c: any) => c?.name === channelName || c?.name_normalized === channelName,
        );

        if (!channelMatch?.id) {
          throw new Error('Bot not in channel and channel not found to join');
        }

        // Attempt to join then retry posting
        await axios.post(
          'https://slack.com/api/conversations.join',
          { channel: channelMatch.id },
          { headers },
        );

        response = await postMessage(channelMatch.id);
      }

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


