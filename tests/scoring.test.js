const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreTerm, getScoreBreakdown } = require('../scripts/scoring');

test('scoreTerm: minimal term with only required fields', () => {
  const term = {
    term: 'Test Term',
    definition: 'A test definition'
  };
  
  const result = scoreTerm(term);
  assert.equal(result.score, 20, 'Should score 20 for base fields only');
  assert.equal(result.badges.length, 0, 'Should have no badges');
});

test('scoreTerm: term with humor adds points', () => {
  const term = {
    term: 'Test Term',
    definition: 'A test definition',
    humor: '12345' // 5 characters = 1 point
  };
  
  const result = scoreTerm(term);
  assert.equal(result.score, 21, 'Should score 21 (20 base + 1 humor)');
});

test('scoreTerm: humor calculation is correct', () => {
  const testCases = [
    { length: 5, expectedPoints: 1 },
    { length: 10, expectedPoints: 2 },
    { length: 25, expectedPoints: 5 },
    { length: 50, expectedPoints: 10 },
    { length: 100, expectedPoints: 20 },
    { length: 150, expectedPoints: 30 }, // max is 30
    { length: 200, expectedPoints: 30 }  // capped at 30
  ];
  
  testCases.forEach(({ length, expectedPoints }) => {
    const term = {
      term: 'Test',
      definition: 'Test',
      humor: 'x'.repeat(length)
    };
    const result = scoreTerm(term);
    const humorPoints = result.score - 20; // subtract base
    assert.equal(humorPoints, expectedPoints, 
      `Humor length ${length} should give ${expectedPoints} points`);
  });
});

test('scoreTerm: comedy gold badge for long humor', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: 'x'.repeat(101) // Over 100 characters
  };
  
  const result = scoreTerm(term);
  assert.ok(result.badges.includes('😂 Comedy Gold'), 'Should award Comedy Gold badge');
});

test('scoreTerm: explanation with sufficient length adds points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    explanation: 'This is a short explanation' // More than 20 chars
  };
  
  const result = scoreTerm(term);
  assert.equal(result.score, 40, 'Should score 40 (20 base + 20 explanation)');
});

test('scoreTerm: short explanation does not add points', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    explanation: 'Short' // Less than 20 chars
  };
  
  const result = scoreTerm(term);
  assert.equal(result.score, 20, 'Should score 20 (explanation too short)');
});

test('scoreTerm: tags scoring is correct', () => {
  const testCases = [
    { tags: ['one'], expectedPoints: 3 },
    { tags: ['one', 'two'], expectedPoints: 6 },
    { tags: ['one', 'two', 'three'], expectedPoints: 9 },
    { tags: ['one', 'two', 'three', 'four'], expectedPoints: 10 }, // capped at 10
    { tags: ['one', 'two', 'three', 'four', 'five'], expectedPoints: 10 } // still capped
  ];
  
  testCases.forEach(({ tags, expectedPoints }) => {
    const term = {
      term: 'Test',
      definition: 'Test',
      tags
    };
    const result = scoreTerm(term);
    const tagPoints = result.score - 20; // subtract base
    assert.equal(tagPoints, expectedPoints,
      `${tags.length} tags should give ${expectedPoints} points`);
  });
});

test('scoreTerm: cross-references scoring is correct', () => {
  const testCases = [
    { refs: ['one'], expectedPoints: 5 },
    { refs: ['one', 'two'], expectedPoints: 10 },
    { refs: ['one', 'two', 'three'], expectedPoints: 15 },
    { refs: ['one', 'two', 'three', 'four'], expectedPoints: 20 }, // capped at 20
    { refs: ['one', 'two', 'three', 'four', 'five'], expectedPoints: 20 } // still capped
  ];
  
  testCases.forEach(({ refs, expectedPoints }) => {
    const term = {
      term: 'Test',
      definition: 'Test',
      see_also: refs
    };
    const result = scoreTerm(term);
    const refPoints = result.score - 20; // subtract base
    assert.equal(refPoints, expectedPoints,
      `${refs.length} cross-references should give ${expectedPoints} points`);
  });
});

test('scoreTerm: controversy badges are awarded', () => {
  const highControversy = {
    term: 'Test',
    definition: 'Test',
    controversy_level: 'high'
  };
  
  const mediumControversy = {
    term: 'Test',
    definition: 'Test',
    controversy_level: 'medium'
  };
  
  const highResult = scoreTerm(highControversy);
  assert.ok(highResult.badges.includes('🔥 Flame Warrior'), 'Should award Flame Warrior badge');
  
  const mediumResult = scoreTerm(mediumControversy);
  assert.ok(mediumResult.badges.includes('🌶️ Spicy Take'), 'Should award Spicy Take badge');
});

test('scoreTerm: achievement badges based on score', () => {
  const perfectTerm = {
    term: 'Perfect',
    definition: 'Perfect definition',
    humor: 'x'.repeat(150), // 30 points
    explanation: 'This is a long enough explanation to count for points',
    tags: ['tag1', 'tag2', 'tag3', 'tag4'], // 10 points
    see_also: ['ref1', 'ref2', 'ref3', 'ref4'] // 20 points
    // Total: 20 + 30 + 20 + 10 + 20 = 100
  };
  
  const starTerm = {
    term: 'Star',
    definition: 'Star definition',
    humor: 'x'.repeat(120), // 24 points
    explanation: 'Long enough explanation here',
    tags: ['tag1', 'tag2', 'tag3', 'tag4'], // 10 points
    see_also: ['ref1', 'ref2', 'ref3'] // 15 points
    // Total: 20 + 24 + 20 + 10 + 15 = 89 (but let's get it to 80-89 range)
  };
  
  const strongTerm = {
    term: 'Strong',
    definition: 'Strong definition',
    humor: 'x'.repeat(100), // 20 points
    explanation: 'Long enough explanation here',
    tags: ['tag1', 'tag2'], // 6 points
    see_also: ['ref1', 'ref2'] // 10 points
    // Total: 20 + 20 + 20 + 6 + 10 = 76
  };
  
  const perfectResult = scoreTerm(perfectTerm);
  assert.ok(perfectResult.badges.includes('💯 Perfectionist'), 'Score 90+ should get Perfectionist badge');
  
  // Adjust starTerm to be in 80-89 range
  starTerm.humor = 'x'.repeat(105); // 21 points
  const starResult = scoreTerm(starTerm);
  assert.ok(starResult.badges.includes('⭐ Star Contributor'), 'Score 80-89 should get Star Contributor badge');
  
  const strongResult = scoreTerm(strongTerm);
  assert.ok(strongResult.badges.includes('💪 Strong Entry'), 'Score 70-79 should get Strong Entry badge');
});

test('scoreTerm: score is capped at 100', () => {
  const maxTerm = {
    term: 'Max',
    definition: 'Max definition',
    humor: 'x'.repeat(200), // Would be 40, but capped at 30
    explanation: 'Long enough explanation',
    tags: ['t1', 't2', 't3', 't4', 't5', 't6'], // Would be 18, but capped at 10
    see_also: ['r1', 'r2', 'r3', 'r4', 'r5'] // Would be 25, but capped at 20
  };
  
  const result = scoreTerm(maxTerm);
  assert.equal(result.score, 100, 'Score should be capped at 100');
});

test('scoreTerm: handles missing optional fields gracefully', () => {
  const term = {
    term: 'Test',
    definition: 'Test'
    // No optional fields
  };
  
  const result = scoreTerm(term);
  assert.equal(result.score, 20, 'Should handle missing optional fields');
  assert.ok(Array.isArray(result.badges), 'Should return badges array');
});

test('scoreTerm: handles null/undefined fields', () => {
  const term = {
    term: 'Test',
    definition: 'Test',
    humor: null,
    explanation: undefined,
    tags: null,
    see_also: undefined
  };
  
  const result = scoreTerm(term);
  assert.equal(result.score, 20, 'Should handle null/undefined fields');
});

test('scoreTerm: validates tags and see_also are arrays', () => {
  const term1 = {
    term: 'Test',
    definition: 'Test',
    tags: 'not-an-array', // Should be ignored
    see_also: 'also-not-an-array' // Should be ignored
  };
  
  const result1 = scoreTerm(term1);
  assert.equal(result1.score, 20, 'Should ignore non-array tags and see_also');
  
  const term2 = {
    term: 'Test',
    definition: 'Test',
    tags: [], // Empty array
    see_also: [] // Empty array
  };
  
  const result2 = scoreTerm(term2);
  assert.equal(result2.score, 20, 'Should handle empty arrays');
});

test('getScoreBreakdown: returns detailed breakdown', () => {
  const term = {
    term: 'Test',
    definition: 'Test definition',
    humor: 'x'.repeat(25), // 5 points
    explanation: 'This is a long enough explanation',
    tags: ['tag1', 'tag2'], // 6 points
    see_also: ['ref1', 'ref2', 'ref3'] // 15 points
  };
  
  const breakdown = getScoreBreakdown(term);
  
  assert.equal(breakdown.base, 20, 'Base should be 20');
  assert.equal(breakdown.humor, 5, 'Humor should be 5');
  assert.equal(breakdown.explanation, 20, 'Explanation should be 20');
  assert.equal(breakdown.tags, 6, 'Tags should be 6');
  assert.equal(breakdown.crossReferences, 15, 'Cross-references should be 15');
  
  assert.ok(breakdown.maxScores, 'Should include max scores');
  assert.equal(breakdown.maxScores.base, 20);
  assert.equal(breakdown.maxScores.humor, 30);
  assert.equal(breakdown.maxScores.explanation, 20);
  assert.equal(breakdown.maxScores.tags, 10);
  assert.equal(breakdown.maxScores.crossReferences, 20);
});

test('getScoreBreakdown: handles minimal term', () => {
  const term = {
    term: 'Test',
    definition: 'Test'
  };
  
  const breakdown = getScoreBreakdown(term);
  
  assert.equal(breakdown.base, 20, 'Base should be 20');
  assert.equal(breakdown.humor, 0, 'Humor should be 0');
  assert.equal(breakdown.explanation, 0, 'Explanation should be 0');
  assert.equal(breakdown.tags, 0, 'Tags should be 0');
  assert.equal(breakdown.crossReferences, 0, 'Cross-references should be 0');
});

test('scoreTerm and getScoreBreakdown: total matches', () => {
  const term = {
    term: 'Test',
    definition: 'Test definition',
    humor: 'x'.repeat(50), // 10 points
    explanation: 'This is a sufficient explanation for scoring',
    tags: ['tag1', 'tag2', 'tag3'], // 9 points
    see_also: ['ref1', 'ref2'] // 10 points
  };
  
  const result = scoreTerm(term);
  const breakdown = getScoreBreakdown(term);
  
  const calculatedTotal = breakdown.base + breakdown.humor + 
                          breakdown.explanation + breakdown.tags + 
                          breakdown.crossReferences;
  
  assert.equal(result.score, calculatedTotal, 
    'Score from scoreTerm should match sum of breakdown components');
});
