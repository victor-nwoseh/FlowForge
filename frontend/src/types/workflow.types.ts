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
  | 'delay'
  | 'variable'
  | 'slack'
  | 'email'
  | 'http'
  | 'sheets'
  | 'webhook';

export interface WorkflowNode extends Node<NodeData> {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: NodeData;
}

export interface WorkflowEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

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

