# FlowForge User Guide

Welcome to FlowForge! This guide will help you create powerful workflow automations without writing any code.

## Introduction

FlowForge is a no-code workflow automation platform that lets you connect your favorite apps and services to automate repetitive tasks. Think of it as your personal automation assistant that works 24/7.

### What You Can Build

- **Notification Workflows**: Get Slack alerts when webhooks are received
- **Data Pipelines**: Collect form submissions and add them to Google Sheets
- **Email Automation**: Send personalized emails based on triggers
- **Scheduled Reports**: Generate and send reports daily/weekly
- **API Integrations**: Connect any service that has an API
- **Conditional Logic**: Route data based on rules and conditions

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Workflow** | A series of connected nodes that execute in order |
| **Node** | A single step in your workflow (trigger, action, or logic) |
| **Trigger** | The event that starts your workflow |
| **Edge** | A connection between two nodes |
| **Execution** | A single run of your workflow |

---

## Getting Started

### Creating an Account

1. Navigate to FlowForge in your browser (http://localhost:5173 for local, or your deployed URL)
2. Click **Sign Up** on the login page
3. Enter your email address and create a password (minimum 6 characters)
4. Click **Create Account**
5. You'll be automatically logged in and redirected to the dashboard

### Logging In

1. Navigate to FlowForge
2. Enter your registered email and password
3. Click **Log In**
4. If you forget your password, contact your administrator

### Dashboard Overview

After logging in, you'll see the main dashboard with:

| Section | Description |
|---------|-------------|
| **Navigation Bar** | Access Workflows, Executions, Integrations, Templates |
| **Workflows List** | Your saved workflows with status indicators |
| **Quick Actions** | Create new workflow, view recent executions |
| **Statistics** | Total workflows, executions today, active schedules |

---

## Connecting Integrations

Before using Slack, Gmail, or Google Sheets in your workflows, you need to connect your accounts.

### Navigate to Integrations

1. Click **Integrations** in the navigation bar
2. You'll see available services and their connection status

### Connecting Slack

1. In the Integrations page, find the **Slack** card
2. Click **Connect Slack**
3. You'll be redirected to Slack's authorization page
4. Select the workspace you want to connect
5. Review the permissions FlowForge is requesting:
   - `chat:write` - Send messages to channels
   - `channels:read` - View channel list
6. Click **Allow**
7. You'll be redirected back to FlowForge
8. The Slack card should now show **Connected** with your workspace name

### Connecting Google (Gmail & Sheets)

1. In the Integrations page, find the **Google** card
2. Click **Connect Google**
3. You'll be redirected to Google's authorization page
4. Select or sign into your Google account
5. Review the permissions:
   - Send emails on your behalf (Gmail)
   - View and edit spreadsheets (Google Sheets)
6. Click **Allow**
7. You'll be redirected back to FlowForge
8. The Google card should now show **Connected** with your email

### Managing Connections

**To disconnect a service:**
1. Go to the Integrations page
2. Find the connected service
3. Click **Disconnect**
4. Confirm the disconnection

**To reconnect a service:**
- Simply click **Connect** again and go through the authorization flow
- This is useful if your token expires or you want to use a different account

> **Note**: Disconnecting a service will cause any workflows using that service to fail. Reconnect before running those workflows.

---

## Creating Your First Workflow

Let's create a simple workflow that sends a Slack message when triggered.

### Step 1: Create New Workflow

1. Click **Workflows** in the navigation bar
2. Click the **Create Workflow** button
3. Enter a name: "My First Workflow"
4. Click **Create**

### Step 2: Understand the Interface

The workflow builder has three main areas:

| Area | Location | Purpose |
|------|----------|---------|
| **Node Palette** | Left sidebar | Drag nodes from here to the canvas |
| **Canvas** | Center | Build your workflow by connecting nodes |
| **Config Panel** | Right sidebar | Configure the selected node's properties |

### Step 3: Add a Trigger Node

1. In the Node Palette, find **Webhook** under Triggers
2. Drag it onto the canvas
3. This node will start your workflow when it receives data

### Step 4: Add an Action Node

1. Find **Slack** in the Node Palette under Actions
2. Drag it onto the canvas, below the Webhook node

### Step 5: Connect the Nodes

1. Hover over the Webhook node - you'll see a small circle (handle) at the bottom
2. Click and drag from this handle to the Slack node's top handle
3. Release to create a connection (edge)
4. The nodes are now linked - the Slack node will run after the Webhook triggers

### Step 6: Configure the Slack Node

1. Click on the Slack node to select it
2. In the Config Panel on the right, you'll see:
   - **Channel**: Enter the Slack channel (e.g., `#general`)
   - **Message**: Enter your message text
3. For the message, try: `Hello from FlowForge! Webhook received.`

### Step 7: Save Your Workflow

1. Click the **Save** button in the top toolbar
2. Your workflow is now saved and ready to use

### Step 8: Execute Manually

1. Click the **Execute** button in the toolbar
2. A dialog may appear for trigger data - click **Execute** to use empty data
3. The workflow will run immediately

### Step 9: View Results

1. After execution, you'll see a notification
2. Click **View Execution** or go to the Executions page
3. You'll see each node's status (success/failed)
4. Check your Slack channel - your message should appear!

---

## Node Types

FlowForge provides various node types for different purposes.

### Triggers

Triggers start your workflow. Every workflow needs at least one trigger.

#### Manual Trigger
- Starts workflow when you click "Execute"
- Good for testing and on-demand workflows

#### Webhook Trigger
- Starts workflow when an external service sends data to your webhook URL
- Each workflow has a unique webhook URL: `https://your-domain/api/webhooks/{workflow-id}`
- Access incoming data with `{{trigger.body.field}}`

#### Scheduled Trigger
- Starts workflow on a schedule (cron expression)
- Examples: Every hour, daily at 9am, weekdays at 5pm

### Logic Nodes

#### Condition
- Creates if/else branching in your workflow
- Configure: left value, operator, right value
- Has two outputs: **True** branch and **False** branch
- Only the matching branch executes

#### Loop
- Iterates over an array of items
- Runs connected nodes once for each item
- Access current item: `{{loop.item}}`
- Access index: `{{loop.index}}` (0-based)
- Access total count: `{{loop.count}}`

#### Variable
- Creates or updates a variable
- Variables persist throughout the workflow execution
- Access later with `{{variables.variableName}}`

#### Delay
- Pauses execution for specified milliseconds
- Use for rate limiting or timed sequences
- Example: 5000 = 5 seconds

### Action Nodes

#### Slack
- Sends a message to a Slack channel
- Requires: Slack connection
- Configure: Channel name, Message text

#### Email
- Sends an email via Gmail
- Requires: Google connection
- Configure: To address, Subject, Body

#### Google Sheets
- Reads from or writes to Google Sheets
- Requires: Google connection
- Actions: `read` (fetch data), `append` (add rows)
- Configure: Spreadsheet ID, Range, Values

#### HTTP Request
- Makes HTTP requests to any API
- Methods: GET, POST, PUT, DELETE
- Configure: URL, Headers, Body
- Great for integrating with any service

---

## Using Variables

Variables let you store and pass data between nodes.

### Creating Variables

1. Add a **Variable** node to your workflow
2. Configure:
   - **Variable Name**: e.g., `customerName`
   - **Value**: The value to store (can include other variables)

### Variable Syntax

Use double curly braces to reference variables:

```
{{variablePath}}
```

### Variable Sources

| Syntax | Description | Example |
|--------|-------------|---------|
| `{{trigger.field}}` | Data from the trigger | `{{trigger.body.email}}` |
| `{{variables.name}}` | User-defined variable | `{{variables.count}}` |
| `{{nodeId.field}}` | Output from a specific node | `{{http1.response.data}}` |
| `{{loop.item}}` | Current item in loop | `{{loop.item.name}}` |
| `{{loop.index}}` | Current loop index (0-based) | `{{loop.index}}` |
| `{{loop.count}}` | Total items in loop | `{{loop.count}}` |

### Examples

**Personalizing a Slack message:**
```
Hello {{trigger.body.name}}! Your order #{{trigger.body.orderId}} is confirmed.
```

**Using previous node output:**
```
API returned: {{httpRequest.response.status}}
```

**Combining variables:**
```
Processing item {{loop.index}} of {{loop.count}}: {{loop.item.productName}}
```

---

## Conditional Branching

Use conditions to create different paths based on your data.

### Adding a Condition

1. Drag a **Condition** node onto your canvas
2. Connect it after your trigger or previous node

### Configuring the Condition

In the Config Panel, set up your condition:

| Field | Description | Example |
|-------|-------------|---------|
| **Left Operand** | First value to compare | `{{trigger.body.amount}}` |
| **Operator** | Comparison type | `>` |
| **Right Operand** | Second value to compare | `100` |

### Available Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Equals | `{{status}} == "active"` |
| `!=` | Not equals | `{{type}} != "draft"` |
| `>` | Greater than | `{{amount}} > 100` |
| `<` | Less than | `{{count}} < 10` |
| `>=` | Greater than or equal | `{{score}} >= 80` |
| `<=` | Less than or equal | `{{quantity}} <= 0` |
| `contains` | Text contains | `{{email}} contains "@gmail"` |
| `startsWith` | Text starts with | `{{name}} startsWith "Dr."` |
| `endsWith` | Text ends with | `{{file}} endsWith ".pdf"` |

### Connecting Branches

The Condition node has two output handles:

- **True (green)**: Connect nodes that should run when condition is true
- **False (red)**: Connect nodes that should run when condition is false

**Example workflow:**
```
Webhook → Condition (amount > 100)
              ├─ True → Slack ("Large order received!")
              └─ False → Email ("Small order processed")
```

---

## Loops

Process arrays of data by iterating over each item.

### When to Use Loops

- Sending emails to multiple recipients
- Processing each item in an order
- Iterating over API response arrays
- Batch operations on lists

### Adding a Loop

1. Drag a **Loop** node onto your canvas
2. Connect it after the node that provides your array data

### Configuring the Loop

| Field | Description | Example |
|-------|-------------|---------|
| **Array** | Source array to iterate | `{{trigger.body.items}}` |
| **Item Variable** | Name for current item (optional) | `currentItem` |

### Loop Variables

Inside the loop (nodes connected after the loop node), you can access:

| Variable | Description |
|----------|-------------|
| `{{loop.item}}` | The current item being processed |
| `{{loop.index}}` | Current iteration index (starts at 0) |
| `{{loop.count}}` | Total number of items in the array |
| `{{loop.itemVariable}}` | If you set a custom item variable name |

### Example: Email Each Customer

**Trigger data:**
```json
{
  "customers": [
    {"name": "Alice", "email": "alice@example.com"},
    {"name": "Bob", "email": "bob@example.com"},
    {"name": "Carol", "email": "carol@example.com"}
  ]
}
```

**Workflow:**
```
Webhook → Loop (array: {{trigger.body.customers}})
              └→ Email
                   To: {{loop.item.email}}
                   Subject: Hello {{loop.item.name}}!
                   Body: Thank you for your order.
```

**Result:** Three emails sent, one to each customer.

---

## Scheduling Workflows

Run workflows automatically on a schedule.

### Creating a Schedule

1. Go to **Workflows** and select your workflow
2. Click **Add Schedule** or go to the **Schedules** page
3. Click **Create Schedule**
4. Select the workflow you want to schedule
5. Enter a cron expression or use presets

### Cron Expression Format

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

### Common Cron Presets

| Schedule | Cron Expression |
|----------|-----------------|
| Every minute | `* * * * *` |
| Every 15 minutes | `*/15 * * * *` |
| Every hour | `0 * * * *` |
| Every day at midnight | `0 0 * * *` |
| Every day at 9:00 AM | `0 9 * * *` |
| Weekdays at 9:00 AM | `0 9 * * 1-5` |
| Every Monday at 9:00 AM | `0 9 * * 1` |
| First day of month | `0 0 1 * *` |

### Managing Schedules

**View all schedules:**
1. Go to **Schedules** in the navigation
2. See all active and paused schedules

**Pause a schedule:**
1. Find the schedule in the list
2. Click the toggle to disable it
3. The schedule won't run until re-enabled

**Delete a schedule:**
1. Find the schedule
2. Click the delete (trash) icon
3. Confirm deletion

> **Tip**: Pausing is better than deleting if you might need the schedule again.

---

## Using Templates

Templates are pre-built workflows you can use as starting points.

### Browsing Templates

1. Click **Templates** in the navigation
2. Browse available templates by category:
   - **Notifications**: Slack alerts, email notifications
   - **Data Sync**: Spreadsheet updates, data pipelines
   - **Monitoring**: Health checks, status alerts
   - **Marketing**: Campaign automation, lead processing

### Using a Template

1. Find a template that matches your needs
2. Click **Use Template** or **Preview** to see details
3. Click **Import** to add it to your workflows
4. The template creates a new workflow in your account

### Customizing Templates

After importing:

1. Open the new workflow in the builder
2. Update node configurations with your specific values:
   - Slack channels
   - Email addresses
   - API endpoints
   - Variable names
3. Test the workflow by executing manually
4. Save your changes

### Template Categories

| Category | Use Cases |
|----------|-----------|
| **Notifications** | Slack alerts, email notifications, SMS (via webhook) |
| **Data Sync** | Spreadsheet updates, database syncing, backups |
| **Monitoring** | Uptime checks, error alerts, system status |
| **Marketing** | Lead capture, email campaigns, social posting |

---

## Monitoring Executions

Track and debug your workflow runs.

### Viewing Execution History

1. Click **Executions** in the navigation
2. See a list of all workflow executions with:
   - Workflow name
   - Status (completed, failed, running)
   - Trigger source (manual, webhook, scheduled)
   - Start time and duration

### Filtering Executions

Use the filters to find specific executions:

| Filter | Description |
|--------|-------------|
| **Workflow** | Show only executions for a specific workflow |
| **Status** | Filter by completed, failed, or running |
| **Date Range** | Show executions within a time period |

### Execution Details

Click on any execution to see detailed information:

**Overview:**
- Execution ID
- Workflow name
- Status
- Trigger type and data
- Start and end times

**Node Logs:**
Each node shows:
- Node name and type
- Status (success, error, skipped)
- Timestamp
- Output data (expandable)
- Error message (if failed)

### Real-Time Monitoring

When a workflow is running:

1. Go to Executions and click on the running execution
2. Watch nodes complete in real-time
3. Progress bar shows overall completion
4. No need to refresh - updates via WebSocket

### Debugging Failed Executions

When a workflow fails:

1. Find the failed execution (marked with red status)
2. Click to view details
3. Look for the first node with "error" status
4. Expand the error message for details
5. Common issues:
   - Missing OAuth connection
   - Invalid variable reference
   - External API error
   - Invalid node configuration

---

## Best Practices

### Workflow Design

1. **Start Simple**: Build and test incrementally
2. **Use Descriptive Names**: Name workflows and variables clearly
3. **Test with Small Data**: Verify logic before processing large datasets
4. **Add Delays**: Prevent rate limiting with delay nodes between API calls

### Error Handling

1. **Enable continueOnError**: For non-critical nodes, allow workflow to continue
2. **Add Fallback Paths**: Use conditions to handle error scenarios
3. **Monitor Executions**: Check execution history regularly
4. **Set Up Alerts**: Create a workflow that alerts you on failures

### Security

1. **Keep Connections Active**: Reconnect if OAuth tokens expire
2. **Don't Share Webhook URLs**: Treat them like API keys
3. **Review Permissions**: Only grant necessary OAuth scopes
4. **Audit Executions**: Review what data flows through your workflows

### Performance

1. **Minimize Nodes**: Combine operations where possible
2. **Use Conditions Early**: Skip unnecessary processing
3. **Batch Operations**: Use loops efficiently
4. **Monitor Usage**: Watch execution counts and durations

---

## Troubleshooting

### Common Issues and Solutions

#### "Connection not found" Error

**Problem**: Workflow fails because it can't find an OAuth connection.

**Solution**:
1. Go to **Integrations** page
2. Check if the required service is connected
3. If not connected, click **Connect** and authorize
4. If connected but failing, try **Disconnect** then reconnect

#### Workflow Execution Fails

**Problem**: Workflow runs but fails at a specific node.

**Solution**:
1. Go to **Executions** and find the failed run
2. Click to view details
3. Find the node with "error" status
4. Read the error message
5. Common causes:
   - Invalid variable syntax (check `{{}}` format)
   - Missing required fields in node config
   - External service unavailable
   - API rate limit exceeded

#### Schedule Not Running

**Problem**: Scheduled workflow doesn't execute at expected time.

**Solution**:
1. Go to **Schedules** page
2. Check if the schedule is **Active** (toggle is on)
3. Verify cron expression is correct
4. Check "Next Run" time matches your expectation
5. Ensure the workflow itself is saved and active

#### OAuth Token Expired

**Problem**: Connected service shows errors about invalid tokens.

**Solution**:
1. Go to **Integrations**
2. Find the affected service
3. Click **Disconnect**
4. Click **Connect** again
5. Re-authorize the application
6. Test by running a workflow using that service

#### Webhook Not Receiving Data

**Problem**: External service sends webhooks but workflow doesn't trigger.

**Solution**:
1. Verify the webhook URL is correct
2. Check workflow ID in the URL matches your workflow
3. Ensure the external service is sending POST requests
4. Verify the payload is valid JSON
5. Check if your server is accessible from the internet
6. For local development, use ngrok to expose your server

#### Variables Not Resolving

**Problem**: Variable placeholders appear as literal text in output.

**Solution**:
1. Check syntax: `{{variable.path}}` (double curly braces)
2. Verify variable exists at that point in workflow
3. Check for typos in variable names
4. Ensure the source node executed successfully
5. Test with simpler variable references first

#### Loop Not Iterating

**Problem**: Loop node doesn't process all items.

**Solution**:
1. Verify the array source resolves to an actual array
2. Check if array is empty
3. Ensure array syntax is correct: `{{trigger.body.items}}`
4. Try logging the array value with a variable node first

### Getting Help

If you're still stuck:

1. Check the [API Documentation](API.md) for technical details
2. Review the [Architecture Guide](ARCHITECTURE.md) for system understanding
3. Check execution logs for detailed error information
4. Contact support with your execution ID for assistance

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save workflow |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Delete` | Delete selected node |
| `Escape` | Deselect all |
| `Ctrl/Cmd + Click` | Multi-select nodes |

---

## Glossary

| Term | Definition |
|------|------------|
| **Canvas** | The main area where you build workflows visually |
| **Edge** | A connection line between two nodes |
| **Execution** | A single run of a workflow |
| **Handle** | Connection point on a node (input/output) |
| **Node** | A single step in your workflow |
| **Palette** | The sidebar containing available node types |
| **Trigger** | The event that starts a workflow |
| **Variable** | Named storage for data within a workflow |
| **Webhook** | URL endpoint that receives external HTTP requests |
| **Workflow** | A complete automation consisting of connected nodes |
