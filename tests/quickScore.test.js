const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveTermToScore, getCliSlug } = require('../scripts/quickScore');

test('resolveTermToScore: CLI slug overrides TARGET_SLUG environment variable', () => {
  const terms = [
    { slug: 'first-term', term: 'First', definition: 'x'.repeat(80) },
    { slug: 'second-term', term: 'Second', definition: 'x'.repeat(80) }
  ];

  const { term } = resolveTermToScore(terms, {
    argv: ['node', 'quickScore.js', 'second-term'],
    env: { TARGET_SLUG: 'first-term' }
  });

  assert.ok(term, 'Should resolve a term');
  assert.equal(term.slug, 'second-term', 'CLI argument should take precedence over TARGET_SLUG');
});

test('getCliSlug: supports --slug flag formats', () => {
  assert.equal(
    getCliSlug(['node', 'quickScore.js', '--slug', 'custom-term']),
    'custom-term',
    'Should read slug from --slug <value>'
  );

  assert.equal(
    getCliSlug(['node', 'quickScore.js', '--slug=inline-term']),
    'inline-term',
    'Should read slug from --slug=value'
  );
});
