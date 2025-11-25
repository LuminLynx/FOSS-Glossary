# AGENTS.md — Automation & Copilot Playbook [![AGENTS.md Compliance](https://img.shields.io/badge/AGENTS.md-100%25-brightgreen)](./.github/AGENTS.md)

> **Audience:** Maintainers, contributors, and automation/bot agents ("Copilot").
>
> **Goal:** Explain exactly how agents should interact with this repository — issues, labels, PRs, validation, scoring, and post‑merge publishing — with clear rules, checklists, and safe‑guards.

---

## 1) Agent Identity & Scope

**Agent name:** `Copilot` (or `codex-bot` if using a GitHub user/bot).

**Scope of work (allowed):**
N/A
**Out of scope (not allowed):**
N/A

---

## 2) Repository Truths

- **Canonical data:** `terms.yaml` (validated by `schema.json`).
- **Validation workflow:** `.github/workflows/pr-complete.yml` calls `scripts/validateTerms.js` on PRs.
- **Contributor score:** computed/displayed **after validation** on PRs.
- **Merge policy:** Owner approval required.
- **Post‑merge export:** `npm run export:new` runs on push to `main` **only if** a new term (new slug) was added; it publishes `docs/terms.json` for the Landing Page.
- **Landing Page:** served from `/docs` (GitHub Pages). Glossary UI fetches `./terms.json`.

---

## 3) Labels & Triggers

Agents should watch these labels to decide actions:

- `copilot` or `ready-for-copilot`: issue is ready for Copilot to pick up.
- `validation`, `ci`, `pages`: tasks in the automation pipeline.
- `needs-info`: Copilot should leave a concise question and pause.
- `blocked`: external dependency; Copilot should pause and summarize blockers.
- `high-priority`: prefer this task when multiple are open.

**Mentions:** `@copilot` means: subscribe to the issue and acknowledge with a comment.

**Acknowledgement comment template:**

> Subscribed and standing by. I will propose a PR on branch `<prefix>/<slug>` and update this issue when ready.

---

## 4) PR Body Template & Checklist Standards

**PR body must include:**

- Context summary (1–3 lines).
- Files modified list with Manda
- **✅ Linting confirmation: "Ran `npm run format` - all checks pass"**
- Checklist of acceptance criteria.
- Negative test plan (for validator changes).
- "Fixes #<ISSUE_NUMBER>" to auto-close on merge.

**Do not include in PR:**

- `docs/terms.json` (post‑merge artifact).
- `docs/index.html` (post‑merge artifact).
- Unrelated refactors or formatting noise.

---

## 4.1) Linting & Code Quality Gate (Mandatory)

**⚠️ CRITICAL - DO NOT SKIP ⚠️**

**All PRs must pass linting checks before submission:**

```bash
# Run locally before pushing
npm run lint    # Prettier + markdownlint + cspell
npm run format  # Auto-fix formatting issues
```

**Required compliance:**

- ✅ Prettier (code/markdown formatting)
- ✅ markdownlint (markdown structure)
- ✅ cspell (spell checking)

**CI Gate:** `.github/workflows/pr-complete.yml` enforces linting as a **blocking check**.

**If linting fails:**

- ❌ PR cannot be merged
- ❌ Downstream jobs (validate, score, export) are blocked
- ✅ Re-run `npm run format` locally and push fixes

**Agent responsibility:** Ensure `npm run lint` returns **zero errors** before opening PR.

## 4.2) File Organization Rules (Mandatory)

**Document Placement:**
- ❌ **NEVER** create new `.md` files in the repository root
- ✅ Use existing subdirectories or create logical folder structure
- ✅ Group related content when possible to reduce file count

**Root Directory Reserved For:**
- README.md (only markdown file allowed in root) 
- LICENSE, CONTRIBUTING.md 
- Configuration files (package.json, .gitignore, etc.)

**When Creating New Documents:**
1. Identify appropriate subdirectory
2. Consider if content can be added to existing files
3. Update any cross-references when reorganizing

**Agent responsibility:** Ensure NO new markdown files are created in root directory.
---

## 5) Validation & Schema Rules (What Agents Enforce)

**Root shape (strict):**

- YAML root must be an object with **exactly** one key: `terms`.
- Top‑level: `additionalProperties: false`.

**`terms` array (strict):**

- `terms` must be an array.
- Every item must be an object (no strings/numbers/booleans).

**Term object (strict):**

- Required: `slug`, `term`, `definition`.
- `additionalProperties: false`.
- `slug` pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$` and length 3–48.
- `definition` minimum length: 80 characters.
- Duplicate guards: case‑ and punctuation‑insensitive across `term` and all `aliases`.

**Failure behavior:**

- The validate step exits non‑zero and blocks downstream steps (`score`, `stats`).
- The PR must show clear error messages (index + reason).

---

## 6) Post‑Merge Export & Publishing

**Trigger:** push to `main` where `terms.yaml` changed.

**Guard:** Only run export if new slugs were added (`npm run export:new`).

**Action:** write `docs/terms.json` with metadata fields:

- `version` (short commit SHA)
- `generated_at` (ISO timestamp)
- `terms_count`

**Caching:** Landing Page fetches `./terms.json` (relative URL). Optional cache‑buster `?ver=<shortSHA>`.

**Generated Artifacts (Never Commit in PRs):**

- `docs/terms.json` — generated post-merge via `npm run export:new`
- `docs/index.html` — generated post-merge via `npm run generate:landing`

These files are **automatically regenerated** on every push to `main`. PRs must **not** include these files.

**Rule:** Contributors and agents must never commit `docs/terms.json` or `docs/index.html` — they are generated post‑merge by CI workflows.

---

## 7) Issue Intake — What Copilot Should Do

When an issue with label `ready-for-copilot` arrives:

1. **Acknowledge** with the template comment and subscribe.
2. **Restate** the task in 2–4 bullet points to confirm scope.
3. **Propose a Diff Plan** (files + bullets) before committing any changes.
4. **Open a PR** from a `copilot/…` branch with the PR body sections above.
5. **Run CI**, summarize results in a comment.
6. **Wait for maintainer review.** Apply changes only in response to review notes.

If information is missing, add `needs-info` and ask one precise question.

---

## 8) Playbooks

### 8.1 Tighten Validation Rules

- Modify `schema.json` per Section 5.
- Update `scripts/validateTerms.js` to validate the **root** document and to fail non‑zero on violations and duplicates.
- Ensure `.github/workflows/pr-complete.yml` gates `score`/`stats` on validate success.
- Add/confirm negative tests in PR description.

### 8.2 Add Post‑Merge Export Job

- If missing, create a workflow on push to `main` to run `npm run export:new`.
- Ensure it writes to `docs/terms.json` only when a new term (new slug) exists.
- Do not commit `docs/terms.json` in PRs.

### 8.3 Investigate Missing File References (e.g., `Agents.md`)

- Run `git grep -n "Agents.md"`.
- If obsolete, update or remove references; otherwise create the doc in the referenced path.

---

## 9) Safety, Security & Secrets

- Use a Fine‑grained PAT or GitHub App with least privileges (Issues/PRs/Contents RW; Actions/Metadata Read).
- Never commit tokens; use repository secrets.
- Respect branch protection; never force‑push `main`.
- Avoid leaking contributor PII in logs. Keep CI output minimal and actionable.

---

## 10) Rate Limits & Etiquette

- At most **one** active PR per task unless maintainer requests split.
- Don’t re‑run CI unnecessarily; rely on GitHub’s rerun controls.
- Summarize changes in ≤10 lines; link to diffs instead of pasting large chunks in comments.

---

## 11) Observability & Reporting

- PR body should list: changed files, key diffs, and outcomes of negative tests.
- On failure, include the relevant CI log excerpt and a 1–2 line diagnosis.
- On success, link to the CI run and the artifact (if applicable).

---

## 12) SLA & Fallbacks

- If blocked >24h (labels, permissions, external deps), comment with status and apply `blocked`.
- If CI is flaky, retry once; otherwise summarize and request maintainer guidance.

---

## 13) Updating This Document

- Maintainers may adjust rules as the project evolves (leaderboard, server‑side search).
- Copilot should follow the newest version on `main` and reference section numbers in PRs (e.g., "Complies with §5 and §6").

---

## 14) Quick Reference Checklists

**New Validation Work:**

- [ ] Root requires `terms`; no other top‑level keys.
- [ ] `terms` is array; items are objects; unknown keys denied.
- [ ] `slug` regex + length; `definition` min length.
- [ ] Duplicate checks (term + aliases) are case/punct‑insensitive.
- [ ] CI `score`/`stats` gated on validation success.

**Post‑Merge Export:**

- [ ] Trigger on push to `main` when `terms.yaml` changed.
- [ ] Only if new slug(s) added (`export:new`).
- [ ] Output `docs/terms.json` with metadata.
- [ ] Landing Page fetches `./terms.json`.

**PR Quality:**

- [ ] Small, focused diffs.
- [ ] Clear PR body with checklist and negative tests.
- [ ] No artifacts or unrelated changes.

**File Organization:**
- [ ] No new `.md` files created in root directory
- [ ] Content placed in appropriate subdirectories
- [ ] Cross-references updated if files moved
---

## 15) Related Documentation

### By Use Case

**Setting up or debugging automation:**
→ [`.github/RUNBOOK.md`](./RUNBOOK.md) — Troubleshooting, rollback procedures, emergency responses

**Understanding the complete pipeline:**
→ [`README.md`](../README.md) — CI/CD flow diagram, quick links to all resources

**Technical implementation details:**
→ [`.github/copilot-instructions.md`](./copilot-instructions.md) — Code patterns, schema deep-dive, debugging tips

**Issue automation specifics:**
→ [`docs/workflows/documentation.md`](../docs/workflows/documentation.md) — Issue → Task → PR workflow configuration

**Landing page maintenance:**
→ [`docs/landing-page-maintenance.md`](../docs/landing-page-maintenance.md) — Generation, sync, validation procedures

**Understanding terms.json export:**
→ [`docs/terms-json-deploy.md`](../docs/terms-json-deploy.md) — Why it's post-merge, caching strategy, rollback

### Quick Command Reference

```bash
# Validation & Testing
npm run validate              # Pre-flight check (use before PR)
npm run validate:landing      # Check landing page HTML sync
npm test                      # Full test suite

# Code Generation & Export
npm run generate:landing      # Regenerate docs/index.html
npm run export:new            # Export terms.json (only if new slugs)
npm run score                 # Score all terms

# Troubleshooting
npm run sort:yaml             # Verify YAML sort order
npm run validate:types        # Check TypeScript definitions
```

### Overlap Clarification

**This document (AGENTS.md) is authoritative for:**

- Automation rules (§1-6)
- PR standards & checklist (§4, §14)
- SLA & fallbacks (§12)
- What agents **must** do

**[Copilot Instructions](.github/copilot-instructions.md) provides:**

- Technical implementation details
- Code patterns & conventions
- How to debug failures
- Schema & validation deep-dive

**When in doubt:**

1. Check AGENTS.md for **requirements** (what to do)
2. Check copilot-instructions.md for **how-to** (implementation)
3. Check RUNBOOK.md for **troubleshooting** (when things fail)

---

_This document is guidance for agents and automation. GitHub does not provide an `AGENTS.md` by default — this file is project‑specific._

> **See also:** [Copilot Instructions](.github/copilot-instructions.md)
> for technical implementation, code patterns, and debugging guides.
