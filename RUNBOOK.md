# Operations Runbook

> **Audience:** Maintainers, operators, and anyone troubleshooting workflow failures or performing operational tasks.
>
> **Goal:** Provide step-by-step guidance for common operational scenarios including troubleshooting CI/CD failures, rollback procedures, and emergency responses.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Workflow Troubleshooting](#workflow-troubleshooting)
3. [Rollback Procedures](#rollback-procedures)
4. [Emergency Procedures](#emergency-procedures)
5. [Monitoring and Alerts](#monitoring-and-alerts)
6. [Common Error Patterns](#common-error-patterns)

---

## Quick Reference

### Key Workflow Files
- **PR Validation**: `.github/workflows/pr-complete.yml` - Validates terms.yaml, runs scoring
- **Landing Page Deploy**: `.github/workflows/update-landing-page.yml` - Builds and deploys to GitHub Pages
- **Issue Automation**: `.github/workflows/issue-task-pr.yml` - Creates task branches and PRs
- **Stats Update**: `.github/workflows/readme-stats.yml` - Updates README statistics

### Critical Scripts
- `scripts/validateTerms.js` - Schema validation and duplicate detection
- `scripts/exportTerms.js` - Exports docs/terms.json (post-merge only)
- `scripts/generateLandingPage.js` - Generates docs/index.html
- `scripts/quickScore.js` - Scores individual terms

### Essential Commands
```bash
# Validate terms
npm run validate

# Score latest term
npm run score

# Generate landing page
npm run generate:landing

# Validate landing page
npm run validate:landing

# Export terms (only if new slugs added)
npm run export:new

# Run all tests
npm test
```

---

## Workflow Troubleshooting

### 1. PR Validation Workflow Failures

**Workflow**: `pr-complete.yml`

#### Symptom: Schema validation fails

**Error indicators:**
- ❌ "Schema validation failed"
- "additionalProperties" errors
- "required property missing" errors

**Diagnosis:**
```bash
# Clone the PR branch locally
git fetch origin pull/PR_NUMBER/head:pr-branch
git checkout pr-branch

# Run validation locally
npm run validate
```

**Common causes:**
1. Extra fields not in schema.json
2. Missing required fields (slug, term, definition)
3. Invalid slug format (must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`)
4. Definition too short (minimum 80 characters)

**Fix:**
- Review schema.json for allowed fields
- Ensure all required fields are present
- Fix slug format (lowercase, hyphens only, no trailing/leading hyphens)
- Expand definition to meet minimum length

#### Symptom: Duplicate detection fails

**Error indicators:**
- "Duplicate slug detected"
- "Duplicate term name detected"
- "Duplicate alias detected"

**Diagnosis:**
```bash
# Check for duplicates
npm run validate

# Search for specific term
grep -i "slug: term-name" terms.yaml
```

**Fix:**
- Remove or rename duplicate entries
- Check aliases for conflicts
- Verify case-insensitive uniqueness

#### Symptom: Scoring fails

**Error indicators:**
- "Term scoring failed"
- "Cannot read property 'slug' of undefined"

**Diagnosis:**
```bash
# Run scoring locally
npm run score
```

**Common causes:**
1. Malformed YAML in terms.yaml
2. Missing required fields for scoring
3. Invalid data types (arrays instead of strings)

**Fix:**
- Validate YAML syntax
- Ensure all scored fields exist
- Verify data types match schema

### 2. Landing Page Deployment Failures

**Workflow**: `update-landing-page.yml`

#### Symptom: Landing page generation fails

**Error indicators:**
- "Landing page generation failed"
- "Cannot find module" errors
- YAML parse errors

**Diagnosis:**
```bash
# Generate locally
npm run generate:landing

# Check for errors
npm run validate:landing
```

**Common causes:**
1. Malformed terms.yaml
2. Missing dependencies
3. Template errors in templates/landing-page.hbs

**Fix:**
```bash
# Reinstall dependencies
npm ci

# Test generation
npm run generate:landing

# Verify output
npm run validate:landing
```

#### Symptom: Pages deployment fails

**Error indicators:**
- "Deploy to GitHub Pages failed"
- 404 errors on GitHub Pages
- Artifact upload errors

**Diagnosis:**
1. Check workflow logs in Actions tab
2. Verify GitHub Pages settings: Settings → Pages → Source: GitHub Actions
3. Check artifact size (must be < 10GB)

**Fix:**
1. Re-run failed deployment from Actions tab
2. Verify Pages permissions: Settings → Actions → General → Workflow permissions: Read and write
3. Check if Pages is enabled for the repository

### 3. Export Terms Failures

**Workflow**: `update-landing-page.yml` (export step)

#### Symptom: terms.json not generated

**Error indicators:**
- "Export terms failed"
- "No new terms detected"
- Size limit exceeded

**Diagnosis:**
```bash
# Check if new terms exist
npm run export:new

# Test export without guard
npm run export
```

**Common causes:**
1. No new slugs added (export:new guard)
2. terms.json exceeds 2MB size limit
3. Invalid term data structure

**Fix:**
```bash
# If new terms exist, run full export
npm run export

# Check file size
ls -lh docs/terms.json

# Verify structure
head -50 docs/terms.json
```

### 4. Issue Automation Failures

**Workflow**: `issue-task-pr.yml`

#### Symptom: Branch creation fails

**Error indicators:**
- "Failed to create branch"
- "Branch already exists"
- "API rate limit exceeded"

**Diagnosis:**
```bash
# Check if branch exists
git fetch origin
git branch -a | grep task/ISSUE_NUMBER

# Check API rate limit
gh api rate_limit
```

**Fix:**
1. If branch exists, reuse it or delete: `git push origin --delete task/ISSUE_NUMBER-slug`
2. Wait for rate limit reset (automatic retry should handle this)
3. Check workflow permissions: contents: write

#### Symptom: PR creation fails

**Error indicators:**
- "Failed to create pull request"
- "PR already exists"
- "Validation failed"

**Diagnosis:**
```bash
# Check for existing PR
gh pr list --head task/ISSUE_NUMBER-slug

# Check PR validation
gh pr checks PR_NUMBER
```

**Fix:**
1. If PR exists, close or update it
2. Verify pull-requests: write permission
3. Check branch protection rules

---

## Rollback Procedures

### 1. Rollback Landing Page Deployment

When the landing page deployment introduces errors or shows incorrect data.

#### Quick Rollback

**Using GitHub UI:**
1. Go to Actions → "Build & Deploy Landing Page"
2. Find the last successful workflow run
3. Click "Re-run all jobs"
4. Wait for deployment to complete (2-5 minutes)

**Using GitHub CLI:**
```bash
# List recent workflow runs
gh run list --workflow=update-landing-page.yml --limit 10

# Re-run a specific successful run
gh run rerun RUN_ID
```

#### Rollback to Specific Commit

**If you need to rollback to a specific version:**

```bash
# Find the commit SHA you want to rollback to
git log --oneline docs/index.html

# Create a revert commit (recommended - preserves history)
git revert --no-commit COMMIT_SHA
git commit -m "Revert landing page to version COMMIT_SHA"
git push origin main

# Alternatively, reset to specific commit (use with caution)
# This approach is NOT recommended for main branch
# git reset --hard COMMIT_SHA
# git push --force origin main  # DANGEROUS - requires force push permissions
```

**Best practice: Use `git revert` instead of `git reset --hard`**

```bash
# Revert a specific commit (creates a new commit that undoes changes)
git revert COMMIT_SHA

# Revert multiple commits
git revert COMMIT_SHA1 COMMIT_SHA2 COMMIT_SHA3

# Revert a range of commits (oldest first)
git revert --no-commit OLDEST_SHA^..NEWEST_SHA
git commit -m "Revert changes from OLDEST_SHA to NEWEST_SHA"

# Push the revert
git push origin main
```

### 2. Rollback terms.yaml Changes

When a merged PR introduces invalid terms or data issues.

#### Immediate Rollback

```bash
# Identify the problematic commit
git log --oneline terms.yaml | head -10

# Revert the specific commit
git revert BAD_COMMIT_SHA

# Verify the revert
npm run validate
npm test

# Push the revert
git push origin main
```

#### Selective Rollback (Cherry-pick previous version)

```bash
# Find the last known good version
git log --oneline terms.yaml

# Extract specific file from previous commit
git show GOOD_COMMIT_SHA:terms.yaml > terms.yaml

# Verify the rollback
npm run validate
npm test

# Commit the fix
git add terms.yaml
git commit -m "Rollback terms.yaml to version GOOD_COMMIT_SHA"
git push origin main
```

### 3. Rollback docs/terms.json

The terms.json file is generated during deployment and should not be committed to the repository (per terms-json-deploy.md decision). If you need to rollback:

#### Option A: Rollback via Workflow Re-run (Recommended)

```bash
# Find successful workflow run with correct data
gh run list --workflow=update-landing-page.yml --limit 20

# Re-run that workflow
gh run rerun GOOD_RUN_ID
```

#### Option B: Regenerate from Current Source

```bash
# Ensure terms.yaml is correct
npm run validate

# Regenerate terms.json
npm run export

# Deploy manually
git add docs/terms.json
git commit -m "Regenerate terms.json from current terms.yaml"
git push origin main
```

**Note:** Committing terms.json is against project policy (see docs/terms-json-deploy.md). Only do this as an emergency measure and remove it in a follow-up commit.

### 4. Rollback Workflow Changes

When a workflow change breaks CI/CD pipelines.

#### Quick Rollback

```bash
# Identify the problematic commit
git log --oneline .github/workflows/

# Revert the workflow change
git revert WORKFLOW_COMMIT_SHA

# Test locally if possible
act -l  # List jobs (requires act CLI)

# Push the revert
git push origin main
```

#### Emergency Workflow Disable

```bash
# Disable workflow via GitHub UI:
# Settings → Actions → General → Actions permissions → Disable specific workflow

# Or edit workflow file to add condition
git checkout main
git pull origin main

# Add to workflow:
# if: false  # Emergency disable

git add .github/workflows/problematic-workflow.yml
git commit -m "Emergency disable: problematic-workflow.yml"
git push origin main
```

### 5. Rollback Release/Tag

When a release is tagged incorrectly.

```bash
# Delete local tag
git tag -d TAG_NAME

# Delete remote tag
git push origin --delete TAG_NAME

# Recreate tag at correct commit
git tag TAG_NAME CORRECT_COMMIT_SHA
git push origin TAG_NAME
```

---

## Emergency Procedures

### 1. Complete Site Outage

**Symptoms:**
- GitHub Pages returns 404
- All pages inaccessible
- "Site not found" errors

**Immediate Actions:**
1. Check GitHub Pages status: https://www.githubstatus.com/
2. Verify Pages settings: Settings → Pages → Enabled
3. Check latest deployment: Actions → "Build & Deploy Landing Page"

**Recovery:**
```bash
# Re-run latest successful deployment
gh run list --workflow=update-landing-page.yml --limit 5
gh run rerun LAST_SUCCESSFUL_RUN_ID

# Or trigger manual deployment
gh workflow run update-landing-page.yml
```

### 2. Data Corruption in terms.yaml

**Symptoms:**
- All workflows failing
- Validation errors on main branch
- Cannot parse YAML

**Immediate Actions:**
1. Identify the corrupting commit
2. Revert immediately
3. Notify contributors

**Recovery:**
```bash
# Find the last known good commit
git log --oneline terms.yaml | head -20

# Revert to last known good
git revert --no-commit BAD_COMMIT_SHA
git commit -m "Emergency revert: data corruption in terms.yaml"

# Verify
npm run validate
npm test

# Push fix
git push origin main

# Notify team
# Post in GitHub Discussions or relevant communication channel
```

### 3. Workflow Infinite Loop

**Symptoms:**
- Workflow runs continuously
- Multiple runs queued
- Rate limit errors

**Immediate Actions:**
```bash
# Cancel all running workflows
gh run list --limit 50 | grep "in_progress" | awk '{print $7}' | xargs -I {} gh run cancel {}

# Disable problematic workflow
# Go to Settings → Actions → Disable specific workflow

# Or add condition to workflow file
# if: github.event_name != 'push' || github.ref != 'refs/heads/main'
```

### 4. Leaked Secrets or Credentials

**Symptoms:**
- Security alert from GitHub
- API tokens exposed in logs
- Unauthorized access detected

**Immediate Actions:**
1. **STOP ALL WORKFLOWS IMMEDIATELY**
2. Rotate all secrets: Settings → Secrets and variables → Actions
3. Review all workflow runs for exposure
4. Revoke compromised credentials at source (GitHub PAT, etc.)

**Recovery:**
```bash
# Cancel all running workflows
gh run list --limit 100 | grep "in_progress" | awk '{print $7}' | xargs -I {} gh run cancel {}

# Rotate secrets in GitHub UI:
# Settings → Secrets and variables → Actions → Update each secret

# Review workflow logs:
gh run list --limit 50
gh run view RUN_ID --log

# Contact GitHub Support if public exposure occurred
# https://support.github.com/
```

---

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Workflow Success Rate**
   - Target: >95% success rate
   - Check: Actions → Workflows → Success/Failure ratio

2. **Landing Page Sync Status**
   - Target: Landing page always in sync with terms.yaml
   - Check: Run `npm run validate:landing` locally

3. **Build Time**
   - Target: <5 minutes for landing page deployment
   - Check: Actions → Workflow runs → Duration

4. **terms.json Size**
   - Target: <2MB (hard limit)
   - Check: `ls -lh docs/terms.json`

### Setting Up Alerts

**GitHub Actions Email Notifications:**
1. Go to https://github.com/settings/notifications
2. Enable "Actions" notifications
3. Choose notification frequency

**Workflow Status Badge in README:**
```markdown
[![CI](https://github.com/LuminLynx/FOSS-Glossary/actions/workflows/pr-complete.yml/badge.svg)](https://github.com/LuminLynx/FOSS-Glossary/actions)
```

**Slack Integration (if configured):**
- See docs/WORKFLOW_DOCUMENTATION.md for Slack webhook setup
- Workflows send notifications on failure

---

## Common Error Patterns

### Pattern 1: "Module not found" Errors

**Cause:** Missing dependencies or npm cache issues

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify
npm test
```

### Pattern 2: YAML Parse Errors

**Cause:** Invalid YAML syntax in terms.yaml

**Solution:**
```bash
# Validate YAML syntax online: https://www.yamllint.com/
# Or use local validator
npm run validate

# Common issues:
# - Unescaped quotes
# - Incorrect indentation
# - Missing colons
# - Invalid list format
```

### Pattern 3: "Reference does not exist" Git Errors

**Cause:** Branch or commit doesn't exist in remote

**Solution:**
```bash
# Fetch all refs
git fetch origin

# List all branches
git branch -a

# Create missing branch
git checkout -b missing-branch
git push origin missing-branch
```

### Pattern 4: Rate Limit Exceeded

**Cause:** Too many API calls to GitHub

**Solution:**
```bash
# Check current rate limit
gh api rate_limit

# Wait for reset
# Core: 5000 requests/hour
# Search: 30 requests/minute

# Or use authenticated token with higher limits
# Set GITHUB_TOKEN in workflow
```

### Pattern 5: "additionalProperties" Validation Error

**Cause:** Extra fields in terms.yaml not defined in schema.json

**Solution:**
```bash
# Identify invalid fields
npm run validate

# Review schema.json for allowed fields
node -e "const schema = require('./schema.json'); console.log(Object.keys(schema.properties.terms.items.properties));"

# Remove or move extra fields to allowed locations
# Valid fields: slug, term, definition, explanation, humor, tags, 
#               see_also, aliases, controversy_level, redirects
```

---

## Related Documentation

- [AGENTS.md](./AGENTS.md) - Automation playbook for agents
- [WORKFLOW_DOCUMENTATION.md](./docs/WORKFLOW_DOCUMENTATION.md) - Complete workflow reference
- [landing-page-maintenance.md](./docs/landing-page-maintenance.md) - Landing page operations
- [terms-json-deploy.md](./docs/terms-json-deploy.md) - Terms JSON deployment strategy
- [README.md](./README.md) - Project overview and quick links

---

## Support

For issues not covered in this runbook:

1. **Check workflow logs**: Actions → Workflow run → Job → Step logs
2. **Search existing issues**: https://github.com/LuminLynx/FOSS-Glossary/issues
3. **Open a new issue**: Include workflow run ID, error logs, and steps to reproduce
4. **Contact maintainers**: Tag @LuminLynx in issue or discussion

---

**Last Updated:** 2025-10-31  
**Maintained By:** Repository Maintainers  
**Version:** 1.0.0
