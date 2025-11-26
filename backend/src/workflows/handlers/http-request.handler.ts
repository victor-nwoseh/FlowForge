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
        error: 'Missing node configuration',
      };
    }

    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    let {
      method = 'GET',
      url,
      headers = {},
      body = {},
    } = nodeData.config;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return {
        success: false,
        output: null,
        error: 'URL is required for HTTP request',
      };
    }

    method = String(method || 'GET').toUpperCase();
    if (!allowedMethods.includes(method)) {
      method = 'GET';
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


