# Issue Task PR Automation Workflow Documentation

## Overview

The Issue Task PR Automation workflow automatically creates task branches, task files, and pull requests when issues are assigned to the bot or labeled with trigger labels. This streamlines the process of converting issues into actionable tasks.

## Features

### 1. Unique Branch and File Naming
- **Branch naming:** `task/{issueNumber}-{slug}-{timestamp}`
- **Task file naming:** `tasks/{issueNumber}/{slug}-{timestamp}.md`
- Timestamps prevent naming conflicts when multiple tasks are created for the same issue
- Task files are organized in subdirectories by issue number for better maintainability

### 2. Enhanced Error Handling
- Automatic retry mechanism with exponential backoff for API calls
- Retries up to 3 times for transient errors (500+ status codes, 429 rate limit, connection resets)
- Detailed logging at each step for debugging
- Grouped console output for better readability
- Job summaries showing success/failure status

### 3. Input Validation
- Validates `workflow_dispatch` inputs for proper format
- Title: Required, non-empty, max 256 characters
- Labels: Alphanumeric with spaces, hyphens, and underscores, max 50 characters each
- Validation runs before issue creation to prevent errors

### 4. Permission Minimization
- Workflow permissions limited to:
  - `contents: write` - For creating branches and files
  - `pull-requests: write` - For creating PRs
  - `issues: write` - For commenting on issues
- No unnecessary permissions granted

### 5. Dynamic Assignee Handling
- Supports both assignee-based and label-based triggers
- Default trigger labels: `codex`, `ready-for-codex`
- Configurable via repository variables:
  - `CODEX_BOT_LOGIN` - Bot username (default: `my-codex-bot`)
  - `TRIGGER_LABELS` - Comma-separated list of trigger labels

### 6. Task File Organization
- Task files organized in subdirectories: `tasks/{issueNumber}/`
- Each task file includes:
  - Issue metadata (number, title, assignee, branch, timestamp)
  - Checklist for tracking progress
  - Issue body/description
  - Creation timestamp

### 7. Notification Mechanism
- Optional Slack notifications for workflow execution
- Notifies on both success and failure
- Configure via `SLACK_WEBHOOK_URL` secret
- Can be enabled for manual triggers via `notify_slack` input

### 8. Enhanced Logging
- Emoji indicators for different operations (✅, ♻️, ℹ️, ❌)
- Grouped console output for each major step
- Detailed error messages with stack traces
- Job summaries with key information

## Usage

### Automatic Trigger (Issue Assignment or Label)

The workflow automatically runs when:
1. An issue is assigned to the configured bot user (default: `my-codex-bot`)
2. OR an issue receives one of the trigger labels (`codex` or `ready-for-codex`)

**Steps:**
1. Open or find an issue
2. Either:
   - Assign it to the bot user, OR
   - Add a trigger label (`codex` or `ready-for-codex`)
3. The workflow will:
   - Create a branch named `task/{issueNumber}-{slug}-{timestamp}`
   - Create a task file at `tasks/{issueNumber}/{slug}-{timestamp}.md`
   - Open a pull request from the branch
   - Comment on the issue with the PR link

### Manual Trigger (workflow_dispatch)

You can manually create an issue and trigger the automation:

**Via GitHub UI:**
1. Go to Actions → Issue Task PR Automation
2. Click "Run workflow"
3. Fill in the inputs:
   - **Title** (required): Issue title
   - **Body** (optional): Issue description
   - **Labels** (optional): Comma-separated labels (e.g., `enhancement,documentation`)
   - **Notify Slack** (optional): Check to send Slack notification

**Via GitHub CLI:**
```bash
gh workflow run issue-task-pr.yml \
  -f title="Add new feature" \
  -f body="Detailed description here" \
  -f labels="enhancement,high-priority" \
  -f notify_slack=true
```

**Via API:**
```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/issue-task-pr.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "title": "Add new feature",
      "body": "Detailed description here",
      "labels": "enhancement,high-priority",
      "notify_slack": "false"
    }
  }'
```

## Configuration

### Repository Variables

Set these in Settings → Secrets and variables → Actions → Variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `CODEX_BOT_LOGIN` | Username of the bot that triggers automation | `my-codex-bot` |
| `TRIGGER_LABELS` | Comma-separated labels that trigger automation | `codex,ready-for-codex` |

### Repository Secrets

Set these in Settings → Secrets and variables → Actions → Secrets:

| Secret | Description | Required |
|--------|-------------|----------|
| `SLACK_WEBHOOK_URL` | Slack webhook URL for notifications | Optional |
| `CODEX_FOSS_TOK` | Fine-grained PAT for bot actions | Optional* |

*Required if the bot needs to act across repositories

### Slack Notifications

To enable Slack notifications:

1. Create a Slack webhook:
   - Go to https://api.slack.com/apps
   - Create a new app or select existing
   - Add "Incoming Webhooks" feature
   - Create a webhook for your channel
   - Copy the webhook URL

2. Add webhook URL as a repository secret:
   - Go to Settings → Secrets and variables → Actions → Secrets
   - Add new secret named `SLACK_WEBHOOK_URL`
   - Paste the webhook URL

3. Notifications will be sent automatically for:
   - Issue assignment automation (when workflow completes)
   - Manual issue creation (when `notify_slack` input is enabled)

## Task File Structure

Task files are created at `tasks/{issueNumber}/{slug}-{timestamp}.md` with the following structure:

```markdown
---
issue: #123
title: "Issue Title"
assignee: @my-codex-bot
branch: task/123-issue-title-1234567890
created: 2024-01-01T12:00:00.000Z
timestamp: 1234567890
---

## Checklist

- [ ] Review issue requirements
- [ ] Implement solution
- [ ] Open pull request
- [ ] Notify repository owner

## Issue Details

[Issue body/description]
```

## Troubleshooting

### Workflow doesn't trigger on issue assignment

**Possible causes:**
1. Issue not assigned to the configured bot user
2. Bot username doesn't match `CODEX_BOT_LOGIN` variable
3. No trigger label applied

**Solutions:**
- Verify the bot username in repository variables
- Check that the issue is assigned to the correct user
- Add a trigger label (`codex` or `ready-for-codex`)

### Workflow doesn't trigger on label

**Possible causes:**
1. Label name doesn't match configured trigger labels
2. `TRIGGER_LABELS` variable is incorrectly configured

**Solutions:**
- Check the label name matches one in `TRIGGER_LABELS`
- Verify `TRIGGER_LABELS` variable format (comma-separated, no spaces)

### Branch creation fails

**Possible causes:**
1. Branch already exists
2. Insufficient permissions
3. API rate limit exceeded

**Solutions:**
- Check if branch already exists (workflow will reuse it)
- Verify `GITHUB_TOKEN` has `contents: write` permission
- Wait for rate limit reset (automatic retry will handle this)

### PR creation fails

**Possible causes:**
1. PR already exists for this branch
2. Insufficient permissions
3. API rate limit exceeded

**Solutions:**
- Check if PR already exists (workflow will reuse it)
- Verify `GITHUB_TOKEN` has `pull-requests: write` permission
- Wait for rate limit reset (automatic retry will handle this)

### Task file not created

**Possible causes:**
1. Branch doesn't exist
2. Insufficient permissions
3. Path conflicts

**Solutions:**
- Verify branch was created successfully
- Check workflow logs for specific error
- Ensure `contents: write` permission

### Slack notifications not sent

**Possible causes:**
1. `SLACK_WEBHOOK_URL` secret not configured
2. Webhook URL is invalid or expired
3. Network issues

**Solutions:**
- Verify `SLACK_WEBHOOK_URL` secret exists and is correct
- Test webhook URL manually
- Check workflow logs for specific error

### Input validation fails

**Possible causes:**
1. Title is empty or too long (>256 characters)
2. Labels contain invalid characters
3. Label is too long (>50 characters)

**Solutions:**
- Ensure title is provided and within length limit
- Use only alphanumeric characters, spaces, hyphens, and underscores in labels
- Keep individual labels under 50 characters

## Workflow Outputs

The `handle-issue-assignment` job provides the following outputs:

| Output | Description | Example |
|--------|-------------|---------|
| `pr-url` | URL of the created/updated PR | `https://github.com/owner/repo/pull/123` |
| `branch-name` | Name of the task branch | `task/123-issue-title-1234567890` |
| `success` | Whether the workflow succeeded | `true` or `false` |

These outputs can be used by subsequent jobs or workflows.

## Best Practices

1. **Use descriptive issue titles** - They become part of branch and file names
2. **Add appropriate labels** - Helps categorize and filter tasks
3. **Monitor Slack notifications** - Stay informed of automation status
4. **Review task files** - Ensure they contain all necessary information
5. **Close issues after PR merge** - Keep issue tracker clean
6. **Use unique trigger labels** - Avoid conflicts with other workflows

## Limitations

1. Maximum issue title length for branch names: ~35 characters (due to slug truncation)
2. Retry mechanism attempts: 3 times with exponential backoff
3. API rate limits apply (automatic retry helps but may still fail if exhausted)
4. Notification mechanism currently supports Slack only

## Examples

### Example 1: Simple Enhancement

**Scenario:** Add a new feature to the project

**Steps:**
1. Create issue with title "Add dark mode support"
2. Add label `enhancement` and `codex`
3. Workflow creates:
   - Branch: `task/45-add-dark-mode-support-1729276800000`
   - File: `tasks/45/add-dark-mode-support-1729276800000.md`
   - PR: "task: #45 Add dark mode support"

### Example 2: Bug Fix

**Scenario:** Fix a critical bug

**Steps:**
1. Create issue with title "Fix login authentication error"
2. Add labels `bug`, `high-priority`
3. Assign to `my-codex-bot`
4. Workflow creates task and PR
5. Slack notification sent (if configured)

### Example 3: Manual Creation

**Scenario:** Create issue and task via API

**Steps:**
```bash
gh workflow run issue-task-pr.yml \
  -f title="Update documentation for API v2" \
  -f body="Need to document new endpoints and deprecate old ones" \
  -f labels="documentation,enhancement" \
  -f notify_slack=true
```

Result:
- Issue created: #67
- Branch: `task/67-update-documentation-for-api-v2-1729276800000`
- File: `tasks/67/update-documentation-for-api-v2-1729276800000.md`
- PR created and linked
- Slack notification sent

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review workflow run logs in Actions tab
3. Check job summaries for detailed error information
4. Open an issue in the repository with workflow run details

## Changelog

### Version 2.0.0 (Current)
- Added unique timestamps to branch and file names
- Implemented retry mechanism with exponential backoff
- Added input validation for workflow_dispatch
- Minimized permissions
- Added dynamic assignee handling with label triggers
- Organized task files in subdirectories
- Added Slack notification support
- Enhanced logging with emojis and grouping
- Added comprehensive documentation

### Version 1.0.0
- Initial version
- Basic issue assignment automation
- Simple branch and PR creation
