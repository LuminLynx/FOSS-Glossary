# FOSS Glossary – Repository Review

This guide orients reviewers and new contributors by outlining the core data flow, automation hooks, and expectations that keep the glossary consistent.

## Quick Repository Map
- **Mission:** Maintain a community-built glossary that balances education and humor, as captured in the README front matter and contributor workflow notes.【F:README.md†L1-L44】
- **Canonical data:** `terms.yaml`, validated with `schema.json`; all other scripts consume this single source of truth.【F:schema.json†L1-L42】【F:package.json†L1-L28】
- **Automation rules:** Node.js scripts under `/scripts` and npm tasks in `package.json` drive validation, scoring, stats, and exports. Generated artifacts—especially `docs/terms.json`—must never be committed manually.【F:AGENTS.md†L8-L105】【F:package.json†L6-L19】

### Quick Start for Local Review
1. `npm install` – ensure script dependencies are available.【F:package.json†L6-L19】
2. `npm run validate` – schema validation plus duplicate checks; fails fast for malformed submissions.【F:package.json†L6-L19】【F:scripts/validateTerms.js†L1-L92】
3. `npm run score` – optional, surfaces contributor feedback that mirrors the CI scoring log.【F:package.json†L6-L19】【F:scripts/quickScore.js†L1-L96】
4. `npm test` – bundles validation and scoring, matching the GitHub Actions experience.【F:package.json†L6-L19】

## Data Model & Validation Rules
- `terms.yaml` must deserialize to an object containing a `terms` array. Each entry requires `slug`, `term`, and a `definition` with at least 80 characters; any unexpected property is rejected.【F:schema.json†L1-L42】
- Optional narrative and metadata fields (`explanation`, `humor`, `tags`, `see_also`, `aliases`, `controversy`) must conform to schema constraints. Ajv-powered validation provides human-readable errors with array indices for fast debugging.【F:schema.json†L1-L42】【F:scripts/validateTerms.js†L1-L92】
- Duplicate protection compares slugs, terms, and aliases in a case- and punctuation-insensitive manner to prevent near misses.【F:scripts/validateTerms.js†L38-L92】

## Automation & Feedback Scripts
- `scripts/quickScore.js` rates either the newest term or a targeted slug (`TARGET_SLUG=<slug>`). Scores map to humor length, completeness, tagging, and cross-references, and emit badge-style annotations used in CI logs.【F:scripts/quickScore.js†L1-L96】
- `scripts/updateReadmeStats.js` rewrites the stats block between `<!-- STATS-START -->` and `<!-- STATS-END -->` with total terms, humor coverage, top scorer, recent additions, and podium contributors sourced from `git log`.【F:README.md†L10-L23】【F:scripts/updateReadmeStats.js†L1-L86】
- `scripts/exportTerms.js` turns the YAML dataset into `docs/terms.json`. The `--only-if-new` flag (used by `npm run export:new`) checks for new slugs to avoid unnecessary publishes while honoring the "no manual edits" rule for the exported JSON.【F:scripts/exportTerms.js†L1-L52】【F:AGENTS.md†L64-L84】

## CI, Publishing & Pages
- `.github/workflows/pr-complete.yml` (referenced in `AGENTS.md`) runs validation before scoring/stats to block downstream jobs on failure. Local runs with `npm test` mirror this order.【F:AGENTS.md†L24-L76】
- `npm run export:new` executes on pushes to `main` when `terms.yaml` changes, exporting `docs/terms.json` with metadata fields (`version`, `generated_at`, `terms_count`).【F:AGENTS.md†L64-L84】【F:package.json†L6-L19】
- `/docs/index.html` powers the GitHub Pages landing experience, consuming the generated JSON and surfacing glossary highlights for visitors.【F:docs/index.html†L1-L360】

## Review Checklist
Use these prompts when evaluating contributions:
1. **Schema compliance:** Does `npm run validate` pass? Are there any duplicate slugs, terms, or aliases?【F:scripts/validateTerms.js†L1-L92】
2. **Narrative quality:** Is the `definition` ≥80 characters and coherent? Are optional humor/explanation fields used appropriately per README tone guidance?【F:README.md†L1-L44】
3. **Automation alignment:** Were README stats or exports left untouched unless corresponding scripts were run? Confirm no manual edits to `docs/terms.json`.【F:AGENTS.md†L64-L84】【F:scripts/updateReadmeStats.js†L1-L86】
4. **CI parity:** Do local commands mirror the CI flow (`validate` → `score` → `stats`)? Encourage contributors to run `npm test` before opening PRs.【F:package.json†L6-L19】
5. **Policy adherence:** Branch naming, PR templates, and automation guardrails are defined in `AGENTS.md`; ensure submissions stay within that envelope.【F:AGENTS.md†L1-L208】

## CI Secrets Configuration

### COMMENT_TOKEN (Optional but Recommended)

The PR Glossary Validation workflow (`.github/workflows/pr-complete.yml`) posts validation results as comments on pull requests. For **fork PRs**, the default `GITHUB_TOKEN` may lack permissions to create/update comments, causing the workflow to fail with "Resource not accessible by integration" errors.

**Solution:** Add a `COMMENT_TOKEN` repository secret containing a Personal Access Token (PAT) with appropriate permissions.

#### Creating the PAT

1. **Navigate to GitHub Settings:**
   - Go to **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   - Or visit: https://github.com/settings/tokens

2. **Generate new token (classic):**
   - Click **Generate new token** → **Generate new token (classic)**
   - Give it a descriptive name: `FOSS-Glossary PR Comments`
   - Set expiration: recommend 90 days or 1 year (set a calendar reminder to rotate)

3. **Select scopes:**
   - For **public repositories:** Check `public_repo` (under `repo` section)
   - For **private repositories:** Check full `repo` scope
   - **Note:** The token needs write access to issues/PRs in the repository

4. **Generate and copy the token**
   - Click **Generate token** at the bottom
   - **Copy the token immediately** – you won't be able to see it again

#### Adding the Secret to the Repository

1. **Navigate to Repository Settings:**
   - Go to your repository → **Settings** → **Secrets and variables** → **Actions**

2. **Add new secret:**
   - Click **New repository secret**
   - Name: `COMMENT_TOKEN`
   - Value: Paste the PAT you generated
   - Click **Add secret**

#### Security Considerations

- **Scope minimization:** Use `public_repo` for public repositories rather than full `repo` access
- **Expiration:** Set an expiration date and rotate the token regularly
- **Access control:** Only repository administrators can view/edit secrets
- **Audit:** Review token usage in GitHub's token settings periodically
- **Revocation:** If compromised, immediately revoke the token in GitHub settings and generate a new one

#### Behavior

- **With COMMENT_TOKEN:** The workflow will use this PAT for all PR comments, ensuring fork PRs work reliably
- **Without COMMENT_TOKEN:** The workflow falls back to `GITHUB_TOKEN`, which works for repository PRs but may fail for fork PRs
- **Error handling:** If commenting fails, the workflow logs helpful error messages and suggests adding the secret

## Additional References
- README stats block and contribution guidance: `README.md` (look for `<!-- STATS-START -->`).【F:README.md†L10-L23】
- Schema definition: `schema.json`.
- Automation guardrails & bot expectations: root `AGENTS.md`.

