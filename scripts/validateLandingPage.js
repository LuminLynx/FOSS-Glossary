#!/usr/bin/env node
/**
 * Landing Page Sync Validator
 *
 * Validates that docs/index.html is in sync with terms.yaml by checking:
 * 1. Total terms count in statistics section
 * 2. Recent terms listed in "Latest Additions" section
 * 3. Number of term cards in "Recent Terms" section
 *
 * This prevents the landing page from showing outdated data.
 *
 * Exit codes:
 * - 0: Landing page is in sync
 * - 1: Landing page is out of sync or validation failed
 */

const fs = require('fs');
const path = require('path');
const { loadTermsYaml } = require('../utils/fileSystem');

const DOCS_INDEX_PATH = path.join(__dirname, '..', 'docs', 'index.html');
const EXPECTED_RECENT_COUNT = 6; // Number of recent terms displayed in cards
const EXPECTED_LATEST_COUNT = 3; // Number of terms in "Latest Additions"

// Regex patterns for HTML parsing
const PATTERNS = {
  TOTAL_TERMS:
    /<span class="stat-number">(\d+)<\/span>\s*<span class="stat-label">Total Terms<\/span>/,
  LATEST_ADDITIONS: /<h2>🆕 Latest Additions<\/h2>\s*<p>Just added: <strong>([^<]+)<\/strong><\/p>/,
  TERM_CARD: /<div\s+class="term-card"/g,
};

/**
 * Extract a number from HTML content using a regex pattern
 * @param {string} html - HTML content
 * @param {RegExp} pattern - Regex pattern to match
 * @returns {number|null} Extracted number or null if not found
 */
function extractNumber(html, pattern) {
  const match = html.match(pattern);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract text content from HTML using a regex pattern
 * @param {string} html - HTML content
 * @param {RegExp} pattern - Regex pattern to match
 * @returns {string|null} Extracted text or null if not found
 */
function extractText(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : null;
}

/**
 * Count occurrences of a pattern in HTML
 * @param {string} html - HTML content
 * @param {RegExp} pattern - Regex pattern to match
 * @returns {number} Count of matches
 */
function countMatches(html, pattern) {
  const matches = html.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Main validation function
 */
function validateLandingPage() {
  try {
    // Load terms.yaml
    const terms = loadTermsYaml();
    const totalTerms = terms.length;
    const recentTerms = terms.slice(-EXPECTED_LATEST_COUNT).reverse();

    // Check if docs/index.html exists
    if (!fs.existsSync(DOCS_INDEX_PATH)) {
      console.error('❌ Error: docs/index.html not found');
      console.error('   Run: node scripts/generateLandingPage.js');
      return false;
    }

    // Read HTML content
    const html = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');

    // Validation 1: Check total terms count in statistics
    const htmlTotalTerms = extractNumber(html, PATTERNS.TOTAL_TERMS);

    if (htmlTotalTerms === null) {
      console.error('❌ Error: Could not find total terms count in HTML');
      return false;
    }

    if (htmlTotalTerms !== totalTerms) {
      console.error(`❌ Error: Total terms mismatch`);
      console.error(`   Expected: ${totalTerms} terms (from terms.yaml)`);
      console.error(`   Found: ${htmlTotalTerms} terms (in docs/index.html)`);
      console.error('   Run: node scripts/generateLandingPage.js');
      return false;
    }

    // Validation 2: Check recent terms in "Latest Additions"
    const recentTermsList = recentTerms.map((t) => t.term).join(', ');
    const htmlRecentTerms = extractText(html, PATTERNS.LATEST_ADDITIONS);

    if (!htmlRecentTerms) {
      console.error('❌ Error: Could not find "Latest Additions" section in HTML');
      return false;
    }

    // Note: We do a simplified check - just verify it's not the placeholder test data
    if (htmlRecentTerms.includes('Test &amp;') || htmlRecentTerms.includes('&lt;Title&gt;')) {
      console.error(`❌ Error: "Latest Additions" contains placeholder test data`);
      console.error(`   Expected: ${recentTermsList}`);
      console.error(`   Found: ${htmlRecentTerms}`);
      console.error('   Run: node scripts/generateLandingPage.js');
      return false;
    }

    // Validation 3: Check number of term cards
    const termCardCount = countMatches(html, PATTERNS.TERM_CARD);

    if (termCardCount === 0) {
      console.error('❌ Error: No term cards found in HTML');
      console.error('   Run: node scripts/generateLandingPage.js');
      return false;
    }

    if (termCardCount === 1 && html.includes('Test &amp;')) {
      console.error(`❌ Error: Only placeholder test card found in "Recent Terms"`);
      console.error(`   Expected: ${EXPECTED_RECENT_COUNT} recent term cards`);
      console.error(`   Found: 1 test card`);
      console.error('   Run: node scripts/generateLandingPage.js');
      return false;
    }

    // All validations passed
    console.log('✅ Landing page is in sync with terms.yaml');
    console.log(`   - Total terms: ${totalTerms}`);
    console.log(`   - Latest additions: ${recentTermsList}`);
    console.log(`   - Recent term cards: ${termCardCount}`);
    return true;
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    return false;
  }
}

// Run validation
const success = validateLandingPage();
process.exit(success ? 0 : 1);
