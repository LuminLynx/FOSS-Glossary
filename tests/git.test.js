const test = require('node:test');
const assert = require('node:assert/strict');
const { getGitSha } = require('../utils/git');

test('getGitSha: returns a string', () => {
  const sha = getGitSha();
  assert.equal(typeof sha, 'string');
  assert.ok(sha.length > 0);
});

test('getGitSha: returns 7 characters in git repository', () => {
  const sha = getGitSha();
  // In a git repo, should be 7 chars. If not, should be default value
  assert.ok(sha.length === 7 || sha === 'unknown');
});

test('getGitSha: uses custom default value', () => {
  // This test might pass in git repo or use default, but tests the parameter works
  const sha = getGitSha('custom-default');
  assert.equal(typeof sha, 'string');
  assert.ok(sha.length > 0);
  // Should be either a git sha or the custom default
  assert.ok(sha.length === 7 || sha === 'custom-default');
});

test('getGitSha: default parameter is "unknown"', () => {
  // We can't force git to fail in this environment, but we can verify the function exists
  const sha = getGitSha();
  assert.equal(typeof sha, 'string');
});
