import { memo } from 'react';
import { Handle, Position } from 'reactflow';
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

import type { WorkflowNode } from '../types/workflow.types';

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

type CustomNodeProps = WorkflowNode & { selected?: boolean };

const CustomNode = ({ data, selected }: CustomNodeProps) => {
  const Icon = ICONS[data.type as keyof typeof ICONS] ?? Play;

  return (
    <div
      className={`relative rounded-lg border bg-white px-4 py-3 shadow-md transition ${
        selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{data.label}</p>
          <p className="text-xs uppercase text-gray-400">{data.type}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(CustomNode);

