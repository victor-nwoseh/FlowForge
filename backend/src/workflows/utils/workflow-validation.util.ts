const SUPPORTED_NODE_TYPES = new Set([
  'http',
  'delay',
  'condition',
  'variable',
  'slack',
  'email',
  'sheets',
  'webhook',
  'loop',
  'ifElse',
]);

export function validateWorkflowStructure(
  workflow: any,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!workflow?.name || typeof workflow.name !== 'string') {
    errors.push('Workflow must have a name');
  }

  if (!Array.isArray(workflow?.nodes) || workflow.nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }

  const nodeIds = new Set<string>();

  if (Array.isArray(workflow?.nodes)) {
    workflow.nodes.forEach((node: any, index: number) => {
      if (!node?.id || !node?.type || !node?.data) {
        errors.push(`Node ${node?.id ?? index} missing required fields`);
        return;
      }

      if (!SUPPORTED_NODE_TYPES.has(node.type)) {
        errors.push(`Node ${node.id} has unsupported type ${node.type}`);
        return;
      }

      nodeIds.add(node.id);
    });
  }

  if (Array.isArray(workflow?.edges)) {
    workflow.edges.forEach((edge: any, index: number) => {
      if (!edge?.source || !edge?.target) {
        errors.push(`Edge ${edge?.id ?? index} missing source or target`);
        return;
      }

      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        errors.push(
          `Edge ${
            edge?.id ?? index
          } references non-existent node(s): ${edge.source} -> ${edge.target}`,
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


