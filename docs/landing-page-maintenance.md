# Landing Page Maintenance

## Overview

The landing page (`docs/index.html`) displays a subset of terms from `terms.yaml` to showcase the glossary. It includes statistics, latest additions, and recent terms. This document explains how the landing page stays in sync with the data.

## How It Works

### Components

1. **Data Source**: `terms.yaml` - The canonical source of all glossary terms
2. **Generator Script**: `scripts/generateLandingPage.js` - Generates the HTML from terms.yaml
3. **Validation Script**: `scripts/validateLandingPage.js` - Ensures HTML is in sync with data
4. **Deployment Workflow**: `.github/workflows/update-landing-page.yml` - Auto-generates on changes

### What the Landing Page Displays

The landing page **does not show all terms**. It displays:

- **Statistics**: Total count of all terms, humor rate, and category count
- **Latest Additions**: The 3 most recently added terms (by position in terms.yaml)
- **Recent Terms**: The 6 most recent terms with full cards (term, definition, humor, tags, score)

This design keeps the page lightweight while showcasing recent contributions.

## Automatic Updates

### When Changes Are Pushed to Main

The `update-landing-page.yml` workflow automatically runs when:
- `terms.yaml` is modified
- Landing page generator script is updated
- Any file in `docs/` changes

**Workflow steps:**
1. Checks out the repository
2. Installs dependencies
3. Runs `generateLandingPage.js` to regenerate HTML
4. Validates the HTML is in sync with `validateLandingPage.js`
5. Exports terms bundle if new terms were added
6. Deploys to GitHub Pages

### When PRs Are Created

The `pr-complete.yml` workflow includes an informational check:
- Validates terms.yaml schema and content
- Checks if landing page needs regeneration (informational only)
- Does not fail the PR if out of sync (will be fixed on merge)

## Prevention Measures

To prevent the landing page from becoming outdated:

### 1. Automated Regeneration
- **Trigger**: Any push to `main` branch that modifies `terms.yaml`
- **Action**: Workflow automatically regenerates and deploys HTML
- **Verification**: Built-in validation ensures sync after generation

### 2. Validation Script
- **Script**: `scripts/validateLandingPage.js`
- **Usage**: `npm run validate:landing`
- **Checks**:
  - Total terms count matches between HTML and YAML
  - Latest additions are not placeholder test data
  - Recent term cards are present (not just test card)

### 3. NPM Scripts
```bash
# Generate landing page
npm run generate:landing

# Validate landing page is in sync
npm run validate:landing
```

### 4. CI/CD Integration
- Landing page validation runs after generation in the deployment workflow
- Informational check in PR workflow warns if regeneration needed
- Prevents deployment of out-of-sync HTML

## Manual Regeneration

If you need to regenerate the landing page manually:

```bash
# Install dependencies (if not already installed)
npm ci

# Generate the landing page
npm run generate:landing

# Validate it's in sync
npm run validate:landing

# Commit the changes
git add docs/index.html
git commit -m "Regenerate landing page"
git push
```

## Troubleshooting

### Landing Page Shows Old Data

**Symptoms:**
- Statistics show incorrect term count
- Latest additions shows "Test & &lt;Title&gt;..." placeholder
- Only 1 term card displayed instead of 6

**Solution:**
```bash
npm run generate:landing
```

**Why it happens:**
- The workflow may not have run (e.g., if changes were made directly to main without triggering paths)
- Manual commits to docs/index.html without regenerating

### Validation Fails

**Error message:**
```
❌ Error: Total terms mismatch
   Expected: 28 terms (from terms.yaml)
   Found: 1 terms (in docs/index.html)
   Run: node scripts/generateLandingPage.js
```

**Solution:**
Follow the suggestion in the error message and regenerate the landing page.

### Workflow Doesn't Run

**Check:**
1. Does the commit modify `terms.yaml` or files in the trigger paths?
2. Is the workflow enabled in the repository settings?
3. Check GitHub Actions logs for errors

**Manual trigger:**
You can manually trigger the workflow from the Actions tab:
1. Go to Actions → "Build & Deploy Landing Page"
2. Click "Run workflow"
3. Select the `main` branch and click "Run workflow"

## Architecture

### Data Flow

```
terms.yaml (source)
    ↓
generateLandingPage.js (reads YAML, generates HTML)
    ↓
docs/index.html (output)
    ↓
validateLandingPage.js (verifies sync)
    ↓
GitHub Pages (deployment)
```

### Template System

The generator uses Handlebars templates:
- **Template**: `templates/landing-page.hbs`
- **Data preparation**: `scripts/generateLandingPage.js`
- **Auto-escaping**: HTML entities are automatically escaped for security
- **Scoring**: Each term's score is calculated using `scripts/scoring.js`

### Statistics Calculation

- **Total Terms**: `terms.length`
- **Funny Terms**: Terms with a `humor` field
- **Humor Rate**: `(termsWithHumor / totalTerms) * 100`
- **Categories**: Unique count of all tags across all terms

## Best Practices

1. **Never edit `docs/index.html` directly** - Always regenerate using the script
2. **Test locally before pushing** - Run `npm run validate:landing` to verify
3. **Trust the automation** - The workflow handles regeneration on merge to main
4. **Check workflow status** - If you modify terms.yaml, verify the workflow succeeds

## Related Documentation

- [Workflow Documentation](./WORKFLOW_DOCUMENTATION.md) - General workflow information
- [Terms JSON Deployment](./terms-json-deploy.md) - How terms.json is exported
- [Terms JSON Spec](./terms-json-spec.md) - Structure of the exported JSON
