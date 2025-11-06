# Landing Page Issue Report

**Issue Number:** Related to issue about "Landing Page loading only 1 Term"  
**Date:** November 6, 2025  
**Status:** ✅ RESOLVED

---

## Issue Summary

The landing page (`docs/index.html`) was displaying only 1 test term instead of all 28 terms from `terms.yaml`. This created a poor user experience and misrepresented the glossary's content.

---

## Root Cause Analysis

### Primary Cause

The landing page HTML file contained **stale test data** from development/testing of the Handlebars template migration. The test term had special HTML characters (`Test & <Title> with 'quotes' and "double"`) indicating it was used to test HTML escaping functionality.

### Why It Happened

1. **Manual Test Data**: During Handlebars template development, the script was likely run with test data to verify HTML escaping
2. **Workflow Limitation**: The `update-landing-page.yml` workflow only runs on pushes to `main` branch
3. **Missing Validation**: The corrupted landing page was committed without running validation scripts

### Technical Details

- `generateLandingPage.js` script works correctly ✅
- `loadTermsYaml()` correctly loads all 28 terms from `terms.yaml` ✅
- `prepareTermCardsData()` correctly filters and displays 6 most recent terms ✅
- The issue was purely **stale data in the committed HTML file**

---

## Fix Applied

### Actions Taken

1. **Regenerated Landing Page**: Ran `node scripts/generateLandingPage.js`
2. **Validated Output**: Verified page now shows all 28 terms
3. **Ran Tests**: Confirmed all validation passes

### Verification Results

```
✅ Landing page is in sync with terms.yaml
   - Total terms: 28
   - Latest additions: Zombie Dependencies, YOLO Deploy, Yak Shaving
   - Recent term cards: 6
```

### Changes

- **Before**: 1 test term with HTML special characters
- **After**: 6 recent terms displayed (Zombie Dependencies, YOLO Deploy, Yak Shaving, Works on My Machine, WONTFIX, Ship It)
- **Statistics**: Updated to show 28 total terms, 100% humor rate, 65 categories

---

## Code Quality Observations

### Architectural Issue (Minor)

The `generateLandingPage.js` script has an architectural inconsistency:

**Current State:**

```javascript
// Some functions receive data as parameters
function generateHTML(stats, artifactVersion) { ... }

// Others rely on module-level variables
function prepareTermCardsData(count = 6) {
  const validTerms = terms.filter(isValidTerm);  // Uses module-level 'terms'
  // ...
}
```

**Impact**:

- ⚠️ Creates hidden dependencies on module state
- ⚠️ Makes functions less testable in isolation
- ⚠️ Could cause issues if module is imported and used differently

**Recommendation**:
Refactor to pass data explicitly:

```javascript
function prepareTermCardsData(terms, count = 6) {
  const validTerms = terms.filter(isValidTerm);
  // ...
}

// Then call it as:
termCards: prepareTermCardsData(terms, 6);
```

This change would:

- ✅ Make dependencies explicit
- ✅ Improve testability
- ✅ Follow functional programming best practices
- ✅ Match the pattern used in `generateHTML(stats, artifactVersion)`

---

## Prevention Measures

### Immediate Actions

1. **✅ Pre-commit Hook**: Use `.husky/pre-commit` to validate landing page sync
2. **✅ Validation Script**: `scripts/validateLandingPage.js` already exists
3. **✅ CI Workflow**: GitHub Actions validates on PR

### Recommended Improvements

#### 1. Git Hook Enhancement

Add to `.husky/pre-commit`:

```bash
# Validate landing page is in sync with terms.yaml
if git diff --cached --name-only | grep -q "docs/index.html"; then
  echo "🔍 Validating landing page..."
  node scripts/validateLandingPage.js || exit 1
fi
```

#### 2. Branch Protection

Add branch protection rules to require:

- ✅ Validation check passes
- ✅ Landing page sync check passes
- ✅ No direct commits to `docs/index.html` without corresponding `terms.yaml` changes

#### 3. Documentation Update

Update `docs/landing-page-maintenance.md` to include:

- When to regenerate landing page
- How to verify changes
- Troubleshooting common issues

#### 4. Automated Regeneration

Consider adding a git hook that automatically regenerates the landing page when `terms.yaml` changes:

```bash
# .husky/pre-commit addition
if git diff --cached --name-only | grep -q "terms.yaml"; then
  echo "📝 Regenerating landing page..."
  node scripts/generateLandingPage.js
  git add docs/index.html
fi
```

---

## Testing Checklist

When making changes to landing page generation:

- [ ] Run `node scripts/generateLandingPage.js`
- [ ] Run `node scripts/validateLandingPage.js`
- [ ] Run `npm test`
- [ ] Verify statistics match `terms.yaml`
- [ ] Check that recent terms are correct
- [ ] Verify term cards display properly
- [ ] Test HTML escaping (special characters)
- [ ] Check responsive design (mobile/desktop)

---

## Related Files

- **Generator Script**: `scripts/generateLandingPage.js`
- **Validation Script**: `scripts/validateLandingPage.js`
- **Template**: `templates/landing-page.hbs`
- **Output**: `docs/index.html`
- **Data Source**: `terms.yaml`
- **Workflow**: `.github/workflows/update-landing-page.yml`
- **Maintenance Guide**: `docs/landing-page-maintenance.md`

---

## Lessons Learned

1. **Always validate generated files**: Automated generation should be followed by validation
2. **Test data hygiene**: Never commit test data to production files
3. **Workflow coverage**: Ensure CI/CD covers all branches where changes might occur
4. **Explicit dependencies**: Pass data as parameters rather than relying on module state
5. **Pre-commit hooks**: Strong validation at commit time prevents issues from reaching CI

---

## Conclusion

The issue was successfully resolved by regenerating the landing page with correct data. The root cause was stale test data, not a bug in the generation script. Implementing the recommended prevention measures will help avoid similar issues in the future.

**Status**: ✅ Issue Resolved  
**Risk of Recurrence**: Low (with preventive measures)  
**User Impact**: Fixed - landing page now displays all 28 terms correctly
