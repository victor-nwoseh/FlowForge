import { Injectable, Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import { replaceVariables } from '../utils/variable-replacement.util';
import { ConnectionsService } from '../../connections/connections.service';

@Injectable()
export class EmailHandler implements INodeHandler {
  private readonly logger = new Logger(EmailHandler.name);

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

      let connection = await this.connectionsService.findByUserAndService(
        userId,
        'google',
      );

      if (!connection) {
        return {
          success: false,
          output: null,
          error:
            'Gmail not connected. Please authorize Google in Integrations page.',
        };
      }

      if (connection.expiresAt && new Date() > connection.expiresAt) {
        connection = await this.connectionsService.refreshGoogleToken(userId);
      }

      const config = nodeData?.config ?? {};
      const { to, subject, body } = config;

      if (typeof to !== 'string' || to.trim().length === 0) {
        throw new Error('Email "to" field must be a non-empty string.');
      }

      if (typeof subject !== 'string' || subject.trim().length === 0) {
        throw new Error('Email "subject" field must be a non-empty string.');
      }

      if (typeof body !== 'string' || body.trim().length === 0) {
        throw new Error('Email "body" field must be a non-empty string.');
      }

      const processedTo = replaceVariables(to, context);
      const processedSubject = replaceVariables(subject, context);
      const processedBody = replaceVariables(body, context);

      const transporter = createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: 'me',
          accessToken: connection.accessToken,
        },
      });

      const mailOptions = {
        from: 'me',
        to: processedTo,
        subject: processedSubject,
        text: processedBody,
      };

      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);

      return {
        success: true,
        output: { sent: true, messageId: info.messageId },
      };
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to send email.';
      this.logger.error(`Email handler error: ${errorMessage}`, error?.stack);

      return {
        success: false,
        output: null,
        error: errorMessage,
      };
    }
  }
}


