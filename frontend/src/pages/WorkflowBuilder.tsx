import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import ReactFlow, {
  Connection,
  Controls,
  Edge,
  EdgeChange,
  MarkerType,
  MiniMap,
  Node,
  NodeChange,
  NodeTypes,
  ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow';
import { Background, BackgroundVariant } from '@reactflow/background';
import 'reactflow/dist/style.css';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Map as MapIcon, Play, Save } from 'lucide-react';

import Input from '../components/Input';
import LiquidMetalButton from '../components/LiquidMetalButton';
import CustomNode from '../components/CustomNode';
import NodeConfigPanel from '../components/NodeConfigPanel';
import NodePalette from '../components/NodePalette';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkflowStats from '../components/WorkflowStats';
import ConfirmDialog from '../components/ConfirmDialog';
import { useWorkflowStore } from '../store/workflow.store';
import workflowService from '../services/workflow.service';
import api from '../services/api';
import { generateEdgeId, generateNodeId } from '../utils/workflow.utils';
import useExecutionSocket from '../hooks/useExecutionSocket';
import type {
  NodeData,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from '../types/workflow.types';
import '../styles/workflow.css';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const DEFAULT_ZOOM = 0.75;
const AUTO_SAVE_DELAY = 30000;
const MANUAL_SAVE_SPINNER_MS = 2000;

const WorkflowBuilder = () => {
  const { id: workflowId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const isLoadingWorkflowRef = useRef(false);
  const shouldFitViewRef = useRef(false);
  const fitViewTimeoutRef = useRef<number | null>(null);
  const fitViewAnimationRef = useRef<number | null>(null);
  const connectingHandleTypeRef = useRef<'source' | 'target' | null>(null);
  const invalidConnectionToastShownRef = useRef(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const validateForm = useCallback(
    (workflowName: string, workflowDescription: string) => {
      const errors: { name?: string; description?: string } = {};

      if (!workflowName.trim()) {
        errors.name = 'Workflow name is required.';
      } else if (workflowName.trim().length < 3) {
        errors.name = 'Workflow name must be at least 3 characters.';
      } else if (workflowName.trim().length > 50) {
        errors.name = 'Workflow name must be at most 50 characters.';
      }

      if (workflowDescription.trim().length > 200) {
        errors.description = 'Description must be at most 200 characters.';
      }

      setFormErrors(errors);
      if (!errors.name && errors.description) {
        toast.error(errors.description);
      }

      return Object.keys(errors).length === 0;
    },
    [],
  );

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    addEdge: addEdgeToStore,
    deleteNode: removeNode,
    setSelectedNode,
    setCurrentWorkflow,
    selectedNode,
    currentWorkflow,
  } = useWorkflowStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    addNode: state.addNode,
    addEdge: state.addEdge,
    deleteNode: state.deleteNode,
    setSelectedNode: state.setSelectedNode,
    setCurrentWorkflow: state.setCurrentWorkflow,
    selectedNode: state.selectedNode,
    currentWorkflow: state.currentWorkflow,
  }));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [fitViewRequest, setFitViewRequest] = useState(0);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; description?: string }>({});
  const canExecuteWorkflow = Boolean(workflowId && workflowId !== 'new');
  const { executionStarted, nodeCompleted, executionCompleted, progress } =
    useExecutionSocket();
  const [isExecuting, setIsExecuting] = useState(false);
  const [completedNodes, setCompletedNodes] = useState<
    Map<string, 'success' | 'failed'>
  >(new Map());
  const [overlayStatus, setOverlayStatus] = useState<'success' | 'failed' | null>(null);

  const executeMutation = useMutation({
    mutationFn: async (workflowIdToExecute: string) => {
      await api.post(`/workflows/${workflowIdToExecute}/execute`, {});
    },
    onSuccess: () => {
      toast.success('Workflow execution started!');
    },
    onError: (error: any) => {
      const missing = error?.response?.data?.missingServices;

      if (Array.isArray(missing) && missing.length > 0) {
        const servicesList = missing.join(', ');
        toast.error(`Please connect ${servicesList} in Integrations before executing.`);
        navigate('/integrations');
        return;
      }

      toast.error('Failed to execute workflow');
    },
  });

  const scheduleFitView = useCallback(() => {
    shouldFitViewRef.current = true;
    setFitViewRequest((value) => value + 1);
  }, []);

  const getBranchColor = useCallback((handle?: string | null) => {
    if (handle === 'true') return '#10b981';
    if (handle === 'false') return '#ef4444';
    return '#94a3b8';
  }, []);

  const getEdgeStyle = useCallback(
    (edge: WorkflowEdge) => {
      if (edge.sourceHandle === 'true') {
        return { stroke: '#10b981', strokeWidth: 2 };
      }
      if (edge.sourceHandle === 'false') {
        return { stroke: '#ef4444', strokeWidth: 2 };
      }
      return { stroke: '#94a3b8', strokeWidth: 2 };
    },
    [],
  );

  const decorateEdgeWithNodes = useCallback(
    (edge: WorkflowEdge, nodesList: WorkflowNode[]): WorkflowEdge => {
      const color = getBranchColor(edge.sourceHandle);
      const sourceNode = nodesList.find((n) => n.id === edge.source);
      const isConditionSource = sourceNode?.data?.type === 'condition';

      const baseStyle = getEdgeStyle(edge);

      let label: string | undefined;
      if (isConditionSource) {
        if (edge.sourceHandle === 'true') {
          label = '✓ True';
        } else if (edge.sourceHandle === 'false') {
          label = '✗ False';
        }
      }

      return {
        ...edge,
        style: {
          ...(edge.style ?? {}),
          ...baseStyle,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
        },
        label,
        labelStyle: label
          ? {
              fill: color,
              fontWeight: 600,
            }
          : edge.labelStyle,
      };
    },
    [getBranchColor, getEdgeStyle],
  );

  useEffect(() => {
    return () => {
      if (fitViewTimeoutRef.current !== null) {
        window.clearTimeout(fitViewTimeoutRef.current);
        fitViewTimeoutRef.current = null;
      }
      if (fitViewAnimationRef.current !== null) {
        cancelAnimationFrame(fitViewAnimationRef.current);
        fitViewAnimationRef.current = null;
      }
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    shouldFitViewRef.current = true;
    isLoadingWorkflowRef.current = true;
    setIsLoadingWorkflow(Boolean(workflowId));
  }, [workflowId]);

  useEffect(() => {
    if (!workflowId || workflowId === 'new') return;
    if (executionStarted && executionStarted.workflowId === workflowId) {
      setIsExecuting(true);
      setCompletedNodes(new Map());
      setOverlayStatus(null);
    }
  }, [executionStarted, workflowId]);

  useEffect(() => {
    if (!workflowId || workflowId === 'new') return;
    if (nodeCompleted && nodeCompleted.executionId && nodeCompleted.nodeId) {
      setCompletedNodes((prev) => {
        const next = new Map(prev);
        next.set(nodeCompleted.nodeId, nodeCompleted.status);
        return next;
      });
    }
  }, [nodeCompleted, workflowId]);

  useEffect(() => {
    if (!workflowId || workflowId === 'new') return;
    if (executionCompleted && executionCompleted.workflowId === workflowId) {
      setOverlayStatus(executionCompleted.status === 'success' ? 'success' : 'failed');
      setIsExecuting(false);
      setTimeout(() => {
        setCompletedNodes(new Map());
        setOverlayStatus(null);
      }, 1500);
    }
  }, [executionCompleted, workflowId]);

  useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId) {
        return;
      }

      try {
        const workflow = await workflowService.getOne(workflowId);
        setName(workflow.name);
        setDescription(workflow.description ?? '');
        const workflowNodes = (workflow.nodes ?? []).map((node) => ({
            ...node,
            type: 'custom',
        }));

        setNodes(workflowNodes);
        setEdges(
          (workflow.edges ?? []).map((edge) =>
            decorateEdgeWithNodes(edge, workflowNodes),
          ),
        );
        setCurrentWorkflow(workflow);
        setSelectedNode(null);
      } catch (error) {
        toast.error(parseApiError(error));
        console.error(error);
      } finally {
        isLoadingWorkflowRef.current = false;
        setIsLoadingWorkflow(false);
        scheduleFitView();
      }
    };

    loadWorkflow();
  }, [
    workflowId,
    setNodes,
    setEdges,
    setCurrentWorkflow,
    setSelectedNode,
    scheduleFitView,
    decorateEdgeWithNodes,
  ]);

  useEffect(() => {
    if (!workflowId) {
      setName('');
      setDescription('');
      setNodes([]);
      setEdges([]);
      setCurrentWorkflow(null);
      setSelectedNode(null);
      isLoadingWorkflowRef.current = false;
      setIsLoadingWorkflow(false);
      scheduleFitView();
    }
  }, [
    workflowId,
    setNodes,
    setEdges,
    setCurrentWorkflow,
    setSelectedNode,
    scheduleFitView,
  ]);

  useEffect(() => {
    if (
      !reactFlowInstance ||
      isLoadingWorkflowRef.current ||
      !shouldFitViewRef.current
    ) {
      return;
    }

    if (fitViewTimeoutRef.current !== null) {
      window.clearTimeout(fitViewTimeoutRef.current);
      fitViewTimeoutRef.current = null;
    }

    if (fitViewAnimationRef.current !== null) {
      cancelAnimationFrame(fitViewAnimationRef.current);
      fitViewAnimationRef.current = null;
    }

    fitViewTimeoutRef.current = window.setTimeout(() => {
      fitViewTimeoutRef.current = null;
      fitViewAnimationRef.current = requestAnimationFrame(() => {
        if (!reactFlowInstance) {
          return;
        }

        if (nodes.length === 0 && edges.length === 0) {
          reactFlowInstance.setViewport({
            x: 0,
            y: 0,
            zoom: DEFAULT_ZOOM,
          });
        } else {
          reactFlowInstance.fitView({
            padding: 0.2,
            duration: 0,
            maxZoom: 1.1,
          });
        }

        shouldFitViewRef.current = false;
        fitViewAnimationRef.current = null;
      });
    }, 0);

    return () => {
      if (fitViewTimeoutRef.current !== null) {
        window.clearTimeout(fitViewTimeoutRef.current);
        fitViewTimeoutRef.current = null;
      }
      if (fitViewAnimationRef.current !== null) {
        cancelAnimationFrame(fitViewAnimationRef.current);
        fitViewAnimationRef.current = null;
      }
    };
  }, [reactFlowInstance, nodes, edges, workflowId, fitViewRequest]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds) as WorkflowNode[]);
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const newEdge: WorkflowEdge = decorateEdgeWithNodes(
        {
        id: generateEdgeId(connection.source, connection.target),
        source: connection.source,
        target: connection.target,
          sourceHandle:
            'sourceHandle' in connection && connection.sourceHandle
              ? connection.sourceHandle
              : undefined,
          targetHandle:
            'targetHandle' in connection && connection.targetHandle
              ? connection.targetHandle
              : undefined,
        type:
          'type' in connection && typeof connection.type === 'string'
            ? connection.type
            : undefined,
        },
        nodes,
      );

      addEdgeToStore(newEdge);
    },
    [addEdgeToStore, decorateEdgeWithNodes, nodes],
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (connectingHandleTypeRef.current === 'target') {
        if (!invalidConnectionToastShownRef.current) {
          toast.error('Start connections from an outgoing handle (bottom).');
          invalidConnectionToastShownRef.current = true;
        }
        connectingHandleTypeRef.current = null;
        return false;
      }

      const { source, target } = connection;
      if (!source || !target) {
        return false;
      }

      if (source === target) {
        if (!invalidConnectionToastShownRef.current) {
          toast.error('Cannot connect a node to itself.');
          invalidConnectionToastShownRef.current = true;
        }
        return false;
      }

      const targetNode = nodes.find((node) => node.id === target);

      if (targetNode?.data.type === 'trigger') {
        if (!invalidConnectionToastShownRef.current) {
          toast.error('Trigger nodes cannot have incoming connections.');
          invalidConnectionToastShownRef.current = true;
        }
        connectingHandleTypeRef.current = null;
        return false;
      }

      const edgeExists = edges.some(
        (edge) => edge.source === source && edge.target === target,
      );

      if (edgeExists) {
        if (!invalidConnectionToastShownRef.current) {
          toast.error('This connection already exists.');
          invalidConnectionToastShownRef.current = true;
        }
        connectingHandleTypeRef.current = null;
        return false;
      }

      return true;
    },
    [edges, nodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const rawData = event.dataTransfer.getData('application/reactflow');

      if (!rawData || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      try {
        const data = JSON.parse(rawData);
        if (!data?.type) {
          return;
        }

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const id = generateNodeId();
        const newNode: WorkflowNode = {
          id,
          type: 'custom',
          position,
          data: {
            type: data.type,
            label: `${data.type.charAt(0).toUpperCase()}${data.type.slice(1)} Node`,
            config: {},
          },
        };

        addNode(newNode);
        setSelectedNode(newNode);
        setIsConfigOpen(false);
      } catch (error) {
        console.error('Failed to parse node data', error);
      }
    },
    [addNode, reactFlowInstance, setSelectedNode],
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      setSelectedNode(node as WorkflowNode);
      setIsConfigOpen(false);
    },
    [setSelectedNode],
  );

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      setSelectedNode(node as WorkflowNode);
      setIsConfigOpen(true);
    },
    [setSelectedNode],
  );

  const handleSave = useCallback(async () => {
    if (!validateForm(name, description)) {
      return;
    }

    const conditionNodes = nodes.filter((n) => n.data.type === 'condition');
    const incomplete = conditionNodes.filter((n) => {
      const outgoing = edges.filter((e) => e.source === n.id);
      const hasTrue = outgoing.some((e) => e.sourceHandle === 'true');
      const hasFalse = outgoing.some((e) => e.sourceHandle === 'false');
      return !(hasTrue && hasFalse);
    });
    if (incomplete.length > 0) {
      const labels = incomplete
        .map((n) => n.data.label || n.id)
        .slice(0, 3)
        .join(', ');
      toast(
        (t) => (
          <div className="text-sm">
            <div className="font-semibold text-amber-300">
              Missing branch on condition node
            </div>
            <div className="text-amber-200/80">
              Add both True and False connections: {labels}
              {incomplete.length > 3 ? '...' : ''}
            </div>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-ember-300 hover:text-ember-200 transition-colors"
              onClick={() => toast.dismiss(t.id)}
            >
              Dismiss
            </button>
          </div>
        ),
        {
          duration: 6000,
          style: {
            background: 'rgba(35, 31, 28, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            backdropFilter: 'blur(12px)',
          },
          icon: '⚠️',
        },
      );
    }

    try {
      const nodeIds = new Set(nodes.map((n) => n.id));
      const sanitizedEdges = edges.filter(
        (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
      );

      const payload = {
        name,
        description,
        nodes: nodes.map(({ id, data, position }) => ({
          id,
          type: data.type,
          position,
          data,
        })),
        edges: sanitizedEdges.map(
          ({ id, source, target, type, sourceHandle, targetHandle }) => ({
          id,
          source,
          target,
          type,
            sourceHandle,
            targetHandle,
          }),
        ),
      };

      if (workflowId) {
        const updated = await workflowService.update(workflowId, payload);
        setCurrentWorkflow(updated);
      } else {
        const created = await workflowService.create(payload);
        setCurrentWorkflow(created);
        navigate(`/workflows/${created._id}`);
      }
    } catch (error) {
      toast.error(parseApiError(error));
      console.error(error);
    }
  }, [
    name,
    description,
    nodes,
    edges,
    workflowId,
    setCurrentWorkflow,
    navigate,
  ]);

  useEffect(() => {
    if (!workflowId) {
      return;
    }

    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        setIsAutoSaving(true);
        await handleSave();
        setLastSavedAt(new Date());
        toast.success('Workflow auto-saved');
      } catch (error) {
        console.error(error);
      } finally {
        setIsAutoSaving(false);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [nodes, edges, name, description, handleSave, workflowId]);

  const triggerManualSave = useCallback(async () => {
    if (isManualSaving) {
      return;
    }
    if (!validateForm(name, description)) {
      return;
    }

    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    setIsManualSaving(true);
    const start = Date.now();
    try {
      await handleSave();
      setLastSavedAt(new Date());
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(MANUAL_SAVE_SPINNER_MS - elapsed, 0);
      window.setTimeout(() => {
        setIsManualSaving(false);
        toast.success('Workflow updated successfully');
      }, remaining);
    }
  }, [handleSave, isManualSaving, name, description, validateForm]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    removeNode(selectedNode.id);
    setSelectedNode(null);
    setIsConfigOpen(false);
    toast.success('Node deleted');
  }, [removeNode, selectedNode, setSelectedNode]);

  const duplicateSelectedNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    const newId = generateNodeId();
    const newNode = {
      ...selectedNode,
      id: newId,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
    };
    addNode(newNode);
    setSelectedNode(newNode);
    setIsConfigOpen(false);
    toast.success('Node duplicated');
  }, [addNode, selectedNode, setSelectedNode]);

  const parseApiError = (error: unknown) => {
    if (!error || typeof error !== 'object') {
      return 'An unexpected error occurred. Please try again.';
    }

    const err = error as { response?: Response; message?: string };

    if (!err.response) {
      return 'Network error: unable to reach the server.';
    }

    switch (err.response.status) {
      case 400:
        return 'Validation error: please check your input.';
      case 401:
        return 'You are not authorized. Please log in again.';
      case 404:
        return 'Workflow not found.';
      default:
        return err.message || 'An unexpected server error occurred.';
    }
  };

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isMeta && key === 's') {
        event.preventDefault();
        await triggerManualSave();
        return;
      }

      if (event.key === 'Delete' && selectedNode) {
        event.preventDefault();
        setIsDeleteConfirmOpen(true);
        return;
      }

      if (isMeta && key === 'd') {
        event.preventDefault();
        duplicateSelectedNode();
        return;
      }

      if (event.key === 'Escape' && selectedNode) {
        event.preventDefault();
        setSelectedNode(null);
        setIsConfigOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteSelectedNode, duplicateSelectedNode, triggerManualSave, selectedNode, setSelectedNode, setIsConfigOpen]);

  const statsWorkflow: Workflow = {
    _id: currentWorkflow?._id,
    name,
    description,
    nodes,
    edges,
    createdAt: currentWorkflow?.createdAt ?? lastSavedAt?.toISOString(),
    updatedAt: currentWorkflow?.updatedAt ?? lastSavedAt?.toISOString(),
    isActive: currentWorkflow?.isActive ?? true,
  };

  const nodesWithLiveState: WorkflowNode[] = nodes.map((n) => {
    const completedStatus = completedNodes.get(n.id);
    const isRunning = isExecuting && !completedStatus;
    const isSuccess = completedStatus === 'success';
    const isFailed = completedStatus === 'failed';
    return {
      ...n,
      className: `${n.className ?? ''} ${
        isRunning ? 'ring-2 ring-blue-400 animate-pulse' : ''
      } ${isSuccess ? 'ring-2 ring-emerald-400' : ''} ${
        isFailed ? 'ring-2 ring-rose-400' : ''
      }`,
    };
  });

  return (
    <div className="flex h-screen max-h-[100vh] overflow-hidden bg-forge-950 relative" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}>
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-forge-950/30 to-forge-950/80 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-ember-500/5 blur-[100px] pointer-events-none" />
      
      <NodePalette
        isCollapsed={isPaletteCollapsed}
        onToggle={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
      />
      <div className="flex flex-1 flex-col relative z-10 overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between border-b border-forge-700 bg-forge-900/60 backdrop-blur-xl px-6 py-3 shadow-lg shadow-forge-950/20 gap-6">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex flex-col gap-1">
              <Input
                className="w-64 bg-forge-800/40 backdrop-blur-sm border-forge-700 text-forge-100 placeholder:text-forge-400 focus:border-ember-500 focus:ring-ember-500/20"
                placeholder="Workflow name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (formErrors.name) {
                    validateForm(event.target.value, description);
                  }
                }}
              />
              {formErrors.name ? (
                <p className="text-xs text-ember-400">{formErrors.name}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Input
                className="w-80 bg-forge-800/40 backdrop-blur-sm border-forge-700 text-forge-100 placeholder:text-forge-400 focus:border-ember-500 focus:ring-ember-500/20"
                placeholder="Description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (formErrors.description) {
                    validateForm(name, event.target.value);
                  }
                }}
              />
              {formErrors.description ? (
                <p className="text-xs text-ember-400">{formErrors.description}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setIsStatsOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-forge-700 bg-forge-800/40 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-forge-200 shadow-sm transition hover:bg-forge-800 hover:border-ember-500/50 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
            >
              Show Stats
            </button>
            <button
              onClick={() => setShowMinimap(!showMinimap)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-forge-700 bg-forge-800/40 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-forge-200 shadow-sm transition hover:bg-forge-800 hover:border-ember-500/50 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
              title={showMinimap ? 'Hide Minimap' : 'Show Minimap'}
            >
              <MapIcon size={16} />
              {showMinimap ? 'Hide' : 'Show'} Map
            </button>
            <LiquidMetalButton
              onClick={triggerManualSave}
              disabled={Boolean(formErrors.name || formErrors.description)}
            >
              <Save size={16} className="mr-2" />
              Save Workflow
            </LiquidMetalButton>
            <LiquidMetalButton
              onClick={() => {
                if (!canExecuteWorkflow || !workflowId) {
                  toast.error('Save the workflow before executing.');
                  return;
                }
                executeMutation.mutate(workflowId);
              }}
              disabled={!canExecuteWorkflow || executeMutation.isPending}
            >
              <Play size={16} className="mr-2" />
              {executeMutation.isPending ? 'Executing...' : 'Execute'}
            </LiquidMetalButton>
          </div>
        </header>
        {!canExecuteWorkflow ? (
          <div className="border-b border-ember-500/30 bg-ember-500/10 backdrop-blur-sm px-6 py-3 text-sm text-ember-400">
            Save the workflow before executing.
          </div>
        ) : null}
        <div className="relative flex flex-1 overflow-hidden min-h-0">
          {isLoadingWorkflow || isManualSaving || isAutoSaving ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-forge-950/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner />
                <span className="text-sm font-medium text-ember-400">
                  {isLoadingWorkflow
                    ? 'Loading workflow...'
                    : isManualSaving
                      ? 'Saving workflow...'
                      : 'Auto-saving workflow...'}
                </span>
              </div>
            </div>
          ) : null}
          <div
            className={`h-full w-full flex-1 bg-forge-900/40 backdrop-blur-sm ${
              isManualSaving ? 'pointer-events-none opacity-90' : ''
            }`}
            ref={reactFlowWrapper}
          >
            {isExecuting || overlayStatus ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3">
                <div
                  className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-xl border ${
                    overlayStatus === 'failed'
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : overlayStatus === 'success'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  } ${isExecuting ? 'animate-pulse' : ''}`}
                >
                  {overlayStatus === 'failed'
                    ? '⚠️ Execution failed'
                    : overlayStatus === 'success'
                      ? '✅ Execution completed'
                      : `⚡ Executing workflow... ${
                          progress ? `${progress.completed}/${progress.total}` : ''
                        }`}
                </div>
              </div>
            ) : null}
            <ReactFlow
              nodes={nodesWithLiveState}
              edges={edges.map((edge) => decorateEdgeWithNodes(edge, nodes))}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodesDraggable={!isExecuting}
              nodesConnectable={!isExecuting}
              isValidConnection={isValidConnection}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onConnectStart={(_, params) => {
                connectingHandleTypeRef.current = params.handleType ?? null;
                invalidConnectionToastShownRef.current = false;
              }}
              onConnectEnd={() => {
                connectingHandleTypeRef.current = null;
                invalidConnectionToastShownRef.current = false;
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onInit={setReactFlowInstance}
              deleteKeyCode={null}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#94a3b8', strokeWidth: 2 },
              }}
              connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
              fitView
            >
              <Background variant={BackgroundVariant.Lines} gap={24} color="#2d1810" />
              {showMinimap && <MiniMap />}
              <Controls position="bottom-right" />
            </ReactFlow>
          </div>
        </div>
      </div>
      <NodeConfigPanel
        isOpen={isConfigOpen && Boolean(selectedNode)}
        onClose={() => setIsConfigOpen(false)}
      />
      {isStatsOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-forge-950/60 backdrop-blur-sm"
          onClick={() => setIsStatsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-forge-900/90 backdrop-blur-xl border border-forge-700 p-6 shadow-2xl shadow-forge-950/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-forge-50">
                Workflow Details
              </h2>
              <button
                type="button"
                onClick={() => setIsStatsOpen(false)}
                className="rounded-full p-2 text-forge-400 transition hover:bg-forge-800 hover:text-forge-200 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
              >
                Close
              </button>
            </div>
            <WorkflowStats workflow={statsWorkflow} />
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onConfirm={() => {
          deleteSelectedNode();
          setIsDeleteConfirmOpen(false);
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        title="Delete Node"
        message={`Are you sure you want to delete "${selectedNode?.data?.label || 'this node'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default WorkflowBuilder;

