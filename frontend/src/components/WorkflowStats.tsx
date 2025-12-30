import type { Workflow } from '../types/workflow.types';

interface WorkflowStatsProps {
  workflow: Workflow;
}

const formatDate = (date?: string | Date) => {
  if (!date) {
    return '—';
  }
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    return '—';
  }
  const absolute = value.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const now = new Date();
  const diff = now.getTime() - value.getTime();
  const minutes = Math.round(diff / 60000);
  let relative = 'just now';
  if (minutes >= 1 && minutes < 60) {
    relative = `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (minutes >= 60 && minutes < 1440) {
    const hours = Math.round(minutes / 60);
    relative = `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    relative = `${days} day${days === 1 ? '' : 's'} ago`;
  }
  return `${absolute} · ${relative}`;
};

const WorkflowStats = ({ workflow }: WorkflowStatsProps) => {
  const totalNodes = workflow.nodes?.length ?? 0;
  const totalEdges = workflow.edges?.length ?? 0;
  const createdAt = formatDate(workflow.createdAt);
  const updatedAt = formatDate(workflow.updatedAt);
  const isActive = workflow.isActive ?? true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-forge-100">Workflow Statistics</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
            isActive
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-forge-800 text-forge-400 border border-forge-700'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-forge-700 bg-forge-800/40 p-4">
          <p className="text-sm font-semibold text-forge-400">Total Nodes</p>
          <p className="mt-1 text-2xl font-bold text-forge-100">{totalNodes}</p>
        </div>
        <div className="rounded-lg border border-forge-700 bg-forge-800/40 p-4">
          <p className="text-sm font-semibold text-forge-400">Total Edges</p>
          <p className="mt-1 text-2xl font-bold text-forge-100">{totalEdges}</p>
        </div>
        <div className="rounded-lg border border-forge-700 bg-forge-800/20 p-4 sm:col-span-2">
          <p className="text-sm font-semibold text-forge-400">Created</p>
          <p className="mt-1 text-sm text-forge-200">{createdAt}</p>
        </div>
        <div className="rounded-lg border border-forge-700 bg-forge-800/20 p-4 sm:col-span-2">
          <p className="text-sm font-semibold text-forge-400">Last Updated</p>
          <p className="mt-1 text-sm text-forge-200">{updatedAt}</p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStats;
