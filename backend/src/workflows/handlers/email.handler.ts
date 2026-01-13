import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

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

  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly configService: ConfigService,
  ) {}

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

      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth client configuration missing on server');
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

      const fromEmail =
        (connection.metadata as any)?.email ||
        (connection.metadata as any)?.user ||
        'me';

      // Use Gmail API instead of SMTP (SMTP ports blocked on cloud providers)
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken ?? undefined,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build RFC 2822 formatted email
      const emailLines = [
        `To: ${processedTo}`,
        `From: ${fromEmail}`,
        `Subject: ${processedSubject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        processedBody,
      ];
      const email = emailLines.join('\r\n');

      // Base64 URL-safe encode the email
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      this.logger.log(`Email sent successfully via Gmail API: ${response.data.id}`);

      return {
        success: true,
        output: { sent: true, messageId: response.data.id },
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


