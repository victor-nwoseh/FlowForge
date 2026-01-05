import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Copy,
  Search,
  Loader2,
  Download,
  Upload,
  History,
  FileText,
  Workflow,
} from 'lucide-react';

import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LiquidMetalButton from '../components/LiquidMetalButton';
import ConfirmDialog from '../components/ConfirmDialog';
import workflowService from '../services/workflow.service';
import { executionService } from '../services/execution.service';
import { generateEdgeId, generateNodeId } from '../utils/workflow.utils';
import { exportWorkflow, importWorkflow } from '../utils/workflow-export';

const WorkflowsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: workflows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['workflows'],
    queryFn: workflowService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowService.delete(id),
    onMutate: async (id: string) => {
      setDeletingId(id);
      await queryClient.cancelQueries({ queryKey: ['workflows'] });
      const previous = queryClient.getQueryData<Awaited<typeof workflows>>([
        'workflows',
      ]);
      queryClient.setQueryData(['workflows'], (old?: typeof workflows) =>
        old?.filter((workflow) => workflow._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['workflows'], context.previous);
      }
      toast.error('Failed to delete workflow');
    },
    onSuccess: () => {
      toast.success('Workflow deleted');
    },
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const workflow = await workflowService.getOne(id);
      const nodeIdMap = new Map<string, string>();

      const duplicatedNodes = (workflow.nodes ?? []).map((node) => {
        const newId = generateNodeId();
        nodeIdMap.set(node.id, newId);
        return {
          ...node,
          id: newId,
        };
      });

      const duplicatedEdges = (workflow.edges ?? []).map((edge) => {
        const newSource = nodeIdMap.get(edge.source) ?? edge.source;
        const newTarget = nodeIdMap.get(edge.target) ?? edge.target;
        return {
          ...edge,
          id: generateEdgeId(newSource, newTarget),
          source: newSource,
          target: newTarget,
        };
      });

      return workflowService.create({
        name: `${workflow.name} (Copy)`,
        description: workflow.description ?? '',
        nodes: duplicatedNodes,
        edges: duplicatedEdges,
      });
    },
    onMutate: (id: string) => {
      setDuplicatingId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow duplicated');
    },
    onError: () => {
      toast.error('Failed to duplicate workflow');
    },
    onSettled: () => {
      setDuplicatingId(null);
    },
  });

  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load workflows');
    }
  }, [isError, error]);

  const handleCreateNew = () => {
    navigate('/workflows/new');
  };

  const handleOpenWorkflow = (id: string) => {
    navigate(`/workflows/${id}`);
  };

  const handleDeleteWorkflow = (
    event: React.MouseEvent,
    id: string | undefined,
    name: string | undefined,
  ) => {
    event.stopPropagation();
    if (!id) {
      return;
    }
    setWorkflowToDelete({ id, name: name || 'Untitled Workflow' });
  };

  const handleConfirmDeleteWorkflow = () => {
    if (!workflowToDelete) {
      return;
    }
    deleteMutation.mutate(workflowToDelete.id);
    setWorkflowToDelete(null);
  };

  const handleDuplicateWorkflow = (
    event: React.MouseEvent,
    id: string | undefined,
  ) => {
    event.stopPropagation();
    if (!id) {
      return;
    }

    duplicateMutation.mutate(id);
  };

  const handleExportWorkflow = useCallback(
    (event: React.MouseEvent, workflow: (typeof workflowsData)[number]) => {
      event.stopPropagation();
      exportWorkflow(workflow);
    },
    [],
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const workflow = await importWorkflow(file);
      const created = await workflowService.create({
        name: workflow.name,
        description: workflow.description ?? '',
        nodes: workflow.nodes ?? [],
        edges: workflow.edges ?? [],
      });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow imported successfully');
      navigate(`/workflows/${created._id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to import workflow',
      );
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleExportAll = () => {
    if (!workflowsData.length) {
      toast.error('No workflows available to export.');
      return;
    }

    if (workflowsData.length > 5) {
      toast('Exporting multiple workflows...', { icon: '⬇️' });
    }

    workflowsData.forEach((workflow) => exportWorkflow(workflow));
  };

  const workflowsData = useMemo(
    () => (Array.isArray(workflows) ? workflows : []),
    [workflows],
  );

  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) {
      return workflowsData;
    }

    const term = searchQuery.trim().toLowerCase();
    return workflowsData.filter((workflow) => {
      const nameMatch = workflow.name?.toLowerCase().includes(term);
      const descriptionMatch = (workflow.description ?? '')
        .toLowerCase()
        .includes(term);
      return nameMatch || descriptionMatch;
    });
  }, [workflowsData, searchQuery]);

  const hasFilteredResults = filteredWorkflows.length > 0;

  const executionQueries = useQueries({
    queries: filteredWorkflows.map((workflow) => ({
      queryKey: ['executions', workflow._id],
      queryFn: () =>
        workflow._id ? executionService.getAll(workflow._id) : Promise.resolve([]),
      enabled: Boolean(workflow._id),
    })),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="h-6 w-40 animate-pulse rounded bg-forge-800/60" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-forge-800/40" />
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="h-9 w-64 animate-pulse rounded-lg bg-forge-800/60" />
            <div className="h-9 w-32 animate-pulse rounded-lg bg-forge-800/60" />
            <div className="h-9 w-32 animate-pulse rounded-lg bg-forge-800/60" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-xl border border-forge-700/50 bg-forge-900/80 p-5"
            >
              <div className="mb-4 h-5 w-24 rounded bg-forge-800/60" />
              <div className="mb-2 h-4 w-full rounded bg-forge-800/40" />
              <div className="mb-2 h-4 w-5/6 rounded bg-forge-800/40" />
              <div className="mt-auto h-4 w-1/3 rounded bg-forge-800/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          Failed to load workflows. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forge-950 p-6 pb-32 relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-forge-950/30 to-forge-950/80 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-ember-500/5 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-forge-50">My Workflows</h1>
            <p className="mt-1 text-sm text-forge-300">
              Manage and organize your automated workflows.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="relative flex w-full items-center sm:w-64">
              <Search className="absolute left-3 h-4 w-4 text-forge-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search workflows..."
                className="w-full rounded-lg border border-forge-700 bg-forge-900/60 backdrop-blur-xl py-2 pl-9 pr-3 text-sm text-forge-100 placeholder:text-forge-400 shadow-sm transition focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => navigate('/templates')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-forge-700 bg-forge-800/50 backdrop-blur-lg px-3 py-2 text-sm font-semibold text-forge-200 shadow-sm transition hover:bg-forge-700/60 hover:border-ember-500/50 hover:text-ember-400 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
            >
              <FileText size={16} />
              Browse Templates
            </button>
            <LiquidMetalButton onClick={handleCreateNew} size="sm" className="whitespace-nowrap">
              <Plus size={16} className="mr-1" />
              Create Workflow
            </LiquidMetalButton>
            <button
              type="button"
              onClick={handleExportAll}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-forge-700 bg-forge-800/50 backdrop-blur-lg px-3 py-2 text-sm font-semibold text-forge-200 shadow-sm transition hover:bg-forge-700/60 hover:border-ember-500/50 hover:text-ember-400 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
            >
              <Upload size={16} />
              Export All
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-forge-700 bg-forge-800/50 backdrop-blur-lg px-3 py-2 text-sm font-semibold text-forge-200 shadow-sm transition hover:bg-forge-700/60 hover:border-ember-500/50 hover:text-ember-400 focus:outline-none focus:ring-2 focus:ring-ember-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Import
                </>
              )}
            </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportChange}
          />
        </div>
      </div>

      {workflowsData.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-forge-700/50 bg-forge-900/60 backdrop-blur-sm px-6 py-12 text-center">
          <div className="p-4 rounded-full bg-forge-800/60 border border-forge-700/50 mb-4">
            <Workflow className="h-10 w-10 text-forge-400" />
          </div>
          <h2 className="text-xl font-semibold text-forge-50">No workflows yet</h2>
          <p className="mt-2 max-w-md text-sm text-forge-400">
            Create a new workflow or start with a template.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleCreateNew} icon={Plus}>
              Create Blank Workflow
            </Button>
            <button
              type="button"
              onClick={() => navigate('/templates')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-forge-700/50 bg-forge-800/60 px-4 py-2 text-sm font-semibold text-forge-300 transition hover:bg-forge-700/60 hover:border-forge-600/50 hover:text-forge-200 focus:outline-none focus:ring-2 focus:ring-ember-500/30"
            >
              <FileText size={16} />
              Browse Templates
            </button>
          </div>
        </div>
      ) : !hasFilteredResults ? (
        <EmptyState
          title="No workflows found"
          description="Try adjusting your search query or create a new workflow."
          actionLabel="Reset search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map((workflow, index) => {
            const executionQuery = executionQueries[index];
            const executionCount = executionQuery?.data?.length ?? 0;

            return (
            <div
              key={workflow._id}
              role="button"
              tabIndex={0}
              onClick={() => workflow._id && handleOpenWorkflow(workflow._id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && workflow._id) {
                  handleOpenWorkflow(workflow._id);
                }
              }}
              className="flex cursor-pointer flex-col rounded-lg border border-forge-800 bg-forge-900/60 backdrop-blur-xl p-5 shadow-lg shadow-forge-950/20 transition-all duration-300 hover:-translate-y-1 hover:border-ember-500/50 hover:shadow-xl hover:shadow-ember-900/20 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:ring-offset-2 focus:ring-offset-forge-950"
            >
              <h2 className="text-lg font-semibold text-forge-50 mb-2">
                {workflow.name}
              </h2>
              <p className="mb-4 line-clamp-3 text-sm text-forge-300">
                {workflow.description || 'No description provided.'}
              </p>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="rounded-full bg-gradient-to-r from-ember-500/20 to-gold-500/20 border border-ember-500/30 px-3 py-1 text-xs font-semibold uppercase text-ember-400">
                  {(workflow.nodes?.length ?? 0).toString()} nodes
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-forge-800/60 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-forge-300 transition hover:bg-forge-700/60 hover:text-ember-400 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:ring-offset-1 focus:ring-offset-forge-950"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (workflow._id) {
                      navigate(`/executions?workflowId=${workflow._id}`);
                    }
                  }}
                >
                  <History className="h-3.5 w-3.5 text-ember-500/80" />
                  {executionCount} executions
                </button>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    className="rounded-full p-2 bg-forge-800/50 text-forge-400 transition hover:bg-blue-500/20 hover:text-blue-400 hover:shadow-md hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-forge-950"
                    onClick={(event) => handleExportWorkflow(event, workflow)}
                    aria-label="Export workflow"
                  >
                    <Upload size={16} />
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-2 bg-forge-800/50 text-forge-400 transition hover:bg-purple-500/20 hover:text-purple-400 hover:shadow-md hover:shadow-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-forge-950 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={(event) =>
                      handleDuplicateWorkflow(event, workflow._id ?? undefined)
                    }
                    aria-label="Duplicate workflow"
                    disabled={duplicatingId === workflow._id}
                  >
                    {duplicatingId === workflow._id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-ember-400" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-2 bg-forge-800/50 text-forge-400 transition hover:bg-red-500/20 hover:text-red-400 hover:shadow-md hover:shadow-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-forge-950 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={(event) =>
                      handleDeleteWorkflow(event, workflow._id ?? undefined, workflow.name)
                    }
                    aria-label="Delete workflow"
                    disabled={deletingId === workflow._id}
                  >
                    {deletingId === workflow._id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-ember-400" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
              <span className="mt-auto text-xs text-forge-500">
                Created{' '}
                {workflow.createdAt
                  ? new Date(workflow.createdAt).toLocaleDateString()
                  : '—'}
              </span>
            </div>
            );
          })}
        </div>
      )}
      </div>
      <ConfirmDialog
        isOpen={workflowToDelete !== null}
        onConfirm={handleConfirmDeleteWorkflow}
        onCancel={() => setWorkflowToDelete(null)}
        title="Delete Workflow"
        message={`Are you sure you want to delete "${workflowToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default WorkflowsList;

