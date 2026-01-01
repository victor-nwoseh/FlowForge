import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  FileSpreadsheet,
  GitBranch,
  Globe,
  Mail,
  MessageSquare,
  Play,
  Repeat,
  Webhook,
  Zap,
} from 'lucide-react';

type PaletteNode = {
  type: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  category: 'trigger' | 'action' | 'logic';
  description?: string;
};

// Category accent colors for the Warm Forge theme
const CATEGORY_ACCENTS = {
  trigger: {
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-500/10',
    iconRing: 'ring-amber-500/20',
  },
  action: {
    border: 'border-l-ember-400',
    iconBg: 'bg-ember-500/10',
    iconRing: 'ring-ember-500/20',
  },
  logic: {
    border: 'border-l-bronze-400',
    iconBg: 'bg-bronze-500/10',
    iconRing: 'ring-bronze-500/20',
  },
} as const;

const NODE_TYPES: PaletteNode[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: Play,
    category: 'trigger',
    description: 'Starts the workflow when conditions are met.',
  },
  {
    type: 'action',
    label: 'Action',
    icon: Zap,
    category: 'action',
    description: 'Performs a task or operation.',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    category: 'logic',
    description: 'Branch logic based on conditions.',
  },
  {
    type: 'ifElse',
    label: 'If/Else',
    icon: GitBranch,
    category: 'logic',
    description: 'Execute different actions based on condition',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: Repeat,
    category: 'logic',
    description: 'Iterate over array and execute actions for each item',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: Clock,
    category: 'logic',
    description: 'Pause execution for a specified time.',
  },
  {
    type: 'variable',
    label: 'Variable',
    icon: Database,
    category: 'logic',
    description: 'Store or transform data within the workflow.',
  },
  {
    type: 'slack',
    label: 'Slack',
    icon: MessageSquare,
    category: 'action',
    description: 'Send messages to Slack channels.',
  },
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    category: 'action',
    description: 'Send email notifications.',
  },
  {
    type: 'http',
    label: 'HTTP Request',
    icon: Globe,
    category: 'action',
    description: 'Make HTTP requests to external services.',
  },
  {
    type: 'sheets',
    label: 'Google Sheets',
    icon: FileSpreadsheet,
    category: 'action',
    description: 'Read or write data to Google Sheets.',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    category: 'trigger',
    description: 'Handle incoming webhook requests.',
  },
] as const;

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Triggers', value: 'trigger' },
  { label: 'Actions', value: 'action' },
  { label: 'Logic', value: 'logic' },
] as const;

type FilterValue = (typeof FILTERS)[number]['value'];

type NodePaletteProps = {
  isCollapsed?: boolean;
  onToggle?: () => void;
};

const NodePalette = ({ isCollapsed = false, onToggle }: NodePaletteProps) => {
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
    <aside
      className={`
        flex h-full flex-col border-r border-forge-700/50 bg-forge-900/80 backdrop-blur-xl
        transition-all duration-300 ease-in-out relative
        ${isCollapsed ? 'w-12' : 'w-64'}
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`
          absolute top-4 z-20 flex h-8 w-8 items-center justify-center
          rounded-full border border-forge-700/50 bg-forge-800/80 backdrop-blur-sm
          text-forge-300 shadow-lg
          transition-all duration-300 ease-in-out
          hover:bg-forge-700 hover:text-ember-400 hover:border-ember-500/50
          focus:outline-none focus:ring-2 focus:ring-ember-500/50
          ${isCollapsed ? 'right-2' : '-right-4'}
        `}
        title={isCollapsed ? 'Expand palette' : 'Collapse palette'}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Collapsed State - Vertical Icon Strip */}
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-2 py-16 px-1.5">
          {NODE_TYPES.slice(0, 8).map(({ type, icon: Icon, category }) => {
            const accent = CATEGORY_ACCENTS[category];
            return (
              <div
                key={type}
                draggable
                onDragStart={(event) => onDragStart(event, type)}
                className={`
                  flex h-8 w-8 cursor-grab items-center justify-center rounded-lg
                  border border-forge-700/50 border-l-2 ${accent.border}
                  bg-forge-800/60 backdrop-blur-sm
                  transition-all duration-200
                  hover:bg-forge-800/80 hover:border-ember-500/40 hover:scale-110
                  active:cursor-grabbing active:scale-95
                `}
                title={type.charAt(0).toUpperCase() + type.slice(1)}
              >
                <Icon size={14} className="text-forge-200" />
              </div>
            );
          })}
          <div className="mt-1 h-px w-6 bg-forge-700/50" />
          <span className="text-[10px] text-forge-500 writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
            +{NODE_TYPES.length - 8} more
          </span>
        </div>
      ) : (
        <>
          {/* Header Section */}
          <div className="border-b border-forge-700/50 p-4">
            <h2 className="text-lg font-semibold text-forge-50">Node Palette</h2>
            <p className="mt-1 text-sm text-forge-400">
              Drag nodes onto the canvas to build your workflow.
            </p>
            <p className="mt-1 text-xs text-forge-500">
              Double-tap a node to open its configuration panel.
            </p>

            {/* Filter Tabs */}
            <div className="mt-4 flex flex-wrap gap-2">
              {FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ember-500/50 ${
                    filter === value
                      ? 'bg-ember-500/20 text-ember-300 shadow-sm shadow-ember-500/10 ring-1 ring-ember-500/30'
                      : 'bg-forge-800/50 text-forge-400 hover:bg-forge-800 hover:text-forge-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Node Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-3">
              {filteredNodeTypes.map(({ type, label, icon: Icon, category, description }, index) => {
                const accent = CATEGORY_ACCENTS[category];
                return (
                  <div
                    key={type}
                    draggable
                    onDragStart={(event) => onDragStart(event, type)}
                    className={`
                      group flex cursor-grab items-center gap-3 rounded-xl
                      border border-forge-700/50 border-l-2 ${accent.border}
                      bg-forge-800/60 backdrop-blur-sm p-3
                      transition-all duration-200 ease-out
                      hover:bg-forge-800/80 hover:border-ember-500/40 hover:shadow-ember-sm
                      hover:-translate-y-0.5
                      active:cursor-grabbing active:scale-[0.98]
                      focus:outline-none focus:ring-2 focus:ring-ember-500/50
                    `}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                    tabIndex={0}
                  >
                    {/* Icon Container */}
                    <div className={`
                      flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                      ${accent.iconBg} ring-1 ${accent.iconRing}
                      transition-all duration-200 group-hover:ring-ember-500/30
                    `}>
                      <Icon size={20} className="text-forge-100" />
                    </div>

                    {/* Text Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-forge-100 truncate">{label}</p>
                      <p className="text-xs text-forge-400 truncate">
                        {description || type}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

export default NodePalette;

