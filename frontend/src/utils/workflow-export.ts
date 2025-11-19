import type { Workflow } from '../types/workflow.types';

export const exportWorkflow = (workflow: Workflow) => {
  const data = JSON.stringify(workflow, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = workflow.name?.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'workflow';
  link.href = url;
  link.download = `workflow-${safeName}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const isValidWorkflow = (data: unknown): data is Workflow => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const workflow = data as Workflow;
  if (!workflow.name || typeof workflow.name !== 'string') {
    return false;
  }
  if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) {
    return false;
  }
  return true;
};

export const importWorkflow = (file: File): Promise<Workflow> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };

    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        if (!isValidWorkflow(parsed)) {
          reject(new Error('Invalid workflow file format.'));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON structure.'));
      }
    };

    reader.readAsText(file);
  });
};
