const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  getExistingLinks,
  buildTermLookup,
  validateSuggestions,
  applySuggestions,
  displaySuggestions,
  truncateForLogging,
} = require('../scripts/suggestLinks');

test('parseArgs: returns fix false by default', () => {
  const options = parseArgs([]);
  assert.equal(options.fix, false);
});

test('parseArgs: returns fix true when --fix flag is provided', () => {
  const options = parseArgs(['--fix']);
  assert.equal(options.fix, true);
});

test('parseArgs: handles multiple arguments with --fix', () => {
  const options = parseArgs(['--other', '--fix', '--another']);
  assert.equal(options.fix, true);
});

test('getExistingLinks: returns empty set for term without see_also', () => {
  const term = { slug: 'test', term: 'Test', definition: 'Test definition' };
  const links = getExistingLinks(term);
  assert.equal(links.size, 0);
});

test('getExistingLinks: returns set with normalized links', () => {
  const term = {
    slug: 'test',
    term: 'Test',
    definition: 'Test definition',
    see_also: ['Link One', 'Link Two'],
  };
  const links = getExistingLinks(term);
  assert.equal(links.size, 2);
  assert.ok(links.has('link one'));
  assert.ok(links.has('link two'));
});

test('getExistingLinks: handles empty see_also array', () => {
  const term = {
    slug: 'test',
    term: 'Test',
    definition: 'Test definition',
    see_also: [],
  };
  const links = getExistingLinks(term);
  assert.equal(links.size, 0);
});

test('buildTermLookup: maps terms by slug and name', () => {
  const terms = [
    { slug: 'test-a', term: 'Test A', definition: 'Definition A' },
    { slug: 'test-b', term: 'Test B', definition: 'Definition B' },
  ];
  const lookup = buildTermLookup(terms);
  assert.equal(lookup.get('test-a').term, 'Test A');
  assert.equal(lookup.get('test a').term, 'Test A');
  assert.equal(lookup.get('test-b').term, 'Test B');
  assert.equal(lookup.get('test b').term, 'Test B');
});

test('buildTermLookup: includes aliases in lookup', () => {
  const terms = [
    {
      slug: 'test-a',
      term: 'Test A',
      definition: 'Definition A',
      aliases: ['Alias One', 'Alias Two'],
    },
  ];
  const lookup = buildTermLookup(terms);
  assert.equal(lookup.get('alias one').term, 'Test A');
  assert.equal(lookup.get('alias two').term, 'Test A');
});

test('buildTermLookup: handles terms without aliases', () => {
  const terms = [{ slug: 'test-slug', term: 'Test Term', definition: 'Definition' }];
  const lookup = buildTermLookup(terms);
  assert.equal(lookup.size, 2); // slug + term name (different normalized values)
  assert.ok(lookup.has('test-slug'));
  assert.ok(lookup.has('test term'));
});

test('validateSuggestions: filters out invalid suggestions', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [
    { sourceTerm: 'Term A', targetTerm: 'Term B', reason: 'Related' },
    { sourceTerm: 'Non-existent', targetTerm: 'Term B', reason: 'Invalid' },
    { sourceTerm: 'Term A', targetTerm: 'Non-existent', reason: 'Invalid' },
  ];

  const valid = validateSuggestions(suggestions, terms);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].sourceTerm, 'Term A');
  assert.equal(valid[0].targetTerm, 'Term B');
});

test('validateSuggestions: filters out self-references', () => {
  const terms = [{ slug: 'term-a', term: 'Term A', definition: 'Definition A' }];
  const suggestions = [{ sourceTerm: 'Term A', targetTerm: 'Term A', reason: 'Self-reference' }];

  const valid = validateSuggestions(suggestions, terms);
  assert.equal(valid.length, 0);
});

test('validateSuggestions: filters out existing links', () => {
  const terms = [
    {
      slug: 'term-a',
      term: 'Term A',
      definition: 'Definition A',
      see_also: ['Term B'],
    },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [{ sourceTerm: 'Term A', targetTerm: 'Term B', reason: 'Already linked' }];

  const valid = validateSuggestions(suggestions, terms);
  assert.equal(valid.length, 0);
});

test('validateSuggestions: filters out suggestions with missing fields', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [
    { sourceTerm: 'Term A' }, // missing targetTerm
    { targetTerm: 'Term B' }, // missing sourceTerm
    { sourceTerm: 123, targetTerm: 'Term B' }, // non-string sourceTerm
    { sourceTerm: 'Term A', targetTerm: 456 }, // non-string targetTerm
  ];

  const valid = validateSuggestions(suggestions, terms);
  assert.equal(valid.length, 0);
});

test('validateSuggestions: includes slug and default reason in output', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [{ sourceTerm: 'Term A', targetTerm: 'Term B' }];

  const valid = validateSuggestions(suggestions, terms);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].sourceSlug, 'term-a');
  assert.equal(valid[0].targetSlug, 'term-b');
  assert.equal(valid[0].reason, 'Semantically related terms');
});

test('applySuggestions: adds new see_also entries', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [
    { sourceSlug: 'term-a', sourceTerm: 'Term A', targetSlug: 'term-b', targetTerm: 'Term B' },
  ];

  const updated = applySuggestions(suggestions, terms);
  assert.deepEqual(updated[0].see_also, ['Term B']);
  assert.equal(updated[1].see_also, undefined);
});

test('applySuggestions: appends to existing see_also', () => {
  const terms = [
    {
      slug: 'term-a',
      term: 'Term A',
      definition: 'Definition A',
      see_also: ['Existing Link'],
    },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [
    { sourceSlug: 'term-a', sourceTerm: 'Term A', targetSlug: 'term-b', targetTerm: 'Term B' },
  ];

  const updated = applySuggestions(suggestions, terms);
  assert.deepEqual(updated[0].see_also, ['Existing Link', 'Term B']);
});

test('applySuggestions: handles multiple suggestions for same term', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
    { slug: 'term-c', term: 'Term C', definition: 'Definition C' },
  ];
  const suggestions = [
    { sourceSlug: 'term-a', sourceTerm: 'Term A', targetSlug: 'term-b', targetTerm: 'Term B' },
    { sourceSlug: 'term-a', sourceTerm: 'Term A', targetSlug: 'term-c', targetTerm: 'Term C' },
  ];

  const updated = applySuggestions(suggestions, terms);
  assert.deepEqual(updated[0].see_also, ['Term B', 'Term C']);
});

test('applySuggestions: does not modify terms without suggestions', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A', extra: 'field' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [];

  const updated = applySuggestions(suggestions, terms);
  assert.deepEqual(updated, terms);
});

test('displaySuggestions: handles empty suggestions array', () => {
  // Just make sure it doesn't throw
  assert.doesNotThrow(() => displaySuggestions([]));
});

test('displaySuggestions: handles non-empty suggestions', () => {
  const suggestions = [
    {
      sourceTerm: 'Term A',
      targetTerm: 'Term B',
      reason: 'Related concepts',
    },
  ];
  // Just make sure it doesn't throw
  assert.doesNotThrow(() => displaySuggestions(suggestions));
});

test('truncateForLogging: returns string unchanged if under max length', () => {
  const result = truncateForLogging('short string', 100);
  assert.equal(result, 'short string');
});

test('truncateForLogging: truncates string over max length with ellipsis', () => {
  const result = truncateForLogging('this is a long string', 10);
  assert.equal(result, 'this is a ...');
});

test('truncateForLogging: uses default max length of 100', () => {
  const shortString = 'x'.repeat(100);
  const longString = 'x'.repeat(101);

  assert.equal(truncateForLogging(shortString), shortString);
  assert.equal(truncateForLogging(longString), 'x'.repeat(100) + '...');
});

test('validateSuggestions: case-insensitive term matching', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [{ sourceTerm: 'TERM A', targetTerm: 'term b', reason: 'Case test' }];

  const valid = validateSuggestions(suggestions, terms);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].sourceTerm, 'Term A'); // Returns original case
  assert.equal(valid[0].targetTerm, 'Term B');
});

test('validateSuggestions: matches by slug', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [{ sourceTerm: 'term-a', targetTerm: 'term-b', reason: 'Slug match' }];

  const valid = validateSuggestions(suggestions, terms);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].sourceTerm, 'Term A');
  assert.equal(valid[0].targetTerm, 'Term B');
});

test('validateSuggestions: detects existing link by slug', () => {
  const terms = [
    {
      slug: 'term-a',
      term: 'Term A',
      definition: 'Definition A',
      see_also: ['term-b'], // Using slug format
    },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];
  const suggestions = [{ sourceTerm: 'Term A', targetTerm: 'Term B', reason: 'Already linked' }];

  const valid = validateSuggestions(suggestions, terms);
  assert.equal(valid.length, 0);
});
