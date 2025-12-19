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
  } else if (root === 'loop') {
    const loopState: any =
      (context as any).loop ?? ((context as any)._loopStack ?? []).slice(-1)[0];
    if (!loopState) {
      return undefined;
    }
    if (rest.length === 0) {
      return loopState;
    }

    const [first, ...remaining] = rest;
    let loopValue: any;

    if (first === 'item') {
      loopValue = loopState.currentItem;
    } else if (first === 'index') {
      loopValue = loopState.currentIndex;
    } else if (first === 'count') {
      loopValue = Array.isArray(loopState.items) ? loopState.items.length : undefined;
    } else if (loopState.loopVariable && first === loopState.loopVariable) {
      loopValue = loopState.currentItem;
    } else {
      loopValue = loopState[first];
    }

    for (const segment of remaining) {
      if (loopValue == null) {
        return undefined;
      }
      loopValue = loopValue[segment];
    }

    return loopValue;
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


