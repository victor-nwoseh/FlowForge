import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { ExecutionContext } from '../../executions/interfaces/execution.interface';
import {
  INodeHandler,
  NodeHandlerResponse,
} from '../interfaces/node-handler.interface';

@Injectable()
export class HttpRequestHandler implements INodeHandler {
  async execute(
    nodeData: any,
    _context: ExecutionContext,
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
      const response = await axios({
        method,
        url,
        headers,
        data: body,
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


