import api from './api';
import type { Workflow } from '../types/workflow.types';

const workflowService = {
  getAll: async (): Promise<Workflow[]> => api.get('/workflows'),
  getOne: async (id: string): Promise<Workflow> => api.get(`/workflows/${id}`),
  create: async (
    workflow: Omit<Workflow, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Workflow> => api.post('/workflows', workflow),
  update: async (
    id: string,
    workflow: Partial<Workflow>,
  ): Promise<Workflow> => api.put(`/workflows/${id}`, workflow),
  delete: async (id: string): Promise<void> => api.delete(`/workflows/${id}`),
};

export default workflowService;

