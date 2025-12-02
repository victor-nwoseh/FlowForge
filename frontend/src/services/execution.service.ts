import api from './api';
import type { Execution } from '../types/execution.types';

export const executionService = {
  async getAll(workflowId?: string): Promise<Execution[]> {
    const response = await api.get<Execution[]>('/executions', {
      params: workflowId ? { workflowId } : undefined,
    });
    return response as unknown as Execution[];
  },

  async getOne(id: string): Promise<Execution> {
    const response = await api.get<Execution>(`/executions/${id}`);
    return response as unknown as Execution;
  },
};


