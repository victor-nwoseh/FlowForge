import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  XCircle,
} from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import { executionService } from '../services/execution.service';
import type { NodeExecutionLog } from '../types/execution.types';
import useExecutionSocket from '../hooks/useExecutionSocket';
import toast from 'react-hot-toast';

const statusColorMap = {
  success: 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30',
  failed: 'text-red-400 bg-red-500/15 border border-red-500/30',
  running: 'text-amber-400 bg-amber-500/15 border border-amber-500/30 animate-pulse',
  pending: 'text-forge-400 bg-forge-700/50 border border-forge-600/30',
};

const statusIconMap = {
  success: CheckCircle,
  failed: XCircle,
  running: AlertCircle,
  pending: AlertCircle,
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

const formatDuration = (duration?: number) => {
  if (duration === undefined || duration === null) {
    return '—';
  }
  const seconds = Math.max(0, Math.round(duration / 1000));
  return `${seconds}s`;
};

const CollapsibleJson = ({
  label,
  data,
}: {
  label: string;
  data: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const content = useMemo(
    () => JSON.stringify(data, null, 2),
    [data],
  );

  return (
    <div className="rounded-lg border border-forge-700/30 bg-forge-800/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-forge-200 hover:bg-forge-700/30 rounded-lg transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{label}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-forge-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-forge-400" />
        )}
      </button>
      {isOpen ? (
        <pre className="max-h-64 overflow-auto px-4 pb-4 text-xs text-forge-300 font-mono">
          {content}
        </pre>
      ) : null}
    </div>
  );
};

const ExecutionDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { executionStarted, nodeCompleted, executionCompleted, progress } =
    useExecutionSocket();
  const [liveStatus, setLiveStatus] = useState<'running' | 'completed' | null>(null);
  const [liveNodes, setLiveNodes] = useState<Map<string, 'success' | 'failed' | 'running'>>(
    new Map(),
  );

  const {
    data: execution,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => executionService.getOne(id ?? ''),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!executionStarted) return;
    if (executionStarted.executionId === id) {
      setLiveStatus('running');
      toast.success('Execution started');
      return;
    }
    if (execution && executionStarted.workflowId === execution.workflowId) {
      navigate(`/executions/${executionStarted.executionId}`);
    }
  }, [executionStarted, id, execution, navigate]);

  useEffect(() => {
    if (nodeCompleted && nodeCompleted.executionId === id) {
      setLiveNodes((prev) => {
        const next = new Map(prev);
        next.set(nodeCompleted.nodeId, nodeCompleted.status);
        return next;
      });
    }
  }, [nodeCompleted, id]);

  useEffect(() => {
    if (executionCompleted && executionCompleted.executionId === id) {
      setLiveStatus('completed');
      toast(
        executionCompleted.status === 'success'
          ? 'Execution completed successfully'
          : 'Execution failed',
      );
      queryClient.invalidateQueries({ queryKey: ['execution', id] });
      setTimeout(() => {
        setLiveStatus(null);
        setLiveNodes(new Map());
      }, 1500);
    }
  }, [executionCompleted, id, queryClient]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !execution) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm text-red-300">
          Failed to load execution details. Please try again later.
        </div>
      </div>
    );
  }

  const statusConfig = statusColorMap[execution.status];
  const StatusIcon = statusIconMap[execution.status] ?? AlertCircle;

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ember-400 transition-colors hover:text-ember-300"
            onClick={() => navigate('/executions')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to executions
          </button>
          <h1 className="text-2xl font-semibold text-forge-50">
            Execution Details
          </h1>
          <p className="mt-1 text-sm text-forge-400">
            Workflow ID: <code className="px-2 py-0.5 rounded bg-forge-800/60 text-forge-300 font-mono text-xs">{execution.workflowId}</code>
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusConfig}`}>
          <StatusIcon className="h-4 w-4" />
          <span className="capitalize">{execution.status}</span>
        </div>
      </div>

      <div className="mb-6 grid gap-4 rounded-2xl border border-forge-700/50 bg-forge-900/80 backdrop-blur-xl p-6 shadow-2xl shadow-black/20 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-forge-500">Started</p>
          <p className="mt-1.5 font-semibold text-forge-50">
            {formatDateTime(execution.startTime ?? execution.createdAt)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-forge-500">Ended</p>
          <p className="mt-1.5 font-semibold text-forge-50">
            {formatDateTime(execution.endTime)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-forge-500">Duration</p>
          <p className="mt-1.5 font-semibold text-forge-50 font-mono">
            {execution.status === 'running'
              ? 'In progress'
              : formatDuration(execution.duration)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-forge-500">Triggered by</p>
          <p className="mt-1.5 font-semibold text-forge-50 capitalize">
            {execution.triggerSource ?? execution.triggerData?.source ?? 'manual'}
          </p>
        </div>
      </div>

      {execution.error ? (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <div className="flex items-center gap-2 font-semibold text-red-200">
            <AlertCircle className="h-4 w-4 text-red-400" />
            Execution Error
          </div>
          <p className="mt-2 text-red-300">{execution.error}</p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-forge-700/50 bg-forge-900/80 backdrop-blur-xl p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-forge-50">Node Logs</h2>
            {liveStatus === 'running' ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-ember-500/15 border border-ember-500/30 px-3 py-1 text-xs font-semibold text-ember-300 animate-pulse">
                Executing...
              </span>
            ) : null}
          </div>
          <div className="text-sm text-forge-400">
            {execution.logs.length} steps
            {progress && (
              <div className="mt-1 flex items-center gap-2 text-xs text-ember-300">
                <div className="h-2 w-32 overflow-hidden rounded-full bg-forge-700/50">
                  <div
                    className="h-2 bg-gradient-to-r from-ember-500 to-ember-400 transition-all"
                    style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                  />
                </div>
                <span>
                  {progress.completed} / {progress.total} ({Math.round(progress.percentage)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {execution.logs.length === 0 ? (
          <p className="text-sm text-forge-400">No node logs available.</p>
        ) : (
          <ul className="space-y-4">
            {execution.logs.map((log: NodeExecutionLog, index: number) => {
              const LogIcon =
                statusIconMap[log.status === 'success' ? 'success' : 'failed'];
              const isSuccess = log.status === 'success';
              const nextLog = execution.logs[index + 1];
              const tookBranch = log.nodeType === 'condition' && log.branchTaken;
              const liveNodeStatus = liveNodes.get(log.nodeId);
              const isLiveRunning = liveStatus === 'running' && liveNodeStatus === 'running';
              const isLiveDoneSuccess = liveNodeStatus === 'success';
              const isLiveDoneFailed = liveNodeStatus === 'failed';
              return (
                <li
                  key={`${log.nodeId}-${log.startTime}`}
                  className={`rounded-2xl border bg-forge-800/60 p-4 transition-all duration-200 ${
                    tookBranch
                      ? log.branchTaken === 'true'
                        ? 'border-l-2 border-l-emerald-500 border-t-forge-700/50 border-r-forge-700/50 border-b-forge-700/50'
                        : 'border-l-2 border-l-red-500 border-t-forge-700/50 border-r-forge-700/50 border-b-forge-700/50'
                      : 'border-forge-700/50'
                  }`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-base font-semibold text-forge-50">
                        <LogIcon
                          className={`h-4 w-4 ${
                            isSuccess ? 'text-emerald-400' : 'text-red-400'
                          } ${isLiveRunning ? 'animate-pulse' : ''}`}
                        />
                        <span>
                          {log.nodeId} <span className="text-forge-400 font-normal">({log.nodeType})</span>
                        </span>
                        {isLiveRunning && (
                          <span className="text-xs font-semibold text-ember-400 animate-pulse">
                            running...
                          </span>
                        )}
                        {isLiveDoneSuccess && (
                          <span className="text-xs font-semibold text-emerald-400">
                            updated
                          </span>
                        )}
                        {isLiveDoneFailed && (
                          <span className="text-xs font-semibold text-red-400">
                            updated
                          </span>
                        )}
                      </div>
                      {log.branchTaken ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
                            log.branchTaken === 'true'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}
                        >
                          {log.branchTaken === 'true' ? '✓ True Path' : '✗ False Path'}
                        </span>
                          {nextLog ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-forge-700/50 px-2.5 py-1 text-[11px] font-semibold text-forge-400">
                              <GitBranch className="h-3 w-3" />
                              {`Next: ${nextLog.nodeId} (${nextLog.nodeType})`}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="mt-1 text-xs uppercase tracking-wider text-forge-500">
                        Attempt {log.attemptNumber ?? 1} • Started{' '}
                        {formatDateTime(log.startTime)}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-forge-300 font-mono">
                      Duration: {formatDuration(log.duration)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <CollapsibleJson label="Input" data={log.input} />
                    <CollapsibleJson label="Output" data={log.output} />
                  </div>

                  {log.error ? (
                    <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                      {log.error}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ExecutionDetails;


