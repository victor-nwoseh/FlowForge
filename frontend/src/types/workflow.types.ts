import type { Edge, Node } from 'reactflow';

export interface NodeData {
  type: string;
  label: string;
  config: Record<string, any>;
}

export type NodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'ifElse'
  | 'delay'
  | 'variable'
  | 'slack'
  | 'email'
  | 'http'
  | 'sheets'
  | 'webhook';

export type WorkflowNode = Node<NodeData> & { data: NodeData };

export type WorkflowEdge = Edge;

export interface Workflow {
  _id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

