#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Fix tags in terms.yaml to match kebab-case pattern (lowercase with hyphens)
 * Converts tags like "FOSS", "GPL", "pull requests" to "foss", "gpl", "pull-requests"
 */
function fixTags() {
  try {
    const termsPath = path.join(__dirname, '..', 'terms.yaml');
    const data = yaml.load(fs.readFileSync(termsPath, 'utf8'));

    if (!data || !Array.isArray(data.terms)) {
      console.error('❌ Error: Invalid terms.yaml structure');
      process.exit(1);
    }

    let changeCount = 0;
    const changes = [];

    // Fix tags in each term
    data.terms.forEach((term, index) => {
      if (!term.tags || !Array.isArray(term.tags)) {
        return;
      }

      term.tags = term.tags.map((tag) => {
        // Convert to lowercase, trim spaces, and replace internal spaces/underscores with hyphens
        const fixed = tag
          .toLowerCase()
          .trim()
          .replace(/[\s_]+/g, '-')
          .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

        if (fixed !== tag) {
          changes.push(`  Term #${index + 1} (${term.slug}): "${tag}" → "${fixed}"`);
          changeCount++;
        }
        return fixed;
      });
    });

    if (changeCount > 0) {
      console.log(`🔧 Fixed ${changeCount} tag(s):`);
      changes.forEach((change) => console.log(change));

      // Write back to file
      const yamlOutput = yaml.dump(data, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });

      fs.writeFileSync(termsPath, yamlOutput);
      console.log('\n✅ Tags fixed successfully');
    } else {
      console.log('✅ All tags are already in correct format');
    }
  } catch (error) {
    console.error('❌ Error fixing tags:', error.message);
    process.exit(1);
  }
}

fixTags();
