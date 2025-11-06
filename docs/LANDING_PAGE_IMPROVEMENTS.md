# Landing Page Code Improvements Guide

This document provides guided suggestions to improve the landing page generation code quality, maintainability, and robustness.

---

## 🎯 Priority 1: Critical Improvements

### 1.1 Add Data Validation in Generator

**Current Issue**: The script loads data but doesn't validate it thoroughly before generating HTML.

**Location**: `scripts/generateLandingPage.js`

**Suggested Fix**:
```javascript
function validateGeneratorData() {
  // Validate terms
  if (!Array.isArray(terms) || terms.length === 0) {
    console.error('❌ Error: No valid terms found in terms.yaml');
    process.exit(1);
  }

  // Validate minimum term requirements
  const invalidTerms = terms.filter(t => !isValidTerm(t));
  if (invalidTerms.length > 0) {
    console.error(`❌ Error: ${invalidTerms.length} invalid terms found`);
    console.error('   Invalid terms:', invalidTerms.map(t => t.term || 'undefined').join(', '));
    process.exit(1);
  }

  // Validate we have enough terms to display
  if (terms.length < 6) {
    console.warn(`⚠️  Warning: Only ${terms.length} terms available. Need at least 6 for optimal display.`);
  }

  console.log(`✅ Data validation passed: ${terms.length} valid terms`);
}

// Call in main() after initializeData()
function main() {
  initializeData();
  validateGeneratorData();  // Add this line
  const html = generateHTML(stats, artifactVersion);
  writeOutputFile(html);
}
```

**Benefits**:

- Catches data issues before generating HTML
- Provides clear error messages
- Prevents generating invalid landing pages

---

### 1.2 Make Dependencies Explicit

**Current Issue**: Functions rely on module-level variables, creating hidden dependencies.

**Location**: `scripts/generateLandingPage.js`

**Problematic Code**:
```javascript
// Module-level variables
let artifactVersion;
let terms;
let stats;

function prepareTermCardsData(count = 6) {
  const validTerms = terms.filter(isValidTerm);  // Hidden dependency
  // ...
}
```

**Suggested Fix**:
```javascript
// Option 1: Pass data explicitly
function prepareTermCardsData(terms, count = 6) {
  const validTerms = terms.filter(isValidTerm);
  const displayTerms = validTerms.slice(-count).reverse();
  return displayTerms.map(term => prepareTermCardData(term));
}

// Update call site in generateHTML()
function generateHTML(terms, stats, artifactVersion) {
  const template = loadTemplate();
  const templateData = {
    // ...
    termCards: prepareTermCardsData(terms, 6),  // Pass terms explicitly
    // ...
  };
  return template(templateData);
}

// Option 2: Create a data context object
function createGeneratorContext(termsArray) {
  return {
    terms: termsArray,
    stats: calculateStats(termsArray),
    artifactVersion: getGitSha('dev'),
  };
}

function prepareTermCardsData(context, count = 6) {
  const validTerms = context.terms.filter(isValidTerm);
  // ...
}
```

**Benefits**:

- Makes dependencies explicit and clear
- Easier to test functions in isolation
- Prevents accidental use of stale data
- Follows functional programming principles

---

### 1.3 Add Output Verification

**Current Issue**: The script writes the HTML file but doesn't verify it was generated correctly.

**Location**: `scripts/generateLandingPage.js` - `writeOutputFile()` function

**Suggested Fix**:
```javascript
function writeOutputFile(html) {
  try {
    // Ensure docs directory exists
    if (!fs.existsSync('docs')) {
      fs.mkdirSync('docs', { recursive: true });
    }

    // Write file
    fs.writeFileSync('docs/index.html', html);

    // Verify file was written correctly
    const writtenContent = fs.readFileSync('docs/index.html', 'utf8');
    if (writtenContent !== html) {
      throw new Error('File content verification failed');
    }

    // Verify file size is reasonable
    const fileSize = Buffer.byteLength(html, 'utf8');
    const minExpectedSize = 10000; // 10KB minimum
    if (fileSize < minExpectedSize) {
      throw new Error(`Generated file is too small (${fileSize} bytes). Expected at least ${minExpectedSize} bytes.`);
    }

    // Success - log statistics
    console.log(`✅ Generated landing page with ${stats.totalTerms} terms!`);
    console.log(`📊 Stats: ${stats.termsWithHumor}/${stats.totalTerms} terms have humor (${Math.round((stats.termsWithHumor / stats.totalTerms) * 100)}%)`);
    console.log(`🆕 Recent: ${stats.recentTerms.join(', ')}`);
    console.log(`📦 File size: ${(fileSize / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Error writing landing page file:', error.message);
    process.exit(1);
  }
}
```

**Benefits**:

- Detects file write issues immediately
- Catches corrupted output
- Provides useful debugging information

---

## 🎨 Priority 2: Code Quality Improvements

### 2.1 Improve Error Messages

**Current Issue**: Some errors don't provide enough context for debugging.

**Suggested Fix**:
```javascript
function loadTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'landing-page.hbs');

    // Better error message if file doesn't exist
    if (!fs.existsSync(templatePath)) {
      console.error('❌ Error: Template file not found');
      console.error(`   Expected location: ${templatePath}`);
      console.error('   Make sure you are running this script from the repository root directory.');
      process.exit(1);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    return Handlebars.compile(templateSource);
  } catch (error) {
    console.error('❌ Error loading template:', error.message);
    console.error('   Template path:', path.join(__dirname, '..', 'templates', 'landing-page.hbs'));
    console.error('   Current directory:', process.cwd());
    process.exit(1);
  }
}
```

---

### 2.2 Add JSDoc Comments for Complex Functions

**Current Issue**: Some functions lack comprehensive documentation.

**Suggested Fix**:
```javascript
/**
 * Validate if a term is displayable on the landing page
 * 
 * A valid term must have:
 * - A non-empty term name (string)
 * - A non-empty definition (string)
 * 
 * Optional fields (humor, tags, explanation) are not required for validity
 * but enhance the term's display and score.
 * 
 * @param {Object} term - Term object to validate
 * @param {string} term.term - Term name/title
 * @param {string} term.definition - Term definition
 * @param {string} [term.humor] - Optional humorous description
 * @param {string[]} [term.tags] - Optional category tags
 * @returns {boolean} True if term has all required fields and they are non-empty
 * 
 * @example
 * isValidTerm({ term: 'Git', definition: 'Version control system' }) // true
 * isValidTerm({ term: '', definition: 'Empty name' }) // false
 * isValidTerm({ term: 'Git' }) // false - missing definition
 */
function isValidTerm(term) {
  return (
    term &&
    term.term &&
    typeof term.term === 'string' &&
    term.term.trim() !== '' &&
    term.definition &&
    typeof term.definition === 'string' &&
    term.definition.trim() !== ''
  );
}
```

---

### 2.3 Extract Magic Numbers

**Current Issue**: Numbers like `6` (term cards) are hardcoded.

**Suggested Fix**:
```javascript
// At the top of the file, add constants
const CONFIG = {
  RECENT_TERMS_COUNT: 6,
  MIN_FILE_SIZE_BYTES: 10000,
  SCORE_THRESHOLDS: {
    EXCELLENT: 80,
    GOOD: 60,
  },
};

// Use throughout the code
function prepareTermCardsData(count = CONFIG.RECENT_TERMS_COUNT) {
  // ...
}

function getScoreColor(score) {
  if (score >= CONFIG.SCORE_THRESHOLDS.EXCELLENT) return '#00d4e4';
  if (score >= CONFIG.SCORE_THRESHOLDS.GOOD) return '#00f0ff';
  return '#ffd93d';
}
```

---

## 🔧 Priority 3: Development Workflow Improvements

### 3.1 Add Development Mode

**Suggested Addition**: Create a development mode flag for easier testing.

```javascript
// Add command-line argument support
const args = process.argv.slice(2);
const isDevelopment = args.includes('--dev');

function main() {
  initializeData();

  if (isDevelopment) {
    console.log('🔧 Running in development mode');
    console.log(`📊 Loaded ${terms.length} terms`);
    console.log('🔍 Sample term:', terms[0]);
  }

  validateGeneratorData();
  const html = generateHTML(stats, artifactVersion);
  writeOutputFile(html);

  if (isDevelopment) {
    console.log('✅ Generation complete. Check docs/index.html');
  }
}
```

**Usage**:
```bash
# Normal mode
node scripts/generateLandingPage.js

# Development mode with extra logging
node scripts/generateLandingPage.js --dev
```

---

### 3.2 Add Dry-Run Mode

**Suggested Addition**: Allow testing without writing files.

```javascript
const isDryRun = args.includes('--dry-run');

function writeOutputFile(html) {
  if (isDryRun) {
    console.log('🔍 DRY RUN - Would write to docs/index.html');
    console.log(`📦 File size: ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(2)} KB`);
    console.log(`✅ Generated HTML with ${stats.totalTerms} terms`);
    return;
  }

  // ... existing write logic ...
}
```

**Usage**:
```bash
# Test generation without writing
node scripts/generateLandingPage.js --dry-run
```

---

## 📋 Priority 4: Testing Improvements

### 4.1 Create Unit Tests

**Suggested Addition**: Create `tests/generateLandingPage.test.js`

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('generateLandingPage', () => {
  it('should validate terms correctly', () => {
    const validTerm = {
      term: 'Test Term',
      definition: 'Test definition',
    };
    assert.strictEqual(isValidTerm(validTerm), true);

    const invalidTerm = { term: '', definition: 'No name' };
    assert.strictEqual(isValidTerm(invalidTerm), false);
  });

  it('should prepare correct number of term cards', () => {
    const mockTerms = Array(10).fill(null).map((_, i) => ({
      term: `Term ${i}`,
      definition: `Definition ${i}`,
    }));
    
    const cards = prepareTermCardsData(mockTerms, 6);
    assert.strictEqual(cards.length, 6);
  });

  it('should escape HTML correctly', () => {
    const dangerous = '<script>alert("xss")</script>';
    const safe = escapeHtml(dangerous);
    assert.strictEqual(safe.includes('<script>'), false);
  });
});
```

---

### 4.2 Add Integration Test

**Suggested Addition**: Create `tests/landingPageIntegration.test.js`

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { execSync } = require('child_process');

describe('Landing Page Integration', () => {
  it('should generate valid HTML', () => {
    // Generate landing page
    execSync('node scripts/generateLandingPage.js', { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });

    // Verify file exists
    assert(fs.existsSync('docs/index.html'));

    // Verify content
    const html = fs.readFileSync('docs/index.html', 'utf8');
    assert(html.includes('<!DOCTYPE html>'));
    assert(html.includes('<title>FOSS Glossary'));
    assert(html.includes('term-card'));
  });

  it('should pass validation after generation', () => {
    const result = execSync('node scripts/validateLandingPage.js', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    assert(result.includes('✅ Landing page is in sync'));
  });
});
```

---

## 🚀 Implementation Plan

### Step 1: Critical Fixes (Week 1)

1. Add data validation in generator
2. Add output verification
3. Improve error messages

### Step 2: Code Quality (Week 2)

1. Make dependencies explicit
2. Extract magic numbers
3. Add comprehensive JSDoc

### Step 3: Development Experience (Week 3)

1. Add development mode
2. Add dry-run mode
3. Create unit tests

### Step 4: Long-term Maintenance (Week 4)

1. Add integration tests
2. Update documentation
3. Review and refine

---

## 📚 Additional Resources

- **Handlebars Documentation**: https://handlebarsjs.com/
- **Node.js Testing**: https://nodejs.org/api/test.html
- **YAML Processing**: https://github.com/nodeca/js-yaml
- **Landing Page Maintenance**: `docs/landing-page-maintenance.md`

---

## ✅ Validation Checklist

Before implementing these improvements, verify:

- [ ] Changes don't break existing functionality
- [ ] All tests pass after changes
- [ ] Landing page generation still works
- [ ] HTML validation passes
- [ ] Performance is not degraded
- [ ] Documentation is updated
- [ ] Code review completed

---

**Last Updated**: November 6, 2025  
**Status**: Recommendations Ready for Implementation
