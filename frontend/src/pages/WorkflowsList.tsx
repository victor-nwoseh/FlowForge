import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Copy, Search, Loader2, Download, Upload } from 'lucide-react';

import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import workflowService from '../services/workflow.service';
import { generateEdgeId, generateNodeId } from '../utils/workflow.utils';
import { exportWorkflow, importWorkflow } from '../utils/workflow-export';

const WorkflowsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
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
  ) => {
    event.stopPropagation();
    if (!id) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this workflow? This action cannot be undone.',
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(id);
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
            <div className="h-9 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-9 w-32 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="mb-4 h-5 w-24 rounded bg-slate-200" />
              <div className="mb-2 h-4 w-full rounded bg-slate-100" />
              <div className="mb-2 h-4 w-5/6 rounded bg-slate-100" />
              <div className="mt-auto h-4 w-1/3 rounded bg-slate-200" />
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
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Workflows</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and organize your automated workflows.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative flex w-full items-center sm:w-64">
            <Search className="absolute left-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search workflows..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <Button onClick={handleCreateNew} icon={Plus} className="w-auto">
            Create New
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportAll}
            className="w-auto"
            icon={Upload}
          >
            Export All
          </Button>
          <Button
            variant="secondary"
            onClick={handleImportClick}
            className="w-auto"
            icon={Download}
            disabled={isImporting}
          >
            {isImporting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Importing...
              </span>
            ) : (
              'Import'
            )}
          </Button>
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
        <EmptyState
          title="No workflows yet"
          description="Create your first workflow to start automating tasks across your tools."
          actionLabel="Create Workflow"
          onAction={handleCreateNew}
        />
      ) : !hasFilteredResults ? (
        <EmptyState
          title="No workflows found"
          description="Try adjusting your search query or create a new workflow."
          actionLabel="Reset search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map((workflow) => (
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
              className="flex cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="mb-3 flex items-start justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {workflow.name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase text-indigo-600">
                    {(workflow.nodes?.length ?? 0).toString()} nodes
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-full p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      onClick={(event) => handleExportWorkflow(event, workflow)}
                      aria-label="Export workflow"
                    >
                      <Upload size={16} />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                      onClick={(event) =>
                        handleDuplicateWorkflow(event, workflow._id ?? undefined)
                      }
                      aria-label="Duplicate workflow"
                      disabled={duplicatingId === workflow._id}
                    >
                      {duplicatingId === workflow._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      onClick={(event) =>
                        handleDeleteWorkflow(event, workflow._id ?? undefined)
                      }
                      aria-label="Delete workflow"
                      disabled={deletingId === workflow._id}
                    >
                      {deletingId === workflow._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <p className="mb-4 line-clamp-3 text-sm text-gray-600">
                {workflow.description || 'No description provided.'}
              </p>
              <span className="mt-auto text-xs text-gray-400">
                Created{' '}
                {workflow.createdAt
                  ? new Date(workflow.createdAt).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowsList;

