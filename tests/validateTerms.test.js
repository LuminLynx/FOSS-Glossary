const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const TERMS_PATH = path.join(__dirname, '..', 'terms.yaml');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.json');
const VALIDATE_SCRIPT = path.join(__dirname, '..', 'scripts', 'validateTerms.js');

function runValidation(termsData, baseTermsData = null) {
  const tmpDir = fs.mkdtempSync('/tmp/validate-test-');
  const tmpTermsPath = path.join(tmpDir, 'terms.yaml');
  const tmpSchemaPath = path.join(tmpDir, 'schema.json');
  
  fs.writeFileSync(tmpTermsPath, yaml.dump(termsData));
  fs.copyFileSync(SCHEMA_PATH, tmpSchemaPath);
  
  try {
    const args = [VALIDATE_SCRIPT];
    
    if (baseTermsData) {
      const baseTermsPath = path.join(tmpDir, 'base-terms.yaml');
      fs.writeFileSync(baseTermsPath, yaml.dump(baseTermsData));
      args.push('--base', baseTermsPath);
    }
    
    const result = spawnSync('node', args, { 
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (result.status === 0) {
      return { success: true, output: result.stdout };
    } else {
      return { success: false, output: result.stdout || result.stderr };
    }
  } catch (error) {
    return { success: false, output: error.message };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

test('validateTerms: detects duplicate slugs efficiently', () => {
  const termsData = {
    terms: [
      {
        slug: 'test-term',
        term: 'Test Term',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
      },
      {
        slug: 'test-term', // Duplicate slug
        term: 'Another Term',
        definition: 'Another test definition that is long enough to pass validation requirements. More text.',
      },
    ],
  };
  
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /slug 'test-term' duplicates/);
});

test('validateTerms: detects duplicate normalized names efficiently', () => {
  const termsData = {
    terms: [
      {
        slug: 'term-one',
        term: 'Test-Term',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
      },
      {
        slug: 'term-two',
        term: 'Test Term', // Normalizes to same as 'Test-Term'
        definition: 'Another test definition that is long enough to pass validation requirements. More text.',
      },
    ],
  };
  
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /conflicts with/);
});

test('validateTerms: detects duplicate aliases efficiently', () => {
  const termsData = {
    terms: [
      {
        slug: 'term-one',
        term: 'First Term',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
        aliases: ['Common Alias'],
      },
      {
        slug: 'term-two',
        term: 'Second Term',
        definition: 'Another test definition that is long enough to pass validation requirements. More text.',
        aliases: ['Common Alias'], // Duplicate alias
      },
    ],
  };

  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /alias 'Common Alias'/);
});

test('validateTerms: handles large datasets efficiently (100 terms)', () => {
  const terms = [];
  for (let i = 0; i < 100; i++) {
    terms.push({
      slug: `term-${i}`,
      term: `Term ${i}`,
      definition: `Definition ${i} - This is a comprehensive definition that is long enough to satisfy the schema validation requirement of at least eighty characters.`,
      aliases: [`Alias ${i}A`, `Alias ${i}B`],
    });
  }
  
  const termsData = { terms };
  const startTime = Date.now();
  const result = runValidation(termsData);
  const duration = Date.now() - startTime;
  
  if (!result.success) {
    console.log('Validation failed with output:', result.output);
  }
  assert.equal(result.success, true);
  assert.match(result.output, /100 terms are valid/);
  // Should complete in reasonable time (< 5 seconds)
  assert.ok(duration < 5000, `Validation took ${duration}ms, expected < 5000ms`);
});

test('validateTerms: detects slug changes with base terms efficiently', () => {
  const baseTerms = {
    terms: [
      {
        slug: 'original-slug',
        term: 'Legacy Term Name',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
        aliases: ['Shared Alias'],
      },
    ],
  };

  const newTerms = {
    terms: [
      {
        slug: 'changed-slug', // Slug changed but alias still matches base entry
        term: 'Rebranded Term Name',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
        aliases: ['Shared Alias'],
      },
    ],
  };

  const result = runValidation(newTerms, baseTerms);
  assert.equal(result.success, false);
  assert.match(result.output, /Slug for term 'Legacy Term Name' changed from 'original-slug' to 'changed-slug'/);
  assert.match(result.output, /label 'Shared Alias'/);
});

test('validateTerms: handles base comparison with many terms efficiently', () => {
  const baseTerms = [];
  const newTerms = [];
  
  // Create 50 base terms
  for (let i = 0; i < 50; i++) {
    baseTerms.push({
      slug: `base-term-${i}`,
      term: `Base Term ${i}`,
      definition: `Base definition ${i} - needs to be at least eighty characters long for validation.`,
    });
  }
  
  // Create 50 new terms (same slugs, same terms - no changes)
  for (let i = 0; i < 50; i++) {
    newTerms.push({
      slug: `base-term-${i}`,
      term: `Base Term ${i}`,
      definition: `Updated definition ${i} - needs to be at least eighty characters long for validation.`,
    });
  }
  
  const startTime = Date.now();
  const result = runValidation({ terms: newTerms }, { terms: baseTerms });
  const duration = Date.now() - startTime;
  
  assert.equal(result.success, true);
  // Should complete efficiently even with base comparison
  assert.ok(duration < 5000, `Base comparison took ${duration}ms, expected < 5000ms`);
});

test('validateTerms: detects duplicates with Unicode normalization - NFC vs NFD', () => {
  const termsData = {
    terms: [
      {
        slug: 'term-one',
        term: 'café', // NFC form (precomposed é)
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
      },
      {
        slug: 'term-two',
        term: 'cafe\u0301', // NFD form (e + combining accent)
        definition: 'Another test definition that is long enough to pass validation requirements. More text.',
      },
    ],
  };
  
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /conflicts with/);
});

test('validateTerms: detects duplicate aliases with Unicode normalization', () => {
  const termsData = {
    terms: [
      {
        slug: 'term-one',
        term: 'First Term',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
        aliases: ['naïve'], // NFC form
      },
      {
        slug: 'term-two',
        term: 'Second Term',
        definition: 'Another test definition that is long enough to pass validation requirements. More text.',
        aliases: ['nai\u0308ve'], // NFD form
      },
    ],
  };
  
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /conflicts with/);
});

test('validateTerms: allows different terms with similar Unicode characters', () => {
  const termsData = {
    terms: [
      {
        slug: 'term-resume',
        term: 'résumé',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
      },
      {
        slug: 'term-resume-action',
        term: 'resume', // Different word without accents
        definition: 'Another test definition that is long enough to pass validation requirements. More text.',
      },
    ],
  };
  
  const result = runValidation(termsData);
  // 'résumé' normalizes to 'rsum' (accents removed) and 'resume' stays 'resume', so they're different
  assert.equal(result.success, true);
});

test('validateTerms: produces user-friendly error for YAML parse error', () => {
  const tmpDir = fs.mkdtempSync('/tmp/validate-yaml-error-');
  const tmpTermsPath = path.join(tmpDir, 'terms.yaml');
  const tmpSchemaPath = path.join(tmpDir, 'schema.json');
  
  // Write invalid YAML with bad indentation
  const invalidYaml = `terms:
  - slug: test1
    term: "Test 1"
    definition: "A test definition that is long enough to pass validation requirements."
  - slug: test2
  term: "Bad indentation"
  definition: "This has incorrect indentation"`;
  
  fs.writeFileSync(tmpTermsPath, invalidYaml);
  fs.copyFileSync(SCHEMA_PATH, tmpSchemaPath);
  
  try {
    const result = spawnSync('node', [VALIDATE_SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    assert.equal(result.status, 1, 'Should exit with non-zero status');
    
    const output = result.stderr || result.stdout;
    assert.match(output, /Validation failed: YAML parse error/, 'Should indicate YAML parse error');
    assert.match(output, /Line:.*Column:/, 'Should show line and column');
    assert.match(output, /Context:/, 'Should show context');
    assert.match(output, /Suggested fix:/, 'Should provide suggested fix');
    
    // Check that validation-output.txt was created
    const validationOutputPath = path.join(tmpDir, 'validation-output.txt');
    assert.ok(fs.existsSync(validationOutputPath), 'Should create validation-output.txt');
    
    const validationOutput = fs.readFileSync(validationOutputPath, 'utf8');
    assert.match(validationOutput, /YAML parse error/, 'Output file should contain error details');
    assert.match(validationOutput, /Line:/, 'Output file should contain line number');
    assert.match(validationOutput, /Context:/, 'Output file should contain context');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('validateTerms: handles missing file gracefully', () => {
  const tmpDir = fs.mkdtempSync('/tmp/validate-missing-');
  const tmpSchemaPath = path.join(tmpDir, 'schema.json');
  fs.copyFileSync(SCHEMA_PATH, tmpSchemaPath);
  
  // Don't create terms.yaml - it's missing
  
  try {
    const result = spawnSync('node', [VALIDATE_SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    assert.equal(result.status, 1, 'Should exit with non-zero status');
    
    const output = result.stderr || result.stdout;
    assert.match(output, /Failed to read/, 'Should indicate file read error');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
