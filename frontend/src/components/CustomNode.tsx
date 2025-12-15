import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
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

import type { NodeData } from '../types/workflow.types';

const ICONS = {
  trigger: Play,
  action: Zap,
  condition: GitBranch,
  delay: Clock,
  variable: Database,
  slack: MessageSquare,
  email: Mail,
  http: Globe,
  sheets: FileSpreadsheet,
  webhook: Webhook,
} as const;

type CustomNodeProps = NodeProps<NodeData>;

const CustomNode = ({ data, selected }: CustomNodeProps) => {
  const Icon = ICONS[data.type as keyof typeof ICONS] ?? Play;
  const isCondition = data.type === 'condition';

  return (
    <div
      className={`group relative rounded-lg border bg-white px-4 py-3 shadow-md transition ${
        selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
      }`}
    >
      <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        In
      </span>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3.5 !w-3.5 border-2 border-white bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.15)] transition group-hover:shadow-[0_0_0_6px_rgba(99,102,241,0.25)]"
      />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <Icon size={20} />
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {data.label}
            {isCondition && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                <GitBranch size={12} />
                Branch
              </span>
            )}
          </p>
          <p className="text-xs uppercase text-gray-400">{data.type}</p>
        </div>
      </div>
      {isCondition ? (
        <>
          <Handle
            id="false"
            type="source"
            position={Position.Left}
            style={{ top: '70%' }}
            className="!h-3.5 !w-3.5 border-2 border-white bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)] transition group-hover:shadow-[0_0_0_6px_rgba(239,68,68,0.25)]"
          />
          <span className="pointer-events-none absolute left-0 top-[78%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-red-500">
            False
          </span>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: '70%' }}
            className="!h-3.5 !w-3.5 border-2 border-white bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)] transition group-hover:shadow-[0_0_0_6px_rgba(34,197,94,0.25)]"
          />
          <span className="pointer-events-none absolute right-0 top-[78%] translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-green-600">
            True
          </span>
        </>
      ) : (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            className="!h-3.5 !w-3.5 border-2 border-white bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.15)] transition group-hover:shadow-[0_0_0_6px_rgba(99,102,241,0.25)]"
          />
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Out
          </span>
        </>
      )}
    </div>
  );
};

export default memo(CustomNode);

