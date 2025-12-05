const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  calculateRelevance,
  retrieveRelevantTerms,
  formatTermsContext,
  truncateForLogging,
  DEFAULT_TOP_K,
} = require('../scripts/askGlossary');

// Sample terms for testing
const sampleTerms = [
  {
    slug: 'fork',
    term: 'Fork',
    definition:
      'When developers copy an open-source project to start their own version—sometimes to innovate, sometimes to escape endless debates.',
    explanation: 'Creating a copy of a repository to make changes independently.',
    humor: 'Warning: excessive forking may lead to family drama in the GitHub tree',
    tags: ['foss', 'git', 'community'],
    see_also: ['Branch', 'Clone'],
    aliases: ['Forking'],
  },
  {
    slug: 'lgtm',
    term: 'LGTM',
    definition:
      'Looks Good To Me — the classic approval signal in code reviews indicating the reviewer saw nothing alarming.',
    explanation: 'Standard approval comment in code reviews.',
    humor: "Translation: I skimmed this for 30 seconds and didn't see anything on fire.",
    tags: ['code-review', 'approval', 'acronym'],
    aliases: ['Looks Good To Me'],
  },
  {
    slug: 'copyleft',
    term: 'Copyleft',
    definition:
      'A licensing principle that requires derivative works to be distributed under the same license as the original.',
    explanation: "Coined by Richard Stallman, 'copyleft' flips copyright on its head.",
    tags: ['licensing', 'foss', 'gpl'],
    controversy_level: 'high',
  },
  {
    slug: 'rtfm',
    term: 'RTFM',
    definition:
      'Read The F***ing Manual — a blunt reminder to consult documentation before asking questions.',
    humor: 'The four most powerful letters in tech support.',
    tags: ['acronym', 'documentation', 'support'],
    aliases: ['Read The Manual'],
  },
  {
    slug: 'bus-factor',
    term: 'Bus Factor',
    definition: 'The number of team members that can be hit by a bus before a project fails.',
    explanation: 'A metric for knowledge concentration risk.',
    tags: ['project-management', 'risk', 'metrics'],
  },
];

// parseArgs tests
test('parseArgs: extracts question from positional argument', () => {
  const options = parseArgs(['What is a fork?']);
  assert.equal(options.question, 'What is a fork?');
  assert.equal(options.topK, DEFAULT_TOP_K);
});

test('parseArgs: extracts topK from --top-k flag', () => {
  const options = parseArgs(['--top-k', '3', 'What is LGTM?']);
  assert.equal(options.question, 'What is LGTM?');
  assert.equal(options.topK, 3);
});

test('parseArgs: extracts topK from -k flag', () => {
  const options = parseArgs(['-k', '10', 'Tell me about copyleft']);
  assert.equal(options.question, 'Tell me about copyleft');
  assert.equal(options.topK, 10);
});

test('parseArgs: returns null question when no positional argument', () => {
  const options = parseArgs(['--top-k', '5']);
  assert.equal(options.question, null);
});

test('parseArgs: handles empty arguments', () => {
  const options = parseArgs([]);
  assert.equal(options.question, null);
  assert.equal(options.topK, DEFAULT_TOP_K);
});

// calculateRelevance tests
test('calculateRelevance: exact term name match scores highest', () => {
  const score = calculateRelevance('what is a fork', sampleTerms[0]);
  assert.ok(score >= 10, `Expected score >= 10, got ${score}`);
});

test('calculateRelevance: alias match scores high', () => {
  const score = calculateRelevance('what does looks good to me mean', sampleTerms[1]);
  assert.ok(score >= 8, `Expected score >= 8, got ${score}`);
});

test('calculateRelevance: tag match contributes to score', () => {
  const score = calculateRelevance('tell me about licensing', sampleTerms[2]);
  assert.ok(score > 0, `Expected score > 0, got ${score}`);
});

test('calculateRelevance: unrelated question scores zero or low', () => {
  const score = calculateRelevance('tell me about quantum physics', sampleTerms[0]);
  assert.ok(score < 3, `Expected score < 3, got ${score}`);
});

test('calculateRelevance: slug words contribute to score', () => {
  const score = calculateRelevance('what is a bus factor', sampleTerms[4]);
  assert.ok(score > 0, `Expected score > 0 for bus-factor term`);
});

// retrieveRelevantTerms tests
test('retrieveRelevantTerms: returns relevant terms sorted by score', () => {
  const results = retrieveRelevantTerms('what is a fork', sampleTerms, 3);
  assert.ok(results.length > 0, 'Should return at least one result');
  assert.equal(results[0].term.slug, 'fork', 'Fork should be first result');
});

test('retrieveRelevantTerms: respects topK limit', () => {
  const results = retrieveRelevantTerms('foss acronym', sampleTerms, 2);
  assert.ok(results.length <= 2, 'Should return at most 2 results');
});

test('retrieveRelevantTerms: filters out zero-score terms', () => {
  const results = retrieveRelevantTerms('quantum physics', sampleTerms, 5);
  for (const result of results) {
    assert.ok(result.score > 0, 'All returned terms should have score > 0');
  }
});

test('retrieveRelevantTerms: returns empty array for completely unrelated query', () => {
  const results = retrieveRelevantTerms('abcdef nonsense query', sampleTerms, 5);
  // All terms should have very low or zero scores
  assert.ok(results.length <= 2, 'Should return few or no results for unrelated query');
});

test('retrieveRelevantTerms: handles multiple relevant terms', () => {
  const results = retrieveRelevantTerms('acronym', sampleTerms, 5);
  // Both LGTM and RTFM have 'acronym' tag
  const slugs = results.map((r) => r.term.slug);
  assert.ok(
    slugs.includes('lgtm') || slugs.includes('rtfm'),
    'Should include acronym-tagged terms'
  );
});

// formatTermsContext tests
test('formatTermsContext: formats single term correctly', () => {
  const context = formatTermsContext([{ term: sampleTerms[0], score: 10 }]);
  assert.ok(context.includes('## Fork'));
  assert.ok(context.includes('**Definition:**'));
  assert.ok(context.includes('slug: fork'));
});

test('formatTermsContext: includes optional fields when present', () => {
  const context = formatTermsContext([{ term: sampleTerms[0], score: 10 }]);
  assert.ok(context.includes('**Explanation:**'));
  assert.ok(context.includes('**Humor:**'));
  assert.ok(context.includes('**Related terms:**'));
  assert.ok(context.includes('**Tags:**'));
});

test('formatTermsContext: includes controversy level when present', () => {
  const context = formatTermsContext([{ term: sampleTerms[2], score: 5 }]);
  assert.ok(context.includes('**Controversy level:** high'));
});

test('formatTermsContext: handles empty array', () => {
  const context = formatTermsContext([]);
  assert.ok(context.includes('No directly relevant terms found'));
});

test('formatTermsContext: separates multiple terms', () => {
  const context = formatTermsContext([
    { term: sampleTerms[0], score: 10 },
    { term: sampleTerms[1], score: 8 },
  ]);
  assert.ok(context.includes('## Fork'));
  assert.ok(context.includes('## LGTM'));
  assert.ok(context.includes('---'), 'Should include separator between terms');
});

// truncateForLogging tests
test('truncateForLogging: returns string unchanged if under max length', () => {
  const result = truncateForLogging('short string', 100);
  assert.equal(result, 'short string');
});

test('truncateForLogging: truncates string over max length', () => {
  const result = truncateForLogging('this is a long string', 10);
  assert.equal(result, 'this is a ...');
});

test('truncateForLogging: uses default max length of 100', () => {
  const shortString = 'x'.repeat(100);
  const longString = 'x'.repeat(101);

  assert.equal(truncateForLogging(shortString), shortString);
  assert.equal(truncateForLogging(longString), 'x'.repeat(100) + '...');
});

// Edge cases
test('calculateRelevance: handles term with minimal fields', () => {
  const minimalTerm = {
    slug: 'test',
    term: 'Test',
    definition: 'A test term.',
  };
  const score = calculateRelevance('test', minimalTerm);
  assert.ok(score >= 0, 'Score should be non-negative');
});

test('calculateRelevance: case-insensitive matching', () => {
  const score1 = calculateRelevance('FORK', sampleTerms[0]);
  const score2 = calculateRelevance('fork', sampleTerms[0]);
  const score3 = calculateRelevance('Fork', sampleTerms[0]);
  assert.equal(score1, score2, 'Scores should be equal regardless of case');
  assert.equal(score2, score3, 'Scores should be equal regardless of case');
});

test('retrieveRelevantTerms: handles empty terms array', () => {
  const results = retrieveRelevantTerms('any question', [], 5);
  assert.deepEqual(results, [], 'Should return empty array for empty terms');
});
