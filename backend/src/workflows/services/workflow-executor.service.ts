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
    try {
      await this.executionsService.updateStatus(executionId, 'running');
      this.logger.log(`Starting workflow execution: ${executionId}`);

      const workflow = await this.workflowsService.findOne(workflowId, userId);

      if (!workflow?.nodes?.length) {
        throw new Error('Workflow has no nodes to execute');
      }

      this.logger.log(`Loaded workflow with ${workflow.nodes.length} nodes`);

      const sortedNodeIds = topologicalSort(workflow.nodes, workflow.edges ?? []);
      this.logger.log(`Sorted nodes: ${sortedNodeIds.join(', ')}`);

      const context: ExecutionContext = {
        variables: {},
        trigger: triggerData,
      };

      for (const nodeId of sortedNodeIds) {
        const node = workflow.nodes.find((n) => n.id === nodeId);

        if (!node) {
          this.logger.warn(`Node not found in workflow definition: ${nodeId}`);
          continue;
        }

        const nodeType = node?.data?.type;

        if (!nodeType) {
          this.logger.warn(`Node type missing for node: ${nodeId}`);
          continue;
        }

        const handler = this.nodeHandlerRegistry.getHandler(nodeType);

        if (!handler) {
          this.logger.warn(`No handler found for node type: ${nodeType}`);
          continue;
        }

        const processedConfig = replaceVariablesInObject(
          node.data?.config ?? {},
          context,
        );

        const processedNodeData = {
          ...node.data,
          config: processedConfig,
        };

        this.logger.log(`Executing node: ${nodeId} (type: ${nodeType})`);

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
          throw new Error(result.error || 'Node execution failed');
        }

        context[nodeId] = result.output;
        this.logger.log(`Node execution completed: ${nodeId}`);
      }

      await this.executionsService.updateStatus(executionId, 'success');
      this.logger.log(`Workflow execution completed successfully: ${executionId}`);
    } catch (error: any) {
      this.logger.error(
        `Workflow execution failed (${executionId}): ${error.message}`,
      );
      await this.executionsService.updateStatus(executionId, 'failed');
      await this.executionsService.setError(executionId, error.message);
    }
  }
}


