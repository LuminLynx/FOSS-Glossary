const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'sortYaml.js');

// Helper to create a temporary YAML file
function createTempYaml(content) {
  const tmpFile = `/tmp/test-terms-${Date.now()}.yaml`;
  fs.writeFileSync(tmpFile, content, 'utf8');
  return tmpFile;
}

// Helper to run sortYaml.js script
function runSort(yamlPath, checkMode = false) {
  const args = checkMode ? '--check' : '';
  try {
    const output = execSync(`node ${SCRIPT_PATH} ${args}`, {
      cwd: path.dirname(yamlPath),
      env: { ...process.env, TERMS_FILE: yamlPath },
      encoding: 'utf8',
    });
    return { success: true, output, exitCode: 0 };
  } catch (error) {
    return { success: false, output: error.stdout || '', exitCode: error.status };
  }
}

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

  const tmpFile = createTempYaml(unsorted);
  
  try {
    // Change to temp directory and create the file there
    const tmpDir = '/tmp/test-sort-yaml';
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    fs.mkdirSync(tmpDir);
    const termsFile = path.join(tmpDir, 'terms.yaml');
    fs.writeFileSync(termsFile, unsorted, 'utf8');
    
    // Run sort
    execSync(`node ${SCRIPT_PATH}`, { cwd: tmpDir, encoding: 'utf8' });
    
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
    
    // Clean up
    fs.rmSync(tmpDir, { recursive: true });
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
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

  const tmpDir = '/tmp/test-sort-check';
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, unsorted, 'utf8');

  try {
    // Run check mode - should fail
    execSync(`node ${SCRIPT_PATH} --check`, { cwd: tmpDir, encoding: 'utf8' });
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

  const tmpDir = '/tmp/test-sort-check-pass';
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

  const tmpDir = '/tmp/test-sort-header';
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const termsFile = path.join(tmpDir, 'terms.yaml');
  fs.writeFileSync(termsFile, withHeader, 'utf8');

  try {
    execSync(`node ${SCRIPT_PATH}`, { cwd: tmpDir, encoding: 'utf8' });
    const sorted = fs.readFileSync(termsFile, 'utf8');
    assert.ok(
      sorted.startsWith('# FOSS Glossary'),
      'Header comment should be preserved'
    );
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

  const tmpDir = '/tmp/test-sort-quotes';
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
