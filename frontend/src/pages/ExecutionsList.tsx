import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, Play, XCircle } from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { executionService } from '../services/execution.service';
import type {
  Execution,
  ExecutionStatus,
} from '../types/execution.types';

type StatusIconComponent = React.ComponentType<{
  size?: number | string;
  className?: string;
}>;

const statusIconMap: Record<
  ExecutionStatus,
  { icon: StatusIconComponent; color: string }
> = {
  success: { icon: CheckCircle, color: 'text-emerald-600' },
  failed: { icon: XCircle, color: 'text-rose-600' },
  running: { icon: Play, color: 'text-sky-600' },
  pending: { icon: Clock, color: 'text-slate-500' },
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const formatDuration = (execution: Execution) => {
  if (execution.status === 'running' || execution.status === 'pending') {
    return 'In progress';
  }
  if (typeof execution.duration === 'number') {
    return `${Math.max(0, Math.round(execution.duration / 1000))}s`;
  }
  return '—';
};

const ExecutionsList = () => {
  const navigate = useNavigate();
  const {
    data: executions = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['executions'],
    queryFn: () => executionService.getAll(),
  });

  const hasExecutions = executions.length > 0;

  const sortedExecutions = useMemo(
    () =>
      [...executions].sort((a, b) => {
        const aTime = new Date(a.startTime ?? a.createdAt).getTime();
        const bTime = new Date(b.startTime ?? b.createdAt).getTime();
        return bTime - aTime;
      }),
    [executions],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          Failed to load executions. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Execution History</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review workflow runs, statuses, and durations.
        </p>
      </div>

      {!hasExecutions ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-center">
          <p className="text-lg font-semibold text-gray-900">No executions yet</p>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Trigger a workflow execution to see it appear here.
          </p>
          <Button
            className="mt-4 w-auto"
            onClick={() => navigate('/workflows')}
            icon={Play}
          >
            Go to Workflows
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="hidden bg-slate-50 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-500 md:grid md:grid-cols-[1.2fr,0.8fr,0.8fr,0.6fr,0.6fr]">
            <span>Workflow</span>
            <span>Status</span>
            <span>Started</span>
            <span>Duration</span>
            <span>Actions</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {sortedExecutions.map((execution) => {
              const statusConfig = statusIconMap[execution.status];
              const StatusIcon = statusConfig.icon;

              return (
                <li
                  key={execution._id}
                  className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50 md:grid md:grid-cols-[1.2fr,0.8fr,0.8fr,0.6fr,0.6fr] md:items-center md:px-6"
                >
                  <div className="font-medium text-gray-900">
                    {execution.triggerData?.workflowName ??
                      execution.workflowId ??
                      'Untitled workflow'}
                    <p className="text-sm text-gray-500">
                      Trigger: {execution.triggerData?.source ?? 'manual'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-gray-800">
                    <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                    <span className="capitalize">{execution.status}</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatDateTime(execution.startTime ?? execution.createdAt)}
                  </div>
                  <div className="text-sm text-gray-700">{formatDuration(execution)}</div>
                  <div>
                    <Button
                      className="w-full md:w-auto"
                      variant="secondary"
                      onClick={() => navigate(`/executions/${execution._id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExecutionsList;


