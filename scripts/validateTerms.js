#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');

function validateTerms() {
  let hasErrors = false;
  const errors = [];

  try {
    // Step 1: Try to read the file
    if (!fs.existsSync('terms.yaml')) {
      console.error('❌ Error: terms.yaml file not found!');
      process.exit(1);
    }

    const fileContents = fs.readFileSync('terms.yaml', 'utf8');
    
    // Step 2: Try to parse as YAML
    let data;
    try {
      data = yaml.load(fileContents);
    } catch (parseError) {
      console.error('❌ YAML Parse Error: The file is not valid YAML!');
      console.error(`   Details: ${parseError.message}`);
      console.error('\n   Common issues:');
      console.error('   - Missing colons after keys');
      console.error('   - Incorrect indentation (use 2 spaces, not tabs)');
      console.error('   - Missing quotes around values with special characters');
      console.error('   - Invalid structure');
      process.exit(1);
    }
    
    // Step 3: Check required structure
    if (!data) {
      console.error('❌ Error: terms.yaml is empty!');
      process.exit(1);
    }
    
    if (typeof data !== 'object') {
      console.error('❌ Error: terms.yaml must contain an object, not a plain value!');
      console.error(`   Found: "${data}"`);
      process.exit(1);
    }
    
    if (!data.terms) {
      console.error('❌ Error: terms.yaml must have a "terms" array at the root level!');
      console.error('   Expected structure:');
      console.error('   terms:');
      console.error('     - term: "Example"');
      console.error('       definition: "Example definition"');
      process.exit(1);
    }
    
    if (!Array.isArray(data.terms)) {
      console.error('❌ Error: "terms" must be an array!');
      console.error(`   Found: ${typeof data.terms}`);
      process.exit(1);
    }
    
    if (data.terms.length === 0) {
      console.error('❌ Error: The terms array is empty!');
      process.exit(1);
    }
    
    // Step 4: Validate each term
    const validTerms = [];
    const termNames = new Set();
    
    data.terms.forEach((term, index) => {
      const termErrors = [];
      const termNumber = index + 1;
      
      // Check if term is an object
      if (!term || typeof term !== 'object') {
        errors.push(`Term ${termNumber}: Must be an object with 'term' and 'definition' fields, got: ${JSON.stringify(term)}`);
        hasErrors = true;
        return;
      }
      
      // Check required field: term
      if (!term.term) {
        termErrors.push(`Missing required field 'term'`);
      } else if (typeof term.term !== 'string') {
        termErrors.push(`'term' must be a string, got: ${typeof term.term}`);
      } else if (term.term.trim().length === 0) {
        termErrors.push(`'term' cannot be empty`);
      } else if (term.term.trim().length < 2) {
        termErrors.push(`'term' is too short (minimum 2 characters)`);
      }
      
      // Check required field: definition  
      if (!term.definition) {
        termErrors.push(`Missing required field 'definition'`);
      } else if (typeof term.definition !== 'string') {
        termErrors.push(`'definition' must be a string, got: ${typeof term.definition}`);
      } else if (term.definition.trim().length === 0) {
        termErrors.push(`'definition' cannot be empty`);
      } else if (term.definition.trim().length < 10) {
        termErrors.push(`'definition' is too short (minimum 10 characters)`);
      }
      
      // Check optional fields
      if (term.explanation !== undefined) {
        if (typeof term.explanation !== 'string') {
          termErrors.push(`'explanation' must be a string, got: ${typeof term.explanation}`);
        } else if (term.explanation.trim().length === 0) {
          termErrors.push(`'explanation' cannot be empty if provided`);
        }
      }
      
      if (term.humor !== undefined) {
        if (typeof term.humor !== 'string') {
          termErrors.push(`'humor' must be a string, got: ${typeof term.humor}`);
        } else if (term.humor.trim().length === 0) {
          termErrors.push(`'humor' cannot be empty if provided`);
        }
      }
      
      if (term.tags !== undefined) {
        if (!Array.isArray(term.tags)) {
          termErrors.push(`'tags' must be an array, got: ${typeof term.tags}`);
        } else {
          term.tags.forEach((tag, i) => {
            if (typeof tag !== 'string') {
              termErrors.push(`Tag ${i + 1} must be a string, got: ${typeof tag}`);
            }
          });
        }
      }
      
      if (term.see_also !== undefined) {
        if (!Array.isArray(term.see_also)) {
          termErrors.push(`'see_also' must be an array, got: ${typeof term.see_also}`);
        } else {
          term.see_also.forEach((ref, i) => {
            if (typeof ref !== 'string') {
              termErrors.push(`Reference ${i + 1} must be a string, got: ${typeof ref}`);
            }
          });
        }
      }
      
      if (term.controversy_level !== undefined) {
        if (!['low', 'medium', 'high'].includes(term.controversy_level)) {
          termErrors.push(`'controversy_level' must be 'low', 'medium', or 'high', got: ${term.controversy_level}`);
        }
      }
      
      // Check for unknown fields
      const allowedFields = ['term', 'definition', 'explanation', 'humor', 'tags', 'see_also', 'controversy_level'];
      const unknownFields = Object.keys(term).filter(key => !allowedFields.includes(key));
      if (unknownFields.length > 0) {
        termErrors.push(`Unknown fields: ${unknownFields.join(', ')}. Did you make a typo?`);
      }
      
      // Add errors if any
      if (termErrors.length > 0) {
        errors.push(`Term ${termNumber} ("${term.term || 'UNNAMED'}"):\n  - ${termErrors.join('\n  - ')}`);
        hasErrors = true;
      } else if (term.term) {
        // Check for duplicates
        const termNameLower = term.term.toLowerCase();
        if (termNames.has(termNameLower)) {
          errors.push(`Term ${termNumber}: Duplicate term "${term.term}" (terms must be unique)`);
          hasErrors = true;
        } else {
          termNames.add(termNameLower);
          validTerms.push(term.term);
        }
      }
    });
    
    // Report results
    if (hasErrors) {
      console.error('❌ Validation FAILED!\n');
      console.error('Found the following errors:\n');
      errors.forEach(error => {
        console.error(error);
        console.error('');
      });
      
      console.error('---');
      console.error('Please fix these issues and try again.');
      console.error('\nExample of a valid term:');
      console.error(`
  - term: "RTFM"
    definition: "Read The F***ing Manual"
    explanation: "A reminder to check documentation"
    humor: "The solution to 90% of questions"
    tags: ["acronym", "support"]
    see_also: ["Documentation"]`);
      
      process.exit(1);
    }
    
    console.log('✅ Validation PASSED!');
    console.log(`   ${data.terms.length} terms validated successfully`);
    console.log(`   Terms: ${validTerms.slice(0, 5).join(', ')}${validTerms.length > 5 ? '...' : ''}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Unexpected error during validation:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

validateTerms();
