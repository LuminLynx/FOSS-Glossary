#!/usr/bin/env node
/**
 * YAML Sorter for FOSS Glossary
 *
 * This script sorts terms in terms.yaml alphabetically by slug.
 * It supports two modes:
 * 1. Default mode: Reads terms.yaml, sorts it, and writes back to disk
 * 2. Check mode (--check): Validates that terms.yaml is sorted without modifying it
 *
 * Usage:
 *   node scripts/sortYaml.js           # Sort and write to disk
 *   node scripts/sortYaml.js --check   # Validate sorting without writing
 *
 * Exit codes:
 *   0: Success (sorted or already sorted)
 *   1: Error (file not sorted in check mode, or other errors)
 */

const fs = require('fs');
const yaml = require('js-yaml');

const TERMS_FILE = 'terms.yaml';

/**
 * Parse command line arguments
 * @returns {Object} Options with check flag
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    check: args.includes('--check'),
  };
}

/**
 * Load and parse terms.yaml, preserving header comment
 * @returns {Object} Object with data and headerComment
 */
function loadTermsYaml() {
  try {
    const content = fs.readFileSync(TERMS_FILE, 'utf8');

    // Extract header comment (lines starting with # before the first YAML key)
    const lines = content.split('\n');
    const headerLines = [];
    for (const line of lines) {
      if (line.trim().startsWith('#')) {
        headerLines.push(line);
      } else if (line.trim() !== '') {
        // Stop at first non-comment, non-empty line
        break;
      }
    }

    const data = yaml.load(content);
    return {
      data,
      headerComment: headerLines.length > 0 ? headerLines.join('\n') + '\n' : '',
    };
  } catch (error) {
    console.error(`❌ Error: Failed to read ${TERMS_FILE}:`, error.message);
    process.exit(1);
  }
}

/**
 * Sort terms alphabetically by slug
 * @param {Array} terms - Array of term objects
 * @returns {Array} Sorted array of terms
 */
function sortTerms(terms) {
  if (!Array.isArray(terms)) {
    console.error('❌ Error: terms must be an array');
    process.exit(1);
  }
  return [...terms].sort((a, b) => {
    const slugA = String(a.slug || '');
    const slugB = String(b.slug || '');
    return slugA.localeCompare(slugB);
  });
}

/**
 * Sort keys within each term according to canonical order
 * @param {Array} terms - Array of term objects
 * @returns {Array} Terms with keys in canonical order
 */
function sortTermKeys(terms) {
  const keyOrder = [
    'slug',
    'term',
    'definition',
    'explanation',
    'humor',
    'see_also',
    'tags',
    'aliases',
    'controversy_level',
  ];

  return terms.map((term) => {
    const sorted = {};

    // Add keys in defined order
    keyOrder.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(term, key)) {
        sorted[key] = term[key];
      }
    });

    // Add any additional keys not in the defined order
    Object.keys(term).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(sorted, key)) {
        sorted[key] = term[key];
      }
    });

    return sorted;
  });
}

/**
 * Sort redirects alphabetically by key
 * @param {Object} redirects - Redirects object
 * @returns {Object} Sorted redirects object
 */
function sortRedirects(redirects) {
  if (!redirects || typeof redirects !== 'object') {
    return redirects;
  }

  const sorted = {};
  Object.keys(redirects)
    .sort()
    .forEach((key) => {
      sorted[key] = redirects[key];
    });

  return sorted;
}

/**
 * Serialize YAML data to string with consistent formatting
 * @param {Object} data - YAML data to serialize
 * @returns {string} Formatted YAML string
 */
function serializeYaml(data) {
  return yaml.dump(data, {
    indent: 2,
    lineWidth: -1, // Disable line wrapping
    noRefs: true, // Disable anchors/aliases
    sortKeys: false, // Don't sort keys (we only sort terms array)
    quotingType: '"', // Use double quotes for strings
    forceQuotes: false, // Only quote when necessary
  });
}

/**
 * Main function
 */
function main() {
  const options = parseArgs();

  // Load terms.yaml
  const { data, headerComment } = loadTermsYaml();

  if (!data.terms || !Array.isArray(data.terms)) {
    console.error('❌ Error: terms.yaml must contain a "terms" array');
    process.exit(1);
  }

  // Sort the terms by slug and sort keys within each term
  const originalTerms = data.terms;
  const sortedTerms = sortTermKeys(sortTerms(originalTerms));

  // Sort redirects if present
  const sortedRedirects = sortRedirects(data.redirects);

  // Build output object with consistent key order
  const sortedData = {};
  if (sortedRedirects) {
    sortedData.redirects = sortedRedirects;
  }
  sortedData.terms = sortedTerms;

  // Serialize both versions for comparison
  const originalYaml = serializeYaml(data);
  const sortedYaml = serializeYaml(sortedData);

  if (options.check) {
    // Check mode: Compare without modifying
    if (originalYaml === sortedYaml) {
      console.log('✅ YAML is properly sorted');
      process.exit(0);
    } else {
      console.error('❌ terms.yaml is not sorted. Run: npm run sort:yaml');
      process.exit(1);
    }
  } else {
    // Write mode: Save sorted version with header
    try {
      const output = headerComment + sortedYaml;
      fs.writeFileSync(TERMS_FILE, output, 'utf8');
      console.log(`✅ YAML keys sorted successfully`);
      process.exit(0);
    } catch (error) {
      console.error(`❌ Error: Failed to write ${TERMS_FILE}:`, error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  sortTerms,
  sortTermKeys,
  sortRedirects,
  serializeYaml,
  loadTermsYaml,
  parseArgs,
};
