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
  <div className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
      {icon ?? <Inbox size={28} />}
    </div>
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>
    {actionLabel && onAction ? (
      <Button className="mt-6 w-auto" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

export default EmptyState;

