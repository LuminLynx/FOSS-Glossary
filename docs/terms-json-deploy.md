# Terms JSON Deployment Options

This document compares two deployment strategies for the generated `terms.json` file and records why we selected the artifact-based approach.

## Option A — Commit `docs/terms.json` to `main`

**Summary:** Generate `docs/terms.json` locally or in CI and commit it to the repository whenever glossary data changes.

### Pros
- Extremely simple hosting model: GitHub Pages serves the committed file automatically.
- No new infrastructure or deployment changes required beyond the existing `docs/` folder.
- Easy to inspect history in git, including diffs of JSON payloads per commit.

### Cons
- Creates noisy commits on nearly every merge that touches `terms.yaml`, obscuring the history of human-authored changes.
- Makes rebases and conflict resolution harder because large JSON diffs are frequently regenerated.
- Encourages contributors to run the export locally, risking accidental drift or schema mismatches.
- Slows reviews by adding large generated files to PRs despite the project rule against committing artifacts.

### Caching & Rollback Impact
- Cache headers cannot be tuned without additional tooling; GitHub Pages defaults would apply.
- Rolling back requires revert commits that also reintroduce the old JSON artifact, potentially conflicting with future merges.

### Developer Experience
- Contributors must remember not to edit the committed JSON manually even though it lives in the repo.
- Maintainers need to police PRs to ensure artifacts are regenerated correctly.

## Option B — Generate `terms.json` in the Pages build artifact *(Selected)*

**Summary:** Keep `terms.json` out of git. After each merge, CI generates the JSON (with metadata) and ships it in the GitHub Pages artifact that publishes the site.

### Pros
- Zero commit noise: the repository history only contains source changes (`terms.yaml`, scripts, docs).
- Deterministic output: the same CI job exports JSON using the canonical tooling (`npm run export`).
- Enables custom HTTP headers via a generated `_headers` file in the Pages artifact.
- Simplifies rollbacks: redeploying a prior workflow run restores both the site and the JSON payload without git surgery.
- Aligns with the automation rule prohibiting manual commits of `docs/terms.json`.

### Cons
- Requires the GitHub Pages deployment workflow to build and upload an artifact (slightly more complex than raw `docs/` hosting).
- Inspecting historical JSON versions requires downloading workflow artifacts instead of browsing git history.

### Caching & Rollback Impact
- Strong caching (immutable, 1-year TTL) is guaranteed because CI emits the appropriate headers on every deploy.
- ETags are derived from the exported content, so clients can revalidate efficiently.
- Rollbacks only need the workflow artifact, and both HTML + JSON revert together.

### Developer Experience
- Contributors focus solely on `terms.yaml`; CI handles exports post-merge.
- Local development remains optional; running `npm run export` locally reproduces the artifact layout if needed.

## Decision

We are adopting **Option B**, exporting `terms.json` during the GitHub Pages build and shipping it as part of the deployment artifact. This keeps artifacts out of git, allows precise cache headers (when supported), and matches the repository's automation policies. The UI references the payload at `./terms.json?ver=<shortSHA>` so the cache-busting query string always matches the version metadata embedded in the JSON.

## GitHub Pages Limitations (2024)

**Important:** As of 2024, GitHub Pages does **not** support custom HTTP headers via `_headers` files or any other configuration mechanism. GitHub Pages serves all content with `Cache-Control: max-age=600` (10 minutes).

Despite this limitation, we generate a `_headers` file for the following reasons:
1. **Future migration readiness** - If we migrate to Netlify or Cloudflare Pages (which do support `_headers` files), the configuration is already in place
2. **Documentation** - The file serves as explicit documentation of our intended caching policy
3. **Cache-busting** - We work around GitHub Pages limitations by using query string cache-busting (`?ver=<shortSHA>`)

### Current Workaround

Since GitHub Pages doesn't support custom `Cache-Control` headers, we rely on:
- **Query parameter cache-busting**: `./terms.json?ver=<shortSHA>` ensures browsers fetch fresh content when the version changes
- **GitHub's default caching**: The 10-minute cache helps reduce server load while still allowing relatively fresh updates

### Future Platform Options

If longer cache times become critical, consider migrating to:
- **Cloudflare Pages**: Supports `_headers` files, automatic cache invalidation, and CDN edge caching
- **Netlify**: Supports `_headers` files and custom caching policies
- **Custom CDN**: Place a CDN in front of GitHub Pages with custom cache rules

## Follow-up Checklist
- ✅ GitHub Pages workflow builds the site, runs `npm run export`, and uploads `docs/` as the artifact.
- ✅ The export script injects metadata (`version`, `generated_at`, `terms_count`) and writes a `_headers` file with `Cache-Control: public,max-age=31536000,immutable` for future platform compatibility.
- ✅ Cache-busting implemented via query parameters (`?ver=<shortSHA>`) in the landing page.
- README links back to this decision record for future maintainers.
