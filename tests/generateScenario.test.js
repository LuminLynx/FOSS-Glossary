const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  findTermBySlug,
  generateMarkdownContent,
  validateRequiredStringField,
  truncateForLogging,
  EXAMPLES_DIR,
} = require('../scripts/generateScenario');

test('parseArgs: extracts slug from positional argument', () => {
  const options = parseArgs(['bus-factor']);
  assert.equal(options.slug, 'bus-factor');
});

test('parseArgs: extracts slug ignoring flags', () => {
  const options = parseArgs(['--some-flag', 'my-term']);
  assert.equal(options.slug, 'my-term');
});

test('parseArgs: throws error when no slug provided', () => {
  assert.throws(() => parseArgs([]), {
    message: /Usage: node scripts\/generateScenario\.js <term-slug>/,
  });
});

test('parseArgs: throws error when only flags provided', () => {
  assert.throws(() => parseArgs(['--flag1', '--flag2']), {
    message: /Usage: node scripts\/generateScenario\.js <term-slug>/,
  });
});

test('findTermBySlug: finds existing term', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
    { slug: 'term-c', term: 'Term C', definition: 'Definition C' },
  ];

  const found = findTermBySlug('term-b', terms);
  assert.deepEqual(found, { slug: 'term-b', term: 'Term B', definition: 'Definition B' });
});

test('findTermBySlug: returns null for non-existing term', () => {
  const terms = [
    { slug: 'term-a', term: 'Term A', definition: 'Definition A' },
    { slug: 'term-b', term: 'Term B', definition: 'Definition B' },
  ];

  const found = findTermBySlug('non-existent', terms);
  assert.equal(found, null);
});

test('findTermBySlug: returns null for empty array', () => {
  const found = findTermBySlug('any-slug', []);
  assert.equal(found, null);
});

test('generateMarkdownContent: creates correct markdown structure', () => {
  const term = {
    slug: 'test-term',
    term: 'Test Term',
    definition: 'This is a test definition for the term.',
  };

  const scenario = {
    title: 'The Day Everything Changed',
    story: 'Once upon a time in a software company...',
    lesson: 'This scenario teaches an important lesson about the concept.',
    takeaways: ['First takeaway', 'Second takeaway'],
  };

  const markdown = generateMarkdownContent(term, scenario);

  // Check title
  assert.ok(markdown.includes('# The Day Everything Changed'));

  // Check term reference
  assert.ok(markdown.includes('**Test Term**'));

  // Check story section
  assert.ok(markdown.includes('## The Story'));
  assert.ok(markdown.includes('Once upon a time in a software company...'));

  // Check lesson section
  assert.ok(markdown.includes('## The Lesson'));
  assert.ok(markdown.includes('This scenario teaches an important lesson about the concept.'));

  // Check takeaways section
  assert.ok(markdown.includes('## Key Takeaways'));
  assert.ok(markdown.includes('- First takeaway'));
  assert.ok(markdown.includes('- Second takeaway'));

  // Check footer
  assert.ok(markdown.includes('FOSS Glossary'));
  assert.ok(markdown.includes('**Definition:**'));
});

test('generateMarkdownContent: includes all takeaways as list items', () => {
  const term = { slug: 'test', term: 'Test', definition: 'Test definition.' };
  const scenario = {
    title: 'Test Title',
    story: 'Test story.',
    lesson: 'Test lesson.',
    takeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'],
  };

  const markdown = generateMarkdownContent(term, scenario);

  // Count list items
  const listItemCount = (markdown.match(/^- /gm) || []).length;
  assert.equal(listItemCount, 3);
});

test('EXAMPLES_DIR: is set to examples', () => {
  assert.equal(EXAMPLES_DIR, 'examples');
});

test('validateRequiredStringField: passes for valid string field', () => {
  const obj = { name: 'test value' };
  // Should not throw
  assert.doesNotThrow(() => validateRequiredStringField(obj, 'name'));
});

test('validateRequiredStringField: throws for missing field', () => {
  const obj = { other: 'value' };
  assert.throws(() => validateRequiredStringField(obj, 'name'), {
    message: /AI response missing required "name" field/,
  });
});

test('validateRequiredStringField: throws for non-string field', () => {
  const obj = { name: 123 };
  assert.throws(() => validateRequiredStringField(obj, 'name'), {
    message: /AI response missing required "name" field/,
  });
});

test('validateRequiredStringField: throws for empty string field', () => {
  const obj = { name: '' };
  assert.throws(() => validateRequiredStringField(obj, 'name'), {
    message: /AI response missing required "name" field/,
  });
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
