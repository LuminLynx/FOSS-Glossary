# Complete Repository Reorganization Implementation Plan

## Overview

This document details the approved implementation plan for reorganizing both:

1. **Repository root** - Option 3 (Hybrid Approach)
2. **docs/ directory** - New organization structure

---

## Part 1: Root Directory Reorganization (Option 3 - Approved)

### Summary

**Result:** 14 → 5 markdown files in root (64% reduction)

### Files to Keep in Root (5 files)

- `README.md` (required)
- `CONTRIBUTING.md` (GitHub convention, 26 references)
- `CODE_OF_CONDUCT.md` (GitHub convention, 19 references)
- `CHANGELOG.md` (industry standard, 10+ references)
- `LICENSE` (standard)

### Files to Move

```bash
# Move to .github/
AGENTS.md → .github/AGENTS.md
RUNBOOK.md → .github/RUNBOOK.md

# Move to docs/releases/
RELEASE_INSTRUCTIONS.md → docs/releases/RELEASE_INSTRUCTIONS.md

# Archive to docs/releases/v1.0.0/
RELEASE_BODY_v1.0.0.md → docs/releases/v1.0.0/RELEASE_BODY.md
RELEASE_NOTES_v1.0.0.md → docs/releases/v1.0.0/RELEASE_NOTES.md
RELEASE_PREPARATION_SUMMARY.md → docs/releases/v1.0.0/PREPARATION_SUMMARY.md
RELEASE_SUMMARY.md → docs/releases/v1.0.0/SUMMARY.md

# Archive to docs/archive/
CONSOLIDATION_SUMMARY.md → docs/archive/CONSOLIDATION_SUMMARY.md

# Delete (duplicate)
PWA_TEST_CHECKLIST.md → DELETE
```

---

## Part 2: docs/ Directory Reorganization (New)

### Current State

**Problem:** 21 markdown files at `docs/` root level, causing clutter

### Proposed Organization

Create logical subdirectories to group related documentation:

```
docs/
├── landing-page/       # Landing page documentation
├── releases/           # Release documentation (already planned)
├── technical/          # Technical specifications
├── policies/           # Project policies (keep visible)
├── testing/            # Testing documentation
├── workflows/          # Workflow documentation (expand existing)
├── archive/            # Historic/review documents (already planned)
├── pwa/                # PWA documentation (existing)
├── index.html          # Keep at root
├── documentation.html  # Keep at root
├── terms.json          # Keep at root
├── 404.html            # Keep at root
└── .nojekyll           # Keep at root
```

### Files to Organize in docs/

#### Move to docs/landing-page/

```bash
LANDING_PAGE_IMPROVEMENTS.md → docs/landing-page/improvements.md
LANDING_PAGE_ISSUE_REPORT.md → docs/landing-page/issue-report.md
landing-page-maintenance.md → docs/landing-page/maintenance.md
SIDEBAR_IMPLEMENTATION_OPTIONS.md → docs/landing-page/sidebar-options.md
```

#### Move to docs/releases/

```bash
RELEASE_COMPLETION_SUMMARY.md → docs/releases/v1.0.0/COMPLETION_SUMMARY.md
RELEASE_INSTRUCTIONS_v1.0.0.md → docs/releases/v1.0.0/INSTRUCTIONS.md
RELEASE_PROCESS.md → docs/releases/process.md
```

#### Move to docs/technical/

```bash
PREBUILT_INDEX_STRATEGY.md → docs/technical/prebuilt-index-strategy.md
schema-hardening.md → docs/technical/schema-hardening.md
terms-json-deploy.md → docs/technical/terms-json-deploy.md
terms-json-spec.md → docs/technical/terms-json-spec.md
```

#### Keep at docs/ root (policies - need visibility)

```bash
deletion-policy.md ✓ (keep)
slug-policy.md ✓ (keep)
```

#### Move to docs/testing/

```bash
TEST_COVERAGE_SUMMARY.md → docs/testing/coverage-summary.md
```

#### Move to docs/workflows/

```bash
WORKFLOW_CHANGELOG.md → docs/workflows/changelog.md
WORKFLOW_DOCUMENTATION.md → docs/workflows/documentation.md
WORKFLOW_EXAMPLES.md → docs/workflows/examples.md
# Keep existing: docs/workflows/README.md
```

#### Move to docs/archive/

```bash
REPOSITORY_REVIEW.md → docs/archive/repository-review.md
# Plus CONSOLIDATION_SUMMARY.md from root (as planned)
```

### Result

**docs/ root:** 21 → 2 markdown files (90% reduction!)

- Only `deletion-policy.md` and `slug-policy.md` remain (need visibility)

---

## Implementation Strategy

### Phase 1: Root Directory Reorganization

#### Step 1.1: Prepare Directories

```bash
mkdir -p .github
mkdir -p docs/releases/v1.0.0
mkdir -p docs/archive
```

#### Step 1.2: Move Operational Docs to .github/

```bash
git mv AGENTS.md .github/AGENTS.md
git mv RUNBOOK.md .github/RUNBOOK.md
```

#### Step 1.3: Archive Release Files

```bash
git mv RELEASE_INSTRUCTIONS.md docs/releases/RELEASE_INSTRUCTIONS.md
git mv RELEASE_BODY_v1.0.0.md docs/releases/v1.0.0/RELEASE_BODY.md
git mv RELEASE_NOTES_v1.0.0.md docs/releases/v1.0.0/RELEASE_NOTES.md
git mv RELEASE_PREPARATION_SUMMARY.md docs/releases/v1.0.0/PREPARATION_SUMMARY.md
git mv RELEASE_SUMMARY.md docs/releases/v1.0.0/SUMMARY.md
```

#### Step 1.4: Archive Historic Files

```bash
git mv CONSOLIDATION_SUMMARY.md docs/archive/CONSOLIDATION_SUMMARY.md
```

#### Step 1.5: Delete Duplicate

```bash
git rm PWA_TEST_CHECKLIST.md
```

### Phase 2: docs/ Directory Reorganization

#### Step 2.1: Create Subdirectories

```bash
mkdir -p docs/landing-page
mkdir -p docs/technical
mkdir -p docs/testing
# docs/releases, docs/workflows, docs/archive already exist
```

#### Step 2.2: Move Landing Page Docs

```bash
git mv docs/LANDING_PAGE_IMPROVEMENTS.md docs/landing-page/improvements.md
git mv docs/LANDING_PAGE_ISSUE_REPORT.md docs/landing-page/issue-report.md
git mv docs/landing-page-maintenance.md docs/landing-page/maintenance.md
git mv docs/SIDEBAR_IMPLEMENTATION_OPTIONS.md docs/landing-page/sidebar-options.md
```

#### Step 2.3: Move Release Docs

```bash
git mv docs/RELEASE_COMPLETION_SUMMARY.md docs/releases/v1.0.0/COMPLETION_SUMMARY.md
git mv docs/RELEASE_INSTRUCTIONS_v1.0.0.md docs/releases/v1.0.0/INSTRUCTIONS.md
git mv docs/RELEASE_PROCESS.md docs/releases/process.md
```

#### Step 2.4: Move Technical Docs

```bash
git mv docs/PREBUILT_INDEX_STRATEGY.md docs/technical/prebuilt-index-strategy.md
git mv docs/schema-hardening.md docs/technical/schema-hardening.md
git mv docs/terms-json-deploy.md docs/technical/terms-json-deploy.md
git mv docs/terms-json-spec.md docs/technical/terms-json-spec.md
```

#### Step 2.5: Move Testing Docs

```bash
git mv docs/TEST_COVERAGE_SUMMARY.md docs/testing/coverage-summary.md
```

#### Step 2.6: Move Workflow Docs

```bash
git mv docs/WORKFLOW_CHANGELOG.md docs/workflows/changelog.md
git mv docs/WORKFLOW_DOCUMENTATION.md docs/workflows/documentation.md
git mv docs/WORKFLOW_EXAMPLES.md docs/workflows/examples.md
```

#### Step 2.7: Move Archive Docs

```bash
git mv docs/REPOSITORY_REVIEW.md docs/archive/repository-review.md
```

### Phase 3: Update References

#### Files Requiring Updates (Priority Order)

**High Priority:**

1. `README.md`
   - Update AGENTS.md reference → `.github/AGENTS.md`
   - Update RUNBOOK.md reference → `.github/RUNBOOK.md`

2. `docs/documentation.html`
   - Update all GitHub URLs for moved files (~15 URLs)

3. `.github/AGENTS.md` (after move)
   - Update self-reference in badge
   - Update RUNBOOK.md reference

4. `.github/RUNBOOK.md` (after move)
   - Update any cross-references

5. `scripts/createRelease.js`
   - Update path to `RELEASE_BODY_${tag}.md`

6. `.github/workflows/create-release.yml`
   - Update release body file path

**Medium Priority:**

1. `scripts/generateDocumentationData.js`
   - Update categorization logic for new paths
   - Handle `.github/*.md` files
   - Handle new docs/ subdirectories

2. All `docs/*.md` files
   - Update cross-references to moved files
   - Update relative paths

3. `tests/e2e-pipeline.test.js`
   - Update AGENTS.md reference in comment

**Low Priority:**

1. `CHANGELOG.md`, release notes
   - Update informational cross-references

### Phase 4: Validation

#### Testing Checklist

- [ ] Run `npm test` - ensure all tests pass
- [ ] Run `npm run lint` - ensure no linting errors
- [ ] Check `docs/documentation.html` - verify all links work
- [ ] Test GitHub workflows - ensure automation still works
- [ ] Verify documentation hub renders correctly
- [ ] Check external badge URLs in README
- [ ] Test release automation script

---

## Impact Summary

### Root Directory

**Before:** 14 markdown files
**After:** 5 markdown files
**Reduction:** 64%

### docs/ Directory

**Before:** 21 markdown files at root level
**After:** 2 markdown files at root level (policies)
**Reduction:** 90%

### Combined Result

**Total markdown files in conspicuous locations:**

- **Before:** 35 files (14 root + 21 docs/)
- **After:** 7 files (5 root + 2 docs/)
- **Overall Reduction:** 80%

---

## Files Requiring Updates

### Complete List

| File                                   | Type   | Updates Needed                    |
| -------------------------------------- | ------ | --------------------------------- |
| `README.md`                            | High   | 2 references (AGENTS, RUNBOOK)    |
| `docs/documentation.html`              | High   | ~15 GitHub URLs                   |
| `scripts/createRelease.js`             | High   | Release body path                 |
| `.github/workflows/create-release.yml` | High   | Release body path                 |
| `.github/AGENTS.md`                    | Medium | Self-reference, RUNBOOK reference |
| `.github/RUNBOOK.md`                   | Medium | Cross-references                  |
| `scripts/generateDocumentationData.js` | Medium | Path categorization logic         |
| `docs/landing-page/*.md`               | Medium | Cross-references                  |
| `docs/releases/*.md`                   | Medium | Cross-references                  |
| `docs/technical/*.md`                  | Medium | Cross-references                  |
| `docs/workflows/*.md`                  | Medium | Cross-references                  |
| `tests/e2e-pipeline.test.js`           | Low    | Comment reference                 |
| `CHANGELOG.md`                         | Low    | Informational references          |

**Estimated Total:** ~30-40 files

---

## Risk Mitigation

### Low Risk Items

✅ Root policies (CONTRIBUTING, CoC, CHANGELOG) stay in place
✅ GitHub conventions preserved
✅ Most external links unchanged
✅ Policies in docs/ remain visible

### Medium Risk Items

🟡 AGENTS.md and RUNBOOK.md move (27 + 12 references)
🟡 docs/ reorganization (internal links only)
🟡 Documentation hub URLs need updates

### Mitigation Strategies

1. **Test thoroughly** after each phase
2. **Update docs/documentation.html** to reflect new paths
3. **Run full test suite** after all moves
4. **Validate GitHub workflows** before merge
5. **Keep git history** for easy rollback if needed

---

## Timeline Estimate

- **Phase 1 (Root):** 2 hours
  - Moves: 30 minutes
  - Reference updates: 1 hour
  - Testing: 30 minutes

- **Phase 2 (docs/):** 2 hours
  - Moves: 30 minutes
  - Reference updates: 1 hour
  - Testing: 30 minutes

- **Phase 3 (Update References):** 1-2 hours
  - Comprehensive updates across all files

- **Phase 4 (Validation):** 1 hour
  - Full testing and verification

**Total Estimated Time:** 6-7 hours

---

## Success Criteria

### Root Directory

- [x] Only 5 markdown files remain
- [ ] All GitHub conventions preserved
- [ ] AGENTS.md and RUNBOOK.md in `.github/`
- [ ] Release files properly archived
- [ ] Duplicate removed

### docs/ Directory

- [ ] Only 2 policy markdown files at root
- [ ] All docs logically organized in subdirectories
- [ ] Documentation hub updated with new paths
- [ ] All internal links working

### Overall

- [ ] All tests passing
- [ ] All linting checks passing
- [ ] Documentation hub fully functional
- [ ] GitHub workflows operational
- [ ] No broken internal links
- [ ] No broken external references

---

## Next Steps

1. ✅ Get approval for combined plan
2. Execute Phase 1 (Root reorganization)
3. Execute Phase 2 (docs/ reorganization)
4. Execute Phase 3 (Reference updates)
5. Execute Phase 4 (Validation)
6. Final review and merge

---

**Status:** Ready for implementation
**Approved by:** @LuminLynx
**Implementation:** Option 3 (Root) + docs/ reorganization
