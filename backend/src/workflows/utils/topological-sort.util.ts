export function topologicalSort(nodes: any[], edges: any[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    const source = edge.source;
    const target = edge.target;

    if (!adjacency.has(source)) {
      adjacency.set(source, []);
      inDegree.set(source, inDegree.get(source) ?? 0);
    }

    if (!inDegree.has(target)) {
      inDegree.set(target, 0);
      adjacency.set(target, []);
    }

    adjacency.get(source)!.push(target);
    inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, nextDegree);

      if (nextDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (result.length !== nodes.length) {
    throw new Error('Circular dependency detected in workflow');
  }

  return result;
}

export function findStartNodes(nodes: any[], edges: any[]): string[] {
  const incoming = new Set<string>();

  for (const edge of edges) {
    if (edge.target) {
      incoming.add(edge.target);
    }
  }

  return nodes.filter((node) => !incoming.has(node.id)).map((node) => node.id);
}


