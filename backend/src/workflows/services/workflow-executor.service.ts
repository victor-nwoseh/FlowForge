import { Injectable, Logger } from '@nestjs/common';

import { WorkflowsService } from '../workflows.service';
import { ExecutionsService } from '../../executions/executions.service';
import { NodeHandlerRegistryService } from './node-handler-registry.service';
import {
  ExecutionContext,
  NodeExecutionLog,
} from '../../executions/interfaces/execution.interface';
import { topologicalSort } from '../utils/topological-sort.util';
import { replaceVariablesInObject } from '../utils/variable-replacement.util';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionsService: ExecutionsService,
    private readonly nodeHandlerRegistry: NodeHandlerRegistryService,
  ) {}

  async executeWorkflow(
    workflowId: string,
    userId: string,
    triggerData: any = {},
  ): Promise<string> {
    const execution = await this.executionsService.create(
      workflowId,
      userId,
      triggerData,
    );

    this.logger.log(`Workflow execution created: ${execution._id}`);

    void this.runExecution(
      execution._id.toString(),
      workflowId,
      userId,
      triggerData,
    );

    return execution._id.toString();
  }

  private async runExecution(
    executionId: string,
    workflowId: string,
    userId: string,
    triggerData: any,
  ): Promise<void> {
    let currentNodeId: string | null = null;
    let currentNodeType: string | null = null;
    let context: ExecutionContext | null = null;

    try {
      await this.executionsService.updateStatus(executionId, 'running');
      this.logger.log(
        `Starting workflow execution ${executionId} for workflow ${workflowId}`,
      );
      this.logger.log(
        `Loading workflow ${workflowId} for execution ${executionId}`,
      );

      const workflow = await this.workflowsService.findOne(workflowId, userId);
      this.logger.log(
        `Workflow ${workflowId} loaded successfully for execution ${executionId}`,
      );

      if (!workflow?.nodes?.length) {
        throw new Error('Workflow has no nodes to execute');
      }

      this.logger.log(
        `Workflow ${workflowId} has ${workflow.nodes.length} nodes for execution ${executionId}`,
      );

      const sortedNodeIds = topologicalSort(
        workflow.nodes,
        workflow.edges ?? [],
      );

      if (sortedNodeIds.length === 0) {
        throw new Error('No executable nodes found in workflow');
      }

      this.logger.log(
        `Node execution order determined for execution ${executionId}: ${sortedNodeIds.join(', ')}`,
      );

      context = {
        variables: {},
        trigger: triggerData,
      };

      context._workflowId = workflowId;
      context._userId = userId;
      context._executionId = executionId;

      for (const nodeId of sortedNodeIds) {
        currentNodeId = nodeId;
        const node = workflow.nodes.find((n) => n.id === nodeId);

        if (!node) {
          throw new Error(`Node ${nodeId} not found in workflow definition`);
        }

        const nodeType = node?.data?.type;
        currentNodeType = nodeType ?? null;

        if (!nodeType) {
          throw new Error(`Node type missing for node ${nodeId}`);
        }

        const handler = this.nodeHandlerRegistry.getHandler(nodeType);

        if (!handler) {
          throw new Error(`Unsupported node type: ${nodeType}. Handler not registered`);
        }

        const processedConfig = replaceVariablesInObject(
          node.data?.config ?? {},
          context,
        );

        const processedNodeData = {
          ...node.data,
          config: processedConfig,
        };

        this.logger.log(
          `Executing node ${nodeId} (type: ${nodeType}) for execution ${executionId}`,
        );

        const startTime = new Date();
        const result = await handler.execute(processedNodeData, context);
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        const log: NodeExecutionLog = {
          nodeId,
          nodeType,
          status: result.success ? 'success' : 'failed',
          input: processedNodeData,
          output: result.output,
          error: result.error,
          startTime,
          endTime,
          duration,
        };

        try {
          await this.executionsService.addLog(executionId, log);
        } catch (logError) {
          this.logger.error(
            `Failed to add execution log for node ${nodeId}: ${(logError as Error).message}`,
          );
        }

        if (!result.success) {
          throw new Error(
            result.error
              ? `Node ${nodeId} failed: ${result.error}`
              : `Node ${nodeId} failed due to unknown error`,
          );
        }

        context[nodeId] = result.output;
        this.logger.log(
          `Node ${nodeId} (type: ${nodeType}) completed for execution ${executionId} in ${duration}ms`,
        );
      }

      await this.executionsService.updateStatus(executionId, 'success');
      this.logger.log(
        `Workflow execution ${executionId} for workflow ${workflowId} completed successfully`,
      );
    } catch (error: any) {
      const contextDetails =
        context && currentNodeId ? context[currentNodeId] : context;
      const failureMessage = currentNodeId
        ? `Workflow execution ${executionId} failed at node ${currentNodeId} (${currentNodeType ?? 'unknown'}): ${error.message}`
        : `Workflow execution ${executionId} failed before node execution: ${error.message}`;

      const failureContext = {
        executionId,
        workflowId,
        nodeId: currentNodeId,
        nodeType: currentNodeType,
        context: contextDetails,
      };

      this.logger.error(
        failureMessage,
        error.stack,
      );
      this.logger.debug(
        `Execution failure context for ${executionId}: ${JSON.stringify(failureContext)}`,
      );
      await this.executionsService.updateStatus(executionId, 'failed');
      await this.executionsService.setError(
        executionId,
        `${failureMessage} | Context: ${JSON.stringify(contextDetails ?? {})}`,
      );
    }
  }
}


