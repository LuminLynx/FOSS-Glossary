const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', 'scripts', 'generateLandingPage.js');
const termsPath = path.join(__dirname, '..', 'terms.yaml');
const docsPath = path.join(__dirname, '..', 'docs');
const indexPath = path.join(docsPath, 'index.html');

// Helper to run script and capture exit code
function runScript(options = {}) {
  const { cwd = path.join(__dirname, '..') } = options;
  try {
    const output = execSync(`node "${scriptPath}"`, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { exitCode: 0, output };
  } catch (error) {
    return {
      exitCode: error.status || 1,
      output: error.stdout || '',
      error: error.stderr || error.message,
    };
  }
}

test('generateLandingPage: successful generation with valid terms.yaml', () => {
  const result = runScript();
  
  assert.equal(result.exitCode, 0, 'Script should exit with code 0');
  assert.ok(result.output.includes('✅ Generated landing page'), 'Should show success message');
  assert.ok(fs.existsSync(indexPath), 'Should create docs/index.html');
  
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.ok(html.includes('<!DOCTYPE html>'), 'Should contain valid HTML');
  assert.ok(html.includes('FOSS Glossary'), 'Should contain title');
});

test('generateLandingPage: fails gracefully with missing terms.yaml', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and remove terms.yaml
    fs.renameSync(termsPath, backupPath);
    
    const result = runScript();
    
    assert.equal(result.exitCode, 1, 'Script should exit with code 1');
    assert.ok(result.error.includes('terms.yaml file not found'), 'Should show file not found error');
  } finally {
    // Restore terms.yaml
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, termsPath);
    }
  }
});

test('generateLandingPage: fails gracefully with malformed YAML', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and create malformed YAML
    fs.renameSync(termsPath, backupPath);
    fs.writeFileSync(termsPath, 'invalid: yaml: [broken\n  bad: indentation', 'utf8');
    
    const result = runScript();
    
    assert.equal(result.exitCode, 1, 'Script should exit with code 1');
    assert.ok(result.error.includes('Error parsing terms.yaml'), 'Should show parsing error');
  } finally {
    // Restore terms.yaml
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
      }
      fs.renameSync(backupPath, termsPath);
    }
  }
});

test('generateLandingPage: fails gracefully with missing terms array', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and create YAML without terms array
    fs.renameSync(termsPath, backupPath);
    fs.writeFileSync(termsPath, 'some_field: value\nanother_field: 123', 'utf8');
    
    const result = runScript();
    
    assert.equal(result.exitCode, 1, 'Script should exit with code 1');
    assert.ok(result.error.includes('must contain a "terms" array'), 'Should show terms array error');
  } finally {
    // Restore terms.yaml
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
      }
      fs.renameSync(backupPath, termsPath);
    }
  }
});

test('generateLandingPage: fails gracefully with empty YAML', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and create empty YAML
    fs.renameSync(termsPath, backupPath);
    fs.writeFileSync(termsPath, '', 'utf8');
    
    const result = runScript();
    
    assert.equal(result.exitCode, 1, 'Script should exit with code 1');
    assert.ok(result.error.includes('must contain a valid YAML object'), 'Should show valid object error');
  } finally {
    // Restore terms.yaml
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
      }
      fs.renameSync(backupPath, termsPath);
    }
  }
});

test('generateLandingPage: creates docs directory if missing', () => {
  const backupDocsPath = `${docsPath}.backup-test`;
  
  try {
    // Backup docs directory if it exists
    if (fs.existsSync(docsPath)) {
      fs.renameSync(docsPath, backupDocsPath);
    }
    
    const result = runScript();
    
    assert.equal(result.exitCode, 0, 'Script should succeed');
    assert.ok(fs.existsSync(docsPath), 'Should create docs directory');
    assert.ok(fs.existsSync(indexPath), 'Should create docs/index.html');
  } finally {
    // Restore docs directory
    if (fs.existsSync(backupDocsPath)) {
      if (fs.existsSync(docsPath)) {
        fs.rmSync(docsPath, { recursive: true, force: true });
      }
      fs.renameSync(backupDocsPath, docsPath);
    }
  }
});

test('generateLandingPage: contains all expected HTML sections', () => {
  const result = runScript();
  
  assert.equal(result.exitCode, 0, 'Script should exit with code 0');
  assert.ok(fs.existsSync(indexPath), 'Should create docs/index.html');
  
  const html = fs.readFileSync(indexPath, 'utf8');
  
  // Verify document structure
  assert.ok(html.includes('<!DOCTYPE html>'), 'Should have DOCTYPE');
  assert.ok(html.includes('<html lang="en">'), 'Should have html tag with lang');
  assert.ok(html.includes('<head>'), 'Should have head section');
  assert.ok(html.includes('<body>'), 'Should have body section');
  
  // Verify meta tags
  assert.ok(html.includes('<meta charset="UTF-8">'), 'Should have charset meta tag');
  assert.ok(html.includes('<meta name="viewport"'), 'Should have viewport meta tag');
  assert.ok(html.includes('FOSS Glossary'), 'Should contain site title');
  
  // Verify main sections exist
  assert.ok(html.includes('LIVE STATISTICS'), 'Should have statistics section');
  assert.ok(html.includes('Total Terms'), 'Should display total terms stat');
  assert.ok(html.includes('Funny Terms'), 'Should display funny terms stat');
  assert.ok(html.includes('Humor Rate'), 'Should display humor rate stat');
  assert.ok(html.includes('Categories'), 'Should display categories stat');
  
  // Verify other key sections
  assert.ok(html.includes('Latest Additions'), 'Should have recent additions section');
  assert.ok(html.includes('Recent Terms'), 'Should have term cards section');
  assert.ok(html.includes('How Scoring Works'), 'Should have scoring section');
  assert.ok(html.includes('Contribute on GitHub'), 'Should have CTA button');
  assert.ok(html.includes('Last updated'), 'Should have footer with timestamp');
  
  // Verify styling is included
  assert.ok(html.includes('<style>'), 'Should include CSS styles');
  assert.ok(html.includes('.term-card'), 'Should include term card styles');
  assert.ok(html.includes('@media (prefers-color-scheme: light)'), 'Should include light theme media query');
  
  // Verify script tag for terms.json
  assert.ok(html.includes('window.__TERMS_JSON_URL'), 'Should include terms JSON URL');
  assert.ok(html.includes('terms.json?ver='), 'Should include version parameter');
});

test('generateLandingPage: XSS protection - escapes malicious term names', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and create YAML with XSS payloads
    fs.renameSync(termsPath, backupPath);
    const maliciousYaml = `terms:
  - slug: xss-test-1
    term: "<script>alert('XSS')</script>"
    definition: "A test term with script tag"
    tags: ["test"]
  - slug: xss-test-2
    term: "<img src=x onerror='alert(1)'>"
    definition: "A test term with img tag"
    tags: ["test"]
  - slug: xss-test-3
    term: "Normal Term"
    definition: "<script>alert('XSS in definition')</script>"
    tags: ["test"]`;
    fs.writeFileSync(termsPath, maliciousYaml, 'utf8');
    
    const result = runScript();
    
    assert.equal(result.exitCode, 0, 'Script should succeed with malicious input');
    assert.ok(fs.existsSync(indexPath), 'Should create docs/index.html');
    
    const html = fs.readFileSync(indexPath, 'utf8');
    
    // Verify that script tags are escaped, not executed
    assert.ok(!html.includes("<script>alert('XSS')</script>"), 'Should not contain unescaped script tag in term name');
    assert.ok(html.includes('&lt;script&gt;'), 'Should escape script tag opening');
    assert.ok(html.includes('&lt;/script&gt;'), 'Should escape script tag closing');
    
    // Verify img onerror is escaped
    assert.ok(!html.includes("onerror='alert(1)'"), 'Should not contain unescaped onerror handler');
    assert.ok(html.includes('&lt;img'), 'Should escape img tag');
    
    // Verify definition is also escaped
    assert.ok(!html.includes("<script>alert('XSS in definition')</script>"), 'Should not contain unescaped script in definition');
  } finally {
    // Restore terms.yaml
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
      }
      fs.renameSync(backupPath, termsPath);
    }
  }
});

test('generateLandingPage: XSS protection - escapes malicious tags', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and create YAML with XSS in tags
    fs.renameSync(termsPath, backupPath);
    const maliciousYaml = `terms:
  - slug: tag-xss-test
    term: "Test Term"
    definition: "A test term with malicious tag"
    tags: ["<script>alert('XSS')</script>", "onclick='alert(1)'", "normal-tag"]`;
    fs.writeFileSync(termsPath, maliciousYaml, 'utf8');
    
    const result = runScript();
    
    assert.equal(result.exitCode, 0, 'Script should succeed');
    const html = fs.readFileSync(indexPath, 'utf8');
    
    // Verify tags are escaped
    assert.ok(html.includes('&lt;script&gt;'), 'Should escape script tag in tags');
    assert.ok(!html.includes("onclick='alert(1)'"), 'Should not contain unescaped onclick handler in tags');
  } finally {
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
      }
      fs.renameSync(backupPath, termsPath);
    }
  }
});

test('generateLandingPage: XSS protection - escapes HTML entities in humor', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and create YAML with XSS in humor
    fs.renameSync(termsPath, backupPath);
    const maliciousYaml = `terms:
  - slug: humor-xss-test
    term: "Test Term"
    definition: "A test term"
    humor: "<img src=x onerror=alert(1)> & <script>alert(1)</script>"
    tags: ["test"]`;
    fs.writeFileSync(termsPath, maliciousYaml, 'utf8');
    
    const result = runScript();
    
    assert.equal(result.exitCode, 0, 'Script should succeed');
    const html = fs.readFileSync(indexPath, 'utf8');
    
    // Verify humor content is escaped - check that HTML tags are escaped not rendered
    assert.ok(!html.includes('<img src=x'), 'Should not contain unescaped img tag in humor');
    assert.ok(html.includes('&lt;img'), 'Should escape img tag opening in humor');
    assert.ok(html.includes('&amp;'), 'Should escape ampersand in humor');
    assert.ok(html.includes('&lt;script&gt;'), 'Should escape script tag in humor');
    assert.ok(html.includes('&lt;/script&gt;'), 'Should escape script closing tag in humor');
  } finally {
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
      }
      fs.renameSync(backupPath, termsPath);
    }
  }
});

test('generateLandingPage: XSS protection - escapes recent terms in stats', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and create YAML where recent terms have XSS
    fs.renameSync(termsPath, backupPath);
    const maliciousYaml = `terms:
  - slug: safe-term
    term: "Safe Term"
    definition: "A safe term"
    tags: ["test"]
  - slug: xss-recent
    term: "<script>alert('Recent XSS')</script>"
    definition: "A malicious recent term"
    tags: ["test"]`;
    fs.writeFileSync(termsPath, maliciousYaml, 'utf8');
    
    const result = runScript();
    
    assert.equal(result.exitCode, 0, 'Script should succeed');
    const html = fs.readFileSync(indexPath, 'utf8');
    
    // Find the recent additions section
    const recentSection = html.match(/<div class="recent-terms">[\s\S]*?<\/div>/);
    assert.ok(recentSection, 'Should have recent terms section');
    
    // Verify recent terms are escaped
    assert.ok(!recentSection[0].includes("<script>alert('Recent XSS')</script>"), 'Should not contain unescaped script in recent terms');
    assert.ok(recentSection[0].includes('&lt;script&gt;'), 'Should escape script tags in recent terms');
  } finally {
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
      }
      fs.renameSync(backupPath, termsPath);
    }
  }
});

test('generateLandingPage: XSS protection - escapes special characters', () => {
  const backupPath = `${termsPath}.backup-test`;
  
  try {
    // Backup and create YAML with various special characters
    fs.renameSync(termsPath, backupPath);
    const maliciousYaml = `terms:
  - slug: special-chars
    term: "Test & <Title> with 'quotes' and \\"double\\""
    definition: "Definition with & < > ' \\" characters"
    humor: "Humor & <fun> with 'quotes'"
    tags: ["tag&special", "<tag>"]`;
    fs.writeFileSync(termsPath, maliciousYaml, 'utf8');
    
    const result = runScript();
    
    assert.equal(result.exitCode, 0, 'Script should succeed');
    const html = fs.readFileSync(indexPath, 'utf8');
    
    // Verify all special characters are escaped
    assert.ok(html.includes('&amp;'), 'Should escape ampersand');
    assert.ok(html.includes('&lt;'), 'Should escape less than');
    assert.ok(html.includes('&gt;'), 'Should escape greater than');
    assert.ok(html.includes('&quot;') || html.includes('&#34;'), 'Should escape double quotes');
    assert.ok(html.includes('&#039;') || html.includes('&#39;'), 'Should escape single quotes');
  } finally {
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(termsPath)) {
        fs.unlinkSync(termsPath);
      }
      fs.renameSync(backupPath, termsPath);
    }
  }
});
