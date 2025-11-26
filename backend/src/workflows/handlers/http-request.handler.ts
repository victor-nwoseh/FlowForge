import { Injectable } from '@nestjs/common';
import axios from 'axios';

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
export class HttpRequestHandler implements INodeHandler {
  async execute(
    nodeData: any,
    context: ExecutionContext,
  ): Promise<NodeHandlerResponse> {
    if (!nodeData?.config) {
      return {
        success: false,
        output: null,
        error: 'HTTP node missing config',
      };
    }

    const {
      method = 'GET',
      url,
      headers = {},
      body = {},
    } = nodeData.config;

    if (!url || typeof url !== 'string') {
      return {
        success: false,
        output: null,
        error: 'HTTP node missing URL',
      };
    }

    try {
      const processedUrl = replaceVariables(url, context);
      const processedHeaders = replaceVariablesInObject(headers, context);
      const processedBody = replaceVariablesInObject(body, context);

      const response = await axios({
        method,
        url: processedUrl,
        headers: processedHeaders,
        data: processedBody,
      });

      return {
        success: true,
        output: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        output: null,
        error: error.message ?? 'HTTP request failed',
      };
    }
  }
}


