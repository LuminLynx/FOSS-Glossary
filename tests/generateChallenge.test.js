const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  parseArgs,
  findTermBySlug,
  generateMarkdownContent,
  CHALLENGES_DIR,
} = require('../scripts/generateChallenge');

test('parseArgs: extracts slug from positional argument', () => {
  const options = parseArgs(['race-condition']);
  assert.equal(options.slug, 'race-condition');
});

test('parseArgs: extracts slug ignoring flags', () => {
  const options = parseArgs(['--some-flag', 'my-term']);
  assert.equal(options.slug, 'my-term');
});

test('parseArgs: throws error when no slug provided', () => {
  assert.throws(() => parseArgs([]), {
    message: /Usage: node scripts\/generateChallenge\.js <term-slug>/,
  });
});

test('parseArgs: throws error when only flags provided', () => {
  assert.throws(() => parseArgs(['--flag1', '--flag2']), {
    message: /Usage: node scripts\/generateChallenge\.js <term-slug>/,
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

  const challenge = {
    conceptExplanation: 'This concept is about testing.',
    buggyCode: 'const x = 1;\nconsole.log(x);',
    goal: 'Fix the bug in the code.',
    solutionCode: 'const x = 2;\nconsole.log(x);',
  };

  const markdown = generateMarkdownContent(term, challenge);

  // Check title
  assert.ok(markdown.includes('# Challenge: Test Term'));

  // Check concept explanation section
  assert.ok(markdown.includes('## Concept Explanation'));
  assert.ok(markdown.includes('This concept is about testing.'));

  // Check buggy code section
  assert.ok(markdown.includes('## The Challenge (Buggy Code)'));
  assert.ok(markdown.includes('**Test Term**'));
  assert.ok(markdown.includes('const x = 1;'));

  // Check goal section
  assert.ok(markdown.includes('## The Goal'));
  assert.ok(markdown.includes('Fix the bug in the code.'));

  // Check solution section (in details tag)
  assert.ok(markdown.includes('<details>'));
  assert.ok(markdown.includes('## Solution'));
  assert.ok(markdown.includes('const x = 2;'));
  assert.ok(markdown.includes('</details>'));

  // Check footer
  assert.ok(markdown.includes('FOSS Glossary'));
});

test('generateMarkdownContent: uses javascript code blocks', () => {
  const term = { slug: 'test', term: 'Test', definition: 'Test definition.' };
  const challenge = {
    conceptExplanation: 'Test concept.',
    buggyCode: 'code1',
    goal: 'Goal text.',
    solutionCode: 'code2',
  };

  const markdown = generateMarkdownContent(term, challenge);

  // Count javascript code blocks - should have exactly 2
  const jsBlockCount = (markdown.match(/```javascript/g) || []).length;
  assert.equal(jsBlockCount, 2);
});

test('CHALLENGES_DIR: is set to challenges', () => {
  assert.equal(CHALLENGES_DIR, 'challenges');
});
