# 🔧 FOSS Glossary Operations Runbook

> **Audience:** Maintainers and operators  
> **Purpose:** Step-by-step guides for troubleshooting, recovery, and rollback procedures

---

## Table of Contents

- [Quick Reference](#quick-reference)
- [CI/CD Pipeline Overview](#cicd-pipeline-overview)
- [Troubleshooting Workflow Failures](#troubleshooting-workflow-failures)
- [Rollback Procedures](#rollback-procedures)
- [Emergency Contacts](#emergency-contacts)

---

## Quick Reference

### Common Commands

```bash
# Validate terms locally
npm run validate

# Score a term
npm run score

# Generate landing page
npm run generate:landing

# Export terms.json
npm run export

# Run all tests
npm test
```

### Critical Workflows

| Workflow | Trigger | Purpose | Docs |
|----------|---------|---------|------|
| `pr-complete.yml` | PR to main | Validate terms.yaml, score contributions | [§5 AGENTS.md](./AGENTS.md#5-validation--schema-rules-what-agents-enforce) |
| `update-landing-page.yml` | Push to main | Build and deploy GitHub Pages | [landing-page-maintenance.md](./docs/landing-page-maintenance.md) |
| `readme-stats.yml` | Push to main, weekly | Update README statistics | - |
| `issue-task-pr.yml` | Issue assignment/label | Create task branches and PRs | [WORKFLOW_DOCUMENTATION.md](./docs/WORKFLOW_DOCUMENTATION.md) |

---

## CI/CD Pipeline Overview

### Pull Request Flow

```
┌─────────────────────┐
│  PR Opened/Updated  │
│   (terms.yaml)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   pr-complete.yml   │
│  ┌───────────────┐  │
│  │ 1. Validate   │  │
│  │    Schema     │  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │ 2. Check      │  │
│  │    Duplicates │  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │ 3. Export     │  │
│  │    Dry-run    │  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │ 4. Score Term │  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │ 5. Comment PR │  │
│  └───────────────┘  │
└─────────────────────┘
           │
           ▼
    ✅ Ready for Review
```

### Post-Merge Deployment Flow

```
┌─────────────────────┐
│   Merge to main     │
│   (terms.yaml)      │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────┐
│ update-landing-page.yml  │
│  ┌────────────────────┐  │
│  │ 1. Generate HTML   │  │
│  └──────────┬─────────┘  │
│             │            │
│  ┌──────────▼─────────┐  │
│  │ 2. Validate Sync   │  │
│  └──────────┬─────────┘  │
│             │            │
│  ┌──────────▼─────────┐  │
│  │ 3. Export terms.json│ │
│  │    (if new terms)   │ │
│  └──────────┬─────────┘  │
│             │            │
│  ┌──────────▼─────────┐  │
│  │ 4. Upload Artifact │  │
│  └──────────┬─────────┘  │
│             │            │
│  ┌──────────▼─────────┐  │
│  │ 5. Deploy Pages    │  │
│  └────────────────────┘  │
└──────────────────────────┘
           │
           ▼
    🚀 Live on GitHub Pages
```

---

## Troubleshooting Workflow Failures

### PR Validation Failures

#### Symptom: Schema Validation Failed

**Error message:**
```
❌ Validation error at terms[5]:
  - must have required property 'definition'
```

**Diagnosis:**
- A term is missing a required field (slug, term, or definition)
- Or has invalid data types

**Resolution:**
1. Check the error message for the term index
2. Open `terms.yaml` and navigate to that term
3. Ensure all required fields are present:
   - `slug` (3-48 chars, lowercase, hyphens only)
   - `term` (the term name)
   - `definition` (minimum 80 characters)
4. Push the fix to the PR branch

**Prevention:**
- Use a YAML linter locally before committing
- Run `npm run validate` before pushing

---

#### Symptom: Duplicate Slug/Name Detected

**Error message:**
```
❌ Duplicate slug detected: "git" (indices 5, 12)
```

**Diagnosis:**
- Two terms share the same slug
- Or term names/aliases conflict (case/punctuation-insensitive)

**Resolution:**
1. Locate both conflicting terms using the indices
2. Choose which term to keep or rename one
3. If renaming, ensure the new slug is unique
4. Update any cross-references in `see_also` fields
5. Push the fix

**Prevention:**
- Search `terms.yaml` for the slug before adding a new term
- Run `npm run validate` locally

---

#### Symptom: Export Schema Check Failed

**Error message:**
```
❌ Export schema check failed
```

**Diagnosis:**
- Terms contain data that cannot be properly exported to JSON
- Possible encoding issues or invalid characters

**Resolution:**
1. Check the detailed error in workflow logs
2. Look for non-UTF-8 characters or malformed data
3. Fix the offending term(s)
4. Test locally with `npm run export:new`

**Prevention:**
- Use UTF-8 encoding for all edits
- Avoid copy-pasting from rich text sources

---

#### Symptom: Scoring Failed

**Error message:**
```
❌ Term scoring failed
```

**Diagnosis:**
- The term structure is valid but scoring logic encountered an issue
- Typically occurs with edge cases in optional fields

**Resolution:**
1. Review the term that was just added/modified
2. Check arrays (`tags`, `see_also`, `aliases`) are properly formatted
3. Ensure `controversy_level` is one of: `none`, `low`, `medium`, `high`, `very-high`
4. Test locally with `npm run score`

---

### Deployment Failures

#### Symptom: Landing Page Generation Failed

**Error message:**
```
Error: Landing page generation failed
```

**Diagnosis:**
- `generateLandingPage.js` encountered an error
- Possible template issues or malformed YAML

**Resolution:**
1. Check workflow logs for the specific error
2. Test locally:
   ```bash
   npm run generate:landing
   ```
3. If template error, check `templates/landing-page.hbs`
4. If YAML error, validate terms.yaml structure
5. Fix and re-run the workflow

**Manual recovery:**
```bash
# Generate landing page locally
npm run generate:landing

# Commit and push to main
git add docs/index.html
git commit -m "fix: regenerate landing page"
git push origin main
```

---

#### Symptom: Landing Page Validation Failed

**Error message:**
```
❌ Error: Total terms mismatch
   Expected: 28 terms (from terms.yaml)
   Found: 1 terms (in docs/index.html)
```

**Diagnosis:**
- Generated HTML doesn't match source data
- Usually happens if generation was interrupted

**Resolution:**
1. Re-run the workflow manually:
   - Go to Actions → "Build & Deploy Landing Page"
   - Click "Run workflow" → Select `main` → "Run workflow"
2. Or regenerate locally (see above)

---

#### Symptom: GitHub Pages Deployment Failed

**Error message:**
```
Error: Failed to deploy to GitHub Pages
```

**Diagnosis:**
- Pages deployment service error
- Artifact upload failed
- Permissions issue

**Resolution:**
1. Check Pages settings:
   - Settings → Pages → Source should be "GitHub Actions"
2. Verify workflow permissions:
   - `.github/workflows/update-landing-page.yml` has `pages: write`
3. Check GitHub Status: https://www.githubstatus.com/
4. Retry the deployment:
   - Actions → Failed workflow → "Re-run failed jobs"

**Escalation:**
- If Pages deployment consistently fails, check repository permissions
- Verify GITHUB_TOKEN has necessary scopes

---

### Build/Test Failures

#### Symptom: npm ci Failed

**Error message:**
```
npm ERR! Cannot find module 'js-yaml'
```

**Diagnosis:**
- Dependencies not installed or corrupted
- package-lock.json out of sync

**Resolution:**
1. Check `package.json` and `package-lock.json` are in sync
2. Delete `node_modules/` if it exists locally
3. Run `npm ci` to clean install
4. Commit any package-lock.json changes if necessary

---

#### Symptom: Tests Failed Locally but Pass in CI

**Diagnosis:**
- Environment differences (Node version, dependencies)
- Local state/cache issues

**Resolution:**
```bash
# Clean rebuild
rm -rf node_modules
npm ci

# Use same Node version as CI (check .github/workflows/*.yml)
nvm use 20  # or appropriate version

# Run tests
npm test
```

---

## Rollback Procedures

### Scenario 1: Bad Term Added to main

**Impact:** Low - Single term with errors, site still functional

**Quick rollback:**

```bash
# 1. Identify the bad commit SHA
git log --oneline -10
# Example output: abc1234 Add new term "BadTerm"

# 2. Revert the specific commit
git revert abc1234

# 3. Push the revert
git push origin main

# 4. Wait for CI to redeploy
# Check Actions tab for workflow status
```

**Alternative - Edit in place:**
```bash
# 1. Create a fix branch
git checkout -b fix/term-error

# 2. Edit terms.yaml to fix the issue
nano terms.yaml

# 3. Validate locally
npm run validate

# 4. Commit and push
git add terms.yaml
git commit -m "fix: correct definition for BadTerm"
git push origin fix/term-error

# 5. Open PR and merge
```

---

### Scenario 2: Multiple Bad Terms or Data Corruption

**Impact:** Medium - Multiple terms affected, validation may be broken

**Rollback to last known good state:**

```bash
# 1. Find the last known good commit
git log --oneline -- terms.yaml
# Example output:
#   abc1234 Add term X (← current, broken)
#   def5678 Add term Y (← this one was good)
#   ghi9012 Add term Z

# 2. Create a fix branch
git checkout -b rollback/terms-yaml

# 3. Restore terms.yaml from the good commit
git checkout def5678 -- terms.yaml

# 4. Validate
npm run validate
npm test

# 5. Commit the rollback
git add terms.yaml
git commit -m "rollback: restore terms.yaml to commit def5678"

# 6. Push and create PR
git push origin rollback/terms-yaml
gh pr create --title "Rollback terms.yaml to known good state" \
  --body "Restores terms.yaml from commit def5678 due to data corruption in abc1234"
```

**Direct push to main (emergency only):**
```bash
# ⚠️  Use only if PR process is broken
git checkout main
git pull
git checkout def5678 -- terms.yaml
git commit -m "emergency rollback: restore terms.yaml to def5678"
git push origin main
```

---

### Scenario 3: Landing Page Broken

**Impact:** High - User-facing site is broken or showing errors

**Quick fix - Redeploy previous successful build:**

1. Navigate to Actions → "Build & Deploy Landing Page"
2. Find the last successful run (green checkmark)
3. Click on the successful run
4. Click "Re-run all jobs" at the top right

**Alternative - Rollback via workflow artifact:**

```bash
# 1. Download artifact from last good deployment
# Go to Actions → Successful workflow run → Artifacts → Download

# 2. Create fix branch
git checkout -b fix/landing-page

# 3. Extract artifact and copy index.html
unzip github-pages.zip
cp index.html /path/to/repo/docs/index.html

# 4. Commit
git add docs/index.html
git commit -m "fix: restore working landing page"
git push origin fix/landing-page
```

**Rebuild from source:**
```bash
# If you have a known good commit for terms.yaml
git checkout main
git pull

# Generate fresh
npm ci
npm run generate:landing
npm run validate:landing

# If valid, commit and push
git add docs/index.html
git commit -m "fix: regenerate landing page"
git push origin main
```

---

### Scenario 4: GitHub Pages Not Updating

**Impact:** Medium - Site shows stale content

**Diagnosis:**
1. Check if deployment workflow completed successfully
2. Verify Pages is enabled and set to "GitHub Actions" source
3. Check for any deployment errors

**Resolution:**

```bash
# 1. Manual workflow trigger
gh workflow run update-landing-page.yml --ref main

# 2. Check Pages deployment
gh api repos/:owner/:repo/pages/builds/latest

# 3. If needed, rebuild from scratch
git checkout main
npm ci
npm run generate:landing
git add docs/index.html
git commit -m "fix: force landing page rebuild"
git push origin main
```

**Pages settings verification:**
1. Settings → Pages
2. Source: "GitHub Actions" (not "Deploy from a branch")
3. Check deployment logs in Actions tab

---

### Scenario 5: Rollback terms.json Export

**Impact:** Medium - API consumers may get old/broken data

**Context:** `docs/terms.json` is NOT committed to git, it's generated during deployment

**Rollback process:**

1. **Identify the problem:**
   - Check current terms.json: https://luminlynx.github.io/FOSS-Glossary/terms.json
   - Note the `version` field (commit SHA) and `generated_at` timestamp

2. **Find the good version:**
   ```bash
   # Check recent commits to terms.yaml
   git log --oneline -20 -- terms.yaml
   ```

3. **Redeploy from specific commit:**
   ```bash
   # Option A: Revert terms.yaml to the good commit
   git checkout <good-commit-sha> -- terms.yaml
   git commit -m "rollback: restore terms.yaml to <good-commit-sha>"
   git push origin main
   # This triggers automatic regeneration of terms.json
   
   # Option B: Create a new commit that fixes the issue
   # Edit terms.yaml manually, then:
   git add terms.yaml
   git commit -m "fix: correct term data for proper JSON export"
   git push origin main
   ```

4. **Verify the fix:**
   ```bash
   # Wait for workflow to complete
   gh run watch
   
   # Check the new terms.json (using jq if available)
   curl -s https://luminlynx.github.io/FOSS-Glossary/terms.json | jq '.version'
   
   # Or without jq
   curl -s https://luminlynx.github.io/FOSS-Glossary/terms.json | grep -o '"version":"[^"]*"'
   ```

**Emergency cache clear (if clients are stuck on bad version):**

The terms.json uses immutable caching with version query strings. The UI fetches it as `./terms.json?ver=<shortSHA>`, so after a successful redeploy, the new version should be served immediately. If issues persist:

1. Verify the `version` in the JSON matches the latest commit SHA
2. The cache will expire naturally (1 year TTL, but version changes force new requests)
3. Clients may need a hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

---

### Scenario 6: Complete Disaster Recovery

**Impact:** Critical - Repository or data severely corrupted

**Full restore from backup:**

```bash
# 1. Clone a fresh copy
git clone https://github.com/LuminLynx/FOSS-Glossary.git foss-glossary-recovery
cd foss-glossary-recovery

# 2. Identify last known good state
git log --all --oneline --graph -20

# 3. Create recovery branch from good state
git checkout -b recovery/<date> <good-commit-sha>

# 4. Test everything
npm ci
npm test
npm run generate:landing
npm run export

# 5. If all tests pass, force update main (⚠️  extreme caution)
git checkout main
git reset --hard <good-commit-sha>
git push --force-with-lease origin main

# 6. Verify deployments
# Watch the workflows complete
gh run watch
```

**⚠️  WARNING:** Force pushing to main should only be done as a last resort. It will rewrite history and may affect other contributors.

**Better approach - Reset via new commits:**
```bash
# Instead of force push, use revert commits
# For a single commit:
git revert <bad-commit-sha>
git push origin main

# For multiple commits, revert them individually (most recent first):
git revert <most-recent-bad-commit>
git revert <previous-bad-commit>
git revert <oldest-bad-commit>
git push origin main

# Or revert multiple commits in one new commit:
git revert --no-commit <oldest-bad-commit>^..<most-recent-bad-commit>
git commit -m "Revert changes from <oldest-bad> to <most-recent-bad>"
git push origin main
```

---

## Emergency Contacts

### Escalation Path

1. **First response:** Check this runbook and attempt documented procedures
2. **Second level:** Review workflow logs and GitHub Actions documentation
3. **Third level:** Open an issue with:
   - What you tried
   - Full error messages
   - Workflow run links
   - Steps to reproduce

### Useful Resources

- **AGENTS.md**: [Automation playbook](./AGENTS.md)
- **Workflow Docs**: [docs/WORKFLOW_DOCUMENTATION.md](./docs/WORKFLOW_DOCUMENTATION.md)
- **Landing Page Maintenance**: [docs/landing-page-maintenance.md](./docs/landing-page-maintenance.md)
- **Terms JSON Spec**: [docs/terms-json-spec.md](./docs/terms-json-spec.md)
- **GitHub Status**: https://www.githubstatus.com/

### Monitoring

**Check system health:**
```bash
# Latest workflow runs
gh run list --limit 5

# Specific workflow status
gh run list --workflow=pr-complete.yml --limit 3

# Watch a running workflow
gh run watch

# View logs for a failed run
gh run view <run-id> --log-failed
```

**Key metrics to monitor:**
- PR validation success rate (should be >95%)
- Deployment workflow success rate (should be >99%)
- Landing page load time (should be <2s)
- Terms.json size (grows with each term, monitor for reasonable growth)

---

## Maintenance Schedule

### Daily
- Monitor GitHub Actions for failures
- Review and merge approved PRs

### Weekly
- Check README stats are updating (automated)
- Review open issues labeled `blocked` or `needs-info`

### Monthly
- Review and update this runbook if new failure modes discovered
- Check dependency updates (npm outdated)
- Audit workflow run times for performance issues

### Quarterly
- Review all documentation for accuracy
- Update emergency procedures based on incidents
- Test disaster recovery procedures

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-10-31 | Initial runbook creation | Copilot |

---

*This runbook is a living document. Update it whenever you encounter and resolve a new type of failure.*
