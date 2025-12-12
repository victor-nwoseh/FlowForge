export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed';

export interface NodeExecutionLog {
  nodeId: string;
  nodeType: string;
  status: 'success' | 'failed' | 'skipped';
  input: any;
  output: any;
  error?: string;
  startTime: string;
  endTime: string;
  duration: number;
  attemptNumber?: number;
}

export interface Execution {
  _id: string;
  workflowId: string;
  userId: string;
  status: ExecutionStatus;
  triggerData: any;
  triggerSource?: string;
  logs: NodeExecutionLog[];
  error?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
}


