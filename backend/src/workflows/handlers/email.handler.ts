import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import { replaceVariables } from '../utils/variable-replacement.util';

@Injectable()
export class EmailHandler implements INodeHandler {
  private readonly logger = new Logger(EmailHandler.name);

  constructor(private readonly configService: ConfigService) {}

  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    try {
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

      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const smtpPort = parseInt(
        this.configService.get<string>('SMTP_PORT') ?? '587',
        10,
      );
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASS');

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        throw new Error(
          'SMTP configuration is incomplete. Ensure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are set.',
        );
      }

      const processedTo = replaceVariables(to, context);
      const processedSubject = replaceVariables(subject, context);
      const processedBody = replaceVariables(body, context);

      const transporter = createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: smtpUser,
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


