import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

import Button from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) => (
  <div className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-forge-700/50 bg-forge-900/60 backdrop-blur-sm px-8 py-16 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-forge-800/60 border border-forge-700/50 text-forge-400">
      {icon ?? <Inbox size={28} />}
    </div>
    <h2 className="text-xl font-semibold text-forge-50">{title}</h2>
    <p className="mt-2 max-w-md text-sm text-forge-400">{description}</p>
    {actionLabel && onAction ? (
      <Button className="mt-6 w-auto" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

export default EmptyState;

