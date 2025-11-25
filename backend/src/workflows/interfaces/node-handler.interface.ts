import { ExecutionContext } from '../../executions/interfaces/execution.interface';

export interface NodeHandlerResponse {
  success: boolean;
  output: any;
  error?: string;
}

export interface INodeHandler {
  execute(nodeData: any, context: ExecutionContext): Promise<NodeHandlerResponse>;
}


