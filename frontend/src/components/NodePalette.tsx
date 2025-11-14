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
  },
  {
    type: 'action',
    label: 'Action',
    icon: Zap,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    color: 'from-amber-500 to-amber-600',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: Clock,
    color: 'from-purple-500 to-purple-600',
  },
  {
    type: 'variable',
    label: 'Variable',
    icon: Database,
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    type: 'slack',
    label: 'Slack',
    icon: MessageSquare,
    color: 'from-blue-400 to-blue-500',
  },
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    color: 'from-pink-500 to-pink-600',
  },
  {
    type: 'http',
    label: 'HTTP Request',
    icon: Globe,
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    type: 'sheets',
    label: 'Google Sheets',
    icon: FileSpreadsheet,
    color: 'from-green-500 to-green-600',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    color: 'from-orange-500 to-orange-600',
  },
] as const;

const NodePalette = () => {
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
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {NODE_TYPES.map(({ type, label, icon: Icon, color }) => (
            <div
              key={type}
              draggable
              onDragStart={(event) => onDragStart(event, type)}
              className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-gradient-to-r p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.4)',
                backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
              }}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white ${color}`}
              >
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

