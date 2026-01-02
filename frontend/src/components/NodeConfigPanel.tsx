import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import cronstrue from 'cronstrue';

import { useWorkflowStore } from '../store/workflow.store';
import api from '../services/api';

type ConnectionSummary = {
  service: 'slack' | 'google';
  metadata?: Record<string, any>;
  createdAt?: string;
  hasToken?: boolean;
};

const ACTION_OPTIONS = [
  { label: 'Send Slack Message', value: 'slack_message' },
  { label: 'Send Email', value: 'send_email' },
  { label: 'HTTP Request', value: 'http_request' },
];

const CRON_PRESETS = [
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 10 AM', value: '0 10 * * 1' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
];

const describeCron = (value: string) => {
  const v = value.trim();
  if (!v.match(/^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/)) return '';
  try {
    return `Runs ${cronstrue.toString(v, { use24HourTimeFormat: true })}`;
  } catch {
    return 'Runs per the specified cron schedule';
  }
};

interface NodeConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NodeConfigPanel = ({ isOpen, onClose }: NodeConfigPanelProps) => {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const nodes = useWorkflowStore((state) => state.nodes);

  const { data: connections = [] } = useQuery<ConnectionSummary[]>({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections'),
  });

  const [label, setLabel] = useState('');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [triggerType, setTriggerType] = useState<'manual' | 'scheduled'>('manual');
  const [cronExpression, setCronExpression] = useState('');
  const loopSourceType = useMemo<'node' | 'variable'>(() => {
    const src = (config.arraySource ?? '').toString();
    if (src.startsWith('node_') && src.includes('.')) {
      return 'node';
    }
    return 'variable';
  }, [config.arraySource]);

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      const nodeConfig = selectedNode.data.config || {};
      // Normalize if/else configs so builder fields are prefilled
      if (selectedNode.data.type === 'ifElse') {
        const condition = typeof nodeConfig.condition === 'string' ? nodeConfig.condition : '';
        const operator = typeof nodeConfig.operator === 'string' ? nodeConfig.operator : '==';
        const value = nodeConfig.value ?? '';
        // Attempt to parse expression if fields missing
        if (!condition && !nodeConfig.condition && typeof nodeConfig.expression === 'string') {
          const parts = nodeConfig.expression.split(' ');
          if (parts.length >= 3) {
            nodeConfig.condition = parts[0];
            nodeConfig.operator = parts[1];
            nodeConfig.value = parts.slice(2).join(' ');
          }
        } else {
          nodeConfig.condition = condition;
          nodeConfig.operator = operator;
          nodeConfig.value = value;
        }
      }
      setConfig(nodeConfig);
      const isScheduled =
        nodeConfig.scheduled === true || nodeConfig.triggerType === 'scheduled';
      setTriggerType(isScheduled ? 'scheduled' : 'manual');
      setCronExpression(nodeConfig.cronExpression || '');
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

    const finalConfig = { ...config };

    if (selectedNode.data.type === 'trigger') {
      if (triggerType === 'scheduled') {
        finalConfig.scheduled = true;
        finalConfig.cronExpression = cronExpression.trim();
        finalConfig.triggerType = 'scheduled';
      } else {
        finalConfig.scheduled = false;
        finalConfig.triggerType = 'manual';
        delete finalConfig.cronExpression;
      }
    }

    if (selectedNode.data.type === 'ifElse') {
      const left = (finalConfig.condition ?? '').toString().trim();
      const op = (finalConfig.operator ?? '==').toString().trim() || '==';
      const right =
        finalConfig.value === undefined || finalConfig.value === null
          ? ''
          : finalConfig.value.toString();
      finalConfig.expression = `${left} ${op} ${right}`.trim();
    }

    if (selectedNode.data.type === 'loop') {
      const src = (finalConfig.arraySource ?? '').toString().trim();
      if (!src) {
        toast.error('Array source is required for loop nodes.');
        return;
      }

      const loopVar = (finalConfig.loopVariable ?? 'item').toString().trim() || 'item';
      finalConfig.loopVariable = loopVar;
      if (['variable', 'variables', 'loop', 'trigger'].includes(loopVar)) {
        toast.error('Loop variable name conflicts with reserved keywords.');
        return;
      }
    }

    const updatedData = {
      ...selectedNode.data,
      label,
      config: finalConfig,
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
    !label ||
    (requiresSlack && !slackConnected) ||
    (requiresGoogle && !googleConnected) ||
    (nodeType === 'trigger' && triggerType === 'scheduled' && !cronExpression.trim().match(/^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/)) ||
    (nodeType === 'loop' &&
      !(config.arraySource && config.arraySource.toString().trim().length > 0));

  if (!selectedNode || !isOpen) {
    return null;
  }

  const renderConnectionWarning = (service: 'slack' | 'google', message: string) => {
    const connected = service === 'slack' ? slackConnected : googleConnected;
    if (connected) return null;

    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-amber-200">{message}</p>
          <button
            onClick={() => (window.location.href = '/integrations')}
            className="mt-2 text-sm font-medium text-ember-300 hover:text-ember-200 transition-colors"
          >
            Go to Integrations →
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
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-forge-200">Trigger Type</label>
              <div className="mt-3 flex items-center gap-6">
                <label className="inline-flex items-center gap-2.5 text-sm text-forge-300 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="radio"
                      name="triggerType"
                      value="manual"
                      checked={triggerType === 'manual'}
                      onChange={() => setTriggerType('manual')}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded-full border-2 border-forge-600 peer-checked:border-ember-400 peer-checked:bg-ember-400 transition-all duration-200 group-hover:border-forge-500"></div>
                    <div className="absolute inset-0 w-4 h-4 rounded-full peer-checked:bg-ember-400 scale-50 opacity-0 peer-checked:opacity-100 transition-all duration-200"></div>
                  </div>
                  <span className="group-hover:text-forge-200 transition-colors">Manual Trigger</span>
                </label>
                <label className="inline-flex items-center gap-2.5 text-sm text-forge-300 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="radio"
                      name="triggerType"
                      value="scheduled"
                      checked={triggerType === 'scheduled'}
                      onChange={() => setTriggerType('scheduled')}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded-full border-2 border-forge-600 peer-checked:border-ember-400 peer-checked:bg-ember-400 transition-all duration-200 group-hover:border-forge-500"></div>
                    <div className="absolute inset-0 w-4 h-4 rounded-full peer-checked:bg-ember-400 scale-50 opacity-0 peer-checked:opacity-100 transition-all duration-200"></div>
                  </div>
                  <span className="group-hover:text-forge-200 transition-colors">Scheduled Trigger</span>
                </label>
              </div>
            </div>

            {triggerType === 'scheduled' && (
              <div className="space-y-3 rounded-lg border border-forge-700/50 bg-forge-800/40 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-forge-200">Cron Expression</label>
                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 9 * * *"
                    className="w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200"
                  />
                  {!cronExpression.trim().match(/^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/) && (
                    <p className="text-xs text-red-400">
                      Invalid format. Cron needs 5 parts: minute hour day month weekday.
                    </p>
                  )}
                  {describeCron(cronExpression) && (
                    <p className="text-xs text-ember-300/80">Schedule: {describeCron(cronExpression)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-forge-300">Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {CRON_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCronExpression(preset.value)}
                        className="rounded-md border border-forge-600/50 bg-forge-800 px-3 py-1.5 text-xs text-forge-300 hover:border-ember-500/40 hover:text-ember-300 hover:bg-forge-700/50 transition-all duration-200"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-forge-400">
                  Cron format: minute hour day month weekday. Need help?{' '}
                  <a
                    href="https://crontab.guru"
                    target="_blank"
                    rel="noreferrer"
                    className="text-ember-300 hover:text-ember-200 hover:underline transition-colors"
                  >
                    crontab.guru
                  </a>
                </p>
              </div>
            )}
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
              <label className="text-sm font-medium text-forge-200">
                Action Type
              </label>
              <select
                value={config.actionType || ACTION_OPTIONS[0].value}
                onChange={(event) =>
                  handleConfigChange('actionType', event.target.value)
                }
                className="w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 cursor-pointer"
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-forge-800 text-forge-50">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">
                Webhook URL
              </label>
              <input
                placeholder="https://example.com/webhook"
                value={config.webhookUrl || ''}
                onChange={(event) =>
                  handleConfigChange('webhookUrl', event.target.value)
                }
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">
                Message
              </label>
              <textarea
                className="h-24 w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 resize-none"
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
              <label className="text-sm font-medium text-forge-200">Channel</label>
              <input
                placeholder="#general"
                value={config.channel || ''}
                onChange={(event) => handleConfigChange('channel', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Message</label>
              <textarea
                className="h-24 w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 resize-none"
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
              <label className="text-sm font-medium text-forge-200">To</label>
              <input
                placeholder="user@example.com"
                value={config.to || ''}
                onChange={(event) => handleConfigChange('to', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Subject</label>
              <input
                placeholder="Subject"
                value={config.subject || ''}
                onChange={(event) => handleConfigChange('subject', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Body</label>
              <textarea
                className="h-24 w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 resize-none"
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
              <label className="text-sm font-medium text-forge-200">Spreadsheet ID</label>
              <input
                placeholder="Spreadsheet ID"
                value={config.spreadsheetId || ''}
                onChange={(event) => handleConfigChange('spreadsheetId', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Range</label>
              <input
                placeholder="Sheet1!A1:B2"
                value={config.range || ''}
                onChange={(event) => handleConfigChange('range', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Operation</label>
              <select
                value={config.operation || 'read'}
                onChange={(event) => handleConfigChange('operation', event.target.value)}
                className="w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 cursor-pointer"
              >
                <option value="read" className="bg-forge-800 text-forge-50">Read</option>
                <option value="write" className="bg-forge-800 text-forge-50">Write</option>
              </select>
            </div>
            {config.operation === 'write' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-forge-200">Values (JSON 2D array)</label>
                <textarea
                  className="h-24 w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 resize-none font-mono"
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
            <label className="text-sm font-medium text-forge-200">
              Condition Expression
            </label>
            <textarea
              className="h-24 w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 resize-none font-mono"
              placeholder="e.g., data.value > 10"
              value={config.expression || ''}
              onChange={(event) =>
                handleConfigChange('expression', event.target.value)
              }
            />
          </div>
        );
      case 'variable':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Key</label>
              <input
                placeholder="count"
                value={config.key || ''}
                onChange={(event) => handleConfigChange('key', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
              <p className="text-xs text-forge-400">
                Reference this value in other nodes with <code className="px-1.5 py-0.5 rounded bg-forge-800 text-ember-300 font-mono">{'{{variable.key}}'}</code>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Value</label>
              <input
                placeholder="15"
                value={config.value ?? ''}
                onChange={(event) => handleConfigChange('value', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
              <p className="text-xs text-forge-400">
                Strings, numbers, booleans, or JSON are supported; stored as provided.
              </p>
            </div>
          </div>
        );
      case 'loop':
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-forge-200">Array Source</label>
              <div className="flex flex-wrap gap-6">
                <label className="inline-flex items-center gap-2.5 text-sm text-forge-300 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="radio"
                      name="loopSource"
                      value="node"
                      checked={loopSourceType === 'node'}
                      onChange={() =>
                        setConfig((prev) => ({
                          ...prev,
                          arraySource:
                            prev.arraySource && prev.arraySource.toString().startsWith('node_')
                              ? prev.arraySource
                              : '',
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded-full border-2 border-forge-600 peer-checked:border-ember-400 peer-checked:bg-ember-400 transition-all duration-200 group-hover:border-forge-500"></div>
                  </div>
                  <span className="group-hover:text-forge-200 transition-colors">Previous node output</span>
                </label>
                <label className="inline-flex items-center gap-2.5 text-sm text-forge-300 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="radio"
                      name="loopSource"
                      value="variable"
                      checked={loopSourceType === 'variable'}
                      onChange={() =>
                        setConfig((prev) => ({
                          ...prev,
                          arraySource:
                            prev.arraySource && !prev.arraySource.toString().startsWith('node_')
                              ? prev.arraySource
                              : '',
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded-full border-2 border-forge-600 peer-checked:border-ember-400 peer-checked:bg-ember-400 transition-all duration-200 group-hover:border-forge-500"></div>
                  </div>
                  <span className="group-hover:text-forge-200 transition-colors">Variable</span>
                </label>
              </div>
              {loopSourceType === 'node' ? (
                <div className="space-y-2">
                  <select
                    value={
                      config.arraySource && config.arraySource.toString().startsWith('node_')
                        ? config.arraySource
                        : ''
                    }
                    onChange={(e) =>
                      handleConfigChange('arraySource', e.target.value || '')
                    }
                    className="w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 cursor-pointer"
                  >
                    <option value="" className="bg-forge-800 text-forge-400">Select previous node output</option>
                    {nodes
                      .filter((n) => n.id !== selectedNode?.id)
                      .map((n) => (
                        <option key={n.id} value={`${n.id}.output`} className="bg-forge-800 text-forge-50">
                          {`${n.data.label || n.id} (${n.id}.output)`}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-forge-400">
                    Picks the selected node&apos;s output (ensure it is an array).
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    placeholder="myArray"
                    value={
                      config.arraySource && !config.arraySource.toString().startsWith('node_')
                        ? config.arraySource
                        : ''
                    }
                    onChange={(event) => handleConfigChange('arraySource', event.target.value)}
                    className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
                  />
                  <p className="text-xs text-forge-400">
                    Provide a variable name; accessible as <code className="px-1.5 py-0.5 rounded bg-forge-800 text-ember-300 font-mono">{'{{variable.myArray}}'}</code>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Item variable name</label>
              <input
                placeholder="item"
                value={config.loopVariable || 'item'}
                onChange={(event) => handleConfigChange('loopVariable', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
              <p className="text-xs text-forge-400">
                Access current item as <code className="px-1.5 py-0.5 rounded bg-forge-800 text-ember-300 font-mono">{'{{loop.item}}'}</code> (or your chosen name).
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-ember-500/20 bg-ember-500/10 p-4 text-xs">
              <p className="font-semibold text-ember-200">Usage examples</p>
              <ul className="list-disc pl-4 text-ember-300/80 space-y-1">
                <li>Current item: <code className="px-1 py-0.5 rounded bg-forge-900/50 text-ember-300 font-mono">{'{{loop.item}}'}</code></li>
                <li>Index: <code className="px-1 py-0.5 rounded bg-forge-900/50 text-ember-300 font-mono">{'{{loop.index}}'}</code></li>
                <li>Total count: <code className="px-1 py-0.5 rounded bg-forge-900/50 text-ember-300 font-mono">{'{{loop.count}}'}</code></li>
              </ul>
              <p className="mt-2 text-ember-300/70">
                Example: if array is ['a','b','c'], loop.item will be 'a', then 'b', then 'c'.
              </p>
            </div>

            <div className="rounded-lg border border-forge-700/50 bg-forge-800/40 p-4 text-xs text-forge-300">
              <p>
                Loop over:{' '}
                <code className="px-1.5 py-0.5 rounded bg-forge-900/50 text-ember-300 font-mono font-semibold">
                  {config.arraySource || '{{variable.myArray}}'}
                </code>
              </p>
              <p className="mt-1">
                Each item accessible as:{' '}
                <code className="px-1.5 py-0.5 rounded bg-forge-900/50 text-ember-300 font-mono font-semibold">
                  {`{{loop.${config.loopVariable || 'item'}}}`}
                </code>
              </p>
            </div>
          </div>
        );
      case 'ifElse':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Left side</label>
              <input
                placeholder="{{variable.count}}"
                value={config.condition || ''}
                onChange={(event) => handleConfigChange('condition', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200 font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Operator</label>
              <select
                value={config.operator || '=='}
                onChange={(event) => handleConfigChange('operator', event.target.value)}
                className="w-full rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 text-sm text-forge-50 focus:border-ember-500/50 focus:outline-none focus:ring-1 focus:ring-ember-500/20 transition-all duration-200 cursor-pointer"
              >
                {['==', '!=', '>', '<', '>=', '<=', 'contains'].map((op) => (
                  <option key={op} value={op} className="bg-forge-800 text-forge-50">
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Right side</label>
              <input
                placeholder="10"
                value={config.value ?? ''}
                onChange={(event) => handleConfigChange('value', event.target.value)}
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200 font-mono"
              />
            </div>
            <div className="rounded-lg border border-bronze-400/30 bg-bronze-400/10 px-4 py-3 text-xs">
              <span className="text-bronze-300">Preview: </span>
              <code className="text-bronze-200 font-mono">
                {`${config.condition || '{{variable.count}}'} ${config.operator || '=='} ${
                  config.value ?? ''
                }`}
              </code>
            </div>
          </div>
        );
      case 'delay':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-forge-200">
              Delay (seconds)
            </label>
            <input
              type="number"
              min={0}
              value={config.delaySeconds ?? ''}
              onChange={(event) =>
                handleConfigChange('delaySeconds', Number(event.target.value))
              }
              placeholder="60"
              className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Determine node category for accent coloring
  const getNodeCategory = (type: string) => {
    if (type === 'trigger' || type === 'webhook') return 'trigger';
    if (['action', 'slack', 'email', 'sheets', 'http'].includes(type)) return 'action';
    if (['condition', 'ifElse', 'loop'].includes(type)) return 'logic';
    return 'utility'; // variable, delay, etc.
  };

  const nodeCategory = getNodeCategory(selectedNode.data.type);
  const categoryStyles = {
    trigger: 'border-l-amber-500 bg-amber-500/10 text-amber-300',
    action: 'border-l-ember-400 bg-ember-500/10 text-ember-300',
    logic: 'border-l-bronze-400 bg-bronze-400/10 text-bronze-300',
    utility: 'border-l-forge-500 bg-forge-700/30 text-forge-300',
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-forge-900/95 backdrop-blur-xl border border-forge-700/50 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-forge-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className={`border-l-4 pl-3 py-1 rounded-r ${categoryStyles[nodeCategory]}`}>
              <h3 className="text-lg font-semibold text-forge-50">
                Configure Node
              </h3>
              <p className="text-xs font-medium uppercase tracking-wider">
                {selectedNode.data.type} node
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-forge-400 transition-all duration-200 hover:bg-forge-800 hover:text-ember-300 focus:outline-none focus:ring-2 focus:ring-ember-500/50"
            aria-label="Close configuration panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-forge-700 scrollbar-track-transparent">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-forge-200">Label</label>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Node label"
                className="w-full px-4 py-2.5 bg-forge-800/60 border border-forge-700/50 rounded-lg text-forge-50 placeholder:text-forge-500 focus:border-ember-500/50 focus:ring-1 focus:ring-ember-500/20 focus:outline-none transition-all duration-200"
              />
            </div>

            {warningBanner()}
            {renderTypeSpecificFields()}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-forge-700/50 p-4 bg-forge-900/50">
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all duration-200"
          >
            Delete Node
          </button>
          <button
            onClick={handleSave}
            disabled={saveDisabled}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-gradient-to-r from-ember-500 to-ember-400 text-forge-950 hover:from-ember-400 hover:to-ember-300 focus:outline-none focus:ring-2 focus:ring-ember-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-ember-500 disabled:hover:to-ember-400 transition-all duration-200"
          >
            Save Changes
          </button>
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-forge-800/60 text-forge-300 border border-forge-700/50 hover:bg-forge-700/60 hover:text-forge-200 hover:border-forge-600/50 focus:outline-none focus:ring-2 focus:ring-forge-600/30 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeConfigPanel;

