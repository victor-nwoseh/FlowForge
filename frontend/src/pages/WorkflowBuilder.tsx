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
import { useWorkflowStore } from '../store/workflow.store';
import workflowService from '../services/workflow.service';
import { generateEdgeId, generateNodeId } from '../utils/workflow.utils';
import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from '../types/workflow.types';

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

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    addEdge: addEdgeToStore,
    setSelectedNode,
    setCurrentWorkflow,
  } = useWorkflowStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    addNode: state.addNode,
    addEdge: state.addEdge,
    setSelectedNode: state.setSelectedNode,
    setCurrentWorkflow: state.setCurrentWorkflow,
  }));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [fitViewRequest, setFitViewRequest] = useState(0);

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
    };
  }, []);

  useEffect(() => {
    shouldFitViewRef.current = true;
    isLoadingWorkflowRef.current = true;
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
        toast.error('Failed to load workflow');
        console.error(error);
      } finally {
        isLoadingWorkflowRef.current = false;
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
    if (!name.trim()) {
      toast.error('Workflow name is required');
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
      toast.error('Failed to save workflow');
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
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              className="max-w-md"
              placeholder="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} icon={Save} className="w-auto">
              Save Workflow
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
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={handleNodeClick}
              onInit={setReactFlowInstance}
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
    </div>
  );
};

export default WorkflowBuilder;

