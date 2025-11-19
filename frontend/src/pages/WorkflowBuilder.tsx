import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  NodeChange,
  ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Play, Save } from 'lucide-react';

import Button from '../components/Button';
import Input from '../components/Input';
import CustomNode from '../components/CustomNode';
import NodeConfigPanel from '../components/NodeConfigPanel';
import NodePalette from '../components/NodePalette';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkflowStats from '../components/WorkflowStats';
import { useWorkflowStore } from '../store/workflow.store';
import workflowService from '../services/workflow.service';
import { generateEdgeId, generateNodeId } from '../utils/workflow.utils';
import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from '../types/workflow.types';
import '../styles/workflow.css';

const nodeTypes = {
  custom: CustomNode,
};

const DEFAULT_ZOOM = 0.75;

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
  const [formErrors, setFormErrors] = useState<{ name?: string; description?: string }>({});

  const scheduleFitView = useCallback(() => {
    shouldFitViewRef.current = true;
    setFitViewRequest((value) => value + 1);
  }, []);

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
    const loadWorkflow = async () => {
      if (!workflowId) {
        return;
      }

      try {
        const workflow = await workflowService.getOne(workflowId);
        setName(workflow.name);
        setDescription(workflow.description ?? '');
        setNodes(
          (workflow.nodes ?? []).map((node) => ({
            ...node,
            type: 'custom',
          })),
        );
        setEdges(workflow.edges ?? []);
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
      setNodes((nds) => applyNodeChanges(changes, nds));
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

      const newEdge: WorkflowEdge = {
        id: generateEdgeId(connection.source, connection.target),
        source: connection.source,
        target: connection.target,
        type: connection.type,
      };

      addEdgeToStore(newEdge);
    },
    [addEdgeToStore],
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

      const sourceNode = nodes.find((node) => node.id === source);
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
      } catch (error) {
        console.error('Failed to parse node data', error);
      }
    },
    [addNode, reactFlowInstance, setSelectedNode],
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: WorkflowNode) => {
      setSelectedNode(node);
    },
    [setSelectedNode],
  );

  const handleSave = useCallback(async () => {
    if (!validateForm(name, description)) {
      return;
    }

    try {
      const payload = {
        name,
        description,
        nodes: nodes.map(({ id, data, position }) => ({
          id,
          type: data.type,
          position,
          data,
        })),
        edges: edges.map(({ id, source, target, type }) => ({
          id,
          source,
          target,
          type,
        })),
      };

      if (workflowId) {
        const updated = await workflowService.update(workflowId, payload);
        setCurrentWorkflow(updated);
        toast.success('Workflow updated successfully');
      } else {
        const created = await workflowService.create(payload);
        setCurrentWorkflow(created);
        toast.success('Workflow created successfully');
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

  const handleRunWorkflow = () => {
    toast.success('Workflow run queued (placeholder)');
  };

  useEffect(() => {
    if (!workflowId) {
      return;
    }

    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    setIsAutoSaving(true);

    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await handleSave();
        setLastSavedAt(new Date());
      } catch (error) {
        console.error(error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [nodes, edges, handleSave, workflowId]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    removeNode(selectedNode.id);
    setSelectedNode(null);
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
    toast.success('Node duplicated');
  }, [addNode, selectedNode, setSelectedNode]);

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
        if (autoSaveTimeoutRef.current !== null) {
          window.clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        try {
          setIsAutoSaving(true);
          await handleSave();
          setLastSavedAt(new Date());
        } finally {
          setIsAutoSaving(false);
        }
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        event.preventDefault();
        deleteSelectedNode();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteSelectedNode, duplicateSelectedNode, handleSave, selectedNode, setSelectedNode]);

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <NodePalette />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-1 items-center gap-4">
            <Input
              className="max-w-sm"
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
              <p className="text-xs text-red-500">{formErrors.name}</p>
            ) : null}
            <Input
              className="max-w-md"
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
              <p className="text-xs text-red-500">{formErrors.description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              icon={Save}
              className="w-auto"
              disabled={Boolean(formErrors.name || formErrors.description)}
            >
              Save Workflow
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsStatsOpen(true)}
              className="w-auto"
            >
              Show Stats
            </Button>
            <Button
              variant="secondary"
              onClick={handleRunWorkflow}
              icon={Play}
              className="w-auto"
            >
              Run
            </Button>
          </div>
        </header>
        <div className="relative flex flex-1">
          {isLoadingWorkflow ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <LoadingSpinner />
            </div>
          ) : null}
          <div
            className="h-full flex-1 bg-slate-100"
            ref={reactFlowWrapper}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
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
              onNodeClick={handleNodeClick}
              onInit={setReactFlowInstance}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#94a3b8', strokeWidth: 2 },
              }}
              connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
              fitView
            >
              <Background variant="lines" gap={24} color="#cbd5f5" />
              <MiniMap />
              <Controls position="bottom-right" />
            </ReactFlow>
          </div>
        </div>
      </div>
      <NodeConfigPanel />
      {isStatsOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setIsStatsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Workflow Details
              </h2>
              <button
                type="button"
                onClick={() => setIsStatsOpen(false)}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
            <WorkflowStats workflow={statsWorkflow} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WorkflowBuilder;

