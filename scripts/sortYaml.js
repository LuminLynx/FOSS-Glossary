#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Sort YAML keys in terms.yaml for stable diffs and consistency
 * Sorts both the terms array (by slug) and the keys within each term object
 */
function sortYamlKeys() {
  try {
    const termsPath = path.join(__dirname, '..', 'terms.yaml');
    const data = yaml.load(fs.readFileSync(termsPath, 'utf8'));

    if (!data || !Array.isArray(data.terms)) {
      console.error('❌ Error: Invalid terms.yaml structure');
      process.exit(1);
    }

    // Define desired key order for term objects
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

    // Sort terms by slug
    data.terms.sort((a, b) => {
      const slugA = a.slug || '';
      const slugB = b.slug || '';
      return slugA.localeCompare(slugB);
    });

    // Sort keys within each term
    const sortedTerms = data.terms.map((term) => {
      const sorted = {};

      // Add keys in defined order
      keyOrder.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(term, key)) {
          sorted[key] = term[key];
        }
      });

      // Add any additional keys not in the defined order (shouldn't happen with strict schema)
      Object.keys(term).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(sorted, key)) {
          sorted[key] = term[key];
        }
      });

      return sorted;
    });

    // Sort redirects if present
    let sortedRedirects = undefined;
    if (data.redirects && typeof data.redirects === 'object') {
      sortedRedirects = {};
      Object.keys(data.redirects)
        .sort()
        .forEach((key) => {
          sortedRedirects[key] = data.redirects[key];
        });
    }

    // Build output object with consistent key order
    const output = {};
    if (sortedRedirects) {
      output.redirects = sortedRedirects;
    }
    output.terms = sortedTerms;

    // Convert to YAML with consistent formatting
    const yamlOutput = yaml.dump(output, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      noRefs: true,
      sortKeys: false, // We already sorted manually
    });

    // Write sorted YAML
    fs.writeFileSync(termsPath, yamlOutput);

    console.log('✅ YAML keys sorted successfully');
  } catch (error) {
    console.error('❌ Error sorting YAML keys:', error.message);
    process.exit(1);
  }
}

sortYamlKeys();
