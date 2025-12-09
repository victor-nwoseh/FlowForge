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

const SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'key',
  'pass',
  'authorization',
  'auth',
  'credential',
];

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
    attemptNumber = 1,
    jobId?: string,
  ): Promise<string> {
    const execution = await this.executionsService.create(
      workflowId,
      userId,
      triggerData,
    );

    this.logger.log(`Workflow execution created: ${execution._id}`);

    await this.runExecution(
      execution._id.toString(),
      workflowId,
      userId,
      triggerData,
      attemptNumber,
      jobId,
    );

    return execution._id.toString();
  }

  private async runExecution(
    executionId: string,
    workflowId: string,
    userId: string,
    triggerData: any,
    attemptNumber: number,
    jobId?: string,
  ): Promise<void> {
    let currentNodeId: string | null = null;
    let currentNodeType: string | null = null;
    let context: ExecutionContext | null = null;
    const successfulNodes: string[] = [];

    try {
      await this.executionsService.updateStatus(executionId, 'running');
      this.logger.log(
        `Starting workflow execution ${executionId} for workflow ${workflowId} (attempt ${attemptNumber}${jobId ? `, job ${jobId}` : ''})`,
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
        userId,
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

        const continueOnError = !!processedConfig.continueOnError;

        this.logger.log(
          `Node execution attempt ${attemptNumber}: ${nodeId} (type: ${nodeType}) for execution ${executionId}`,
        );

        const startTime = new Date();
        const result = await handler.execute(processedNodeData, context);
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        if (!result.success) {
          const failureError = new Error(
            result.error
              ? `Node ${nodeId} failed: ${result.error}`
              : `Node ${nodeId} failed due to unknown error`,
          );

          const nodeFailureDetails = {
            nodeId,
            nodeType,
            label: node.data?.label ?? nodeId,
            config: sanitizeDataStructure(processedConfig),
            input: sanitizeDataStructure(processedNodeData),
            errorMessage: failureError.message,
            stack: failureError.stack,
            executionContext: sanitizeDataStructure(context),
            attemptNumber,
          };

          this.logger.error(
            `Execution ${executionId} node ${nodeId} failed`,
            failureError.stack,
          );
          this.logger.debug(
            `Node failure details for execution ${executionId}: ${JSON.stringify(
              nodeFailureDetails,
            )}`,
          );

          if (continueOnError || result.continueOnError) {
            this.logger.warn(
              `Node ${nodeId} failed but continueOnError is enabled. Continuing workflow execution.`,
            );
            context[nodeId] = {
              error: true,
              message: failureError.message,
            };

            this.logger.log(
              `Node ${nodeId} marked as failed but workflow will continue.`,
            );

            try {
              await this.executionsService.addLog(executionId, {
                nodeId,
                nodeType,
                status: 'failed',
                input: processedNodeData,
                output: context[nodeId],
                error: failureError.message,
                startTime,
                endTime,
                duration,
                attemptNumber,
              });
            } catch (logError) {
              this.logger.error(
                `Failed to add execution log for node ${nodeId}: ${(logError as Error).message}`,
              );
            }

            continue;
          }

          throw failureError;
        }

        context[nodeId] = result.output;
        successfulNodes.push(nodeId);

        const log: NodeExecutionLog = {
          nodeId,
          nodeType,
          status: 'success',
          input: processedNodeData,
          output: result.output,
          startTime,
          endTime,
          duration,
          attemptNumber,
        };

        try {
          await this.executionsService.addLog(executionId, log);
        } catch (logError) {
          this.logger.error(
            `Failed to add execution log for node ${nodeId}: ${(logError as Error).message}`,
          );
        }

        this.logger.log(
          `Node ${nodeId} (type: ${nodeType}) completed for execution ${executionId} in ${duration}ms`,
        );
      }

      await this.executionsService.updateStatus(executionId, 'success');
      this.logger.log(
        `Workflow execution ${executionId} for workflow ${workflowId} completed successfully`,
      );
    } catch (error: any) {
      const sanitizedContext = sanitizeDataStructure(context);
      const failureMessage = currentNodeId
        ? `Workflow execution ${executionId} failed at node ${currentNodeId} (${currentNodeType ?? 'unknown'}): ${error.message}`
        : `Workflow execution ${executionId} failed before node execution: ${error.message}`;

      const failureDetails = {
        executionId,
        workflowId,
        failedNodeId: currentNodeId,
        failedNodeType: currentNodeType,
        completedNodes: successfulNodes,
        context: sanitizedContext,
        triggerData: sanitizeDataStructure(triggerData),
        errorMessage: error.message,
        stack: error.stack,
        attemptNumber,
        jobId,
      };

      this.logger.error(
        `Workflow failed at node: ${currentNodeId ?? 'unknown'} | Execution ${executionId} (attempt ${attemptNumber}${jobId ? `, job ${jobId}` : ''})`,
        error.stack,
      );
      if (successfulNodes.length > 0) {
        this.logger.warn(
          `Nodes completed before failure for execution ${executionId}: ${successfulNodes.join(
            ', ',
          )}`,
        );
      } else {
        this.logger.warn(
          `No nodes completed before failure for execution ${executionId}`,
        );
      }
      this.logger.debug(
        `Execution failure details for ${executionId}: ${JSON.stringify(failureDetails)}`,
      );
      await this.executionsService.updateStatus(executionId, 'failed');
      await this.executionsService.setError(
        executionId,
        JSON.stringify(failureDetails),
      );

      throw error;
    }
  }
}

function sanitizeDataStructure(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDataStructure(item));
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, any>>((acc, [key, val]) => {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        acc[key] = '***redacted***';
        return acc;
      }
      acc[key] = sanitizeDataStructure(val);
      return acc;
    }, {});
  }

  return value;
}


