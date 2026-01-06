import { ConditionHandler } from './condition.handler';
import { ExecutionContext } from '../../executions/interfaces/execution.interface';

describe('ConditionHandler', () => {
  let handler: ConditionHandler;

  beforeEach(() => {
    handler = new ConditionHandler();
  });

  const createContext = (variables: Record<string, any> = {}): ExecutionContext => ({
    variables,
    trigger: {},
    userId: 'test-user-id',
  });

  describe('basic execution', () => {
    it('should return branch true when condition met', async () => {
      const nodeData = {
        config: { expression: '15 > 10' },
      };
      const context = createContext({ count: 15 });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.branch).toBe('true');
    });

    it('should return branch false when condition not met', async () => {
      const nodeData = {
        config: { expression: '5 > 10' },
      };
      const context = createContext({ count: 5 });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.branch).toBe('false');
    });
  });

  describe('variable replacement', () => {
    it('should evaluate expression with variable replacement', async () => {
      const nodeData = {
        config: { expression: '{{variables.count}} > 10' },
      };
      const context = createContext({ count: 15 });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.branch).toBe('true');
    });

    it('should return false when variable makes condition false', async () => {
      const nodeData = {
        config: { expression: '{{variables.count}} > 10' },
      };
      const context = createContext({ count: 5 });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.branch).toBe('false');
    });
  });

  describe('operators', () => {
    it('should handle == operator', async () => {
      const nodeData = { config: { expression: '5 == 5' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');

      const nodeData2 = { config: { expression: '5 == 6' } };
      const result2 = await handler.execute(nodeData2, createContext());
      expect(result2.output.branch).toBe('false');
    });

    it('should handle != operator', async () => {
      const nodeData = { config: { expression: '5 != 6' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');

      const nodeData2 = { config: { expression: '5 != 5' } };
      const result2 = await handler.execute(nodeData2, createContext());
      expect(result2.output.branch).toBe('false');
    });

    it('should handle > operator', async () => {
      const nodeData = { config: { expression: '10 > 5' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');

      const nodeData2 = { config: { expression: '5 > 10' } };
      const result2 = await handler.execute(nodeData2, createContext());
      expect(result2.output.branch).toBe('false');
    });

    it('should handle < operator', async () => {
      const nodeData = { config: { expression: '5 < 10' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');

      const nodeData2 = { config: { expression: '10 < 5' } };
      const result2 = await handler.execute(nodeData2, createContext());
      expect(result2.output.branch).toBe('false');
    });

    it('should handle >= operator', async () => {
      const nodeData = { config: { expression: '10 >= 10' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');

      const nodeData2 = { config: { expression: '10 >= 5' } };
      const result2 = await handler.execute(nodeData2, createContext());
      expect(result2.output.branch).toBe('true');

      const nodeData3 = { config: { expression: '5 >= 10' } };
      const result3 = await handler.execute(nodeData3, createContext());
      expect(result3.output.branch).toBe('false');
    });

    it('should handle <= operator', async () => {
      const nodeData = { config: { expression: '10 <= 10' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');

      const nodeData2 = { config: { expression: '5 <= 10' } };
      const result2 = await handler.execute(nodeData2, createContext());
      expect(result2.output.branch).toBe('true');

      const nodeData3 = { config: { expression: '10 <= 5' } };
      const result3 = await handler.execute(nodeData3, createContext());
      expect(result3.output.branch).toBe('false');
    });
  });

  describe('value types', () => {
    it('should handle string comparisons', async () => {
      const nodeData = { config: { expression: '"hello" == "hello"' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');
    });

    it('should handle boolean values', async () => {
      const nodeData = { config: { expression: 'true == true' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');

      const nodeData2 = { config: { expression: 'true == false' } };
      const result2 = await handler.execute(nodeData2, createContext());
      expect(result2.output.branch).toBe('false');
    });

    it('should handle numeric comparisons with decimals', async () => {
      const nodeData = { config: { expression: '3.14 > 3.0' } };
      const result = await handler.execute(nodeData, createContext());
      expect(result.output.branch).toBe('true');
    });
  });

  describe('error handling', () => {
    it('should return error when expression is missing', async () => {
      const nodeData = { config: {} };
      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expression is required');
    });

    it('should return error when expression is empty', async () => {
      const nodeData = { config: { expression: '' } };
      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expression is required');
    });

    it('should return error for invalid expression', async () => {
      const nodeData = { config: { expression: 'invalid expression without operator' } };
      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid expression');
    });
  });
});
