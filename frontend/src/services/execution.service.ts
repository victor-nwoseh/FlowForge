import api from './api';
import type { Execution } from '../types/execution.types';

export const executionService = {
  async getAll(workflowId?: string): Promise<Execution[]> {
    const response = await api.get('/executions', {
      params: workflowId ? { workflowId } : undefined,
    });
    return response.data;
  },

  async getOne(id: string): Promise<Execution> {
    const response = await api.get(`/executions/${id}`);
    return response.data;
  },
};


