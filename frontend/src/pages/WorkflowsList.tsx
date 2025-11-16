import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import workflowService from '../services/workflow.service';

const WorkflowsList = () => {
  const navigate = useNavigate();

  const {
    data: workflows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['workflows'],
    queryFn: workflowService.getAll,
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

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner />
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Workflows</h1>
        <Button onClick={handleCreateNew} icon={Plus} className="w-auto">
          Create New
        </Button>
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          title="No workflows yet"
          description="Create your first workflow to start automating tasks across your tools."
          actionLabel="Create Workflow"
          onAction={handleCreateNew}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
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
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase text-indigo-600">
                  {workflow.nodes.length} nodes
                </span>
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

