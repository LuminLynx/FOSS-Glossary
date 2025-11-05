# Workflow Documentation

Welcome to the FOSS Glossary workflow documentation!

## 📚 Quick Links

- [Complete Documentation](../WORKFLOW_DOCUMENTATION.md) - Full reference guide
- [Practical Examples](../WORKFLOW_EXAMPLES.md) - Real-world usage examples
- [Changelog](../WORKFLOW_CHANGELOG.md) - Version history and changes

## 🚀 Quick Start

### Automatic Trigger

1. Assign issue to bot OR add trigger label (`codex`)
2. Wait 30-60 seconds
3. Check issue for PR link

### Manual Trigger

```bash
gh workflow run issue-task-pr.yml \
  -f title="Your issue title" \
  -f body="Description" \
  -f labels="enhancement"
```

## 🔍 Key Features

- ✅ Unique naming with timestamps
- ✅ Automatic retry on failures
- ✅ Input validation
- ✅ Flexible triggers (assignment or labels)
- ✅ Organized task files
- ✅ Slack notifications
- ✅ Enhanced logging

## �� Full Documentation

See [WORKFLOW_DOCUMENTATION.md](../WORKFLOW_DOCUMENTATION.md) for complete details.
