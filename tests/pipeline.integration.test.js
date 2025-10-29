const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SCHEMA_PATH = path.join(__dirname, '..', 'schema.json');
const VALIDATE_SCRIPT = path.join(__dirname, '..', 'scripts', 'validateTerms.js');
const SCORE_SCRIPT = path.join(__dirname, '..', 'scripts', 'quickScore.js');
const EXPORT_SCRIPT = path.join(__dirname, '..', 'scripts', 'exportTerms.js');

/**
 * Run a complete validation, scoring, and export pipeline test
 */
function runFullPipeline(termsData, options = {}) {
  const tmpDir = fs.mkdtempSync('/tmp/pipeline-test-');
  const tmpTermsPath = path.join(tmpDir, 'terms.yaml');
  const tmpSchemaPath = path.join(tmpDir, 'schema.json');
  const tmpOutputPath = path.join(tmpDir, 'output.json');
  
  fs.writeFileSync(tmpTermsPath, yaml.dump(termsData));
  fs.copyFileSync(SCHEMA_PATH, tmpSchemaPath);
  
  const results = {
    validation: null,
    scoring: null,
    export: null
  };
  
  try {
    // Step 1: Validation
    const validationResult = spawnSync('node', [VALIDATE_SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    results.validation = {
      success: validationResult.status === 0,
      output: validationResult.stdout || validationResult.stderr,
      exitCode: validationResult.status
    };
    
    // Only continue if validation passed (unless testing failure path)
    if (results.validation.success || options.continueOnError) {
      // Step 2: Scoring (use first term if available)
      if (termsData.terms && termsData.terms.length > 0) {
        const firstSlug = termsData.terms[0].slug;
        const scoringResult = spawnSync('node', [SCORE_SCRIPT, firstSlug], {
          cwd: tmpDir,
          encoding: 'utf8',
          stdio: 'pipe',
          env: {
            ...process.env,
            TARGET_SLUG: 'non-existent-slug'
          }
        });
        results.scoring = {
          success: scoringResult.status === 0,
          output: scoringResult.stdout || scoringResult.stderr,
          exitCode: scoringResult.status
        };
      }
      
      // Step 3: Export
      const exportArgs = [EXPORT_SCRIPT, '--out', tmpOutputPath];
      if (options.checkMode) {
        exportArgs.push('--check');
      }
      const exportResult = spawnSync('node', exportArgs, {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      results.export = {
        success: exportResult.status === 0,
        output: exportResult.stdout || exportResult.stderr,
        exitCode: exportResult.status
      };
      
      // Read exported file if it exists
      if (fs.existsSync(tmpOutputPath)) {
        try {
          results.export.data = JSON.parse(fs.readFileSync(tmpOutputPath, 'utf8'));
        } catch (e) {
          results.export.parseError = e.message;
        }
      }
    }
    
    return results;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Integration test: Valid minimal term passes all stages
test('integration: valid minimal term passes full pipeline', () => {
  const termsData = {
    terms: [{
      slug: 'test-term',
      term: 'Test Term',
      definition: 'x'.repeat(80)
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.scoring.success, true, 'Scoring should pass');
  assert.equal(results.export.success, true, 'Export should pass');
  
  // Verify export contains the term
  assert.ok(results.export.data, 'Should have exported data');
  assert.ok(results.export.data.terms, 'Should have terms array');
  assert.equal(results.export.data.terms.length, 1, 'Should have one term');
  assert.equal(results.export.data.terms[0].slug, 'test-term', 'Should match input');
});

// Integration test: Invalid term fails validation and stops pipeline
test('integration: invalid term fails validation', () => {
  const termsData = {
    terms: [{
      slug: 'invalid',
      term: 'Test',
      definition: 'too short' // Less than 80 chars
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /minLength|80/i, 'Should mention length requirement');
});

// Integration test: Duplicate slugs fail validation
test('integration: duplicate slugs fail validation', () => {
  const termsData = {
    terms: [
      { slug: 'same', term: 'First', definition: 'x'.repeat(80) },
      { slug: 'same', term: 'Second', definition: 'x'.repeat(80) }
    ]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /duplicate/i, 'Should mention duplicates');
});

// Integration test: Duplicate normalized names fail validation
test('integration: duplicate names fail validation', () => {
  const termsData = {
    terms: [
      { slug: 'term-1', term: 'FOSS', definition: 'x'.repeat(80) },
      { slug: 'term-2', term: 'foss', definition: 'x'.repeat(80) }
    ]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /conflict/i, 'Should mention conflict');
});

// Integration test: Term with all scoring components
test('integration: fully populated term scores correctly', () => {
  const termsData = {
    terms: [{
      slug: 'full-term',
      term: 'Full Term',
      definition: 'x'.repeat(80),
      explanation: 'x'.repeat(50),
      humor: 'x'.repeat(150),
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      see_also: ['ref1', 'ref2', 'ref3', 'ref4'],
      aliases: ['Alias 1', 'Alias 2'],
      controversy_level: 'high'
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.scoring.success, true, 'Scoring should pass');
  assert.match(results.scoring.output, /SCORE:(90|100)/, 'Should get high score');
  assert.match(results.scoring.output, /💯|Perfectionist/i, 'Should get Perfectionist badge');
});

// Integration test: Empty terms array
test('integration: empty terms array passes but exports nothing', () => {
  const termsData = { terms: [] };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
  
  if (results.export.data) {
    assert.equal(results.export.data.terms.length, 0, 'Should have no terms');
  }
});

// Integration test: Multiple valid terms
test('integration: multiple valid terms all exported', () => {
  const termsData = {
    terms: [
      { slug: 'term-a', term: 'Term A', definition: 'x'.repeat(80) },
      { slug: 'term-b', term: 'Term B', definition: 'x'.repeat(80) },
      { slug: 'term-c', term: 'Term C', definition: 'x'.repeat(80) }
    ]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
  
  if (results.export.data) {
    assert.equal(results.export.data.terms.length, 3, 'Should export all terms');
    const slugs = results.export.data.terms.map(t => t.slug);
    assert.ok(slugs.includes('term-a'), 'Should include term-a');
    assert.ok(slugs.includes('term-b'), 'Should include term-b');
    assert.ok(slugs.includes('term-c'), 'Should include term-c');
  }
});

// Integration test: Invalid JSON structure
test('integration: malformed YAML structure fails', () => {
  const termsData = { wrong_key: [] }; // Missing 'terms' key
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /required|terms/i, 'Should mention missing terms');
});

// Integration test: Additional properties in term
test('integration: additional properties fail validation', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test',
      definition: 'x'.repeat(80),
      extra_field: 'invalid'
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /additional|unexpected/i, 'Should mention additional properties');
});

// Integration test: Invalid slug format
test('integration: invalid slug format fails validation', () => {
  const termsData = {
    terms: [{
      slug: 'Invalid_Slug',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /pattern/i, 'Should mention pattern violation');
});

// Integration test: Missing required fields
test('integration: missing slug fails validation', () => {
  const termsData = {
    terms: [{
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /required.*slug/i, 'Should mention missing slug');
});

test('integration: missing term name fails validation', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      definition: 'x'.repeat(80)
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /required.*term/i, 'Should mention missing term');
});

test('integration: missing definition fails validation', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test'
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /required.*definition/i, 'Should mention missing definition');
});

// Integration test: Invalid controversy level
test('integration: invalid controversy level fails validation', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test',
      definition: 'x'.repeat(80),
      controversy_level: 'extreme'
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /enum|controversy/i, 'Should mention enum violation');
});

// Integration test: Very large dataset
test('integration: large dataset (50 terms) processes successfully', () => {
  const terms = [];
  for (let i = 0; i < 50; i++) {
    terms.push({
      slug: `term-${i}`,
      term: `Term ${i}`,
      definition: `Definition ${i} - ${'x'.repeat(70)}`,
      tags: [`tag${i % 5}`],
      see_also: i > 0 ? [`term-${i - 1}`] : []
    });
  }
  
  const termsData = { terms };
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
  
  if (results.export.data) {
    assert.equal(results.export.data.terms.length, 50, 'Should export all 50 terms');
  }
});

// Integration test: Unicode handling throughout pipeline
test('integration: Unicode terms handled correctly', () => {
  const termsData = {
    terms: [{
      slug: 'unicode-term',
      term: 'Ελληνικά (Greek)',
      definition: 'Definition with Ελληνικά Greek characters and emoji 🚀 that is long enough for validation',
      humor: '😂 Funny Unicode 中文 humor'
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
  
  if (results.export.data) {
    assert.equal(results.export.data.terms[0].term, 'Ελληνικά (Greek)', 'Should preserve Unicode');
  }
});

// Integration test: Cross-references to non-existent terms (allowed)
test('integration: cross-references to non-existent terms allowed', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test',
      definition: 'x'.repeat(80),
      see_also: ['non-existent-term', 'another-missing']
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  // Cross-reference validation is not enforced in current implementation
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
});

// Integration test: Aliases normalization and duplicate detection
test('integration: aliases properly normalized and checked for duplicates', () => {
  const termsData = {
    terms: [
      {
        slug: 'term-1',
        term: 'Term 1',
        definition: 'x'.repeat(80),
        aliases: ['Open-Source', 'Open Source']
      }
    ]
  };
  
  const results = runFullPipeline(termsData);
  
  // Both aliases normalize to the same value, should be detected
  assert.equal(results.validation.success, false, 'Should detect duplicate aliases within same term');
  assert.match(results.validation.output, /conflict/i, 'Should mention conflict');
});

// Integration test: Case sensitivity in slugs
test('integration: slug case sensitivity enforced', () => {
  const termsData = {
    terms: [{
      slug: 'Test-Slug',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Should reject uppercase in slug');
  assert.match(results.validation.output, /pattern|lowercase/i, 'Should mention pattern violation');
});

// Integration test: Boundary value for definition length
test('integration: definition exactly 80 chars passes all stages', () => {
  const termsData = {
    terms: [{
      slug: 'boundary-test',
      term: 'Boundary Test',
      definition: 'x'.repeat(80)
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
});

test('integration: definition with 79 chars fails validation', () => {
  const termsData = {
    terms: [{
      slug: 'boundary-test',
      term: 'Boundary Test',
      definition: 'x'.repeat(79)
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, false, 'Validation should fail');
  assert.match(results.validation.output, /80|minLength/i, 'Should mention length requirement');
});

// Integration test: Empty optional fields handled correctly
test('integration: empty arrays in optional fields handled', () => {
  const termsData = {
    terms: [{
      slug: 'empty-fields',
      term: 'Empty Fields',
      definition: 'x'.repeat(80),
      tags: [],
      see_also: [],
      aliases: []
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
});

// Integration test: Scoring non-existent term
test('integration: scoring non-existent term fails gracefully', () => {
  const termsData = {
    terms: [{
      slug: 'exists',
      term: 'Exists',
      definition: 'x'.repeat(80)
    }]
  };
  
  const tmpDir = fs.mkdtempSync('/tmp/score-test-');
  const tmpTermsPath = path.join(tmpDir, 'terms.yaml');
  const tmpSchemaPath = path.join(tmpDir, 'schema.json');
  
  fs.writeFileSync(tmpTermsPath, yaml.dump(termsData));
  fs.copyFileSync(SCHEMA_PATH, tmpSchemaPath);
  
  try {
    const result = spawnSync('node', [SCORE_SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, TARGET_SLUG: 'non-existent' }
    });
    
    assert.equal(result.status, 1, 'Should exit with error code');
    assert.match(result.stderr || result.stdout, /not found|No term found/i, 
      'Should mention term not found');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// Integration test: Export with metadata
test('integration: exported JSON includes metadata', () => {
  const termsData = {
    terms: [{
      slug: 'meta-test',
      term: 'Meta Test',
      definition: 'x'.repeat(80)
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
  
  if (results.export.data) {
    assert.ok(results.export.data.version, 'Should have version');
    assert.ok(results.export.data.generated_at, 'Should have timestamp');
    assert.ok(results.export.data.terms_count !== undefined, 'Should have term count');
    assert.equal(results.export.data.terms_count, 1, 'Should have count of 1');
  }
});

// Integration test: Terms sorted by slug in export
test('integration: exported terms are sorted by slug', () => {
  const termsData = {
    terms: [
      { slug: 'zebra', term: 'Zebra', definition: 'x'.repeat(80) },
      { slug: 'alpha', term: 'Alpha', definition: 'x'.repeat(80) },
      { slug: 'middle', term: 'Middle', definition: 'x'.repeat(80) }
    ]
  };
  
  const results = runFullPipeline(termsData);
  
  if (results.export.data && results.export.data.terms) {
    const slugs = results.export.data.terms.map(t => t.slug);
    assert.deepEqual(slugs, ['alpha', 'middle', 'zebra'], 'Should be sorted alphabetically');
  }
});

// Integration test: Pipeline handles special characters in text
test('integration: special characters in text preserved', () => {
  const termsData = {
    terms: [{
      slug: 'special-chars',
      term: 'Special & Chars < > "quotes"',
      definition: 'Definition with & < > "quotes" and other special chars: @#$%^&*() that needs 80 chars total',
      humor: 'Humor with \'single\' and "double" quotes'
    }]
  };
  
  const results = runFullPipeline(termsData);
  
  assert.equal(results.validation.success, true, 'Validation should pass');
  assert.equal(results.export.success, true, 'Export should pass');
  
  if (results.export.data) {
    const term = results.export.data.terms[0];
    assert.ok(term.term.includes('&'), 'Should preserve ampersand');
    assert.ok(term.term.includes('<'), 'Should preserve less-than');
    assert.ok(term.term.includes('>'), 'Should preserve greater-than');
  }
});
