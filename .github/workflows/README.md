# GitHub Actions Workflows

This directory contains automated workflows for the FOSS Glossary repository.

## Workflows

### Issue Task PR Automation (`issue-task-pr.yml`)
Automatically creates task branches, task files, and pull requests when issues are assigned or labeled.

**Triggers:**
- Issue assignment to bot user
- Issue labeled with trigger labels (`codex`, `ready-for-codex`)
- Manual dispatch

**Key Features:**
- Unique branch/file naming with timestamps
- Retry mechanism for API calls
- Input validation
- Slack notifications
- Organized task files in subdirectories

**[📖 Full Documentation](../../docs/WORKFLOW_DOCUMENTATION.md)**

**Quick Start:**
```bash
# Trigger automatically: assign issue to bot or add 'codex' label

# Manual trigger via CLI:
gh workflow run issue-task-pr.yml \
  -f title="Your issue title" \
  -f body="Issue description" \
  -f labels="enhancement,bug"
```

### Issue Assigned Codex (`issue-assigned-codex.yml`)
Acknowledges when issues are assigned to the Codex bot and applies tracking labels.

**Triggers:**
- Issue assignment
- Issue labeled

**Key Features:**
- Posts acknowledgement comment
- Applies `in-progress` label
- Validates bot assignment and `codex` label

### PR Complete (`pr-complete.yml`)
Validates pull requests for term additions and calculates contributor scores.

**Triggers:**
- Pull request opened/synchronized

**Key Features:**
- Validates terms.yaml against schema
- Calculates contribution scores
- Updates PR with validation results

### PR Welcome (`pr-welcome.yml`)
Welcomes first-time contributors with helpful information.

**Triggers:**
- Pull request opened

### Update Landing Page (`update-landing-page.yml`)
Exports terms.yaml to JSON for the landing page after merges.

**Triggers:**
- Push to main branch (when terms.yaml changes)

**Key Features:**
- Exports new terms only
- Updates docs/terms.json

### README Stats (`readme-stats.yml`)
Updates repository statistics in README.md.

**Triggers:**
- Push to main branch
- Weekly schedule

## Configuration

### Repository Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `CODEX_BOT_LOGIN` | Bot username | issue-task-pr.yml, issue-assigned-codex.yml |
| `TRIGGER_LABELS` | Comma-separated trigger labels | issue-task-pr.yml |

### Repository Secrets

| Secret | Description | Used By |
|--------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | issue-task-pr.yml |
| `CODEX_FOSS_TOK` | Fine-grained PAT for bot | issue-assigned-codex.yml |

## Common Tasks

### Enable Slack Notifications

1. Create Slack webhook at https://api.slack.com/apps
2. Add webhook URL as `SLACK_WEBHOOK_URL` secret
3. Notifications will be sent automatically

### Change Bot Username

1. Add `CODEX_BOT_LOGIN` repository variable with new username
2. Update bot assignment accordingly

### Change Trigger Labels

1. Add `TRIGGER_LABELS` repository variable
2. Format: comma-separated, no spaces (e.g., `codex,ready,automation`)

### Manual Issue Creation

```bash
gh workflow run issue-task-pr.yml \
  -f title="Issue title" \
  -f body="Description" \
  -f labels="label1,label2" \
  -f notify_slack=true
```

## Troubleshooting

See [Workflow Documentation](../../docs/WORKFLOW_DOCUMENTATION.md#troubleshooting) for detailed troubleshooting steps.

**Quick checks:**
- Verify repository variables are set correctly
- Check workflow run logs in Actions tab
- Ensure secrets are configured (if using optional features)
- Review job summaries for error details

## Development

### Testing Workflows

1. Create a test issue
2. Assign to bot or add trigger label
3. Monitor workflow run in Actions tab
4. Check job summaries and logs

### Modifying Workflows

1. Edit workflow YAML files
2. Test changes in a feature branch
3. Review workflow runs before merging
4. Update documentation if behavior changes

## Support

For issues or questions:
1. Check workflow documentation
2. Review workflow run logs
3. Check job summaries
4. Open an issue with workflow run details
