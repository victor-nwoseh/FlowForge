import { LoopHandler } from './loop.handler';
import { ExecutionContext } from '../../executions/interfaces/execution.interface';

describe('LoopHandler', () => {
  let handler: LoopHandler;

  beforeEach(() => {
    handler = new LoopHandler();
  });

  const createContext = (variables: Record<string, any> = {}, nodeOutputs: Record<string, any> = {}): ExecutionContext => ({
    variables,
    trigger: {},
    userId: 'test-user-id',
    ...nodeOutputs,
  });

  describe('initialize loop context', () => {
    it('should initialize loop context with array from variables', async () => {
      const nodeData = {
        config: {
          arraySource: 'items',
          loopVariable: 'item',
        },
      };
      const context = createContext({ items: [1, 2, 3] });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.itemCount).toBe(3);
      expect(result.output.loopInitiated).toBe(true);
      expect((context as any).loop).toBeDefined();
      expect((context as any).loop.items).toEqual([1, 2, 3]);
      expect((context as any).loop.currentIndex).toBe(0);
      expect((context as any).loop.loopVariable).toBe('item');
    });

    it('should use default loopVariable when not specified', async () => {
      const nodeData = {
        config: {
          arraySource: 'items',
        },
      };
      const context = createContext({ items: ['a', 'b', 'c'] });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect((context as any).loop.loopVariable).toBe('item');
    });

    it('should handle array from node output', async () => {
      const nodeData = {
        config: {
          arraySource: 'node_http.data',
          loopVariable: 'record',
        },
      };
      const context = createContext({}, {
        node_http: { data: [{ id: 1 }, { id: 2 }] },
      });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.itemCount).toBe(2);
      expect((context as any).loop.items).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should push to loop stack for nested loops', async () => {
      const nodeData = {
        config: {
          arraySource: 'items',
          loopVariable: 'item',
        },
      };
      const context = createContext({ items: [1, 2, 3] });
      (context as any)._loopStack = [];

      await handler.execute(nodeData, context);

      expect((context as any)._loopStack).toHaveLength(1);
      expect((context as any)._loopStack[0].items).toEqual([1, 2, 3]);
    });
  });

  describe('error handling', () => {
    it('should return error if array source missing', async () => {
      const nodeData = {
        config: {},
      };
      const context = createContext();

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Array source not configured');
    });

    it('should return error if array source is empty string', async () => {
      const nodeData = {
        config: { arraySource: '' },
      };
      const context = createContext();

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Array source not configured');
    });

    it('should return error if source not array', async () => {
      const nodeData = {
        config: { arraySource: 'notAnArray' },
      };
      const context = createContext({ notAnArray: 'this is a string' });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Array source is not an array');
    });

    it('should return error if source is a number', async () => {
      const nodeData = {
        config: { arraySource: 'numericValue' },
      };
      const context = createContext({ numericValue: 42 });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Array source is not an array');
    });

    it('should return error if source is an object', async () => {
      const nodeData = {
        config: { arraySource: 'objectValue' },
      };
      const context = createContext({ objectValue: { key: 'value' } });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Array source is not an array');
    });
  });

  describe('empty array handling', () => {
    it('should return success with zero itemCount for empty array', async () => {
      const nodeData = {
        config: { arraySource: 'items' },
      };
      const context = createContext({ items: [] });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.itemCount).toBe(0);
      expect(result.output.message).toBe('No items to loop over');
    });
  });

  describe('JSON string array parsing', () => {
    it('should parse JSON string as array', async () => {
      const nodeData = {
        config: { arraySource: 'jsonArray' },
      };
      const context = createContext({ jsonArray: '[1, 2, 3]' });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.itemCount).toBe(3);
      expect((context as any).loop.items).toEqual([1, 2, 3]);
    });

    it('should parse JSON string with objects', async () => {
      const nodeData = {
        config: { arraySource: 'jsonArray' },
      };
      const context = createContext({ jsonArray: '[{"id": 1}, {"id": 2}]' });

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(result.output.itemCount).toBe(2);
    });
  });
});
