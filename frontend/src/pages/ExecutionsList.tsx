import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, Play, XCircle } from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import { executionService } from '../services/execution.service';
import type {
  Execution,
  ExecutionStatus,
} from '../types/execution.types';

type StatusIconComponent = React.ComponentType<{
  size?: number | string;
  className?: string;
}>;

const statusConfig: Record<
  ExecutionStatus,
  { icon: StatusIconComponent; iconColor: string; badgeClass: string; label: string }
> = {
  success: {
    icon: CheckCircle,
    iconColor: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    label: 'Success',
  },
  failed: {
    icon: XCircle,
    iconColor: 'text-red-400',
    badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
    label: 'Failed',
  },
  running: {
    icon: Play,
    iconColor: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse',
    label: 'Running',
  },
  pending: {
    icon: Clock,
    iconColor: 'text-forge-400',
    badgeClass: 'bg-forge-700/50 text-forge-400 border border-forge-600/30',
    label: 'Pending',
  },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const workflowFilter = searchParams.get('workflowId') ?? undefined;
  const {
    data: executions = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['executions', workflowFilter],
    queryFn: () => executionService.getAll(workflowFilter),
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
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm text-red-300">
          Failed to load executions. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-forge-50">Execution History</h1>
        <p className="mt-1 text-sm text-forge-400">
          Review workflow runs, statuses, and durations.
        </p>
        {workflowFilter ? (
          <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-ember-500/15 border border-ember-500/30 px-4 py-1.5 text-sm text-ember-300">
            <span>Filtering by workflow</span>
            <code className="px-2 py-0.5 rounded bg-forge-800/60 text-ember-200 font-mono text-xs">
              {workflowFilter}
            </code>
            <button
              type="button"
              className="text-xs font-semibold uppercase text-ember-400 hover:text-ember-200 transition-colors"
              onClick={() => {
                setSearchParams((prev) => {
                  const params = new URLSearchParams(prev);
                  params.delete('workflowId');
                  return params;
                });
              }}
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      {!hasExecutions ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-forge-700/50 bg-forge-800/40 text-center">
          <div className="w-12 h-12 rounded-full bg-forge-700/50 flex items-center justify-center mb-4">
            <Play className="w-6 h-6 text-forge-400" />
          </div>
          <p className="text-lg font-semibold text-forge-200">No executions yet</p>
          <p className="mt-2 max-w-sm text-sm text-forge-400">
            Trigger a workflow execution to see it appear here.
          </p>
          <button
            onClick={() => navigate('/workflows')}
            className="mt-5 px-5 py-2.5 rounded-lg font-medium bg-gradient-to-r from-ember-500 to-ember-400 text-forge-950 hover:from-ember-400 hover:to-ember-300 transition-all duration-200"
          >
            Go to Workflows
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forge-700/50 bg-forge-900/80 backdrop-blur-xl shadow-2xl shadow-black/20">
          <div className="hidden bg-forge-800/60 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-forge-400 border-b border-forge-700/50 md:grid md:grid-cols-[1.2fr,0.8fr,0.8fr,0.6fr,0.6fr]">
            <span>Workflow</span>
            <span>Status</span>
            <span>Started</span>
            <span>Duration</span>
            <span>Actions</span>
          </div>
          <ul className="divide-y divide-forge-700/30">
            {sortedExecutions.map((execution) => {
              const status = statusConfig[execution.status];
              const StatusIcon = status.icon;

              return (
                <li
                  key={execution._id}
                  className="flex flex-col gap-3 px-4 py-4 transition-all duration-200 hover:bg-forge-800/40 shadow-[inset_3px_0_0_0_transparent] hover:shadow-[inset_3px_0_0_0_#e65c00] md:grid md:grid-cols-[1.2fr,0.8fr,0.8fr,0.6fr,0.6fr] md:items-center md:px-6"
                >
                  <div>
                    <p className="font-medium text-forge-50">
                      {execution.triggerData?.workflowName ??
                        execution.workflowId ??
                        'Untitled workflow'}
                    </p>
                    <p className="text-sm text-forge-400 mt-0.5">
                      Trigger: {execution.triggerSource ?? execution.triggerData?.source ?? 'manual'}
                    </p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.badgeClass}`}>
                      <StatusIcon className={`h-3.5 w-3.5 ${status.iconColor}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="text-sm text-forge-300">
                    {formatDateTime(execution.startTime ?? execution.createdAt)}
                  </div>
                  <div className="text-sm text-forge-300 font-mono">
                    {formatDuration(execution)}
                  </div>
                  <div>
                    <button
                      onClick={() => navigate(`/executions/${execution._id}`)}
                      className="w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-forge-800/60 text-forge-300 border border-forge-700/50 hover:bg-forge-700/60 hover:text-ember-300 hover:border-ember-500/30 transition-all duration-200"
                    >
                      View Details
                    </button>
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


