import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';
import {
  replaceVariables,
  replaceVariablesInObject,
} from '../utils/variable-replacement.util';

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

@Injectable()
export class SheetsHandler implements INodeHandler {
  private readonly logger = new Logger(SheetsHandler.name);

  constructor(private readonly configService: ConfigService) {}

  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    try {
      const config = nodeData?.config ?? {};
      const { spreadsheetId, range, operation, values } = config;

      if (typeof spreadsheetId !== 'string' || spreadsheetId.trim().length === 0) {
        throw new Error('Google Sheets "spreadsheetId" is required.');
      }

      if (typeof range !== 'string' || range.trim().length === 0) {
        throw new Error('Google Sheets "range" is required.');
      }

      if (typeof operation !== 'string' || operation.trim().length === 0) {
        throw new Error('Google Sheets "operation" must be specified.');
      }

      const clientEmail = this.configService.get<string>('GOOGLE_SHEETS_CLIENT_EMAIL');
      const privateKeyRaw = this.configService.get<string>('GOOGLE_SHEETS_PRIVATE_KEY');

      if (!clientEmail || !privateKeyRaw) {
        throw new Error(
          'Google Sheets credentials missing. Ensure GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY are set.',
        );
      }

      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

      const processedSpreadsheetId = replaceVariables(spreadsheetId, context);
      const processedRange = replaceVariables(range, context);
      const processedOperation = replaceVariables(operation, context)
        .trim()
        .toLowerCase();
      const processedValues = Array.isArray(values)
        ? replaceVariablesInObject(values, context)
        : undefined;

      if (!['read', 'write'].includes(processedOperation)) {
        throw new Error('Google Sheets "operation" must be either "read" or "write".');
      }

      if (processedOperation === 'write' && !Array.isArray(processedValues)) {
        throw new Error(
          'Google Sheets "values" must be provided as a 2D array for write operations.',
        );
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: SHEETS_SCOPES,
      });

      const sheets = google.sheets({ version: 'v4', auth });

      if (processedOperation === 'read') {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: processedSpreadsheetId,
          range: processedRange,
        });

        this.logger.log('Google Sheets read operation succeeded');
        return {
          success: true,
          output: { data: response.data.values ?? [] },
        };
      }

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: processedSpreadsheetId,
        range: processedRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: processedValues,
        },
      });

      this.logger.log('Google Sheets write operation succeeded');
      return {
        success: true,
        output: {
          updated: true,
          range: response.data.updates?.updatedRange,
        },
      };
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Google Sheets operation failed.';
      this.logger.error(`Sheets handler error: ${errorMessage}`, error?.stack);

      return {
        success: false,
        output: null,
        error: errorMessage,
      };
    }
  }
}


