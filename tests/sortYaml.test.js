const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, execFileSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'sortYaml.js');

test('sortYaml: sorts terms alphabetically by slug', () => {
  const unsorted = `# Header comment
terms:
  - slug: zebra
    term: Zebra
  - slug: apple
    term: Apple
  - slug: middle
    term: Middle
`;

  const tmpDir = path.join(os.tmpdir(), `test-sort-yaml-${Date.now()}`);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, unsorted, 'utf8');

  try {
    // Run sort
    execFileSync('node', [SCRIPT_PATH], { cwd: tmpDir, encoding: 'utf8' });

    // Read sorted file
    const sorted = fs.readFileSync(termsFile, 'utf8');

    // Verify header is preserved
    assert.ok(sorted.startsWith('# Header comment'), 'Header comment should be preserved');

    // Verify terms are sorted
    const lines = sorted.split('\n');
    const slugLine1 = lines.findIndex((l) => l.includes('slug: apple'));
    const slugLine2 = lines.findIndex((l) => l.includes('slug: middle'));
    const slugLine3 = lines.findIndex((l) => l.includes('slug: zebra'));

    assert.ok(slugLine1 < slugLine2, 'apple should come before middle');
    assert.ok(slugLine2 < slugLine3, 'middle should come before zebra');
  } finally {
    // Clean up
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  }
});

test('sortYaml: check mode detects unsorted terms', () => {
  const unsorted = `terms:
  - slug: zebra
    term: Zebra
  - slug: apple
    term: Apple
`;

  const tmpDir = path.join(os.tmpdir(), `test-sort-check-${Date.now()}`);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, unsorted, 'utf8');

  try {
    // Run check mode - should fail
    execFileSync('node', [SCRIPT_PATH, '--check'], { cwd: tmpDir, encoding: 'utf8' });
    assert.fail('Check mode should have failed for unsorted terms');
  } catch (error) {
    assert.strictEqual(error.status, 1, 'Should exit with code 1');
    const output = error.stdout || error.stderr || '';
    assert.ok(
      output.includes('not sorted') || output.includes('Run: npm run sort:yaml'),
      'Should indicate terms are not sorted'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('sortYaml: check mode passes for sorted terms', () => {
  const sorted = `terms:
  - slug: apple
    term: Apple
  - slug: zebra
    term: Zebra
`;

  const tmpDir = path.join(os.tmpdir(), `test-sort-check-pass-${Date.now()}`);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, sorted, 'utf8');

  try {
    const output = execSync(`node ${SCRIPT_PATH} --check`, {
      cwd: tmpDir,
      encoding: 'utf8',
    });
    assert.ok(output.includes('properly sorted'), 'Should indicate terms are sorted');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('sortYaml: preserves header comment', () => {
  const withHeader = `# FOSS Glossary - Community-driven definitions
terms:
  - slug: zebra
    term: Zebra
  - slug: apple
    term: Apple
`;

  const tmpDir = path.join(os.tmpdir(), `test-sort-header-${Date.now()}`);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, withHeader, 'utf8');

  try {
    execSync(`node ${SCRIPT_PATH}`, { cwd: tmpDir, encoding: 'utf8' });
    const sorted = fs.readFileSync(termsFile, 'utf8');
    assert.ok(sorted.startsWith('# FOSS Glossary'), 'Header comment should be preserved');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('sortYaml: handles strings with apostrophes correctly', () => {
  const withApostrophe = `terms:
  - slug: test
    term: Test
    humor: "This doesn't fail"
`;

  const tmpDir = path.join(os.tmpdir(), `test-sort-quotes-${Date.now()}`);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, withApostrophe, 'utf8');

  try {
    execSync(`node ${SCRIPT_PATH}`, { cwd: tmpDir, encoding: 'utf8' });
    const sorted = fs.readFileSync(termsFile, 'utf8');
    // Should preserve apostrophes correctly (js-yaml handles quote escaping automatically)
    assert.ok(sorted.includes("doesn't"), 'Should preserve apostrophes correctly');
    assert.ok(sorted.includes('humor: '), 'Should have humor field');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('sortYaml: normalizes key order within terms', () => {
  const unsortedKeys = `terms:
  - tags:
      - test
    humor: Funny
    slug: test-term
    definition: This is a test term with at least eighty characters to meet the minimum length requirement.
    term: Test Term
    explanation: Extra info
`;

  const tmpDir = path.join(os.tmpdir(), `test-sort-keys-${Date.now()}`);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, unsortedKeys, 'utf8');

  try {
    execSync(`node ${SCRIPT_PATH}`, { cwd: tmpDir, encoding: 'utf8' });
    const sorted = fs.readFileSync(termsFile, 'utf8');

    // Verify canonical key order: slug, term, definition, explanation, humor, see_also, tags, aliases, controversy_level
    const lines = sorted.split('\n');
    const slugIdx = lines.findIndex((l) => l.trim().startsWith('slug:'));
    const termIdx = lines.findIndex((l) => l.trim().startsWith('term:'));
    const definitionIdx = lines.findIndex((l) => l.trim().startsWith('definition:'));
    const explanationIdx = lines.findIndex((l) => l.trim().startsWith('explanation:'));
    const humorIdx = lines.findIndex((l) => l.trim().startsWith('humor:'));
    const tagsIdx = lines.findIndex((l) => l.trim().startsWith('tags:'));

    assert.ok(slugIdx < termIdx, 'slug should come before term');
    assert.ok(termIdx < definitionIdx, 'term should come before definition');
    assert.ok(definitionIdx < explanationIdx, 'definition should come before explanation');
    assert.ok(explanationIdx < humorIdx, 'explanation should come before humor');
    assert.ok(humorIdx < tagsIdx, 'humor should come before tags');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('sortYaml: check mode detects unsorted keys', () => {
  const unsortedKeys = `terms:
  - definition: This is a test term with at least eighty characters to meet the minimum length requirement.
    slug: test-term
    term: Test Term
`;

  const tmpDir = path.join(os.tmpdir(), `test-check-keys-${Date.now()}`);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, unsortedKeys, 'utf8');

  try {
    // Run check mode - should fail because keys are not in canonical order
    execFileSync('node', [SCRIPT_PATH, '--check'], { cwd: tmpDir, encoding: 'utf8' });
    assert.fail('Check mode should have failed for unsorted keys');
  } catch (error) {
    assert.strictEqual(error.status, 1, 'Should exit with code 1');
    const output = error.stdout || error.stderr || '';
    assert.ok(
      output.includes('not sorted') || output.includes('Run: npm run sort:yaml'),
      'Should indicate YAML is not sorted'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});
