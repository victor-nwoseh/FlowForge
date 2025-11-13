export interface NodeData {
  type: string;
  label: string;
  config: Record<string, any>;
}

export interface Node {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: NodeData;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

