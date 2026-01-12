import { Model } from 'mongoose';
import { TemplateDocument } from '../schemas/template.schema';

const templates = [
  {
    name: 'Daily Sales Report',
    description:
      'Automatically fetch sales data from Google Sheets and email report to team every morning',
    category: 'Sales',
    tags: ['email', 'sheets', 'daily', 'reporting'],
    difficulty: 'Beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger_1',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            type: 'trigger',
            label: 'Daily Trigger',
            config: { triggerType: 'scheduled', cronExpression: '0 9 * * *' },
          },
        },
        {
          id: 'sheets_1',
          type: 'custom',
          position: { x: 200, y: 0 },
          data: {
            type: 'sheets',
            label: 'Fetch Sales Data',
            config: { range: 'Sales!A:E', operation: 'read', sheetId: '' },
          },
        },
        {
          id: 'variable_1',
          type: 'custom',
          position: { x: 400, y: 0 },
          data: {
            type: 'variable',
            label: 'Calculate Total',
            config: { key: 'totalSales', value: '{{sheets_1.output.total}}' },
          },
        },
        {
          id: 'email_1',
          type: 'custom',
          position: { x: 600, y: 0 },
          data: {
            type: 'email',
            label: 'Send Report',
            config: {
              to: 'team@company.com',
              subject: 'Daily Sales Report {{date}}',
              body: 'Total sales: {{variable.totalSales}}',
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger_1', target: 'sheets_1' },
        { id: 'e2', source: 'sheets_1', target: 'variable_1' },
        { id: 'e3', source: 'variable_1', target: 'email_1' },
      ],
    },
    isPublic: true,
    usageCount: 0,
  },
  {
    name: 'Slack Alert on High-Value Payment',
    description: 'Receive Slack notification when payment webhook receives transaction over $1000',
    category: 'Finance',
    tags: ['slack', 'webhook', 'payment', 'alert'],
    difficulty: 'Intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger_2',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: { type: 'trigger', label: 'Payment Webhook', config: { triggerType: 'webhook' } },
        },
        {
          id: 'variable_2',
          type: 'custom',
          position: { x: 200, y: 0 },
          data: {
            type: 'variable',
            label: 'Extract Amount',
            config: { key: 'amount', value: '{{trigger.body.amount}}' },
          },
        },
        {
          id: 'condition_1',
          type: 'custom',
          position: { x: 400, y: 0 },
          data: {
            type: 'condition',
            label: 'Is High Value?',
            config: { expression: '{{variable.amount}} > 1000' },
          },
        },
        {
          id: 'slack_1',
          type: 'custom',
          position: { x: 600, y: -50 },
          data: {
            type: 'slack',
            label: 'Notify Finance',
            config: { channel: '#finance', message: 'High-value payment: ${{variable.amount}}' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger_2', target: 'variable_2' },
        { id: 'e2', source: 'variable_2', target: 'condition_1' },
        { id: 'e3', source: 'condition_1', target: 'slack_1', sourceHandle: 'true' },
      ],
    },
    isPublic: true,
    usageCount: 0,
  },
  {
    name: 'Weekly Team Reminder',
    description: 'Send weekly reminder email every Monday morning',
    category: 'Operations',
    tags: ['email', 'weekly', 'reminder'],
    difficulty: 'Beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger_3',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            type: 'trigger',
            label: 'Weekly Trigger',
            config: { triggerType: 'scheduled', cronExpression: '0 10 * * 1' },
          },
        },
        {
          id: 'email_2',
          type: 'custom',
          position: { x: 200, y: 0 },
          data: {
            type: 'email',
            label: 'Send Reminder',
            config: {
              to: 'team@company.com',
              subject: 'Weekly Reminder',
              body: 'Please review weekly tasks.',
            },
          },
        },
      ],
      edges: [{ id: 'e1', source: 'trigger_3', target: 'email_2' }],
    },
    isPublic: true,
    usageCount: 0,
  },
  {
    name: 'API Data Sync to Sheets',
    description: 'Fetch data from external API and append to Google Sheets every hour',
    category: 'Operations',
    tags: ['api', 'sheets', 'sync', 'automation'],
    difficulty: 'Intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger_4',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            type: 'trigger',
            label: 'Hourly Trigger',
            config: { triggerType: 'scheduled', cronExpression: '0 * * * *' },
          },
        },
        {
          id: 'http_1',
          type: 'custom',
          position: { x: 200, y: 0 },
          data: {
            type: 'http',
            label: 'Fetch API Data',
            config: { method: 'GET', url: 'https://api.example.com/data', headers: {}, body: '' },
          },
        },
        {
          id: 'variable_3',
          type: 'custom',
          position: { x: 400, y: 0 },
          data: {
            type: 'variable',
            label: 'Format Rows',
            config: { key: 'rows', value: '{{http_1.output.rows}}' },
          },
        },
        {
          id: 'sheets_2',
          type: 'custom',
          position: { x: 600, y: 0 },
          data: {
            type: 'sheets',
            label: 'Append to Sheet',
            config: { operation: 'write', values: '{{variable.rows}}', range: 'Data!A:Z' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger_4', target: 'http_1' },
        { id: 'e2', source: 'http_1', target: 'variable_3' },
        { id: 'e3', source: 'variable_3', target: 'sheets_2' },
      ],
    },
    isPublic: true,
    usageCount: 0,
  },
  {
    name: 'Lead Capture Notification',
    description:
      'When form submitted via webhook, notify team via Slack and email, log in Sheets',
    category: 'Marketing',
    tags: ['webhook', 'email', 'slack', 'sheets', 'leads'],
    difficulty: 'Advanced',
    workflow: {
      nodes: [
        {
          id: 'trigger_5',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: { type: 'trigger', label: 'Lead Webhook', config: { triggerType: 'webhook' } },
        },
        {
          id: 'variable_4',
          type: 'custom',
          position: { x: 220, y: -40 },
          data: {
            type: 'variable',
            label: 'Extract Lead',
            config: { key: 'lead', value: '{{trigger.body}}' },
          },
        },
        {
          id: 'email_3',
          type: 'custom',
          position: { x: 440, y: -120 },
          data: {
            type: 'email',
            label: 'Email Sales',
            config: {
              to: 'sales@company.com',
              subject: 'New Lead: {{variable.lead.name}}',
              body: 'Lead details: {{variable.lead.email}} {{variable.lead.phone}}',
            },
          },
        },
        {
          id: 'slack_2',
          type: 'custom',
          position: { x: 440, y: -40 },
          data: {
            type: 'slack',
            label: 'Slack Notify',
            config: { channel: '#leads', message: 'New lead: {{variable.lead.name}}' },
          },
        },
        {
          id: 'sheets_3',
          type: 'custom',
          position: { x: 440, y: 40 },
          data: {
            type: 'sheets',
            label: 'Log to Sheets',
            config: { operation: 'write', values: '{{variable.lead}}', range: 'Leads!A:Z' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger_5', target: 'variable_4' },
        { id: 'e2', source: 'variable_4', target: 'email_3' },
        { id: 'e3', source: 'variable_4', target: 'slack_2' },
        { id: 'e4', source: 'variable_4', target: 'sheets_3' },
      ],
    },
    isPublic: true,
    usageCount: 0,
  },
  {
    name: 'Overdue Invoice Reminders',
    description:
      'Daily check for overdue invoices in Sheets and send reminder emails to customers',
    category: 'Finance',
    tags: ['email', 'sheets', 'invoice', 'reminder', 'loop'],
    difficulty: 'Advanced',
    workflow: {
      nodes: [
        {
          id: 'trigger_6',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            type: 'trigger',
            label: 'Daily Trigger',
            config: { triggerType: 'scheduled', cronExpression: '0 9 * * *' },
          },
        },
        {
          id: 'sheets_4',
          type: 'custom',
          position: { x: 200, y: 0 },
          data: {
            type: 'sheets',
            label: 'Fetch Unpaid',
            config: {
              operation: 'read',
              range: 'Invoices!A:Z',
              filter: 'status=Unpaid AND dueDate<today',
            },
          },
        },
        {
          id: 'loop_1',
          type: 'custom',
          position: { x: 400, y: 0 },
          data: {
            type: 'loop',
            label: 'Loop Invoices',
            config: { arraySource: 'invoices', loopVariable: 'invoice' },
          },
        },
        {
          id: 'email_4',
          type: 'custom',
          position: { x: 600, y: 0 },
          data: {
            type: 'email',
            label: 'Send Reminder',
            config: {
              to: '{{loop.invoice.customerEmail}}',
              subject: 'Invoice overdue',
              body: 'Your invoice is overdue. Please pay soon.',
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger_6', target: 'sheets_4' },
        { id: 'e2', source: 'sheets_4', target: 'loop_1' },
        { id: 'e3', source: 'loop_1', target: 'email_4' },
      ],
    },
    isPublic: true,
    usageCount: 0,
  },
  {
    name: 'Weekly Project Status Update',
    description:
      'Fetch project status from API every Friday and send different Slack messages based on progress',
    category: 'Operations',
    tags: ['api', 'slack', 'weekly', 'status', 'conditional'],
    difficulty: 'Intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger_7',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            type: 'trigger',
            label: 'Friday Trigger',
            config: { triggerType: 'scheduled', cronExpression: '0 17 * * 5' },
          },
        },
        {
          id: 'http_2',
          type: 'custom',
          position: { x: 200, y: 0 },
          data: {
            type: 'http',
            label: 'Get Project Status',
            config: { method: 'GET', url: 'https://api.example.com/projects/status' },
          },
        },
        {
          id: 'variable_5',
          type: 'custom',
          position: { x: 400, y: 0 },
          data: {
            type: 'variable',
            label: 'Extract Progress',
            config: { key: 'progress', value: '{{http_2.output.progress}}' },
          },
        },
        {
          id: 'condition_2',
          type: 'custom',
          position: { x: 600, y: 0 },
          data: {
            type: 'condition',
            label: 'On Track?',
            config: { expression: '{{variable.progress}} >= 80' },
          },
        },
        {
          id: 'slack_3',
          type: 'custom',
          position: { x: 800, y: -80 },
          data: {
            type: 'slack',
            label: 'On Track',
            config: { channel: '#projects', message: 'On track!' },
          },
        },
        {
          id: 'slack_4',
          type: 'custom',
          position: { x: 800, y: 80 },
          data: {
            type: 'slack',
            label: 'Needs Attention',
            config: { channel: '#projects', message: 'Project needs attention.' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger_7', target: 'http_2' },
        { id: 'e2', source: 'http_2', target: 'variable_5' },
        { id: 'e3', source: 'variable_5', target: 'condition_2' },
        { id: 'e4', source: 'condition_2', target: 'slack_3', sourceHandle: 'true' },
        { id: 'e5', source: 'condition_2', target: 'slack_4', sourceHandle: 'false' },
      ],
    },
    isPublic: true,
    usageCount: 0,
  },
];

export async function seedTemplates(templateModel: Model<TemplateDocument>) {
  const count = await templateModel.countDocuments();
  if (count > 0) {
    // eslint-disable-next-line no-console
    console.log('Templates already seeded');
    return;
  }

  await templateModel.insertMany(templates);
  // eslint-disable-next-line no-console
  console.log(`Successfully seeded ${templates.length} templates`);
}

