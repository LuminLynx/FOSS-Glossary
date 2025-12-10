const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for trendWatcher.js sanitization logic
 * These tests verify that the JSON parsing handles markdown code fences correctly
 */

// Test helper function that mimics the sanitization logic in trendWatcher.js
function sanitizeAndParse(messageContent) {
  let content = messageContent
    .trim()
    .replace(/^```(?:json)?\s*/i, '') // remove opening ``` or ```json
    .replace(/\s*```$/i, ''); // remove trailing ```
  const m = content.match(/\{[\s\S]*\}/); // extract first {...} block if present
  if (m) content = m[0];

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    const snippet = content.length > 500 ? content.slice(0, 500) + '...' : content;
    throw new Error(
      `Failed to parse AI response as JSON: ${parseError.message}. Response snippet: ${snippet}`
    );
  }
  return parsed;
}

// Test cases
test('sanitizeAndParse: handles plain JSON object', () => {
  const input = '{"definition": "test", "humor": "funny", "tags": ["a", "b"]}';
  const result = sanitizeAndParse(input);
  assert.deepEqual(result, {
    definition: 'test',
    humor: 'funny',
    tags: ['a', 'b'],
  });
});

test('sanitizeAndParse: strips markdown code fence with json', () => {
  const input = '```json\n{"definition": "test", "humor": "funny", "tags": ["a"]}\n```';
  const result = sanitizeAndParse(input);
  assert.deepEqual(result, {
    definition: 'test',
    humor: 'funny',
    tags: ['a'],
  });
});

test('sanitizeAndParse: strips markdown code fence without language', () => {
  const input = '```\n{"definition": "test", "humor": "funny", "tags": ["a"]}\n```';
  const result = sanitizeAndParse(input);
  assert.deepEqual(result, {
    definition: 'test',
    humor: 'funny',
    tags: ['a'],
  });
});

test('sanitizeAndParse: extracts JSON from text with surrounding content', () => {
  const input = 'Here is the JSON:\n{"definition": "test", "humor": "funny", "tags": ["a"]}\nDone!';
  const result = sanitizeAndParse(input);
  assert.deepEqual(result, {
    definition: 'test',
    humor: 'funny',
    tags: ['a'],
  });
});

test('sanitizeAndParse: handles JSON with nested objects', () => {
  const input = '```json\n{"definition": "test", "nested": {"key": "value"}, "tags": ["a"]}\n```';
  const result = sanitizeAndParse(input);
  assert.deepEqual(result, {
    definition: 'test',
    nested: { key: 'value' },
    tags: ['a'],
  });
});

test('sanitizeAndParse: handles JSON with whitespace', () => {
  const input = `
  \`\`\`json
  {
    "definition": "test",
    "humor": "funny",
    "tags": ["a", "b"]
  }
  \`\`\`
  `;
  const result = sanitizeAndParse(input);
  assert.deepEqual(result, {
    definition: 'test',
    humor: 'funny',
    tags: ['a', 'b'],
  });
});

test('sanitizeAndParse: throws error for invalid JSON', () => {
  const input = '```json\n{invalid json}\n```';
  assert.throws(() => sanitizeAndParse(input), {
    message: /Failed to parse AI response as JSON/,
  });
});

test('sanitizeAndParse: error message includes snippet for long content', () => {
  const longInvalid = '{' + 'x'.repeat(600) + '}';
  try {
    sanitizeAndParse(longInvalid);
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.match(error.message, /Response snippet:/);
    assert.match(error.message, /\.\.\./); // Should be truncated
  }
});

test('sanitizeAndParse: handles case-insensitive json marker', () => {
  const input = '```JSON\n{"definition": "test", "humor": "funny", "tags": ["a"]}\n```';
  const result = sanitizeAndParse(input);
  assert.deepEqual(result, {
    definition: 'test',
    humor: 'funny',
    tags: ['a'],
  });
});

test('sanitizeAndParse: handles empty object', () => {
  const input = '```json\n{}\n```';
  const result = sanitizeAndParse(input);
  assert.deepEqual(result, {});
});
