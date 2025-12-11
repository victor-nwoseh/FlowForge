import { Injectable, Logger } from '@nestjs/common';
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
import { ConnectionsService } from '../../connections/connections.service';

@Injectable()
export class SheetsHandler implements INodeHandler {
  private readonly logger = new Logger(SheetsHandler.name);

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
            'Google Sheets not connected. Please authorize Google in Integrations page.',
        };
      }

      if (connection.expiresAt && new Date() > connection.expiresAt) {
        connection = await this.connectionsService.refreshGoogleToken(userId);
      }

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

      const processedSpreadsheetId = replaceVariables(spreadsheetId, context);
      const processedRange = replaceVariables(range, context);
      const processedOperation = replaceVariables(operation, context)
        .trim()
        .toLowerCase();

      let processedValues: any = values;
      // If values came in as a JSON string from the UI, parse it.
      if (typeof processedValues === 'string') {
        try {
          processedValues = JSON.parse(processedValues);
        } catch (parseError) {
          throw new Error(
            'Google Sheets "values" must be a valid JSON 2D array (e.g., [["A","B"],["C","D"]]).',
          );
        }
      }

      if (Array.isArray(processedValues)) {
        // If it's a 1D array, wrap as a single row for convenience
        if (processedValues.length > 0 && !Array.isArray(processedValues[0])) {
          processedValues = [processedValues];
        }
        processedValues = replaceVariablesInObject(processedValues, context);
      }

      if (!['read', 'write'].includes(processedOperation)) {
        throw new Error('Google Sheets "operation" must be either "read" or "write".');
      }

      if (processedOperation === 'write') {
        if (
          !Array.isArray(processedValues) ||
          (processedValues.length > 0 && !Array.isArray(processedValues[0]))
        ) {
          throw new Error(
            'Google Sheets "values" must be provided as a 2D array for write operations.',
          );
        }
      }

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: connection.accessToken,
      });

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

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


