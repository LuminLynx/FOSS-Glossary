# Workflow Examples

This document provides practical examples of using the Issue Task PR Automation workflow.

## Table of Contents

1. [Automatic Triggers](#automatic-triggers)
2. [Manual Triggers](#manual-triggers)
3. [Configuration Examples](#configuration-examples)
4. [Real-World Scenarios](#real-world-scenarios)

## Automatic Triggers

### Example 1: Assign to Bot

**Scenario:** You have an issue that needs automation

**Steps:**
1. Navigate to the issue
2. On the right sidebar, click "Assignees"
3. Select `my-codex-bot` (or your configured bot)
4. Wait for the workflow to run (usually takes 30-60 seconds)

**Expected Result:**
- Branch created: `task/123-issue-title-1729276800000`
- File created: `tasks/123/issue-title-1729276800000.md`
- PR opened with link in issue comment

### Example 2: Add Trigger Label

**Scenario:** Use labels instead of assignment

**Steps:**
1. Navigate to the issue
2. On the right sidebar, click "Labels"
3. Add the `codex` or `ready-for-codex` label
4. Wait for the workflow to run

**Expected Result:**
- Same as Example 1
- Works even if issue is not assigned to bot

### Example 3: Both Assignment and Label

**Scenario:** Maximum visibility

**Steps:**
1. Assign issue to bot
2. Add `codex` label
3. Add other labels like `high-priority`, `enhancement`

**Expected Result:**
- Workflow triggers on first action (assignment or label)
- Task created with all context

## Manual Triggers

### Example 4: GitHub UI

**Scenario:** Create issue and task via web interface

**Steps:**
1. Go to Actions tab
2. Click "Issue Task PR Automation" workflow
3. Click "Run workflow" button
4. Fill in the form:
   ```
   Title: Add dark mode support
   Body: Users have requested a dark mode theme for better nighttime viewing
   Labels: enhancement, ui, high-priority
   Notify Slack: ✓ (check)
   ```
5. Click "Run workflow"

**Expected Result:**
- Issue #X created
- Task automation runs automatically
- Slack notification sent (if configured)

### Example 5: GitHub CLI

**Scenario:** Create from command line

**Command:**
```bash
gh workflow run issue-task-pr.yml \
  --ref main \
  -f title="Fix memory leak in API endpoint" \
  -f body="The /api/users endpoint has a memory leak that causes the server to crash after ~1000 requests" \
  -f labels="bug,critical,api" \
  -f notify_slack=true
```

**Expected Result:**
- Issue created with provided details
- Automation runs automatically
- Slack notification sent

### Example 6: GitHub API

**Scenario:** Integrate with external systems

**cURL Command:**
```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ghp_YOURTOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/issue-task-pr.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "title": "Update dependencies",
      "body": "Weekly dependency update",
      "labels": "maintenance,dependencies",
      "notify_slack": "false"
    }
  }'
```

**Expected Result:**
- Issue created via API
- Workflow runs automatically
- No Slack notification (disabled)

### Example 7: Node.js Script

**Scenario:** Automate issue creation from your application

**Script:**
```javascript
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function createTaskIssue(title, body, labels) {
  const result = await octokit.actions.createWorkflowDispatch({
    owner: 'OWNER',
    repo: 'REPO',
    workflow_id: 'issue-task-pr.yml',
    ref: 'main',
    inputs: {
      title,
      body,
      labels: labels.join(','),
      notify_slack: 'true'
    }
  });
  
  console.log('Workflow dispatched:', result.status);
}

// Usage
createTaskIssue(
  'Refactor authentication module',
  'Current auth code is complex and hard to maintain',
  ['refactor', 'authentication', 'technical-debt']
);
```

## Configuration Examples

### Example 8: Custom Bot Username

**Scenario:** Use a different bot account

**Configuration:**
1. Go to Settings → Secrets and variables → Actions → Variables
2. Click "New repository variable"
3. Name: `CODEX_BOT_LOGIN`
4. Value: `my-custom-bot-name`
5. Click "Add variable"

**Usage:**
- Now assign issues to `my-custom-bot-name` instead
- Workflow will use this username in comments and PRs

### Example 9: Custom Trigger Labels

**Scenario:** Use project-specific labels

**Configuration:**
1. Go to Settings → Secrets and variables → Actions → Variables
2. Click "New repository variable"
3. Name: `TRIGGER_LABELS`
4. Value: `automation,bot-task,needs-automation`
5. Click "Add variable"

**Usage:**
- Add any of these labels to trigger automation
- Multiple labels can trigger the same workflow

### Example 10: Slack Notifications

**Scenario:** Get notified in Slack when automation runs

**Configuration:**
1. Create Slack webhook:
   - Go to https://api.slack.com/apps
   - Create app → "From scratch"
   - Name: "GitHub Automation"
   - Select workspace
   - Add "Incoming Webhooks" feature
   - Activate incoming webhooks
   - "Add New Webhook to Workspace"
   - Select channel (e.g., #github-notifications)
   - Copy webhook URL

2. Add to GitHub:
   - Go to Settings → Secrets and variables → Actions → Secrets
   - Click "New repository secret"
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Paste webhook URL
   - Click "Add secret"

**Usage:**
- Notifications sent automatically on workflow completion
- Shows issue number, status, PR link
- Can be enabled manually via `notify_slack` input

## Real-World Scenarios

### Scenario 1: Bug Triage Workflow

**Use Case:** New bugs need immediate attention

**Setup:**
1. Label template: Create `bug` and `codex` labels
2. Configure trigger labels to include `bug`
3. Set up Slack notifications

**Process:**
1. User reports bug → Issue created
2. Maintainer adds `bug` and `codex` labels
3. Workflow creates task branch and PR
4. Team gets Slack notification
5. Developer picks up PR and fixes bug
6. PR reviewed and merged

**Benefits:**
- Immediate action on bugs
- No manual branch/PR creation
- Team stays informed via Slack

### Scenario 2: Feature Request Pipeline

**Use Case:** Organize feature requests into actionable tasks

**Setup:**
1. Create `feature-request` and `approved` labels
2. Configure: `TRIGGER_LABELS=codex,approved`
3. Assign bot to auto-handle approved features

**Process:**
1. User submits feature request
2. Team reviews and adds `approved` label
3. Workflow creates task automatically
4. Developer works on feature in dedicated branch
5. PR includes original issue context

**Benefits:**
- Clear approval workflow
- Automatic task creation
- Traceability from request to implementation

### Scenario 3: Weekly Maintenance Tasks

**Use Case:** Automated recurring maintenance

**Setup:**
1. Create separate automation repo or script
2. Configure cron job or scheduled workflow
3. Use workflow_dispatch to create issues

**Script Example:**
```bash
#!/bin/bash
# weekly-maintenance.sh

gh workflow run issue-task-pr.yml \
  -f title="Weekly dependency update - $(date +%Y-%m-%d)" \
  -f body="Review and update outdated dependencies" \
  -f labels="maintenance,dependencies,automated" \
  -f notify_slack=true

gh workflow run issue-task-pr.yml \
  -f title="Weekly security scan - $(date +%Y-%m-%d)" \
  -f body="Run security audit and address findings" \
  -f labels="security,maintenance,automated" \
  -f notify_slack=true
```

**Process:**
1. Cron job runs script every Monday
2. Issues created automatically
3. Workflow creates task branches
4. Team gets Slack notification
5. Tasks completed during the week

**Benefits:**
- No manual task creation
- Consistent maintenance schedule
- Clear tracking of recurring tasks

### Scenario 4: Multi-Stage Approval

**Use Case:** Features need approval before automation

**Setup:**
1. Create labels: `needs-review`, `approved`, `codex`
2. Configure trigger for `approved` only
3. Require manual label change after review

**Process:**
1. Feature request submitted
2. Add `needs-review` label
3. Team discusses in issue
4. When approved, remove `needs-review`, add `approved`
5. Manually add `codex` label to trigger automation
6. Task created automatically

**Benefits:**
- Prevents premature automation
- Clear approval gates
- Team discussion preserved

### Scenario 5: External Integration

**Use Case:** Integrate with project management tools

**Setup:**
1. Configure webhook in PM tool (Jira, Asana, etc.)
2. Create middleware service
3. Use GitHub API to dispatch workflow

**Flow:**
```
PM Tool → Webhook → Middleware → GitHub API → Workflow → Task Created
```

**Middleware Example:**
```javascript
// Express.js webhook handler
app.post('/jira-webhook', async (req, res) => {
  const issue = req.body.issue;
  
  if (issue.fields.status.name === 'Ready for Dev') {
    await octokit.actions.createWorkflowDispatch({
      owner: 'OWNER',
      repo: 'REPO',
      workflow_id: 'issue-task-pr.yml',
      ref: 'main',
      inputs: {
        title: `[JIRA-${issue.key}] ${issue.fields.summary}`,
        body: issue.fields.description,
        labels: 'jira,external',
        notify_slack: 'true'
      }
    });
  }
  
  res.sendStatus(200);
});
```

**Benefits:**
- Seamless tool integration
- Single source of truth
- Automated task creation from external systems

## Tips and Best Practices

1. **Use descriptive titles** - They become branch names
2. **Add context in body** - Copied to task file and PR
3. **Use consistent labels** - Makes filtering easier
4. **Enable Slack** - Stay informed of automation
5. **Review task files** - Ensure they have needed info
6. **Close issues after merge** - Keep tracker clean
7. **Use unique labels** - Avoid accidental triggers
8. **Document conventions** - Help team understand workflow
9. **Monitor workflow runs** - Check Actions tab regularly
10. **Test changes** - Use test issues before production

## Troubleshooting Examples

### Problem: Workflow doesn't trigger

**Example:**
```
Issue #123 assigned to my-codex-bot
Labels: bug, high-priority
No workflow run
```

**Solution:**
```bash
# Check if bot username matches
gh variable get CODEX_BOT_LOGIN

# If not set or wrong, update:
gh variable set CODEX_BOT_LOGIN -b "my-codex-bot"

# Or add trigger label:
gh issue edit 123 --add-label codex
```

### Problem: PR creation fails

**Example:**
```
Error: Request failed with status code 422
```

**Solution:**
Check workflow logs for specific error. Common issues:
- PR already exists (workflow will reuse it)
- Branch name conflicts (timestamp prevents this)
- Permissions issue (check PAT scopes)

### Problem: Slack notifications not working

**Example:**
```
Workflow succeeds but no Slack message
```

**Solution:**
```bash
# Check if secret exists
gh secret list | grep SLACK

# If not, add it:
gh secret set SLACK_WEBHOOK_URL

# Test webhook manually:
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test from GitHub"}' \
  YOUR_WEBHOOK_URL
```

## Additional Resources

- [Workflow Documentation](./WORKFLOW_DOCUMENTATION.md)
- [Troubleshooting Guide](./WORKFLOW_DOCUMENTATION.md#troubleshooting)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Documentation](https://cli.github.com/)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)
