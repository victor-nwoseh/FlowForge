import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Button from './Button';
import Input from './Input';
import { useWorkflowStore } from '../store/workflow.store';
import api from '../services/api';

type ConnectionSummary = {
  service: 'slack' | 'google';
  metadata?: Record<string, any>;
  createdAt?: string;
  hasToken?: boolean;
};

const TRIGGER_OPTIONS = [
  { label: 'Manual', value: 'manual' },
  { label: 'Schedule', value: 'schedule' },
  { label: 'Webhook', value: 'webhook' },
];

const ACTION_OPTIONS = [
  { label: 'Send Slack Message', value: 'slack_message' },
  { label: 'Send Email', value: 'send_email' },
  { label: 'HTTP Request', value: 'http_request' },
];

interface NodeConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NodeConfigPanel = ({ isOpen, onClose }: NodeConfigPanelProps) => {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);

  const { data: connections = [] } = useQuery<ConnectionSummary[]>({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections'),
  });

  const [label, setLabel] = useState('');
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setConfig(selectedNode.data.config || {});
    }
  }, [selectedNode]);

  const handleConfigChange = (key: string, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    if (!selectedNode) return;

    const updatedData = {
      ...selectedNode.data,
      label,
      config,
    };

    updateNode(selectedNode.id, { data: updatedData });
    toast.success('Node changes saved successfully');
    handleClose();
  };

  const handleClose = () => {
    setSelectedNode(null);
    onClose();
  };

  const handleDelete = () => {
    if (!selectedNode) {
      return;
    }

    const shouldDelete =
      window.confirm('Are you sure you want to delete this node?');

    if (!shouldDelete) {
      return;
    }

    deleteNode(selectedNode.id);
    toast.success('Node deleted successfully');
    handleClose();
  };

  const isServiceConnected = useMemo(
    () => (service: string) => connections.some((conn) => conn.service === service),
    [connections],
  );

  const googleConnected = isServiceConnected('google');
  const slackConnected = isServiceConnected('slack');

  const nodeType = selectedNode?.data?.type;
  const requiresSlack =
    nodeType === 'slack' ||
    (nodeType === 'action' && config?.actionType === 'slack_message');
  const requiresGoogle =
    nodeType === 'email' ||
    nodeType === 'sheets' ||
    (nodeType === 'action' && config?.actionType === 'send_email');

  const saveDisabled =
    !label || (requiresSlack && !slackConnected) || (requiresGoogle && !googleConnected);

  if (!selectedNode || !isOpen) {
    return null;
  }

  const renderConnectionWarning = (service: 'slack' | 'google', message: string) => {
    const connected = service === 'slack' ? slackConnected : googleConnected;
    if (connected) return null;

    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-amber-800">{message}</p>
          <button
            onClick={() => (window.location.href = '/integrations')}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Go to Integrations
          </button>
        </div>
      </div>
    );
  };

  const warningBanner = () => {
    if (requiresSlack && !slackConnected) {
      return renderConnectionWarning(
        'slack',
        'Warning: Slack not connected. Connect in Integrations to use this node.',
      );
    }

    if (nodeType === 'email' && !googleConnected) {
      return renderConnectionWarning(
        'google',
        'Warning: Gmail not connected. Connect in Integrations to use this node.',
      );
    }

    if (nodeType === 'sheets' && !googleConnected) {
      return renderConnectionWarning(
        'google',
        'Warning: Google Sheets not connected. Connect in Integrations to use this node.',
      );
    }

    if (nodeType === 'action' && config?.actionType === 'send_email' && !googleConnected) {
      return renderConnectionWarning(
        'google',
        'Warning: Gmail not connected. Connect in Integrations to use this node.',
      );
    }

    return null;
  };

  const renderTypeSpecificFields = () => {
    switch (selectedNode.data.type) {
      case 'trigger':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Trigger Type
            </label>
            <select
              value={config.triggerType || TRIGGER_OPTIONS[0].value}
              onChange={(event) =>
                handleConfigChange('triggerType', event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {TRIGGER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      case 'action':
        return (
          <div className="space-y-4">
            {config?.actionType === 'slack_message' &&
              renderConnectionWarning(
                'slack',
                'Warning: Slack not connected. Connect in Integrations to use this node.',
              )}
            {config?.actionType === 'send_email' &&
              renderConnectionWarning(
                'google',
                'Warning: Gmail not connected. Connect in Integrations to use this node.',
              )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Action Type
              </label>
              <select
                value={config.actionType || ACTION_OPTIONS[0].value}
                onChange={(event) =>
                  handleConfigChange('actionType', event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Webhook URL
              </label>
              <Input
                placeholder="https://example.com/webhook"
                value={config.webhookUrl || ''}
                onChange={(event) =>
                  handleConfigChange('webhookUrl', event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                className="h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Enter message content..."
                value={config.message || ''}
                onChange={(event) =>
                  handleConfigChange('message', event.target.value)
                }
              />
            </div>
          </div>
        );
      case 'slack':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Channel</label>
              <Input
                placeholder="#general"
                value={config.channel || ''}
                onChange={(event) => handleConfigChange('channel', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                className="h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Enter message content..."
                value={config.message || ''}
                onChange={(event) => handleConfigChange('message', event.target.value)}
              />
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To</label>
              <Input
                placeholder="user@example.com"
                value={config.to || ''}
                onChange={(event) => handleConfigChange('to', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <Input
                placeholder="Subject"
                value={config.subject || ''}
                onChange={(event) => handleConfigChange('subject', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Body</label>
              <textarea
                className="h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Email body..."
                value={config.body || ''}
                onChange={(event) => handleConfigChange('body', event.target.value)}
              />
            </div>
          </div>
        );
      case 'sheets':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Spreadsheet ID</label>
              <Input
                placeholder="Spreadsheet ID"
                value={config.spreadsheetId || ''}
                onChange={(event) => handleConfigChange('spreadsheetId', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Range</label>
              <Input
                placeholder="Sheet1!A1:B2"
                value={config.range || ''}
                onChange={(event) => handleConfigChange('range', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Operation</label>
              <select
                value={config.operation || 'read'}
                onChange={(event) => handleConfigChange('operation', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
              </select>
            </div>
            {config.operation === 'write' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Values (JSON 2D array)</label>
                <textarea
                  className="h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder='e.g., [["a","b"],["c","d"]]'
                  value={config.values || ''}
                  onChange={(event) => handleConfigChange('values', event.target.value)}
                />
              </div>
            )}
          </div>
        );
      case 'condition':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Condition Expression
            </label>
            <textarea
              className="h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="e.g., data.value > 10"
              value={config.expression || ''}
              onChange={(event) =>
                handleConfigChange('expression', event.target.value)
              }
            />
          </div>
        );
      case 'delay':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Delay (seconds)
            </label>
            <Input
              type="number"
              min={0}
              value={config.delaySeconds ?? ''}
              onChange={(event) =>
                handleConfigChange('delaySeconds', Number(event.target.value))
              }
              placeholder="60"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Configure Node
            </h3>
            <p className="text-sm text-gray-500">
              {selectedNode.data.type.toUpperCase()} NODE
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close configuration panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Label</label>
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Node label"
              />
            </div>

            {warningBanner()}
            {renderTypeSpecificFields()}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-200 p-4">
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Delete Node
          </Button>
          <Button onClick={handleSave} disabled={saveDisabled} className="flex-1">
            Save Changes
          </Button>
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NodeConfigPanel;

