import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import Button from './Button';
import Input from './Input';
import { useWorkflowStore } from '../store/workflow.store';

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

const NodeConfigPanel = () => {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);

  const [label, setLabel] = useState('');
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setConfig(selectedNode.data.config || {});
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return null;
  }

  const handleConfigChange = (key: string, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    const updatedData = {
      ...selectedNode.data,
      label,
      config,
    };

    updateNode(selectedNode.id, { data: updatedData });
    setSelectedNode({
      ...selectedNode,
      data: updatedData,
    });
  };

  const handleClose = () => {
    setSelectedNode(null);
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
    <aside className="fixed right-0 top-0 z-30 flex h-full w-96 flex-col border-l border-gray-200 bg-white shadow-2xl">
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

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Label</label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Node label"
            />
          </div>

          {renderTypeSpecificFields()}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-200 p-4">
        <Button onClick={handleSave} disabled={!label}>
          Save Changes
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </div>
    </aside>
  );
};

export default NodeConfigPanel;

