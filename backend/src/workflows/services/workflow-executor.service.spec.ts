import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowsService } from '../workflows.service';
import { ExecutionsService } from '../../executions/executions.service';
import { NodeHandlerRegistryService } from './node-handler-registry.service';
import { SchedulesService } from '../../schedules/schedules.service';
import { ExecutionGateway } from '../../executions/gateways/execution.gateway';

describe('WorkflowExecutorService', () => {
  let service: WorkflowExecutorService;
  let workflowsService: jest.Mocked<WorkflowsService>;
  let executionsService: jest.Mocked<ExecutionsService>;
  let nodeHandlerRegistry: jest.Mocked<NodeHandlerRegistryService>;
  let executionGateway: jest.Mocked<ExecutionGateway>;

  const mockUserId = new Types.ObjectId().toString();
  const mockWorkflowId = new Types.ObjectId().toString();
  const mockExecutionId = new Types.ObjectId().toString();

  const createMockHandler = (output: any = {}, success = true) => ({
    execute: jest.fn().mockResolvedValue({ success, output, error: success ? undefined : 'Mock error' }),
  });

  beforeEach(async () => {
    const mockExecutionsService = {
      create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(mockExecutionId) }),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      addLog: jest.fn().mockResolvedValue(undefined),
      setError: jest.fn().mockResolvedValue(undefined),
    };

    const mockWorkflowsService = {
      findOne: jest.fn(),
    };

    const mockNodeHandlerRegistry = {
      getHandler: jest.fn(),
    };

    const mockSchedulesService = {
      updateLastRun: jest.fn().mockResolvedValue(undefined),
    };

    const mockExecutionGateway = {
      emitExecutionStarted: jest.fn(),
      emitExecutionProgress: jest.fn(),
      emitNodeCompleted: jest.fn(),
      emitExecutionCompleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowExecutorService,
        { provide: WorkflowsService, useValue: mockWorkflowsService },
        { provide: ExecutionsService, useValue: mockExecutionsService },
        { provide: NodeHandlerRegistryService, useValue: mockNodeHandlerRegistry },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: ExecutionGateway, useValue: mockExecutionGateway },
      ],
    }).compile();

    service = module.get<WorkflowExecutorService>(WorkflowExecutorService);
    workflowsService = module.get(WorkflowsService);
    executionsService = module.get(ExecutionsService);
    nodeHandlerRegistry = module.get(NodeHandlerRegistryService);
    executionGateway = module.get(ExecutionGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeWorkflow', () => {
    it('should execute simple workflow with 2 nodes', async () => {
      const workflow = {
        _id: mockWorkflowId,
        nodes: [
          {
            id: 'node-trigger',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { type: 'trigger', label: 'Trigger', config: {} },
          },
          {
            id: 'node-action',
            type: 'action',
            position: { x: 100, y: 0 },
            data: { type: 'http', label: 'HTTP Request', config: { url: 'https://api.example.com' } },
          },
        ],
        edges: [{ id: 'edge-1', source: 'node-trigger', target: 'node-action' }],
      };

      workflowsService.findOne.mockResolvedValue(workflow as any);
      const httpHandler = createMockHandler({ data: 'response' });
      nodeHandlerRegistry.getHandler.mockReturnValue(httpHandler);

      const executionId = await service.executeWorkflow(mockWorkflowId, mockUserId, {});

      expect(executionId).toBe(mockExecutionId);
      expect(executionsService.create).toHaveBeenCalledWith(mockWorkflowId, mockUserId, {}, 'manual');
      expect(httpHandler.execute).toHaveBeenCalled();
      expect(executionsService.updateStatus).toHaveBeenCalledWith(mockExecutionId, 'success');
    });

    it('should handle node execution failure', async () => {
      const workflow = {
        _id: mockWorkflowId,
        nodes: [
          {
            id: 'node-trigger',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { type: 'trigger', label: 'Trigger', config: {} },
          },
          {
            id: 'node-fail',
            type: 'action',
            position: { x: 100, y: 0 },
            data: { type: 'http', label: 'Failing Node', config: {} },
          },
        ],
        edges: [{ id: 'edge-1', source: 'node-trigger', target: 'node-fail' }],
      };

      workflowsService.findOne.mockResolvedValue(workflow as any);
      const failingHandler = createMockHandler({}, false);
      nodeHandlerRegistry.getHandler.mockReturnValue(failingHandler);

      await expect(service.executeWorkflow(mockWorkflowId, mockUserId, {})).rejects.toThrow();

      expect(executionsService.updateStatus).toHaveBeenCalledWith(mockExecutionId, 'failed');
      expect(executionGateway.emitExecutionCompleted).toHaveBeenCalledWith(
        mockExecutionId,
        'failed',
        mockUserId,
        mockWorkflowId,
      );
    });

    it('should handle continueOnError flag', async () => {
      const workflow = {
        _id: mockWorkflowId,
        nodes: [
          {
            id: 'node-trigger',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { type: 'trigger', label: 'Trigger', config: {} },
          },
          {
            id: 'node-fail',
            type: 'action',
            position: { x: 100, y: 0 },
            data: { type: 'http', label: 'Failing Node', config: { continueOnError: true } },
          },
          {
            id: 'node-after',
            type: 'action',
            position: { x: 200, y: 0 },
            data: { type: 'delay', label: 'After Node', config: { duration: 100 } },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'node-trigger', target: 'node-fail' },
          { id: 'edge-2', source: 'node-fail', target: 'node-after' },
        ],
      };

      workflowsService.findOne.mockResolvedValue(workflow as any);

      const failingHandler = createMockHandler({}, false);
      const successHandler = createMockHandler({ delayed: true });

      nodeHandlerRegistry.getHandler.mockImplementation((type: string) => {
        if (type === 'http') return failingHandler;
        return successHandler;
      });

      const executionId = await service.executeWorkflow(mockWorkflowId, mockUserId, {});

      expect(executionId).toBe(mockExecutionId);
      expect(failingHandler.execute).toHaveBeenCalled();
      expect(successHandler.execute).toHaveBeenCalled();
      expect(executionsService.updateStatus).toHaveBeenCalledWith(mockExecutionId, 'success');
    });

    it('should execute nodes in topological order', async () => {
      const executionOrder: string[] = [];

      const workflow = {
        _id: mockWorkflowId,
        nodes: [
          {
            id: 'node-A',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { type: 'trigger', label: 'A', config: {} },
          },
          {
            id: 'node-B',
            type: 'action',
            position: { x: 100, y: 0 },
            data: { type: 'http', label: 'B', config: {} },
          },
          {
            id: 'node-C',
            type: 'action',
            position: { x: 200, y: 0 },
            data: { type: 'delay', label: 'C', config: { duration: 100 } },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'node-A', target: 'node-B' },
          { id: 'edge-2', source: 'node-B', target: 'node-C' },
        ],
      };

      workflowsService.findOne.mockResolvedValue(workflow as any);

      const trackingHandler = {
        execute: jest.fn().mockImplementation((nodeData) => {
          executionOrder.push(nodeData.label);
          return Promise.resolve({ success: true, output: {} });
        }),
      };

      nodeHandlerRegistry.getHandler.mockReturnValue(trackingHandler);

      await service.executeWorkflow(mockWorkflowId, mockUserId, {});

      expect(executionOrder).toEqual(['B', 'C']);
    });

    it('should pass userId to execution context', async () => {
      const workflow = {
        _id: mockWorkflowId,
        nodes: [
          {
            id: 'node-trigger',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { type: 'trigger', label: 'Trigger', config: {} },
          },
          {
            id: 'node-action',
            type: 'action',
            position: { x: 100, y: 0 },
            data: { type: 'http', label: 'Action', config: {} },
          },
        ],
        edges: [{ id: 'edge-1', source: 'node-trigger', target: 'node-action' }],
      };

      workflowsService.findOne.mockResolvedValue(workflow as any);

      let capturedContext: any;
      const contextCapturingHandler = {
        execute: jest.fn().mockImplementation((nodeData, context) => {
          capturedContext = context;
          return Promise.resolve({ success: true, output: {} });
        }),
      };

      nodeHandlerRegistry.getHandler.mockReturnValue(contextCapturingHandler);

      await service.executeWorkflow(mockWorkflowId, mockUserId, {});

      expect(capturedContext.userId).toBe(mockUserId);
    });

    it('should emit WebSocket events during execution', async () => {
      const workflow = {
        _id: mockWorkflowId,
        nodes: [
          {
            id: 'node-trigger',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { type: 'trigger', label: 'Trigger', config: {} },
          },
          {
            id: 'node-action',
            type: 'action',
            position: { x: 100, y: 0 },
            data: { type: 'http', label: 'Action', config: {} },
          },
        ],
        edges: [{ id: 'edge-1', source: 'node-trigger', target: 'node-action' }],
      };

      workflowsService.findOne.mockResolvedValue(workflow as any);
      nodeHandlerRegistry.getHandler.mockReturnValue(createMockHandler({}));

      await service.executeWorkflow(mockWorkflowId, mockUserId, {});

      expect(executionGateway.emitExecutionStarted).toHaveBeenCalledWith(
        mockExecutionId,
        mockWorkflowId,
        mockUserId,
      );
      expect(executionGateway.emitNodeCompleted).toHaveBeenCalled();
      expect(executionGateway.emitExecutionCompleted).toHaveBeenCalledWith(
        mockExecutionId,
        'success',
        mockUserId,
        mockWorkflowId,
      );
    });

    it('should handle conditional branching', async () => {
      const executedNodes: string[] = [];

      const workflow = {
        _id: mockWorkflowId,
        nodes: [
          {
            id: 'node-trigger',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { type: 'trigger', label: 'Trigger', config: {} },
          },
          {
            id: 'node-condition',
            type: 'action',
            position: { x: 100, y: 0 },
            data: { type: 'condition', label: 'Condition', config: { expression: '5 > 3' } },
          },
          {
            id: 'node-true-branch',
            type: 'action',
            position: { x: 200, y: -50 },
            data: { type: 'http', label: 'True Branch', config: {} },
          },
          {
            id: 'node-false-branch',
            type: 'action',
            position: { x: 200, y: 50 },
            data: { type: 'http', label: 'False Branch', config: {} },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'node-trigger', target: 'node-condition' },
          { id: 'edge-2', source: 'node-condition', target: 'node-true-branch', sourceHandle: 'true' },
          { id: 'edge-3', source: 'node-condition', target: 'node-false-branch', sourceHandle: 'false' },
        ],
      };

      workflowsService.findOne.mockResolvedValue(workflow as any);

      nodeHandlerRegistry.getHandler.mockImplementation((type: string) => {
        if (type === 'condition') {
          return {
            execute: jest.fn().mockImplementation((nodeData) => {
              executedNodes.push('Condition');
              return Promise.resolve({ success: true, output: { branch: 'true' } });
            }),
          };
        }
        return {
          execute: jest.fn().mockImplementation((nodeData) => {
            executedNodes.push(nodeData.label);
            return Promise.resolve({ success: true, output: {} });
          }),
        };
      });

      await service.executeWorkflow(mockWorkflowId, mockUserId, {});

      expect(executedNodes).toContain('Condition');
      expect(executedNodes).toContain('True Branch');
      expect(executedNodes).not.toContain('False Branch');
    });

    it('should execute loop iterations', async () => {
      const loopIterations: any[] = [];

      const workflow = {
        _id: mockWorkflowId,
        nodes: [
          {
            id: 'node-trigger',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { type: 'trigger', label: 'Trigger', config: {} },
          },
          {
            id: 'node-loop',
            type: 'action',
            position: { x: 100, y: 0 },
            data: { type: 'loop', label: 'Loop', config: { arraySource: 'items' } },
          },
          {
            id: 'node-body',
            type: 'action',
            position: { x: 200, y: 0 },
            data: { type: 'http', label: 'Loop Body', config: {} },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'node-trigger', target: 'node-loop' },
          { id: 'edge-2', source: 'node-loop', target: 'node-body' },
        ],
      };

      workflowsService.findOne.mockResolvedValue(workflow as any);

      const loopHandler = {
        execute: jest.fn().mockImplementation((nodeData, context) => {
          context.variables = context.variables || {};
          context.variables.items = [1, 2, 3];

          const loopState = {
            items: [1, 2, 3],
            currentIndex: 0,
            currentItem: null,
            loopVariable: 'item',
            arraySource: 'items',
          };
          context.loop = loopState;
          context._loopStack = [loopState];

          return Promise.resolve({
            success: true,
            output: { itemCount: 3, loopInitiated: true },
          });
        }),
      };

      const bodyHandler = {
        execute: jest.fn().mockImplementation((nodeData, context) => {
          loopIterations.push({
            item: context.loop?.currentItem,
            index: context.loop?.currentIndex,
          });
          return Promise.resolve({ success: true, output: {} });
        }),
      };

      nodeHandlerRegistry.getHandler.mockImplementation((type: string) => {
        if (type === 'loop') return loopHandler;
        return bodyHandler;
      });

      await service.executeWorkflow(mockWorkflowId, mockUserId, {});

      expect(loopHandler.execute).toHaveBeenCalled();
      expect(bodyHandler.execute).toHaveBeenCalledTimes(3);
    });
  });
});
