import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

import Button from '../components/Button';
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
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-gray-500">Loading workflows...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Workflows</h1>
        <Button onClick={handleCreateNew} icon={Plus}>
          Create New
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          No workflows yet. Create your first workflow!
        </div>
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
                Created {new Date(workflow.createdAt ?? '').toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowsList;

