import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

const statusColorMap = {
  success: 'text-emerald-600 bg-emerald-50',
  failed: 'text-rose-600 bg-rose-50',
  running: 'text-sky-600 bg-sky-50',
  pending: 'text-slate-500 bg-slate-100',
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
    <div className="rounded-lg border border-gray-100 bg-slate-50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-gray-800"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{label}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen ? (
        <pre className="max-h-64 overflow-auto px-4 pb-4 text-xs text-gray-700">
          {content}
        </pre>
      ) : null}
    </div>
  );
};

const ExecutionDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    data: execution,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => executionService.getOne(id ?? ''),
    enabled: Boolean(id),
  });

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
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          Failed to load execution details. Please try again later.
        </div>
      </div>
    );
  }

  const statusConfig = statusColorMap[execution.status];
  const StatusIcon = statusIconMap[execution.status] ?? AlertCircle;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
            onClick={() => navigate('/executions')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to executions
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Execution Details
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Workflow ID: {execution.workflowId}
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusConfig}`}>
          <StatusIcon className="h-4 w-4" />
          <span className="capitalize">{execution.status}</span>
        </div>
      </div>

      <div className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-gray-500">Started</p>
          <p className="mt-1 font-semibold text-gray-900">
            {formatDateTime(execution.startTime ?? execution.createdAt)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Ended</p>
          <p className="mt-1 font-semibold text-gray-900">
            {formatDateTime(execution.endTime)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Duration</p>
          <p className="mt-1 font-semibold text-gray-900">
            {execution.status === 'running'
              ? 'In progress'
              : formatDuration(execution.duration)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Triggered by</p>
          <p className="mt-1 font-semibold text-gray-900 capitalize">
            {execution.triggerSource ?? execution.triggerData?.source ?? 'manual'}
          </p>
        </div>
      </div>

      {execution.error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            Execution Error
          </div>
          <p className="mt-2 text-rose-800">{execution.error}</p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Node Logs</h2>
          <p className="text-sm text-gray-500">
            {execution.logs.length} steps
          </p>
        </div>

        {execution.logs.length === 0 ? (
          <p className="text-sm text-gray-500">No node logs available.</p>
        ) : (
          <ul className="space-y-4">
            {execution.logs.map((log: NodeExecutionLog, index: number) => {
              const LogIcon =
                statusIconMap[log.status === 'success' ? 'success' : 'failed'];
              const isSuccess = log.status === 'success';
              const nextLog = execution.logs[index + 1];
              const tookBranch = log.nodeType === 'condition' && log.branchTaken;
              return (
                <li
                  key={`${log.nodeId}-${log.startTime}`}
                  className={`rounded-2xl border bg-slate-50 p-4 ${
                    tookBranch
                      ? log.branchTaken === 'true'
                        ? 'border-emerald-200'
                        : 'border-rose-200'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                        <LogIcon
                          className={`h-4 w-4 ${
                            isSuccess ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        />
                        <span>
                          {log.nodeId} ({log.nodeType})
                        </span>
                      </div>
                      {log.branchTaken ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            log.branchTaken === 'true'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {log.branchTaken === 'true' ? '✓ True Path' : '✗ False Path'}
                        </span>
                          {nextLog ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                              <GitBranch className="h-3 w-3" />
                              {`Next: ${nextLog.nodeId} (${nextLog.nodeType})`}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="text-xs uppercase text-gray-500">
                        Attempt {log.attemptNumber ?? 1} • Started{' '}
                        {formatDateTime(log.startTime)}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      Duration: {formatDuration(log.duration)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <CollapsibleJson label="Input" data={log.input} />
                    <CollapsibleJson label="Output" data={log.output} />
                  </div>

                  {log.error ? (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
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


