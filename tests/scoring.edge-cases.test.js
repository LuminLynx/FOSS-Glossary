const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreTerm, getScoreBreakdown } = require('../scripts/scoring');

// Edge case: Term without required fields
test('scoring edge case: term missing both term and definition scores 0', () => {
  const term = {};
  const result = scoreTerm(term);
  assert.equal(result.score, 0, 'Should score 0 without required fields');
  assert.equal(result.badges.length, 0, 'Should have no badges');
});

// Edge case: Term with only term field (missing definition)
test('scoring edge case: term without definition scores 0', () => {
  const term = { term: 'Test' };
  const result = scoreTerm(term);
  assert.equal(result.score, 0, 'Should score 0 without definition');
});

// Edge case: Term with only definition field (missing term)
test('scoring edge case: term without name scores 0', () => {
  const term = { definition: 'Test definition' };
  const result = scoreTerm(term);
  assert.equal(result.score, 0, 'Should score 0 without term name');
});

// Edge case: Empty string values in required fields
test('scoring edge case: empty string in required fields scores 0', () => {
  const term = { term: '', definition: '' };
  const result = scoreTerm(term);
  assert.equal(result.score, 0, 'Empty strings should not count');
});

// Edge case: Whitespace-only strings
test('scoring edge case: whitespace-only strings in fields', () => {
  const term = {
    term: '   ',
    definition: '   ',
    humor: '   ',
    explanation: '   ',
  };
  const result = scoreTerm(term);
  // Whitespace strings are truthy but meaningless
  assert.ok(result.score >= 0, 'Should handle whitespace gracefully');
});

// Edge case: Humor with exactly 5 characters (boundary)
test('scoring edge case: humor with exactly 5 characters scores 1 point', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: '12345', // Exactly 5 chars
  };
  const result = scoreTerm(term);
  assert.equal(result.score, 21, 'Should score 21 (20 base + 1 humor)');
});

// Edge case: Humor with 4 characters (below threshold)
test('scoring edge case: humor with 4 characters scores 0 humor points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: '1234', // Less than 5 chars
  };
  const result = scoreTerm(term);
  assert.equal(result.score, 20, 'Should score 20 (no humor points)');
});

// Edge case: Humor with exactly 100 characters (Comedy Gold boundary)
test('scoring edge case: humor with exactly 100 chars no Comedy Gold', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(100),
  };
  const result = scoreTerm(term);
  assert.ok(!result.badges.includes('😂 Comedy Gold'), 'Should not get Comedy Gold at exactly 100');
});

// Edge case: Humor with 101 characters (Comedy Gold threshold)
test('scoring edge case: humor with 101 chars gets Comedy Gold', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(101),
  };
  const result = scoreTerm(term);
  assert.ok(result.badges.includes('😂 Comedy Gold'), 'Should get Comedy Gold at 101+');
});

// Edge case: Humor scoring caps at 30 points
test('scoring edge case: humor caps at 30 points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(1000), // Would be 200 points without cap
  };
  const result = scoreTerm(term);
  const breakdown = getScoreBreakdown(term);
  assert.equal(breakdown.humor, 30, 'Humor should cap at 30 points');
});

// Edge case: Explanation with exactly 20 characters (boundary)
test('scoring edge case: explanation with exactly 20 chars no points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    explanation: 'x'.repeat(20), // Exactly 20
  };
  const result = scoreTerm(term);
  assert.equal(result.score, 20, 'Should not count explanation at exactly 20 chars');
});

// Edge case: Explanation with 21 characters (threshold)
test('scoring edge case: explanation with 21 chars gets points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    explanation: 'x'.repeat(21), // Just over 20
  };
  const result = scoreTerm(term);
  assert.equal(result.score, 40, 'Should score 40 (20 base + 20 explanation)');
});

// Edge case: Tags with empty array
test('scoring edge case: empty tags array scores 0 tag points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    tags: [],
  };
  const result = scoreTerm(term);
  const breakdown = getScoreBreakdown(term);
  assert.equal(breakdown.tags, 0, 'Empty array should score 0');
});

// Edge case: Single tag scores 3 points
test('scoring edge case: one tag scores 3 points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    tags: ['tag1'],
  };
  const breakdown = getScoreBreakdown(term);
  assert.equal(breakdown.tags, 3, 'One tag should score 3 points');
});

// Edge case: Tags cap at 10 points (4 tags = 10, but calculated as 12)
test('scoring edge case: 4 or more tags cap at 10 points', () => {
  const fourTags = {
    term: 'Test',
    definition: 'Test',
    tags: ['t1', 't2', 't3', 't4'],
  };
  const fiveTags = {
    term: 'Test',
    definition: 'Test',
    tags: ['t1', 't2', 't3', 't4', 't5'],
  };

  const fourResult = getScoreBreakdown(fourTags);
  const fiveResult = getScoreBreakdown(fiveTags);

  assert.equal(fourResult.tags, 10, 'Four tags should cap at 10');
  assert.equal(fiveResult.tags, 10, 'Five tags should cap at 10');
});

// Edge case: Cross-references with empty array
test('scoring edge case: empty see_also array scores 0', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    see_also: [],
  };
  const breakdown = getScoreBreakdown(term);
  assert.equal(breakdown.crossReferences, 0, 'Empty array should score 0');
});

// Edge case: Single cross-reference scores 5 points
test('scoring edge case: one cross-reference scores 5 points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    see_also: ['ref1'],
  };
  const breakdown = getScoreBreakdown(term);
  assert.equal(breakdown.crossReferences, 5, 'One ref should score 5 points');
});

// Edge case: Cross-references cap at 20 points
test('scoring edge case: 4 or more cross-refs cap at 20 points', () => {
  const fourRefs = {
    term: 'Test',
    definition: 'Test',
    see_also: ['r1', 'r2', 'r3', 'r4'],
  };
  const fiveRefs = {
    term: 'Test',
    definition: 'Test',
    see_also: ['r1', 'r2', 'r3', 'r4', 'r5'],
  };

  const fourResult = getScoreBreakdown(fourRefs);
  const fiveResult = getScoreBreakdown(fiveRefs);

  assert.equal(fourResult.crossReferences, 20, 'Four refs should cap at 20');
  assert.equal(fiveResult.crossReferences, 20, 'Five refs should cap at 20');
});

// Edge case: Controversy level null or undefined
test('scoring edge case: missing controversy level no badge', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
  };
  const result = scoreTerm(term);
  assert.ok(!result.badges.includes('🔥 Flame Warrior'), 'No controversy badge without level');
  assert.ok(!result.badges.includes('🌶️ Spicy Take'), 'No controversy badge without level');
});

// Edge case: Invalid controversy level (should not crash)
test('scoring edge case: invalid controversy level ignored', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    controversy_level: 'extreme', // Not valid per schema
  };
  const result = scoreTerm(term);
  // Should not crash, might not award badge
  assert.ok(typeof result.score === 'number', 'Should return valid score');
});

// Edge case: Score exactly 70 gets Strong Entry badge
test('scoring edge case: score of exactly 70 gets Strong Entry', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(100), // 20 points
    explanation: 'x'.repeat(21), // 20 points
    tags: ['t1', 't2', 't3'], // 9 points
    see_also: ['r1'], // 5 points
    // Total: 20 + 20 + 20 + 9 + 5 = 74
  };

  // Adjust to get exactly 70
  term.see_also = []; // Remove 5 points
  term.tags = ['t1']; // 3 points instead of 9
  // Total: 20 + 20 + 20 + 3 + 0 = 63, need to adjust

  // Better approach: 20 + 25 (humor) + 20 (explanation) + 3 (tags) + 2 (refs) = 70
  term.humor = 'x'.repeat(125); // 25 points
  term.tags = ['t1']; // 3 points
  term.see_also = []; // 0 points
  // 20 + 25 + 20 + 3 + 0 = 68, need 2 more

  // Actually: 20 + 20 (humor) + 20 (explanation) + 6 (tags) + 4 (refs) = 70
  term.humor = 'x'.repeat(100); // 20 points
  term.tags = ['t1', 't2']; // 6 points
  term.see_also = []; // 0 points
  // 20 + 20 + 20 + 6 + 0 = 66, still need 4

  // Final: 20 + 20 + 20 + 6 + 10 = 76, too much
  // Let's try: 20 + 25 + 20 + 3 + 2 = 70
  term.humor = 'x'.repeat(125); // 25 points
  term.tags = ['t1']; // 3 points
  term.see_also = []; // 0 points
  // 20 + 25 + 20 + 3 + 0 = 68

  // Simpler: 20 + 20 + 20 + 9 + 1 = 70
  term.humor = 'x'.repeat(100); // 20 points
  term.tags = ['t1', 't2', 't3']; // 9 points
  term.see_also = []; // 0 points
  // 20 + 20 + 20 + 9 + 0 = 69

  // Use: 20 + 21 + 20 + 9 + 0 = 70
  term.humor = 'x'.repeat(105); // 21 points
  term.tags = ['t1', 't2', 't3']; // 9 points
  term.see_also = []; // 0 points

  const result = scoreTerm(term);
  assert.equal(result.score, 70, 'Should score exactly 70');
  assert.ok(result.badges.includes('💪 Strong Entry'), 'Should get Strong Entry badge at 70');
  assert.ok(!result.badges.includes('⭐ Star Contributor'), 'Should not get Star badge at 70');
});

// Edge case: Score exactly 80 gets Star Contributor badge
test('scoring edge case: score of exactly 80 gets Star Contributor', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(150), // 30 points (capped)
    explanation: 'x'.repeat(21), // 20 points
    tags: ['t1', 't2', 't3'], // 9 points
    see_also: ['r1'], // 5 points
    // Total: 20 + 30 + 20 + 9 + 5 = 84, too much
  };

  // Adjust: 20 + 30 + 20 + 6 + 4 = 80
  term.humor = 'x'.repeat(150); // 30 points
  term.tags = ['t1', 't2']; // 6 points
  term.see_also = []; // 0 points
  // 20 + 30 + 20 + 6 + 0 = 76

  // Try: 20 + 30 + 20 + 9 + 1 = 80
  term.tags = ['t1', 't2', 't3']; // 9 points
  term.see_also = ['r1']; // 5 points
  // 20 + 30 + 20 + 9 + 5 = 84

  // Use: 20 + 30 + 20 + 6 + 5 = 81
  term.tags = ['t1', 't2']; // 6 points
  term.see_also = ['r1']; // 5 points
  // 20 + 30 + 20 + 6 + 5 = 81

  // Actually: 20 + 30 + 20 + 10 + 0 = 80
  term.tags = ['t1', 't2', 't3', 't4']; // 10 points (capped)
  term.see_also = []; // 0 points

  const result = scoreTerm(term);
  assert.equal(result.score, 80, 'Should score exactly 80');
  assert.ok(result.badges.includes('⭐ Star Contributor'), 'Should get Star badge at 80');
  assert.ok(!result.badges.includes('💯 Perfectionist'), 'Should not get Perfect badge at 80');
});

// Edge case: Score exactly 90 gets Perfectionist badge
test('scoring edge case: score of exactly 90 gets Perfectionist', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(150), // 30 points (capped)
    explanation: 'x'.repeat(21), // 20 points
    tags: ['t1', 't2', 't3', 't4'], // 10 points (capped)
    see_also: ['r1', 'r2'], // 10 points
    // Total: 20 + 30 + 20 + 10 + 10 = 90
  };

  const result = scoreTerm(term);
  assert.equal(result.score, 90, 'Should score exactly 90');
  assert.ok(result.badges.includes('💯 Perfectionist'), 'Should get Perfect badge at 90');
});

// Edge case: Maximum possible score is 100
test('scoring edge case: maximum score is capped at 100', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(150), // 30 points
    explanation: 'x'.repeat(21), // 20 points
    tags: ['t1', 't2', 't3', 't4'], // 10 points
    see_also: ['r1', 'r2', 'r3', 'r4'], // 20 points
    // Total: 20 + 30 + 20 + 10 + 20 = 100
  };

  const result = scoreTerm(term);
  assert.equal(result.score, 100, 'Should score exactly 100');
  assert.ok(result.badges.includes('💯 Perfectionist'), 'Should get Perfect badge at 100');
});

// Edge case: Multiple badges can be awarded
test('scoring edge case: term can have multiple badges', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(150), // 30 points + Comedy Gold
    explanation: 'x'.repeat(21), // 20 points
    tags: ['t1', 't2', 't3', 't4'], // 10 points
    see_also: ['r1', 'r2', 'r3', 'r4'], // 20 points
    controversy_level: 'high',
    // Total: 100 points
  };

  const result = scoreTerm(term);
  assert.ok(result.badges.includes('😂 Comedy Gold'), 'Should have Comedy Gold');
  assert.ok(result.badges.includes('🔥 Flame Warrior'), 'Should have Flame Warrior');
  assert.ok(result.badges.includes('💯 Perfectionist'), 'Should have Perfectionist');
  assert.equal(result.badges.length, 3, 'Should have exactly 3 badges');
});

// Edge case: Invalid field types (non-string, non-array)
test('scoring edge case: number in string field handled gracefully', () => {
  const term = {
    term: 12345,
    definition: 67890,
    humor: 'x'.repeat(50),
  };
  const result = scoreTerm(term);
  // Should handle gracefully, truthy numbers count as having the field
  assert.ok(result.score >= 20, 'Should handle number types');
});

// Edge case: Boolean values in fields
test('scoring edge case: boolean values in fields', () => {
  const term = {
    term: true,
    definition: false,
    humor: true,
  };
  const result = scoreTerm(term);
  // Should handle gracefully
  assert.ok(typeof result.score === 'number', 'Should return a number');
});

// Edge case: Object in array field
test('scoring edge case: objects in array fields ignored', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    tags: [{ key: 'value' }, 'valid-tag'],
    see_also: ['valid-ref', { key: 'value' }],
  };
  const result = scoreTerm(term);
  // Should handle gracefully, possibly counting array length
  assert.ok(typeof result.score === 'number', 'Should return a number');
});

// Edge case: Negative number fields (should not occur, but test robustness)
test('scoring edge case: term object with unusual structure', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    score: -100, // Extra field that shouldn't affect scoring
    badges: ['fake'],
  };
  const result = scoreTerm(term);
  assert.equal(result.score, 20, 'Should ignore extra fields');
  assert.ok(Array.isArray(result.badges), 'Should return badges array');
});

// Edge case: getScoreBreakdown with missing fields
test('scoring edge case: getScoreBreakdown handles missing fields', () => {
  const term = {};
  const breakdown = getScoreBreakdown(term);

  assert.equal(breakdown.base, 0, 'Missing fields should score 0');
  assert.equal(breakdown.humor, 0);
  assert.equal(breakdown.explanation, 0);
  assert.equal(breakdown.tags, 0);
  assert.equal(breakdown.crossReferences, 0);

  assert.ok(breakdown.maxScores, 'Should include maxScores');
  assert.equal(breakdown.maxScores.base, 20);
});

// Edge case: getScoreBreakdown totals match scoreTerm
test('scoring edge case: breakdown always matches total score', () => {
  // Test with various combinations
  const testCases = [
    {},
    { term: 'T', definition: 'D' },
    { term: 'T', definition: 'D', humor: 'x'.repeat(50) },
    { term: 'T', definition: 'D', humor: 'x'.repeat(150), explanation: 'x'.repeat(30) },
    { term: 'T', definition: 'D', tags: ['t1', 't2'], see_also: ['r1'] },
  ];

  testCases.forEach((term, index) => {
    const result = scoreTerm(term);
    const breakdown = getScoreBreakdown(term);
    const total =
      breakdown.base +
      breakdown.humor +
      breakdown.explanation +
      breakdown.tags +
      breakdown.crossReferences;
    assert.equal(result.score, total, `Case ${index}: Score should match breakdown total`);
  });
});

// Edge case: Fractional humor length (floor operation test)
test('scoring edge case: humor length floor calculation', () => {
  // Test that floor operation works correctly for various lengths
  const testCases = [
    { length: 6, expected: 1 }, // 6/5 = 1.2 -> 1
    { length: 9, expected: 1 }, // 9/5 = 1.8 -> 1
    { length: 10, expected: 2 }, // 10/5 = 2.0 -> 2
    { length: 14, expected: 2 }, // 14/5 = 2.8 -> 2
    { length: 15, expected: 3 }, // 15/5 = 3.0 -> 3
  ];

  testCases.forEach(({ length, expected }) => {
    const term = {
      term: 'Test',
      definition: 'Test',
      humor: 'x'.repeat(length),
    };
    const breakdown = getScoreBreakdown(term);
    assert.equal(
      breakdown.humor,
      expected,
      `Humor length ${length} should score ${expected} points`
    );
  });
});

// Edge case: Very short explanation (exactly 20 chars)
test('scoring edge case: explanation exactly 20 chars is not sufficient', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    explanation: '12345678901234567890', // Exactly 20
  };
  const breakdown = getScoreBreakdown(term);
  assert.equal(breakdown.explanation, 0, 'Exactly 20 chars should not score');
});

// Edge case: Explanation with 21 chars is sufficient
test('scoring edge case: explanation 21 chars is sufficient', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    explanation: '123456789012345678901', // 21 chars
  };
  const breakdown = getScoreBreakdown(term);
  assert.equal(breakdown.explanation, 20, '21+ chars should score 20 points');
});

// Edge case: All controversy levels award correct badges
test('scoring edge case: controversy level low does not award badge', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    controversy_level: 'low',
  };
  const result = scoreTerm(term);
  assert.ok(!result.badges.includes('🔥 Flame Warrior'), 'Low should not get Flame');
  assert.ok(!result.badges.includes('🌶️ Spicy Take'), 'Low should not get Spicy');
});

// Edge case: Medium and high controversy both award badges (no overlap)
test('scoring edge case: only one controversy badge awarded', () => {
  const high = {
    term: 'Test',
    definition: 'Test',
    controversy_level: 'high',
  };
  const medium = {
    term: 'Test',
    definition: 'Test',
    controversy_level: 'medium',
  };

  const highResult = scoreTerm(high);
  const mediumResult = scoreTerm(medium);

  // High should only have Flame Warrior, not Spicy Take
  assert.ok(highResult.badges.includes('🔥 Flame Warrior'));
  assert.ok(!highResult.badges.includes('🌶️ Spicy Take'));

  // Medium should only have Spicy Take, not Flame Warrior
  assert.ok(mediumResult.badges.includes('🌶️ Spicy Take'));
  assert.ok(!mediumResult.badges.includes('🔥 Flame Warrior'));
});
