const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  ensureDirectoryForFile,
  loadYaml,
  loadJson,
  loadTermsYaml,
} = require('../utils/fileSystem');

// Tests for ensureDirectoryForFile
test('ensureDirectoryForFile: creates directory for file', () => {
  const testDir = '/tmp/test-fs-utils';
  const testFile = path.join(testDir, 'subdir', 'test.txt');

  // Clean up first
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }

  ensureDirectoryForFile(testFile);

  assert.ok(fs.existsSync(path.dirname(testFile)));

  // Clean up
  fs.rmSync(testDir, { recursive: true });
});

test('ensureDirectoryForFile: handles file in current directory', () => {
  // Should not throw for file in current directory
  ensureDirectoryForFile('test.txt');
  ensureDirectoryForFile('./test.txt');
});

test('ensureDirectoryForFile: creates nested directories', () => {
  const testDir = '/tmp/test-fs-nested';
  const testFile = path.join(testDir, 'a', 'b', 'c', 'test.txt');

  // Clean up first
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }

  ensureDirectoryForFile(testFile);

  assert.ok(fs.existsSync(path.dirname(testFile)));

  // Clean up
  fs.rmSync(testDir, { recursive: true });
});

// Tests for loadYaml
test('loadYaml: loads valid YAML file', () => {
  const result = loadYaml('terms.yaml');
  assert.ok(result);
  assert.ok(typeof result === 'object');
  assert.ok(Array.isArray(result.terms));
});

test('loadYaml: loads schema.json as YAML', () => {
  const result = loadYaml('schema.json');
  assert.ok(result);
  assert.ok(typeof result === 'object');
});

// Tests for loadJson
test('loadJson: loads valid JSON file', () => {
  const result = loadJson('schema.json');
  assert.ok(result);
  assert.ok(typeof result === 'object');
});

test('loadJson: loads package.json', () => {
  const result = loadJson('package.json');
  assert.ok(result);
  assert.equal(result.name, 'foss-glossary');
});

// Tests for loadTermsYaml
test('loadTermsYaml: loads terms.yaml successfully', () => {
  const terms = loadTermsYaml();
  assert.ok(Array.isArray(terms));
  assert.ok(terms.length > 0);
  // Check first term has expected structure
  assert.ok(terms[0].slug);
  assert.ok(terms[0].term);
  assert.ok(terms[0].definition);
});

test('loadTermsYaml: returns array of term objects', () => {
  const terms = loadTermsYaml();
  terms.forEach((term) => {
    assert.ok(typeof term === 'object');
    assert.ok(term.slug);
    assert.ok(term.term);
    assert.ok(term.definition);
  });
});
