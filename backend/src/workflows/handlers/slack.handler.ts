import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import { replaceVariables } from '../utils/variable-replacement.util';

@Injectable()
export class SlackHandler implements INodeHandler {
  private readonly logger = new Logger(SlackHandler.name);

  constructor(private readonly configService: ConfigService) {}

  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    try {
      const config = nodeData?.config ?? {};
      const webhookUrl =
        (typeof config.webhookUrl === 'string' && config.webhookUrl.trim()) ||
        this.configService.get<string>('SLACK_WEBHOOK_URL');

      if (!webhookUrl) {
        throw new Error(
          'Slack webhook URL is required via node config or SLACK_WEBHOOK_URL env variable.',
        );
      }

      const rawMessage = config.message;
      if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
        throw new Error('Slack message must be a non-empty string.');
      }

      const channel =
        typeof config.channel === 'string' && config.channel.trim().length > 0
          ? config.channel.trim()
          : undefined;

      const processedMessage = replaceVariables(rawMessage, context);
      const payload: Record<string, any> = {
        text: processedMessage,
      };

      if (channel) {
        payload.channel = channel;
      }

      await axios.post(webhookUrl, payload);

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


