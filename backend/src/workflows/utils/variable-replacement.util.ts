import { ExecutionContext } from '../../executions/interfaces/execution.interface';

const VARIABLE_REGEX = /{{([^}]+)}}/g;

export function replaceVariables(
  template: string,
  context: ExecutionContext,
): string {
  if (typeof template !== 'string') {
    return template as unknown as string;
  }

  return template.replace(VARIABLE_REGEX, (_, path: string) => {
    const value = resolvePath(path.trim(), context);
    return value !== undefined && value !== null ? String(value) : `{{${path}}}`;
  });
}

export function replaceVariablesInObject(
  obj: any,
  context: ExecutionContext,
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return replaceVariables(obj, context);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceVariablesInObject(item, context));
  }

  if (typeof obj === 'object') {
    return Object.entries(obj).reduce<Record<string, any>>((acc, [key, value]) => {
      acc[key] = replaceVariablesInObject(value, context);
      return acc;
    }, {});
  }

  return obj;
}

function resolvePath(path: string, context: ExecutionContext): any {
  const [root, ...rest] = path.split('.');

  if (!root) {
    return undefined;
  }

  let current: any;

  if (root === 'variables' || root === 'variable') {
    current = context.variables;
  } else if (root === 'trigger') {
    current = context.trigger;
  } else {
    current = context[root];
  }

  for (const segment of rest) {
    if (current == null) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}


