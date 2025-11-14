import { create } from 'zustand';

import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from '../types/workflow.types';

interface WorkflowState {
  currentWorkflow: Workflow | null;
  workflows: Workflow[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNode: WorkflowNode | null;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  setWorkflows: (workflows: Workflow[]) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<WorkflowNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  deleteEdge: (id: string) => void;
  setSelectedNode: (node: WorkflowNode | null) => void;
  resetWorkflow: () => void;
}

const initialState = {
  currentWorkflow: null,
  workflows: [],
  nodes: [],
  edges: [],
  selectedNode: null,
} satisfies Omit<
  WorkflowState,
  | 'setCurrentWorkflow'
  | 'setWorkflows'
  | 'setNodes'
  | 'setEdges'
  | 'addNode'
  | 'updateNode'
  | 'deleteNode'
  | 'addEdge'
  | 'deleteEdge'
  | 'setSelectedNode'
  | 'resetWorkflow'
>;

export const useWorkflowStore = create<WorkflowState>((set) => ({
  ...initialState,
  setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),
  setWorkflows: (workflows) => set({ workflows }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),
  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...data } : node,
      ),
    })),
  deleteNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id,
      ),
    })),
  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),
  deleteEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    })),
  setSelectedNode: (node) => set({ selectedNode: node }),
  resetWorkflow: () => set(initialState),
}));

