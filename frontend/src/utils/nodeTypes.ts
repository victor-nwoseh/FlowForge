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

type NodeCategory = 'trigger' | 'action' | 'logic';

interface NodeTypeConfig {
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string }>;
  defaultConfig: Record<string, unknown>;
  color: string;
  category: NodeCategory;
}

export const NODE_TYPE_CONFIGS: Record<string, NodeTypeConfig> = {
  trigger: {
    name: 'Trigger',
    description: 'Starts the workflow when conditions are met.',
    icon: Play,
    defaultConfig: {
      triggerType: 'manual',
    },
    color: 'blue',
    category: 'trigger',
  },
  action: {
    name: 'Action',
    description: 'Performs a task or operation.',
    icon: Zap,
    defaultConfig: {
      actionType: 'http_request',
      message: '',
      webhookUrl: '',
    },
    color: 'emerald',
    category: 'action',
  },
  condition: {
    name: 'Condition',
    description: 'Branch logic based on conditions.',
    icon: GitBranch,
    defaultConfig: {
      expression: '',
    },
    color: 'amber',
    category: 'logic',
  },
  delay: {
    name: 'Delay',
    description: 'Pause execution for a specified time.',
    icon: Clock,
    defaultConfig: {
      delaySeconds: 60,
    },
    color: 'purple',
    category: 'logic',
  },
  variable: {
    name: 'Variable',
    description: 'Store or transform data within the workflow.',
    icon: Database,
    defaultConfig: {
      key: '',
      value: '',
    },
    color: 'cyan',
    category: 'logic',
  },
  slack: {
    name: 'Slack',
    description: 'Send messages to Slack channels.',
    icon: MessageSquare,
    defaultConfig: {
      channel: '',
      message: '',
    },
    color: 'sky',
    category: 'action',
  },
  email: {
    name: 'Email',
    description: 'Send email notifications.',
    icon: Mail,
    defaultConfig: {
      to: '',
      subject: '',
      body: '',
    },
    color: 'pink',
    category: 'action',
  },
  http: {
    name: 'HTTP Request',
    description: 'Make HTTP requests to external services.',
    icon: Globe,
    defaultConfig: {
      method: 'GET',
      url: '',
      body: '',
      headers: {},
    },
    color: 'indigo',
    category: 'action',
  },
  sheets: {
    name: 'Google Sheets',
    description: 'Read or write data to Google Sheets.',
    icon: FileSpreadsheet,
    defaultConfig: {
      sheetId: '',
      range: '',
      operation: 'read',
    },
    color: 'green',
    category: 'action',
  },
  webhook: {
    name: 'Webhook',
    description: 'Handle incoming webhook requests.',
    icon: Webhook,
    defaultConfig: {
      secret: '',
      endpoint: '',
    },
    color: 'orange',
    category: 'trigger',
  },
};

export const getNodeTypeConfig = (type: string) =>
  NODE_TYPE_CONFIGS[type] ?? null;

