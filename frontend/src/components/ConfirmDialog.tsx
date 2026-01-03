import { useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

const ConfirmDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
      }
    },
    [isOpen, onConfirm, onCancel],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-500/15 border-red-500/30',
      iconColor: 'text-red-400',
      confirmBtn:
        'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/50',
      Icon: Trash2,
    },
    warning: {
      iconBg: 'bg-amber-500/15 border-amber-500/30',
      iconColor: 'text-amber-400',
      confirmBtn:
        'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50',
      Icon: AlertTriangle,
    },
    default: {
      iconBg: 'bg-ember-500/15 border-ember-500/30',
      iconColor: 'text-ember-400',
      confirmBtn:
        'bg-gradient-to-r from-ember-500 to-ember-400 text-white hover:from-ember-400 hover:to-ember-300',
      Icon: AlertTriangle,
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.Icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forge-950/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-forge-900/95 backdrop-blur-xl border border-forge-700/50 p-6 shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border ${styles.iconBg} flex-shrink-0`}
          >
            <Icon className={`h-6 w-6 ${styles.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-forge-50">{title}</h3>
            <p className="mt-1 text-sm text-forge-400 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-forge-500 hover:text-forge-300 hover:bg-forge-800/60 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-forge-700/50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-forge-800/60 text-forge-300 border border-forge-700/50 hover:bg-forge-700/60 hover:text-forge-200 hover:border-forge-600/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-forge-600/30"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-forge-900 ${styles.confirmBtn} ${
              variant === 'danger' ? 'focus:ring-red-500/50' : variant === 'warning' ? 'focus:ring-amber-500/50' : 'focus:ring-ember-500/50'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
