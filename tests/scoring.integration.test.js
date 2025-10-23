const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreTerm } = require('../scripts/scoring');

test('Integration: All scripts use consistent scoring', () => {
  // Use mock terms instead of reading from terms.yaml to avoid race conditions
  const terms = [
    {
      term: 'Test Term 1',
      definition: 'A basic definition',
      humor: 'x'.repeat(50),
      explanation: 'A detailed explanation that meets the length requirement',
      tags: ['tag1', 'tag2'],
      see_also: ['ref1', 'ref2']
    },
    {
      term: 'Test Term 2',
      definition: 'Another definition',
      humor: 'x'.repeat(100),
      tags: ['tag1'],
      see_also: ['ref1']
    },
    {
      term: 'Test Term 3',
      definition: 'Minimal definition'
    }
  ];
  
  assert.ok(terms.length > 0, 'Should have terms to test');
  
  // Test scoring for multiple terms to ensure consistency
  const sampleTerms = terms.slice(0, Math.min(3, terms.length));
  
  sampleTerms.forEach(term => {
    const result = scoreTerm(term);
    
    // Verify result structure
    assert.ok(typeof result.score === 'number', `Score should be a number for ${term.term}`);
    assert.ok(result.score >= 0 && result.score <= 100, 
      `Score should be between 0 and 100 for ${term.term}, got ${result.score}`);
    assert.ok(Array.isArray(result.badges), `Badges should be an array for ${term.term}`);
    
    // Verify minimum score for valid terms
    if (term.term && term.definition) {
      assert.ok(result.score >= 20, 
        `Valid term ${term.term} should have at least 20 points`);
    }
  });
});

test('Integration: Scoring algorithm produces expected ranges', () => {
  // Test minimum score term
  const minTerm = {
    term: 'Min',
    definition: 'Minimal'
  };
  const minResult = scoreTerm(minTerm);
  assert.equal(minResult.score, 20, 'Minimal term should score exactly 20');
  
  // Test term with all components
  const maxTerm = {
    term: 'Maximum',
    definition: 'A comprehensive definition',
    humor: 'x'.repeat(150), // 30 points (capped)
    explanation: 'A detailed explanation that is long enough to count',
    tags: ['tag1', 'tag2', 'tag3', 'tag4'], // 10 points (capped)
    see_also: ['ref1', 'ref2', 'ref3', 'ref4'] // 20 points (capped)
  };
  const maxResult = scoreTerm(maxTerm);
  assert.equal(maxResult.score, 100, 'Maximum term should score 100');
  
  // Test mid-range term
  const midTerm = {
    term: 'Mid',
    definition: 'A definition',
    humor: 'x'.repeat(25), // 5 points
    explanation: 'A reasonable explanation here'
  };
  const midResult = scoreTerm(midTerm);
  assert.equal(midResult.score, 45, 'Mid-range term should score 45');
});

test('Integration: Badge system works correctly', () => {
  // Test controversy badges
  const controversialTerm = {
    term: 'Test',
    definition: 'Test',
    controversy_level: 'high'
  };
  const controversialResult = scoreTerm(controversialTerm);
  assert.ok(controversialResult.badges.includes('🔥 Flame Warrior'), 
    'High controversy should award Flame Warrior badge');
  
  // Test achievement badges
  const highScoringTerm = {
    term: 'High',
    definition: 'High def',
    humor: 'x'.repeat(150), // 30 points
    explanation: 'Long explanation that counts',
    tags: ['t1', 't2', 't3', 't4'], // 10 points
    see_also: ['r1', 'r2', 'r3', 'r4'] // 20 points
  };
  const highResult = scoreTerm(highScoringTerm);
  assert.ok(highResult.score >= 90, 'Should score 90+');
  assert.ok(highResult.badges.includes('💯 Perfectionist'), 
    'Score 90+ should award Perfectionist badge');
  
  // Test comedy gold badge
  const funnyTerm = {
    term: 'Funny',
    definition: 'Funny def',
    humor: 'x'.repeat(101) // Over 100 chars
  };
  const funnyResult = scoreTerm(funnyTerm);
  assert.ok(funnyResult.badges.includes('😂 Comedy Gold'), 
    'Long humor should award Comedy Gold badge');
});

test('Integration: Edge cases are handled', () => {
  // Empty/null fields
  const emptyFieldsTerm = {
    term: 'Test',
    definition: 'Test',
    humor: '',
    explanation: null,
    tags: [],
    see_also: undefined
  };
  const emptyResult = scoreTerm(emptyFieldsTerm);
  assert.equal(emptyResult.score, 20, 'Empty fields should not add points');
  
  // Invalid types
  const invalidTypesTerm = {
    term: 'Test',
    definition: 'Test',
    tags: 'not-an-array',
    see_also: 123
  };
  const invalidResult = scoreTerm(invalidTypesTerm);
  assert.equal(invalidResult.score, 20, 'Invalid types should be ignored');
  
  // Short explanation (should not count)
  const shortExplanationTerm = {
    term: 'Test',
    definition: 'Test',
    explanation: 'Too short' // Less than 20 chars
  };
  const shortResult = scoreTerm(shortExplanationTerm);
  assert.equal(shortResult.score, 20, 'Short explanation should not count');
});
