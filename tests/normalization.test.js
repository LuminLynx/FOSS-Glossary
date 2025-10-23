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
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition',
  });
  
  assert.deepEqual(result, {
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition',
  });
});

test('normalizeTerm: includes optional fields when present', () => {
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition',
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
    definition: 'Test definition',
    explanation: 'Test explanation',
    humor: 'Test humor',
    tags: ['tag1', 'tag2'],
    see_also: ['ref1', 'ref2'],
    aliases: ['alias1'],
    controversy_level: 'high',
  });
});

test('normalizeTerm: omits empty optional fields', () => {
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition',
    explanation: '  ',
    humor: '',
    tags: [],
    see_also: null,
    aliases: ['  '],
  });
  
  assert.deepEqual(result, {
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition',
  });
});

test('normalizeTerm: normalizes array fields correctly', () => {
  const result = normalizeTerm({
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition',
    tags: 'single-tag',
    see_also: ['ref1', '  ', null, 'ref2'],
  });
  
  assert.deepEqual(result, {
    slug: 'test-slug',
    term: 'Test Term',
    definition: 'Test definition',
    tags: ['single-tag'],
    see_also: ['ref1', 'ref2'],
  });
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
