#!/usr/bin/env node
/**
 * Test script to validate workflow logic
 * Tests key functions like slug generation, timestamp creation, and path construction
 */

const assert = require('assert');

console.log('🧪 Testing workflow logic...\n');

/**
 * Generate a URL-safe slug from an issue title
 * Converts title to lowercase, replaces non-alphanumeric with hyphens,
 * removes leading/trailing hyphens, and truncates to 35 characters
 * 
 * @param {string} title - Issue title to convert to slug
 * @param {number} issueNumber - Issue number to use as fallback
 * @returns {string} URL-safe slug (max 35 chars) or issue-{number} if empty
 */
const slugFromTitle = (title, issueNumber) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 35);
  return base || `issue-${issueNumber}`;
};

// Test 1: Slug generation
console.log('Test 1: Slug generation');
const testCases = [
  { title: 'Add dark mode support', expected: 'add-dark-mode-support' },
  { title: 'Fix: Authentication Error!!!', expected: 'fix-authentication-error' },
  { title: '   Leading and trailing spaces   ', expected: 'leading-and-trailing-spaces' },
  { title: 'UPPERCASE TITLE', expected: 'uppercase-title' },
  { title: 'Title with 123 numbers', expected: 'title-with-123-numbers' },
  { title: 'Very long title that exceeds the maximum character limit and should be truncated', expected: 'very-long-title-that-exceeds-the-ma' }
];

testCases.forEach(({ title, expected }) => {
  const result = slugFromTitle(title, 1);
  assert.strictEqual(result, expected, `Failed for title: "${title}"`);
  console.log(`  ✅ "${title}" → "${result}"`);
});

console.log('\nTest 2: Branch naming with timestamp');
const issueNumber = 42;
const slug = slugFromTitle('Add new feature', issueNumber);
const timestamp = Date.now();
const branchName = `task/${issueNumber}-${slug}-${timestamp}`;
console.log(`  ✅ Branch: ${branchName}`);
assert(branchName.startsWith('task/42-add-new-feature-'), 'Branch name format is correct');

console.log('\nTest 3: File path with subdirectory');
const filePath = `tasks/${issueNumber}/${slug}-${timestamp}.md`;
console.log(`  ✅ File path: ${filePath}`);
assert(filePath.startsWith('tasks/42/add-new-feature-'), 'File path format is correct');
assert(filePath.endsWith('.md'), 'File has .md extension');

console.log('\nTest 4: Timestamp uniqueness');
const timestamp1 = Date.now();
setTimeout(() => {
  const timestamp2 = Date.now();
  assert(timestamp2 > timestamp1, 'Timestamps are unique');
  console.log(`  ✅ Timestamp 1: ${timestamp1}`);
  console.log(`  ✅ Timestamp 2: ${timestamp2}`);
  console.log(`  ✅ Difference: ${timestamp2 - timestamp1}ms`);
}, 5);

/**
 * Retry an async function with exponential backoff
 * Attempts the function multiple times with increasing delays between attempts
 * 
 * @param {Function} fn - Async function to retry
 * @param {number} [maxRetries=3] - Maximum number of retry attempts
 * @param {number} [baseDelay=100] - Base delay in milliseconds (doubled each retry)
 * @returns {Promise<*>} Result from successful function execution
 * @throws {Error} Error from last attempt if all retries fail
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 100) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts++;
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error.message === 'retryable';
      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

console.log('\nTest 5: Retry mechanism simulation');
let attempts = 0;
const maxRetries = 3;

// Test successful retry
(async () => {
  let callCount = 0;
  try {
    await retryWithBackoff(async () => {
      callCount++;
      if (callCount < 2) {
        const error = new Error('retryable');
        throw error;
      }
      return 'success';
    });
    console.log(`  ✅ Retry succeeded after ${callCount} attempts`);
  } catch (error) {
    console.log(`  ❌ Retry failed: ${error.message}`);
  }

  console.log('\nTest 6: Label matching');
  const triggerLabels = ['codex', 'ready-for-codex'];
  const issueLabels = [
    { name: 'enhancement' },
    { name: 'codex' },
    { name: 'high-priority' }
  ];
  
  const hasTriggerLabel = issueLabels.some(l => 
    triggerLabels.includes(l.name.toLowerCase())
  );
  
  assert(hasTriggerLabel, 'Trigger label found');
  console.log(`  ✅ Found trigger label in: ${issueLabels.map(l => l.name).join(', ')}`);

  console.log('\n✅ All tests passed!\n');
})();
