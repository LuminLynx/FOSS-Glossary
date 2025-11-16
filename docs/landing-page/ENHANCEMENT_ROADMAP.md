# Landing Page Enhancement Roadmap

**Status:** Ready for implementation  
**Created:** November 16, 2025  
**Estimated Timeline:** 21-30 hours  
**Target Release:** v1.1.0

---

## 📋 Overview

Transform the FOSS Glossary landing page from a static showcase into an engaging, dynamic hub with improved visuals, interactive search/filtering, and better term discovery—while maintaining the lightweight, performant design.

### Current State

- ~20KB landing page (HTML + inline CSS)
- Static display of 6 recent terms
- No search/filter capabilities
- Basic responsive design

### Target State

- Enhanced visual design with animations
- Interactive search & filtering (client-side)
- 12-16 terms visible on first load
- Visual score indicators & category badges
- Improved mobile responsiveness
- Comprehensive test coverage
- CI/CD safety gates

---

## 🎯 Implementation Phases

### Phase 1: Visual Polish & Animations ⭐

**Effort:** Medium | **Duration:** 2-3 hours

Add eye-catching animations and modern design elements to the template.

**Tasks:**

- Enhance CSS with entrance animations (fade-in, scale-up) on page load
- Add stagger animation to cards (each appears with slight delay)
- Improve button hover/active states with smooth transitions
- Add gradient backgrounds to key sections (hero, statistics)
- Enhance typography hierarchy (better heading sizes, weights)
- Add glowing effects to featured elements

**Files Modified:**

- `templates/landing-page.hbs` (CSS enhancements)

**Success Criteria:**

- Smooth animations without jank
- Page load time remains <100ms
- Visual hierarchy clear
- All hover states work smoothly

---

### Phase 2: Refactor Generator Script 🔧

**Effort:** Medium | **Duration:** 2-3 hours

Fix code quality issues to prevent stale data and improve maintainability.

**Tasks:**

- Resolve hidden module-level dependencies in `scripts/generateLandingPage.js`
- Add validation layer: check term data before rendering
- Implement error handling with clear error messages
- Add pre-generation checks (validate `terms.yaml` exists, has valid structure)
- Refactor functions to have clear input/output (no implicit state)
- Add debug logging for troubleshooting

**Files Modified:**

- `scripts/generateLandingPage.js` (refactoring)

**Success Criteria:**

- No hidden dependencies
- Clear error messages
- Consistent function signatures
- Pre-generation validation in place

---

### Phase 3: Expand Data Display 📊

**Effort:** Medium | **Duration:** 2-3 hours

Show more terms and add visual indicators for quality & categories.

**Tasks:**

- Increase recent terms grid from 6 to 12-16 terms
- Add visual score indicators (colored progress bars or star ratings)
- Display category badges/tags inline on each term card
- Create "Featured Term" or "Term of the Week" spotlight section
- Improve card layout with better spacing and information hierarchy
- Add term count statistics per category

**Files Modified:**

- `templates/landing-page.hbs` (template structure)
- `scripts/generateLandingPage.js` (data preparation)

**Success Criteria:**

- 12-16 terms visible without excessive scrolling
- Score indicators clear and intuitive
- Featured term prominently displayed
- Layout remains responsive

---

### Phase 4: Add Client-Side Search & Filtering 🔍

**Effort:** High | **Duration:** 4-5 hours

Enable real-time interaction without page reloads.

**Tasks:**

- Embed minimal vanilla JavaScript (~5KB gzipped) into landing-page.hbs
- Add search input that fuzzy-matches against term names and definitions
- Add filter buttons by category/tags
- Add sort options (by score descending, date added, alphabetical)
- Implement debounced search for performance
- Update results in real-time as user types/filters
- Ensure keyboard accessibility

**Files Modified:**

- `templates/landing-page.hbs` (embedded JavaScript + UI)

**Success Criteria:**

- Search response <50ms
- No external dependencies
- <5KB gzipped JavaScript
- Full keyboard navigation support
- Works offline (PWA compatible)

---

### Phase 5: Improve Responsive Design 📱

**Effort:** Medium | **Duration:** 2-3 hours

Optimize layout and interaction for all screen sizes.

**Tasks:**

- Test and refine breakpoints (mobile <480px, tablet 480-768px, desktop >768px)
- Make filter controls collapsible/dismissible on mobile
- Optimize card sizing and spacing for mobile (larger touch targets)
- Improve typography sizing for readability on small screens
- Test on actual devices or Chrome DevTools
- Ensure touch-friendly interactions (44px+ tap targets)

**Files Modified:**

- `templates/landing-page.hbs` (media queries + mobile UI)

**Success Criteria:**

- All breakpoints render correctly
- Touch targets ≥44px on mobile
- No horizontal scrolling
- Filters accessible on mobile

---

### Phase 6: Add Unit Tests to Generator ✅

**Effort:** Medium | **Duration:** 2-3 hours

Prevent regressions and ensure generator reliability.

**Tasks:**

- Create `tests/generateLandingPage.test.js`
- Test data validation (missing fields, invalid structure)
- Test error handling (missing files, corrupted data)
- Test template rendering (correct HTML output)
- Test edge cases (empty terms, very long definitions, special characters)
- Test file I/O (writes correct HTML to correct location)
- Aim for >80% code coverage

**Files Created:**

- `tests/generateLandingPage.test.js` (test suite)

**Success Criteria:**

- > 80% code coverage
- All edge cases tested
- Clear test descriptions
- Tests run in <5 seconds

---

### Phase 7: Implement CI Safety Checks 🛡️

**Effort:** Low | **Duration:** 1-2 hours

Prevent stale or invalid HTML from being committed.

**Tasks:**

- Update `.github/workflows/pr-complete.yml` to validate generated landing page
- Add check that landing page HTML matches current `terms.yaml` content
- Add check that no stale HTML is committed in PRs
- Implement pre-merge validation gate
- Update `.github/workflows/update-landing-page.yml` if needed

**Files Modified:**

- `.github/workflows/pr-complete.yml` (add validation)
- `.github/workflows/update-landing-page.yml` (if needed)

**Success Criteria:**

- CI detects stale landing page HTML
- PRs blocked if validation fails
- Clear error messages in CI
- No false positives

---

### Phase 8: Test & Validate 🧪

**Effort:** High | **Duration:** 3-4 hours

Comprehensive quality assurance before shipping.

**Tasks:**

- Run full test suite: `npm test`
- Validate landing page: `npm run validate:landing`
- Manually test search/filter functionality in browser
- Test responsive design on mobile/tablet/desktop
- Run Lighthouse audit (target >90)
- Test accessibility (WCAG 2.1 AA)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)

**Success Criteria:**

- All tests passing
- Lighthouse score >90
- WCAG 2.1 AA compliance
- No console errors/warnings
- Search/filter works smoothly

---

### Phase 9: Documentation & Handoff 📚

**Effort:** Low | **Duration:** 1-2 hours

Document changes for maintainers and contributors.

**Tasks:**

- Update `docs/landing-page/maintenance.md` with new features
- Document generator improvements and validation logic
- Add usage guide for search/filter features
- Update README with new features
- Update `CHANGELOG.md` with v1.1.0 changes
- Create troubleshooting guide for new features

**Files Modified:**

- `docs/landing-page/maintenance.md` (update)
- `README.md` (update)
- `CHANGELOG.md` (new entry)

**Success Criteria:**

- Clear documentation for users
- Clear documentation for maintainers
- CHANGELOG entry complete
- No orphaned or outdated docs

---

### Phase 10: Deploy & Monitor 🚀

**Effort:** Low | **Duration:** 1-2 hours

Merge, deploy, and gather feedback.

**Tasks:**

- Create PR with all changes, pass CI/CD pipeline
- Get code review, address feedback
- Merge to main → auto-deploys to GitHub Pages
- Verify deployment
- Monitor for issues
- Gather community feedback
- Plan Phase 2 improvements

**Success Criteria:**

- Live enhanced landing page
- No deployment errors
- All features working in production
- Community feedback positive

---

## 📊 Timeline & Effort Summary

| Phase | Title                      | Effort | Duration | Total Hours |
| ----- | -------------------------- | ------ | -------- | ----------- |
| 1     | Visual Polish & Animations | Medium | 2-3h     | 2-3         |
| 2     | Refactor Generator Script  | Medium | 2-3h     | 2-3         |
| 3     | Expand Data Display        | Medium | 2-3h     | 2-3         |
| 4     | Search & Filtering         | High   | 4-5h     | 4-5         |
| 5     | Responsive Design          | Medium | 2-3h     | 2-3         |
| 6     | Unit Tests                 | Medium | 2-3h     | 2-3         |
| 7     | CI Safety Checks           | Low    | 1-2h     | 1-2         |
| 8     | Test & Validation          | High   | 3-4h     | 3-4         |
| 9     | Documentation              | Low    | 1-2h     | 1-2         |
| 10    | Deploy & Monitor           | Low    | 1-2h     | 1-2         |
|       | **TOTAL**                  |        |          | **21-30h**  |

---

## 🔄 Execution Strategy

### Option A: Big Bang (Recommended for Clear Vision)

Implement all 10 phases → 1 comprehensive PR → single deployment

**Advantages:**

- ✅ Consistent design language across all changes
- ✅ Single QA pass for all features
- ✅ Cleaner git history

**Disadvantages:**

- ❌ Large PR, harder to review
- ❌ Higher risk if issues found
- ❌ Delayed feedback from users

### Option B: Phased Releases (Better for Iterative Feedback)

Split into 3 releases over time.

**Release 1:** Phases 1-3 (Visual refresh + data display)
**Release 2:** Phases 4-5 (Search & filtering + responsive)
**Release 3:** Phases 6-7 (Testing & CI improvements)

**Advantages:**

- ✅ Easier to review
- ✅ Gather feedback faster
- ✅ Can launch early and iterate

**Disadvantages:**

- ❌ Multiple deployments
- ❌ More coordination needed
- ❌ Potential visual inconsistencies between releases

---

## ✨ Key Success Metrics

After implementation, you should achieve:

| Metric                 | Target    | Current | Status      |
| ---------------------- | --------- | ------- | ----------- |
| Page load time         | <100ms    | ~50ms   | ✅ Maintain |
| Search/filter response | <50ms     | N/A     | 🎯 Target   |
| Lighthouse score       | >90       | ~88     | 🎯 Target   |
| Mobile usability       | Excellent | Good    | 🎯 Improve  |
| Test coverage          | >80%      | ~60%    | 🎯 Target   |
| Accessibility (WCAG)   | 2.1 AA    | 2.1 AA  | ✅ Maintain |
| Bundle size            | <25KB     | ~20KB   | ⚠️ +5KB OK  |

---

## 📁 Files to Create/Modify

### New Files

- `tests/generateLandingPage.test.js` - Test suite for generator

### Modified Files

- `templates/landing-page.hbs` - Template enhancements (Phases 1, 3, 4, 5)
- `scripts/generateLandingPage.js` - Generator refactoring (Phases 2, 3)
- `.github/workflows/pr-complete.yml` - CI validation (Phase 7)
- `.github/workflows/update-landing-page.yml` - Post-merge workflow (Phase 7)
- `docs/landing-page/maintenance.md` - Documentation (Phase 9)
- `README.md` - Feature announcement (Phase 9)
- `CHANGELOG.md` - Version entry (Phase 9)

---

## 🚀 Getting Started

### Prerequisites

- Node.js v22+
- npm v11+
- Git
- Basic knowledge of Handlebars templates

### Setup

```bash
# Clone and install dependencies
git clone https://github.com/LuminLynx/FOSS-Glossary.git
cd FOSS-Glossary
npm install

# Verify current state
npm run validate:landing
npm test
```

### Recommended Start

1. **Start with Phase 1** if prioritizing visual appeal
2. **Start with Phase 2** if prioritizing reliability
3. **Start with Phase 4** if prioritizing user interactivity
4. **Run all phases in parallel** if you have team capacity

---

## 📋 Pre-Implementation Checklist

- [ ] Review current `templates/landing-page.hbs`
- [ ] Review current `scripts/generateLandingPage.js`
- [ ] Run baseline tests: `npm test`
- [ ] Run baseline Lighthouse audit
- [ ] Create feature branch: `git checkout -b feat/landing-page-enhancement`
- [ ] Assign team members to phases
- [ ] Schedule code reviews
- [ ] Plan testing timeline

---

## 🔄 Phase Dependencies

```
Phase 1 (Visual) ──┐
                   ├──> Phase 3 (Data Display) ──┐
Phase 2 (Generator)┤                             ├──> Phase 8 (QA)
                   └──> Phase 4 (Search) ────────┘
                                    │
                            Phase 5 (Mobile)
                                    │
                        Phase 6 (Tests) & Phase 7 (CI)
                                    │
                            Phase 9 (Docs)
                                    │
                            Phase 10 (Deploy)
```

**Critical Path:** Phase 2 → Phase 4 → Phase 8
**Parallel Work:** Phases 1, 3, 5, 6, 7 can run simultaneously

---

## 🛠️ Rollback Plan

If critical issues are discovered:

1. **Revert PR:** `git revert <commit-sha>`
2. **Restore landing page:** Automated by GitHub Pages
3. **Post-mortem:** Identify root cause
4. **Re-plan:** Adjust phases and retry

**Rollback time:** <5 minutes (automated)

---

## 📞 Support & Escalation

### Questions About Phases

- Phases 1-3, 5: Ask UX/design team
- Phase 4: Ask frontend/JS specialist
- Phases 6-7: Ask QA/testing lead
- Phases 9-10: Ask documentation/release lead

### If Stuck

1. Review phase documentation
2. Check `.github/copilot-instructions.md` for patterns
3. Open issue with detailed problem description
4. Post in discussions for async help

---

## Version History

| Version | Date       | Changes                 |
| ------- | ---------- | ----------------------- |
| 1.0     | 2025-11-16 | Initial roadmap created |

---

**Approved for:** FOSS Glossary v1.1.0  
**Maintainer:** @LuminLynx  
**Last Updated:** November 16, 2025
