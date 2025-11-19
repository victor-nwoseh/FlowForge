import { useMemo, useState } from 'react';
import {
  Clock,
  Database,
  FileSpreadsheet,
  GitBranch,
  Globe,
  Mail,
  MessageSquare,
  Play,
  Webhook,
  Zap,
} from 'lucide-react';

const NODE_TYPES = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: Play,
    color: 'from-blue-500 to-blue-600',
    category: 'trigger',
  },
  {
    type: 'action',
    label: 'Action',
    icon: Zap,
    color: 'from-emerald-500 to-emerald-600',
    category: 'action',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    color: 'from-amber-500 to-amber-600',
    category: 'logic',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: Clock,
    color: 'from-purple-500 to-purple-600',
    category: 'logic',
  },
  {
    type: 'variable',
    label: 'Variable',
    icon: Database,
    color: 'from-cyan-500 to-cyan-600',
    category: 'logic',
  },
  {
    type: 'slack',
    label: 'Slack',
    icon: MessageSquare,
    color: 'from-blue-400 to-blue-500',
    category: 'action',
  },
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    color: 'from-pink-500 to-pink-600',
    category: 'action',
  },
  {
    type: 'http',
    label: 'HTTP Request',
    icon: Globe,
    color: 'from-indigo-500 to-indigo-600',
    category: 'action',
  },
  {
    type: 'sheets',
    label: 'Google Sheets',
    icon: FileSpreadsheet,
    color: 'from-green-500 to-green-600',
    category: 'action',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    color: 'from-orange-500 to-orange-600',
    category: 'trigger',
  },
] as const;

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Triggers', value: 'trigger' },
  { label: 'Actions', value: 'action' },
  { label: 'Logic', value: 'logic' },
] as const;

type FilterValue = (typeof FILTERS)[number]['value'];

const NodePalette = () => {
  const [filter, setFilter] = useState<FilterValue>('all');

  const filteredNodeTypes = useMemo(() => {
    if (filter === 'all') {
      return NODE_TYPES;
    }
    return NODE_TYPES.filter((node) => node.category === filter);
  }, [filter]);

  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string,
  ) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ type: nodeType }),
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Node Palette</h2>
        <p className="mt-1 text-sm text-gray-500">
          Drag nodes onto the canvas to build your workflow.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Double-tap a node to open its configuration panel.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                filter === value
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {filteredNodeTypes.map(({ type, label, icon: Icon, color }) => (
            <div
              key={type}
              draggable
              onDragStart={(event) => onDragStart(event, type)}
              className={`group flex cursor-pointer items-center gap-3 rounded-lg border border-white/20 bg-gradient-to-r p-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${color}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-white/80 uppercase">{type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default NodePalette;

