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
import { SchedulesService } from '../../schedules/schedules.service';
import { ExecutionGateway } from '../../executions/gateways/execution.gateway';

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
    private readonly schedulesService: SchedulesService,
    private readonly executionGateway: ExecutionGateway,
  ) {}

  async executeWorkflow(
    workflowId: string,
    userId: string,
    triggerData: any = {},
    attemptNumber = 1,
    jobId?: string,
    triggerSource: 'manual' | 'webhook' | 'scheduled' = 'manual',
  ): Promise<string> {
    const execution = await this.executionsService.create(
      workflowId,
      userId,
      triggerData,
      triggerSource,
    );

    this.executionGateway.emitExecutionStarted(
      execution._id.toString(),
      workflowId,
      userId,
    );

    this.logger.log(`Workflow execution created: ${execution._id}`);

    await this.runExecution(
      execution._id.toString(),
      workflowId,
      userId,
      triggerData,
      attemptNumber,
      jobId,
      triggerSource,
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
    triggerSource: 'manual' | 'webhook' | 'scheduled' = 'manual',
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

      const branchSelections = new Map<string, 'true' | 'false'>();

      const edgeFilter = (edge: any) => {
        if (!edge?.source || !edge?.target) {
          return false;
        }

        const selectedBranch = branchSelections.get(edge.source);
        if (selectedBranch) {
          return edge.sourceHandle === selectedBranch;
        }

        return true;
      };

      const getFilteredEdges = () => (workflow.edges ?? []).filter(edgeFilter);

      const computeReachable = (): Set<string> => {
        const filteredEdges = getFilteredEdges();
        const reachableSet = new Set<string>();

      const triggerNodeIds = (workflow.nodes ?? [])
        .filter((n) => n?.data?.type === 'trigger')
        .map((n) => n.id);

        // Build adjacency from filtered edges (respecting branch selection)
        const adjacency = new Map<string, string[]>();
        for (const edge of filteredEdges) {
          if (edge?.source && edge?.target) {
            const arr = adjacency.get(edge.source) ?? [];
            arr.push(edge.target);
            adjacency.set(edge.source, arr);
          }
        }

        // Determine start nodes from the original (unfiltered) graph to avoid
        // promoting disconnected branch targets when a branch is filtered out.
        const incomingAll = new Set<string>();
        for (const edge of workflow.edges ?? []) {
          if (edge?.target) {
            incomingAll.add(edge.target);
          }
        }

        let startNodes: string[] = [];
        if (triggerNodeIds.length > 0) {
          startNodes = triggerNodeIds;
        } else {
          startNodes = (workflow.nodes ?? [])
            .map((n) => n.id)
            .filter((id) => !incomingAll.has(id));
          if (startNodes.length === 0) {
            startNodes = (workflow.nodes ?? []).map((n) => n.id);
          }
        }

        const stack = [...startNodes];
        while (stack.length) {
          const current = stack.pop() as string;
          if (reachableSet.has(current)) continue;
          reachableSet.add(current);
          const next = adjacency.get(current) ?? [];
          for (const tgt of next) {
            if (!reachableSet.has(tgt)) stack.push(tgt);
          }
        }

        return reachableSet;
      };

      const computeLoopTraversal = (
        loopNodeId: string,
      ): { order: string[]; reachable: Set<string> } => {
        const filteredEdges = getFilteredEdges();
        const reachableSet = new Set<string>();

        const adjacency = new Map<string, string[]>();
        for (const edge of filteredEdges) {
          if (edge?.source && edge?.target) {
            const arr = adjacency.get(edge.source) ?? [];
            arr.push(edge.target);
            adjacency.set(edge.source, arr);
          }
        }

        const stack = [loopNodeId];
        while (stack.length) {
          const current = stack.pop() as string;
          if (reachableSet.has(current)) continue;
          reachableSet.add(current);
          const next = adjacency.get(current) ?? [];
          for (const tgt of next) {
            if (!reachableSet.has(tgt)) stack.push(tgt);
          }
        }

        reachableSet.delete(loopNodeId);

        const bodyNodes = (workflow.nodes ?? []).filter((n) =>
          reachableSet.has(n.id),
        );
        const bodyEdges = filteredEdges.filter(
          (e) => reachableSet.has(e.source) && reachableSet.has(e.target),
        );

        const order = bodyNodes.length
          ? topologicalSort(bodyNodes, bodyEdges)
          : [];

        return { order, reachable: reachableSet };
      };

      let sortedNodeIds = topologicalSort(
        workflow.nodes,
        workflow.edges ?? [],
        edgeFilter,
      );

      let reachable = computeReachable();
      const totalNodes = sortedNodeIds.length;
      let completedNodesCount = 0;

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

      const processedNodes = new Set<string>();

      let index = 0;
      while (index < sortedNodeIds.length) {
        const nodeId = sortedNodeIds[index];
        index += 1;

        if (processedNodes.has(nodeId)) {
          continue;
        }

        currentNodeId = nodeId;

        if (!reachable.has(nodeId)) {
          this.logger.debug(`Skipping unreachable node ${nodeId} for execution ${executionId}`);
          continue;
        }

        const node = workflow.nodes.find((n) => n.id === nodeId);

        if (!node) {
          throw new Error(`Node ${nodeId} not found in workflow definition`);
        }

        const nodeType = node?.data?.type;
        currentNodeType = nodeType ?? null;

        if (!nodeType) {
          throw new Error(`Node type missing for node ${nodeId}`);
        }

        // Skip trigger nodes — they are entry points only
        if (nodeType === 'trigger') {
          successfulNodes.push(nodeId);
          context[nodeId] = { trigger: true };
          continue;
        }

        const hasIncomingEdge = (workflow.edges ?? []).some(
          (e) => e?.target === nodeId,
        );

        if (nodeType === 'loop' && !hasIncomingEdge) {
          this.logger.warn(
            `Skipping loop node ${nodeId} because it has no incoming edges (unreachable).`,
          );
          const skipLog: NodeExecutionLog = {
            nodeId,
            nodeType,
            status: 'skipped',
            input: node.data,
            output: {
              skipped: true,
              reason: 'Loop node has no incoming edges',
            },
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
            attemptNumber,
          };
          try {
            await this.executionsService.addLog(executionId, skipLog);
          } catch (logError) {
            this.logger.error(
              `Failed to add execution log for skipped loop node ${nodeId}: ${(logError as Error).message}`,
            );
          }
          processedNodes.add(nodeId);
          continue;
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

        const loopContextPresent =
          (context as any).loop || ((context as any)._loopStack ?? []).length > 0;
        const needsLoopContext = usesLoopVariables(processedNodeData);

        if (needsLoopContext && !loopContextPresent) {
          this.logger.warn(
            `Node ${nodeId} references loop variables but no loop context is available. Skipping node.`,
          );
          const skipLog: NodeExecutionLog = {
            nodeId,
            nodeType,
            status: 'skipped',
            input: processedNodeData,
            output: {
              skipped: true,
              reason: 'Missing loop context for loop.* variables',
            },
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
            attemptNumber,
          };
          try {
            await this.executionsService.addLog(executionId, skipLog);
          } catch (logError) {
            this.logger.error(
              `Failed to add execution log for skipped node ${nodeId}: ${(logError as Error).message}`,
            );
          }
          processedNodes.add(nodeId);
          continue;
        }

        const continueOnError = !!processedConfig.continueOnError;

        this.logger.log(
          `Node execution attempt ${attemptNumber}: ${nodeId} (type: ${nodeType}) for execution ${executionId}`,
        );

        let branchTaken: 'true' | 'false' | undefined;
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

            processedNodes.add(nodeId);

            continue;
          }

          this.executionGateway.emitNodeCompleted(
            executionId,
            nodeId,
            nodeType,
            'failed',
            userId,
          );
          throw failureError;
        }

        if (nodeType === 'condition') {
          branchTaken = result.output?.branch as 'true' | 'false' | undefined;
          if (branchTaken) {
            this.logger.log(
              `Branch taken: ${branchTaken} for node ${nodeId}`,
            );
            branchSelections.set(nodeId, branchTaken);

            const branchEdges =
              workflow.edges?.filter(
                (edge) =>
                  edge?.source === nodeId &&
                  edge.sourceHandle === branchTaken,
              ) ?? [];

            if (branchEdges.length === 0) {
              this.logger.warn(
                `Condition node ${nodeId} has no outgoing edges on branch ${branchTaken}`,
              );
            }

            reachable = computeReachable();
            sortedNodeIds = topologicalSort(
              workflow.nodes,
              workflow.edges ?? [],
              edgeFilter,
            );
            index = 0;
          } else {
            this.logger.warn(
              `Condition node ${nodeId} did not produce a branch value; downstream routing may be skipped`,
            );
          }
        }

        if (nodeType === 'loop') {
          const loopState: any = (context as any).loop;

          if (!loopState || !Array.isArray(loopState.items)) {
            this.logger.warn(
              `Loop node ${nodeId} did not initialize loop items; skipping loop body`,
            );
          } else if (loopState.items.length > 0) {
            const executedBodyNodes = new Set<string>();
            const loopItems = loopState.items as any[];

            for (let i = 0; i < loopItems.length; i += 1) {
              loopState.currentIndex = i;
              loopState.currentItem = loopItems[i];
              context.variables[loopState.loopVariable] = loopItems[i];
              context.variables.loopIndex = i;
              context.variables.loopCount = loopItems.length;
              (context as any).loop = loopState;

              const executedThisIteration = new Set<string>();
              let { order } = computeLoopTraversal(nodeId);
              let bodyIndex = 0;

              while (bodyIndex < order.length) {
                const childNodeId = order[bodyIndex];
                bodyIndex += 1;

                if (executedThisIteration.has(childNodeId)) {
                  continue;
                }

                const childNode = workflow.nodes.find((n) => n.id === childNodeId);
                if (!childNode) {
                  throw new Error(`Loop body node ${childNodeId} not found`);
                }

                const childNodeType = childNode?.data?.type;
                if (!childNodeType) {
                  throw new Error(`Node type missing for node ${childNodeId}`);
                }

                const childHandler = this.nodeHandlerRegistry.getHandler(childNodeType);
                if (!childHandler) {
                  throw new Error(
                    `Unsupported node type: ${childNodeType}. Handler not registered`,
                  );
                }

                const childProcessedConfig = replaceVariablesInObject(
                  childNode.data?.config ?? {},
                  context,
                );

                const childNodeData = {
                  ...childNode.data,
                  config: childProcessedConfig,
                };

                const childContinueOnError = !!childProcessedConfig.continueOnError;

                const childStart = new Date();
                let childBranch: 'true' | 'false' | undefined;
                const childResult = await childHandler.execute(
                  childNodeData,
                  context,
                );
                const childEnd = new Date();
                const childDuration = childEnd.getTime() - childStart.getTime();

                if (!childResult.success) {
                  const failureError = new Error(
                    childResult.error
                      ? `Node ${childNodeId} failed: ${childResult.error}`
                      : `Node ${childNodeId} failed due to unknown error`,
                  );

                  if (childContinueOnError || childResult.continueOnError) {
                    this.logger.warn(
                      `Node ${childNodeId} failed inside loop but continueOnError is enabled. Continuing iteration.`,
                    );
                    context[childNodeId] = {
                      error: true,
                      message: failureError.message,
                    };
                    try {
                      await this.executionsService.addLog(executionId, {
                        nodeId: childNodeId,
                        nodeType: childNodeType,
                        status: 'failed',
                        input: childNodeData,
                        output: context[childNodeId],
                        error: failureError.message,
                        startTime: childStart,
                        endTime: childEnd,
                        duration: childDuration,
                        attemptNumber,
                      });
                    } catch (logError) {
                      this.logger.error(
                        `Failed to add execution log for node ${childNodeId}: ${(logError as Error).message}`,
                      );
                    }
                    executedThisIteration.add(childNodeId);
                    executedBodyNodes.add(childNodeId);
            continue;
          }

          throw failureError;
                }

                if (childNodeType === 'condition') {
                  childBranch = childResult.output?.branch as 'true' | 'false' | undefined;
                  if (childBranch) {
                    this.logger.log(
                      `Branch taken: ${childBranch} for node ${childNodeId} (loop iteration ${i + 1})`,
                    );
                    branchSelections.set(childNodeId, childBranch);
                    const traversal = computeLoopTraversal(nodeId);
                    order = traversal.order.filter(
                      (id) => !executedThisIteration.has(id),
                    );
                    bodyIndex = 0;
                  } else {
                    this.logger.warn(
                      `Condition node ${childNodeId} in loop did not produce a branch value`,
                    );
                  }
                }

                context[childNodeId] = childResult.output;
                executedThisIteration.add(childNodeId);
                executedBodyNodes.add(childNodeId);
                successfulNodes.push(childNodeId);

                const childLog: NodeExecutionLog = {
                  nodeId: childNodeId,
                  nodeType: childNodeType,
                  status: 'success',
                  input: childNodeData,
                  output: childResult.output,
                  branchTaken: childNodeType === 'condition' ? childBranch : undefined,
                  startTime: childStart,
                  endTime: childEnd,
                  duration: childDuration,
                  attemptNumber,
                };

                try {
                  await this.executionsService.addLog(executionId, childLog);
                } catch (logError) {
                  this.logger.error(
                    `Failed to add execution log for node ${childNodeId}: ${(logError as Error).message}`,
                  );
                }
              }

              this.logger.log(
                `Loop node ${nodeId} iteration ${i + 1}/${loopItems.length} completed`,
              );
            }

            if ((context as any)._loopStack) {
              (context as any)._loopStack.pop();
              const remaining = (context as any)._loopStack;
              (context as any).loop = remaining.length ? remaining[remaining.length - 1] : undefined;
            } else {
              (context as any).loop = undefined;
            }

            executedBodyNodes.forEach((id) => processedNodes.add(id));
            reachable = computeReachable();
            sortedNodeIds = topologicalSort(
              workflow.nodes,
              workflow.edges ?? [],
              edgeFilter,
            );
            index = 0;
          } else {
            if ((context as any)._loopStack) {
              (context as any)._loopStack.pop();
              const remaining = (context as any)._loopStack;
              (context as any).loop = remaining.length ? remaining[remaining.length - 1] : undefined;
            } else {
              (context as any).loop = undefined;
            }
          }
        }

        context[nodeId] = result.output;
        processedNodes.add(nodeId);
        successfulNodes.push(nodeId);

        const log: NodeExecutionLog = {
          nodeId,
          nodeType,
          status: 'success',
          input: processedNodeData,
          output: result.output,
          branchTaken: nodeType === 'condition' ? branchTaken : undefined,
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

        this.executionGateway.emitNodeCompleted(
          executionId,
          nodeId,
          nodeType,
          'success',
          userId,
        );

        completedNodesCount += 1;
        this.executionGateway.emitExecutionProgress(
          executionId,
          completedNodesCount,
          totalNodes,
          userId,
        );
      }

      await this.executionsService.updateStatus(executionId, 'success');
      this.executionGateway.emitExecutionCompleted(executionId, 'success', userId);
      if (triggerSource === 'scheduled') {
        try {
          await this.schedulesService.updateLastRun(workflowId);
        } catch (schedErr) {
          this.logger.error(
            `Failed to update schedule lastRunAt for workflow ${workflowId}: ${(schedErr as Error).message}`,
          );
        }
      }
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
      this.executionGateway.emitExecutionCompleted(executionId, 'failed', userId);

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

function usesLoopVariables(obj: any): boolean {
  const loopRegex = /{{\s*loop\./i;

  const walker = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return loopRegex.test(val);
    if (Array.isArray(val)) return val.some((item) => walker(item));
    if (typeof val === 'object') {
      return Object.values(val).some((v) => walker(v));
    }
    return false;
  };

  return walker(obj);
}



