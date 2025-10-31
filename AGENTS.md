# AGENTS.md — Automation & Codex Playbook [![AGENTS.md Compliance](https://img.shields.io/badge/AGENTS.md-100%25-brightgreen)](./AGENTS.md)

> **Audience:** Maintainers, contributors, and automation/bot agents ("Codex").
>
> **Goal:** Explain exactly how agents should interact with this repository — issues, labels, PRs, validation, scoring, and post‑merge publishing — with clear rules, checklists, and safe‑guards.

---

## 1) Agent Identity & Scope

**Agent name:** `Codex` (or `codex-bot` if using a GitHub user/bot).

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

- `codex` or `ready-for-codex`: issue is ready for Codex to pick up.
- `validation`, `ci`, `pages`: tasks in the automation pipeline.
- `needs-info`: Codex should leave a concise question and pause.
- `blocked`: external dependency; Codex should pause and summarize blockers.
- `high-priority`: prefer this task when multiple are open.

**Mentions:** `@codex-bot` means: subscribe to the issue and acknowledge with a comment.

**Acknowledgement comment template:**
> Subscribed and standing by. I will propose a PR on branch `<prefix>/<slug>` and update this issue when ready.

---

## 4) Branching & PR Standards

**Branch naming:** `codex/<short-task-slug>` (e.g., `codex/strict-validation-terms-json`).

**PR title:** short & imperative (e.g., `Validation: enforce strict terms.yaml & publish docs/terms.json`).

**PR body must include:**
- Context summary (1–3 lines).
- Files modified list with bullets.
- Checklist of acceptance criteria.
- Negative test plan (for validator changes).
- "Fixes #<ISSUE_NUMBER>" to auto-close on merge.

**Do not include in PR:**
- `docs/terms.json` (post‑merge artifact).
- Unrelated refactors or formatting noise.

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

**Rule:** PRs must **not** commit `docs/terms.json` — it’s generated post‑merge.

---

## 7) Issue Intake — What Codex Should Do

When an issue with label `ready-for-codex` arrives:
1. **Acknowledge** with the template comment and subscribe.
2. **Restate** the task in 2–4 bullet points to confirm scope.
3. **Propose a Diff Plan** (files + bullets) before committing any changes.
4. **Open a PR** from a `codex/…` branch with the PR body sections above.
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
- Codex should follow the newest version on `main` and reference section numbers in PRs (e.g., "Complies with §5 and §6").

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

---

*This document is guidance for agents and automation. GitHub does not provide an `AGENTS.md` by default — this file is project‑specific.*

