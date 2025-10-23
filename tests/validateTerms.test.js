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
  assert.match(result.output, /conflicts with/);
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
        term: 'Test Term',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
      },
    ],
  };
  
  const newTerms = {
    terms: [
      {
        slug: 'changed-slug', // Slug changed but term name same
        term: 'Test Term',
        definition: 'A test definition that is long enough to pass validation requirements. Adding more text here.',
      },
    ],
  };
  
  const result = runValidation(newTerms, baseTerms);
  assert.equal(result.success, false);
  assert.match(result.output, /Slug for term .* changed from 'original-slug' to 'changed-slug'/);
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
