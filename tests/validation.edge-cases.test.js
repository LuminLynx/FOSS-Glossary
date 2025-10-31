const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SCHEMA_PATH = path.join(__dirname, '..', 'schema.json');
const VALIDATE_SCRIPT = path.join(__dirname, '..', 'scripts', 'validateTerms.js');

function runValidation(termsData, baseTermsData = null) {
  const tmpDir = fs.mkdtempSync('/tmp/validate-edge-test-');
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

// Edge case: Empty terms array
test('validation edge case: empty terms array passes', () => {
  const termsData = { terms: [] };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
  assert.match(result.output, /0 terms are valid/);
});

// Edge case: Terms with minimum valid definition length (exactly 80 chars)
test('validation edge case: definition with exactly 80 characters', () => {
  const def80 = 'x'.repeat(80);
  const termsData = {
    terms: [{
      slug: 'test-term',
      term: 'Test Term',
      definition: def80
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Definition with 79 characters (should fail)
test('validation edge case: definition with 79 characters fails', () => {
  const def79 = 'x'.repeat(79);
  const termsData = {
    terms: [{
      slug: 'test-term',
      term: 'Test Term',
      definition: def79
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /minLength|at least 80/i);
});

// Edge case: Slug with minimum valid length (3 chars)
test('validation edge case: slug with exactly 3 characters', () => {
  const termsData = {
    terms: [{
      slug: 'abc',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Slug with 2 characters (should fail)
test('validation edge case: slug with 2 characters fails', () => {
  const termsData = {
    terms: [{
      slug: 'ab',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /minLength|pattern/i);
});

// Edge case: Slug with maximum valid length (48 chars)
test('validation edge case: slug with exactly 48 characters', () => {
  const slug48 = 'a'.repeat(48);
  const termsData = {
    terms: [{
      slug: slug48,
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Slug with 49 characters (should fail)
test('validation edge case: slug with 49 characters fails', () => {
  const slug49 = 'a'.repeat(49);
  const termsData = {
    terms: [{
      slug: slug49,
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /maxLength|pattern|more than 48/i);
});

// Edge case: Multiple duplicate slugs in same file
test('validation edge case: multiple duplicate slugs detected', () => {
  const termsData = {
    terms: [
      { slug: 'dup', term: 'First', definition: 'x'.repeat(80) },
      { slug: 'dup', term: 'Second', definition: 'x'.repeat(80) },
      { slug: 'dup', term: 'Third', definition: 'x'.repeat(80) }
    ]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /duplicates/);
});

// Edge case: Term name conflicts with alias
test('validation edge case: term name conflicts with another term alias', () => {
  const termsData = {
    terms: [
      { 
        slug: 'term-one',
        term: 'Shared Name',
        definition: 'x'.repeat(80)
      },
      { 
        slug: 'term-two',
        term: 'Different',
        definition: 'x'.repeat(80),
        aliases: ['Shared Name']
      }
    ]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /conflicts with/);
});

// Edge case: Alias conflicts with another alias
test('validation edge case: alias conflicts with another alias', () => {
  const termsData = {
    terms: [
      { 
        slug: 'term-one',
        term: 'First',
        definition: 'x'.repeat(80),
        aliases: ['Shared Alias']
      },
      { 
        slug: 'term-two',
        term: 'Second',
        definition: 'x'.repeat(80),
        aliases: ['Shared Alias']
      }
    ]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /conflicts with/);
});

// Edge case: Case-insensitive duplicate detection
test('validation edge case: case variations are detected as duplicates', () => {
  const termsData = {
    terms: [
      { slug: 'term-one', term: 'FOSS', definition: 'x'.repeat(80) },
      { slug: 'term-two', term: 'foss', definition: 'x'.repeat(80) }
    ]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /conflicts with/);
});

// Edge case: Hyphen vs underscore vs space normalization
test('validation edge case: punctuation variations detected as duplicates', () => {
  const termsData = {
    terms: [
      { slug: 'term-one', term: 'Open-Source', definition: 'x'.repeat(80) },
      { slug: 'term-two', term: 'Open Source', definition: 'x'.repeat(80) }
    ]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /conflicts with/);
});

// Edge case: Leading/trailing whitespace in term names
test('validation edge case: whitespace variations detected as duplicates', () => {
  const termsData = {
    terms: [
      { slug: 'term-one', term: '  FOSS  ', definition: 'x'.repeat(80) },
      { slug: 'term-two', term: 'FOSS', definition: 'x'.repeat(80) }
    ]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /conflicts with/);
});

// Edge case: Empty string values in optional fields
test('validation edge case: empty arrays in optional fields', () => {
  const termsData = {
    terms: [{
      slug: 'test-term',
      term: 'Test',
      definition: 'x'.repeat(80),
      tags: [],
      see_also: [],
      aliases: []
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Null values in required fields
test('validation edge case: null in required field fails', () => {
  const termsData = {
    terms: [{
      slug: 'test-term',
      term: null,
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
});

// Edge case: Missing terms property
test('validation edge case: missing terms property fails', () => {
  const termsData = {};
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /required|terms/i);
});

// Edge case: Terms is not an array
test('validation edge case: terms as object instead of array fails', () => {
  const termsData = {
    terms: { slug: 'invalid', term: 'Invalid', definition: 'x'.repeat(80) }
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /array/i);
});

// Edge case: Additional properties in term object
test('validation edge case: additional properties fail validation', () => {
  const termsData = {
    terms: [{
      slug: 'test-term',
      term: 'Test',
      definition: 'x'.repeat(80),
      invalid_field: 'should fail'
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /additional|unexpected/i);
});

// Edge case: Invalid controversy level
test('validation edge case: invalid controversy level fails', () => {
  const termsData = {
    terms: [{
      slug: 'test-term',
      term: 'Test',
      definition: 'x'.repeat(80),
      controversy_level: 'extreme'
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /enum|controversy/i);
});

// Edge case: Valid controversy levels
test('validation edge case: all valid controversy levels pass', () => {
  const levels = ['low', 'medium', 'high'];
  levels.forEach(level => {
    const termsData = {
      terms: [{
        slug: `test-${level}`,
        term: 'Test',
        definition: 'x'.repeat(80),
        controversy_level: level
      }]
    };
    const result = runValidation(termsData);
    assert.equal(result.success, true, `Level '${level}' should be valid`);
  });
});

// Edge case: Unicode characters in various fields
test('validation edge case: Unicode characters in term names', () => {
  const termsData = {
    terms: [{
      slug: 'unicode-term',
      term: 'Ελληνικά (Greek)',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Emoji in fields
test('validation edge case: emoji in humor field', () => {
  const termsData = {
    terms: [{
      slug: 'emoji-term',
      term: 'Test',
      definition: 'x'.repeat(80),
      humor: '😂 This is hilarious! 🚀'
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Very long definition (stress test)
test('validation edge case: very long definition (10000 chars)', () => {
  const termsData = {
    terms: [{
      slug: 'long-def',
      term: 'Test',
      definition: 'x'.repeat(10000)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Many tags (array edge case)
test('validation edge case: term with many tags', () => {
  const manyTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
  const termsData = {
    terms: [{
      slug: 'many-tags',
      term: 'Test',
      definition: 'x'.repeat(80),
      tags: manyTags
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Circular references in see_also
test('validation edge case: circular references in see_also allowed', () => {
  const termsData = {
    terms: [
      {
        slug: 'term-a',
        term: 'Term A',
        definition: 'x'.repeat(80),
        see_also: ['term-b']
      },
      {
        slug: 'term-b',
        term: 'Term B',
        definition: 'x'.repeat(80),
        see_also: ['term-a']
      }
    ]
  };
  const result = runValidation(termsData);
  // Circular refs should be allowed - schema doesn't prevent them
  assert.equal(result.success, true);
});

// Edge case: Self-reference in see_also
test('validation edge case: self-reference in see_also allowed', () => {
  const termsData = {
    terms: [{
      slug: 'self-ref',
      term: 'Self Reference',
      definition: 'x'.repeat(80),
      see_also: ['self-ref']
    }]
  };
  const result = runValidation(termsData);
  // Self-refs should be allowed - schema doesn't prevent them
  assert.equal(result.success, true);
});

// Edge case: Slug change detection with aliases
test('validation edge case: slug change detected through alias', () => {
  const baseTerms = {
    terms: [{
      slug: 'original',
      term: 'Original',
      definition: 'x'.repeat(80),
      aliases: ['Alternative Name']
    }]
  };
  
  const newTerms = {
    terms: [{
      slug: 'changed',
      term: 'Original',
      definition: 'x'.repeat(80),
      aliases: ['Alternative Name']
    }]
  };
  
  const result = runValidation(newTerms, baseTerms);
  assert.equal(result.success, false);
  assert.match(result.output, /Slug.*changed from/);
});

// Edge case: Multiple slug changes in one validation
test('validation edge case: multiple slug changes detected', () => {
  const baseTerms = {
    terms: [
      { slug: 'orig-1', term: 'Term 1', definition: 'x'.repeat(80) },
      { slug: 'orig-2', term: 'Term 2', definition: 'x'.repeat(80) }
    ]
  };
  
  const newTerms = {
    terms: [
      { slug: 'changed-1', term: 'Term 1', definition: 'x'.repeat(80) },
      { slug: 'changed-2', term: 'Term 2', definition: 'x'.repeat(80) }
    ]
  };
  
  const result = runValidation(newTerms, baseTerms);
  assert.equal(result.success, false);
  // Should report both changes
  assert.match(result.output, /orig-1/);
  assert.match(result.output, /orig-2/);
});

// Edge case: Slug with numbers only
test('validation edge case: slug with only numbers', () => {
  const termsData = {
    terms: [{
      slug: '123',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Slug with mixed numbers and hyphens
test('validation edge case: slug with numbers and hyphens', () => {
  const termsData = {
    terms: [{
      slug: '2024-term-v2',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Invalid slug patterns
test('validation edge case: slug starting with hyphen fails', () => {
  const termsData = {
    terms: [{
      slug: '-invalid',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /pattern/i);
});

test('validation edge case: slug ending with hyphen fails', () => {
  const termsData = {
    terms: [{
      slug: 'invalid-',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /pattern/i);
});

test('validation edge case: slug with consecutive hyphens fails', () => {
  const termsData = {
    terms: [{
      slug: 'invalid--slug',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /pattern/i);
});

test('validation edge case: slug with uppercase fails', () => {
  const termsData = {
    terms: [{
      slug: 'Invalid-Slug',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /pattern/i);
});

test('validation edge case: slug with underscore fails', () => {
  const termsData = {
    terms: [{
      slug: 'invalid_slug',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /pattern/i);
});

test('validation edge case: slug with space fails', () => {
  const termsData = {
    terms: [{
      slug: 'invalid slug',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /pattern/i);
});

// Edge case: Valid redirects mapping
test('validation edge case: valid redirects mapping passes', () => {
  const termsData = {
    terms: [
      { slug: 'current-slug', term: 'Current Term', definition: 'x'.repeat(80) }
    ],
    redirects: {
      'old-slug': 'current-slug',
      'another-old': 'current-slug'
    }
  };
  const result = runValidation(termsData);
  assert.equal(result.success, true);
});

// Edge case: Redirect source conflicts with existing term
test('validation edge case: redirect source conflicts with existing term', () => {
  const termsData = {
    terms: [
      { slug: 'existing-term', term: 'Existing', definition: 'x'.repeat(80) }
    ],
    redirects: {
      'existing-term': 'another-term'
    }
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /Redirect source 'existing-term' conflicts with an active term slug/);
});

// Edge case: Redirect target does not exist
test('validation edge case: redirect target does not exist', () => {
  const termsData = {
    terms: [
      { slug: 'existing-term', term: 'Existing', definition: 'x'.repeat(80) }
    ],
    redirects: {
      'old-slug': 'non-existent-target'
    }
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /Redirect target 'non-existent-target' does not exist in terms/);
});

// Edge case: Multiple redirect errors
test('validation edge case: multiple redirect errors detected', () => {
  const termsData = {
    terms: [
      { slug: 'term-a', term: 'Term A', definition: 'x'.repeat(80) }
    ],
    redirects: {
      'term-a': 'term-b',  // conflicts with existing term
      'old-slug': 'non-existent'  // target doesn't exist
    }
  };
  const result = runValidation(termsData);
  assert.equal(result.success, false);
  assert.match(result.output, /Redirect source 'term-a' conflicts/);
  assert.match(result.output, /Redirect target 'non-existent' does not exist/);
});
