# Copilot Instructions for FOSS Glossary

This file provides AI coding agents with essential context for productive development in this repository.

## Project Overview

**FOSS Glossary** is a community-driven glossary of open source terms with humor and personality. The codebase combines:

- **Data layer**: `terms.yaml` (canonical source, strict schema validation)
- **Processing layer**: Node.js scripts for validation, scoring, export
- **Presentation layer**: Generated landing page + PWA + JSON API

**Key principle**: Terms are validated at PR time, scored, and published post-merge to GitHub Pages as both HTML and JSON.

## Architecture Essentials

### Data Flow

```
terms.yaml → Validation (AJV + schema.json) → Scoring → Export → docs/index.html + docs/terms.json → GitHub Pages
```

### Canonical Data: `terms.yaml`

- **Format**: YAML with strict schema (see `config/schema.json`)
- **Root structure**: Must have exactly one key: `terms` (array of term objects)
- **Term fields**: `slug` (required, kebab-case, 3-48 chars), `term`, `definition` (min 80 chars), plus optional `explanation`, `humor`, `tags`, `see_also`, `aliases`, `controversy_level`
- **Validation**: Enforces slug uniqueness, duplicate detection (case/punct-insensitive), required field presence
- **Artifact rule**: `docs/terms.json` and `docs/index.html` are NEVER committed in PRs—only regenerated post-merge

### Scoring System (0-100 points)

Located in `scripts/scoring.js`. Allocates points as:

- Base (20 pts): term + definition present
- Humor (30 pts max): 1 point per 5 chars (Comedy Gold badge at 100+ chars)
- Explanation (20 pts): if length > 20 chars
- Tags (10 pts max): 3 pts per tag
- Cross-references (20 pts max): 5 pts per `see_also` entry
- Controversy badges: 'high' → 🔥 Flame Warrior, 'medium' → 🌶️ Spicy Take

## Critical Workflows

### PR Validation Workflow (`.github/workflows/pr-comment.yml`)

**Trigger**: PR opened or updated (all PRs, including forks).
**Steps** (in order):

1. Validate schema (`scripts/validateTerms.js`) — blocks downstream if fails
2. Score new/modified term (`scripts/quickScore.js`)
3. Post comment with validation status and score

**Key rule**: If validation fails (exit non-zero), CI stops and PR cannot merge until fixed.

### Post-Merge Publishing (`.github/workflows/update-landing-page.yml`)

**Trigger**: Push to `main` where `terms.yaml` changed.
**Jobs**:

1. Generate landing page: `npm run generate:landing` → `docs/index.html` (Handlebars template + CSS)
2. Validate landing page sync: `npm run validate:landing`
3. Export terms (conditional): `npm run export:new` → `docs/terms.json` (only if new slugs detected)
4. Deploy to GitHub Pages (auto)

**Important**: `docs/terms.json` includes metadata (`version` = short SHA, `generated_at`, `terms_count`). Landing page PWA fetches this for offline support.

## Common Tasks & Commands

```bash
# Validation & Testing
npm run validate              # Validate terms.yaml against schema
npm run validate:landing      # Check landing page HTML sync
npm test                      # Run all tests (validate + score + unit tests)

# Code Generation & Export
npm run generate:landing      # Regenerate docs/index.html from template
npm run export:new            # Export terms.json (only if new slugs)
npm run generate:types        # Generate terms.d.ts from schema
npm run score                 # Score all terms and display results

# Quality & Formatting
npm run lint                  # Prettier + markdownlint + cspell
npm run format                # Auto-fix formatting

# CI Debugging
npm run validate:types        # Check TypeScript definitions
npm run sort:yaml             # Sort terms.yaml (done in CI, useful for diffs)
```

## Schema & Validation Deep Dive

### `config/schema.json` Rules

- Root: `{ "type": "object", "required": ["terms"], "additionalProperties": false }`
- `terms` array: Each item is an object with strict properties
- Slug pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$` (kebab-case), length 3–48
- Definition: min 80 characters
- Duplicate detection: Normalized (case-insensitive, punctuation removed) across `term` + all `aliases`
- Unknown properties: Rejected (e.g., typo `explanation_` will fail)

### Validation Error Messages

Errors from `scripts/validateTerms.js` include:

- `$.terms[5].slug: does not match pattern` — slug format issue
- `$.terms[3]: missing required property 'definition'` — missing required field
- `Duplicate term detected: "git" (index 2 and 5)` — normalized duplicate found

**Agent action**: Parse error index and message, guide user to fix specific term.

## Code Patterns & Conventions

### Handlebars Template System

- **Location**: `templates/landing-page.hbs` → renders to `docs/index.html`
- **Data injection**: `scripts/generateLandingPage.js` prepares data objects and passes to template
- **Escaping**: `{{variable}}` auto-escapes HTML; `{{{variable}}}` for CSS (use sparingly)
- **CSS**: Inline `<style>` in template with dark/light theme media queries
- **Helpers**: Register custom Handlebars helpers in `generateLandingPage.js` if needed

### Shared Utilities

- **`utils/validation.js`**: `formatAjvError()` — formats AJV error objects into readable messages
- **`utils/normalization.js`**: `normalizeString()`, `normalizeTerm()` — used for duplicate detection
- **`utils/git.js`**: `getGitSha()` — retrieves commit SHA for versioning
- **`utils/fileSystem.js`**: `loadTermsYaml()`, `ensureDirectoryForFile()` — YAML loading and I/O

### Module Pattern

Scripts follow a consistent pattern:

1. Parse CLI args (if applicable)
2. Load terms.yaml via `loadTermsYaml()`
3. Validate/process
4. Conditional output (log to console or write file)
5. Exit with code 0 (success) or 1 (failure) for CI gating

## PR Expectations & Standards

### PR Body Template (from `.github/AGENTS.md` §4)

```
[Context: 1-3 lines describing the change]

**Files Modified:**
- scripts/scoring.js
- tests/scoring.test.js

**Acceptance Criteria:**
- [ ] Term validates against schema
- [ ] Scoring correctly allocates points
- [ ] No unrelated changes

**Negative Test Plan:**
- Tested with invalid score values
- Verified edge cases (empty strings, max length)

Fixes #<ISSUE_NUMBER>
```

### PR Checklist (from `.github/AGENTS.md` §4)

- Small, focused diffs (avoid refactoring unrelated code)
- No artifacts committed (`docs/terms.json`, `docs/index.html`, `types/terms.d.ts`)
- Clear commit messages (imperative, < 50 chars)
- Link to CI results if changes affect pipelines

## Integration Points & Dependencies

### External Integrations

- **GitHub Pages**: Deploys `docs/` to `luminlynx.github.io/FOSS-Glossary/`
- **GitHub Actions**: PR validation + post-merge publishing workflows
- **Octokit** (`@octokit/rest`): Used in release scripts for API calls

### Key Dependencies

- **js-yaml**: Parse/dump `terms.yaml`
- **ajv** + **ajv-formats**: JSON schema validation
- **handlebars**: Template engine for landing page
- **prettier** + **markdownlint** + **cspell**: Linting/formatting
- **typescript**: Type generation from schema

## Testing Strategy

### Test Locations

- `tests/`: Jest-compatible test files (run via `node --test`)
- Key suites: `validateTerms.test.js`, `scoring.test.js`, `exportTerms.test.js`, `pipeline.integration.test.js`
- Snapshots: `tests/__snapshots__/terms.snapshot.json` (reference for export format)

### Running Tests

```bash
npm test              # Full suite: validate + score + node tests
npm run validate      # Focused: schema validation only
```

## When Adding Features or Fixing Bugs

### For Validation/Schema Changes

1. Update `config/schema.json` with new rules
2. Update validation script (`scripts/validateTerms.js`)
3. Add tests in `tests/validation.test.js`
4. Ensure CI gate in `.github/workflows/pr-comment.yml` is correct
5. Document in PR body per AGENTS.md §8.1

### For Scoring or Export Changes

1. Update logic in `scripts/scoring.js` or `scripts/exportTerms.js`
2. Add unit tests
3. Update `docs/IMPLEMENTATION_PLAN.md` if behavior changes
4. Validate with `npm run score` and `npm run export:new`

### For Landing Page Changes

1. Edit `templates/landing-page.hbs` (template structure)
2. Update data preparation in `scripts/generateLandingPage.js` (data objects)
3. Run `npm run generate:landing` to test
4. Review generated `docs/index.html` in browser (no zoom effects on buttons, etc.)
5. Validate with `npm run validate:landing`

## Troubleshooting & Debugging

### Validation Fails Locally But CI Passes

- Ensure you're running `npm run validate` from repo root
- Check that `terms.yaml` is valid YAML: `js-yaml` parser may differ slightly from online validators

### Landing Page Not Updating

- Confirm `terms.yaml` was committed and pushed to `main`
- Check workflow logs in GitHub Actions (`update-landing-page.yml`)
- Manually regenerate: `npm run generate:landing`
- Verify GitHub Pages settings point to `docs/` branch `main`

### Export Skipped (Expected Behavior)

- `npm run export:new` only writes if new slugs detected
- If re-exporting existing terms, use `npm run export` instead

### Score Calculation Seems Wrong

- Review `scripts/scoring.js` formula (points capped at 100)
- Check term object has required fields (`term` + `definition` for base 20 pts)
- Test with `npm run score` to see all term scores

## Reference Documentation

**Within repo:**

- [`.github/AGENTS.md`](./.github/AGENTS.md) — Automation playbook (compliance checklist)
- [`README.md`](../README.md) — CI/CD pipeline diagram, quick links
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contributor guide (user-facing)
- [`docs/IMPLEMENTATION_PLAN.md`](../docs/IMPLEMENTATION_PLAN.md) — Detailed design docs

**Quick command reference:**

```
npm run validate         # Pre-flight check
npm run generate:landing # Regenerate HTML
npm run export:new       # Export terms.json (post-merge)
npm test                 # Full test suite
```

---

**Version**: Aligned with AGENTS.md §1-15 and package.json v1.0.0
**Last Updated**: November 15, 2025

**See also:** [AGENTS.md](.github/AGENTS.md)
for automation workflows, branching rules, and SLA policies.

---

**Document hierarchy:**

- **[AGENTS.md](./.github/AGENTS.md)** — Rules, standards, SLA (what you must do)
- **This file** — Implementation details, code patterns, debugging (how to do it)
- **[RUNBOOK.md](./.github/RUNBOOK.md)** — Troubleshooting, rollback (when things break)

**Overlap resolution:** If both documents cover the same topic, AGENTS.md is authoritative for requirements; this file provides implementation context.
