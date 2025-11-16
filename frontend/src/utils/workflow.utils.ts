import type { WorkflowEdge, WorkflowNode } from '../types/workflow.types';
import { getNodeTypeConfig } from './nodeTypes';

export const generateNodeId = (): string =>
  `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const generateEdgeId = (source: string, target: string): string =>
  `edge_${source}_${target}`;

export const getNodeIcon = (type: string) => {
  const config = getNodeTypeConfig(type);
  return config?.icon ?? getNodeTypeConfig('action')?.icon ?? null;
};

const hasTriggerNode = (nodes: WorkflowNode[]) =>
  nodes.some((node) => node.data.type === 'trigger');

const buildAdjacencyList = (edges: WorkflowEdge[]) => {
  const adjacency = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set());
    }
    adjacency.get(edge.source)!.add(edge.target);
  });
  return adjacency;
};

const detectCycles = (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const adjacency = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const visit = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    adjacency.get(nodeId)?.forEach((neighbor) => {
      if (visit(neighbor)) {
        return true;
      }
    });

    recursionStack.delete(nodeId);
    return false;
  };

  return nodes.some((node) => visit(node.id));
};

const findDisconnectedNodes = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
) => {
  if (nodes.length === 0) {
    return [];
  }

  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((node) => {
    adjacency.set(node.id, new Set());
  });

  edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const visited = new Set<string>();
  const queue: string[] = [];

  const startNode = nodes[0].id;
  queue.push(startNode);
  visited.add(startNode);

  while (queue.length > 0) {
    const current = queue.shift()!;
    adjacency.get(current)?.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    });
  }

  return nodes.filter((node) => !visited.has(node.id)).map((node) => node.id);
};

export const validateWorkflow = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
) => {
  const errors: string[] = [];

  if (!hasTriggerNode(nodes)) {
    errors.push('Workflow must include at least one trigger node.');
  }

  const disconnected = findDisconnectedNodes(nodes, edges);
  if (disconnected.length > 0) {
    errors.push(
      `The following nodes are disconnected: ${disconnected.join(', ')}`,
    );
  }

  if (detectCycles(nodes, edges)) {
    errors.push('Workflow contains circular dependencies.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

