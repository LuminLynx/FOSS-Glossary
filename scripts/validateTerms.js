#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

function validateTerms() {
  try {
    // Read the terms file
    const fileContents = fs.readFileSync('terms.yaml', 'utf8');
    const data = yaml.load(fileContents);
    
    if (!data || !data.terms) {
      console.error('❌ Error: terms.yaml must have a "terms" array');
      process.exit(1);
    }
    
// Enforce schema.json (single insert)
(() => {
  const schema = JSON.parse(require('fs').readFileSync('schema.json', 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    console.error('❌ Schema validation failed:');
    for (const e of validate.errors || []) {
      const loc = e.instancePath || '(root)';
      console.error(`  - ${loc} ${e.message}`);
    }
    process.exit(1);
  }
})();

    let hasErrors = false;
    const errors = [];
    
    // Check each term
    data.terms.forEach((term, index) => {
      // Check required fields
      if (!term.term) {
        errors.push(`Term ${index + 1}: Missing 'term' field`);
        hasErrors = true;
      }
      if (!term.definition) {
        errors.push(`Term ${index + 1}: Missing 'definition' field`);
        hasErrors = true;
      }
      
      // Check field types
      if (term.term && typeof term.term !== 'string') {
        errors.push(`Term ${index + 1}: 'term' must be a string`);
        hasErrors = true;
      }
      if (term.definition && typeof term.definition !== 'string') {
        errors.push(`Term ${index + 1}: 'definition' must be a string`);
        hasErrors = true;
      }
      
      // Check optional field types
      if (term.tags && !Array.isArray(term.tags)) {
        errors.push(`Term ${index + 1}: 'tags' must be an array`);
        hasErrors = true;
      }
      if (term.see_also && !Array.isArray(term.see_also)) {
        errors.push(`Term ${index + 1}: 'see_also' must be an array`);
        hasErrors = true;
      }
      if (term.controversy_level && !['low', 'medium', 'high'].includes(term.controversy_level)) {
        errors.push(`Term ${index + 1}: 'controversy_level' must be low, medium, or high`);
        hasErrors = true;
      }
    });
    
    // Check for duplicate terms
    const termNames = data.terms.map(t => t.term?.toLowerCase());
    const duplicates = termNames.filter((term, index) => termNames.indexOf(term) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate terms found: ${[...new Set(duplicates)].join(', ')}`);
      hasErrors = true;
    }

// Extra duplicate pass: case/space-insensitive
(() => {
  const norm = s => (typeof s === 'string' ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '');
  const names = data.terms.map(t => norm(t.term)).filter(Boolean);
  const dups = names.filter((n, i) => names.indexOf(n) !== i);
  if (dups.length) {
    const unique = [...new Set(dups)];
    errors.push(`Duplicate terms (normalized) found: ${unique.join(', ')}`);
    hasErrors = true;
  }
})();
    
    if (hasErrors) {
      console.error('❌ Validation failed:\n');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    console.log(`✅ Validation passed! ${data.terms.length} terms are valid.`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error reading or parsing terms.yaml:', error.message);
    process.exit(1);
  }
}

// Run validation
validateTerms();
