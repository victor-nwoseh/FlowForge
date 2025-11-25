export interface NodeExecutionLog {
  nodeId: string;
  nodeType: string;
  status: 'success' | 'failed' | 'skipped';
  input: any;
  output: any;
  error?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed';

export interface ExecutionContext {
  variables: Record<string, any>;
  trigger: any;
  [key: string]: any;
}


