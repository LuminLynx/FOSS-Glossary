const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeString,
  normalizeArray,
  normalizeTerm,
  normalizeName,
} = require('../utils/normalization');

// Tests for normalizeString
test('normalizeString: returns undefined for null', () => {
  assert.equal(normalizeString(null), undefined);
});

test('normalizeString: returns undefined for undefined', () => {
  assert.equal(normalizeString(undefined), undefined);
});

test('normalizeString: returns undefined for empty string', () => {
  assert.equal(normalizeString(''), undefined);
});

test('normalizeString: returns undefined for whitespace-only string', () => {
  assert.equal(normalizeString('   '), undefined);
});

test('normalizeString: trims and returns non-empty string', () => {
  assert.equal(normalizeString('  hello  '), '  hello  ');
});

test('normalizeString: converts non-string values to strings', () => {
  assert.equal(normalizeString(123), '123');
  assert.equal(normalizeString(true), 'true');
});

// Tests for normalizeArray
test('normalizeArray: returns undefined for null', () => {
  assert.equal(normalizeArray(null), undefined);
});

test('normalizeArray: returns undefined for undefined', () => {
  assert.equal(normalizeArray(undefined), undefined);
});

test('normalizeArray: converts single value to array', () => {
  assert.deepEqual(normalizeArray('single'), ['single']);
});

test('normalizeArray: filters out empty and whitespace entries', () => {
  assert.deepEqual(normalizeArray(['a', '', '   ', 'b']), ['a', 'b']);
});

test('normalizeArray: filters out null and undefined entries', () => {
  assert.deepEqual(normalizeArray(['a', null, undefined, 'b']), ['a', 'b']);
});

test('normalizeArray: returns undefined for empty result', () => {
  assert.equal(normalizeArray(['']), undefined);
  assert.equal(normalizeArray(['  ']), undefined);
});

test('normalizeArray: handles mixed array types', () => {
  assert.deepEqual(normalizeArray([1, 'text', null, '  ']), ['1', 'text']);
});

// Tests for normalizeTerm
test('normalizeTerm: throws error for non-object', () => {
  assert.throws(() => normalizeTerm(null), /Each term must be an object/);
  assert.throws(() => normalizeTerm('string'), /Each term must be an object/);
  assert.throws(() => normalizeTerm(123), /Each term must be an object/);
});

test('normalizeTerm: throws error for missing required fields', () => {
  assert.throws(() => normalizeTerm({}), /Terms require slug, term, and definition/);
  assert.throws(() => normalizeTerm({ slug: 'test' }), /Terms require slug, term, and definition/);
  assert.throws(() => normalizeTerm({ slug: 'test', term: 'Test' }), /Terms require slug, term, and definition/);
});

test('normalizeTerm: returns minimal term with only required fields', () => {
  const definition = 'Test definition that meets the minimum length requirement of 80 characters for validation';
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition,
  });
  
  assert.deepEqual(result, {
    slug: 'test-slug',
    term: 'Test Term',
    definition,
  });
});

test('normalizeTerm: includes optional fields when present', () => {
  const definition = 'Test definition that meets the minimum length requirement of 80 characters for validation';
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition,
    explanation: 'Test explanation',
    humor: 'Test humor',
    tags: ['tag1', 'tag2'],
    see_also: ['ref1', 'ref2'],
    aliases: ['alias1'],
    controversy_level: 'high',
  });
  
  assert.deepEqual(result, {
    slug: 'test-slug',
    term: 'Test Term',
    definition,
    explanation: 'Test explanation',
    humor: 'Test humor',
    tags: ['tag1', 'tag2'],
    see_also: ['ref1', 'ref2'],
    aliases: ['alias1'],
    controversy_level: 'high',
  });
});

test('normalizeTerm: omits empty optional fields', () => {
  const definition = 'Test definition that meets the minimum length requirement of 80 characters for validation';
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition,
    explanation: '  ',
    humor: '',
    tags: [],
    see_also: null,
    aliases: ['  '],
  });
  
  assert.deepEqual(result, {
    slug: 'test-slug',
    term: 'Test Term',
    definition,
  });
});

test('normalizeTerm: normalizes array fields correctly', () => {
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    tags: 'single-tag',
    see_also: ['ref1', '  ', null, 'ref2'],
  });
  
  assert.deepEqual(result, {
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    tags: ['single-tag'],
    see_also: ['ref1', 'ref2'],
  });
});

// Tests for slug format validation
test('normalizeTerm: validates slug format - rejects uppercase', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'Test-Slug',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    }),
    /Slug 'Test-Slug' must contain only lowercase letters, numbers, and hyphens/
  );
});

test('normalizeTerm: validates slug format - rejects special characters', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'test_slug',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    }),
    /must contain only lowercase letters, numbers, and hyphens/
  );
});

test('normalizeTerm: validates slug format - rejects spaces', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'test slug',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    }),
    /must contain only lowercase letters, numbers, and hyphens/
  );
});

test('normalizeTerm: validates slug format - rejects leading hyphen', () => {
  assert.throws(
    () => normalizeTerm({
      slug: '-test-slug',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    }),
    /must contain only lowercase letters, numbers, and hyphens/
  );
});

test('normalizeTerm: validates slug format - rejects trailing hyphen', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'test-slug-',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    }),
    /must contain only lowercase letters, numbers, and hyphens/
  );
});

test('normalizeTerm: validates slug format - rejects consecutive hyphens', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'test--slug',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    }),
    /must contain only lowercase letters, numbers, and hyphens/
  );
});

test('normalizeTerm: validates slug format - accepts valid slug with numbers', () => {
  const result = normalizeTerm({
    slug: 'test-slug-123',
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
  });
  
  assert.equal(result.slug, 'test-slug-123');
});

test('normalizeTerm: validates slug format - accepts valid slug without hyphens', () => {
  const result = normalizeTerm({
    slug: 'testslug',
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
  });
  
  assert.equal(result.slug, 'testslug');
});

// Tests for slug length validation
test('normalizeTerm: validates slug length - rejects slug shorter than 3 characters', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'ab',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    }),
    /Slug 'ab' must be at least 3 characters long/
  );
});

test('normalizeTerm: validates slug length - accepts slug with exactly 3 characters', () => {
  const result = normalizeTerm({
    slug: 'abc',
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
  });
  
  assert.equal(result.slug, 'abc');
});

test('normalizeTerm: validates slug length - rejects slug longer than 48 characters', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'this-is-a-very-long-slug-that-exceeds-the-maximum-length-limit',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    }),
    /Slug 'this-is-a-very-long-slug-that-exceeds-the-maximum-length-limit' must be at most 48 characters long/
  );
});

test('normalizeTerm: validates slug length - accepts slug with exactly 48 characters', () => {
  const slug48 = 'a'.repeat(48);
  const result = normalizeTerm({
    slug: slug48,
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
  });
  
  assert.equal(result.slug, slug48);
});

// Tests for definition length validation
test('normalizeTerm: validates definition length - rejects definition shorter than 80 characters', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'test-slug',
      term: 'Test Term',
      definition: 'This is too short',
    }),
    /Definition for 'test-slug' must be at least 80 characters long/
  );
});

test('normalizeTerm: validates definition length - accepts definition with exactly 80 characters', () => {
  const def80 = 'x'.repeat(80);
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: def80,
  });
  
  assert.equal(result.definition, def80);
});

test('normalizeTerm: validates definition length - accepts definition longer than 80 characters', () => {
  const longDef = 'This is a very long definition that exceeds the minimum length requirement of 80 characters and should pass validation without any issues at all';
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: longDef,
  });
  
  assert.equal(result.definition, longDef);
});

// Tests for controversy_level validation
test('normalizeTerm: validates controversy_level - rejects invalid value', () => {
  assert.throws(
    () => normalizeTerm({
      slug: 'test-slug',
      term: 'Test Term',
      definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
      controversy_level: 'extreme',
    }),
    /Controversy level 'extreme' for 'test-slug' must be one of: low, medium, high/
  );
});

test('normalizeTerm: validates controversy_level - accepts "low"', () => {
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    controversy_level: 'low',
  });
  
  assert.equal(result.controversy_level, 'low');
});

test('normalizeTerm: validates controversy_level - accepts "medium"', () => {
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    controversy_level: 'medium',
  });
  
  assert.equal(result.controversy_level, 'medium');
});

test('normalizeTerm: validates controversy_level - accepts "high"', () => {
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition that meets the minimum length requirement of 80 characters for validation',
    controversy_level: 'high',
  });
  
  assert.equal(result.controversy_level, 'high');
});

// Tests for normalizeName
test('normalizeName: returns empty string for non-string', () => {
  assert.equal(normalizeName(null), '');
  assert.equal(normalizeName(undefined), '');
  assert.equal(normalizeName(123), '');
  assert.equal(normalizeName({}), '');
});

test('normalizeName: converts to lowercase', () => {
  assert.equal(normalizeName('HELLO'), 'hello');
  assert.equal(normalizeName('HeLLo'), 'hello');
});

test('normalizeName: removes non-alphanumeric characters', () => {
  assert.equal(normalizeName('hello-world'), 'helloworld');
  assert.equal(normalizeName('hello_world'), 'helloworld');
  assert.equal(normalizeName('hello world'), 'helloworld');
  assert.equal(normalizeName('hello@world!'), 'helloworld');
});

test('normalizeName: handles mixed case and special characters', () => {
  assert.equal(normalizeName('Hello-World_123!'), 'helloworld123');
  assert.equal(normalizeName('FOSS-Glossary'), 'fossglossary');
});

test('normalizeName: returns empty string for string with only special characters', () => {
  assert.equal(normalizeName('---'), '');
  assert.equal(normalizeName('!!!'), '');
  assert.equal(normalizeName('   '), '');
});
