const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * E2E Pipeline Test
 *
 * This test validates the complete end-to-end flow:
 * 1. Merge a test term → terms.yaml
 * 2. CI validation → validateTerms.js
 * 3. CI export → exportTerms.js (with metadata)
 * 4. Landing page generation → generateLandingPage.js
 * 5. Site serves new JSON with version metadata
 * 6. UI refreshes via ?ver=<shortSHA> parameter matching JSON version
 *
 * Purpose: Ensure the full pipeline works together as documented in AGENTS.md
 */

const VALIDATE_SCRIPT = path.join(__dirname, '..', 'scripts', 'validateTerms.js');
const EXPORT_SCRIPT = path.join(__dirname, '..', 'scripts', 'exportTerms.js');
const GENERATE_LANDING_SCRIPT = path.join(__dirname, '..', 'scripts', 'generateLandingPage.js');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.json');

/**
 * Run the complete E2E pipeline in a temporary directory
 * Simulates what happens when a PR is merged:
 * - Validation runs
 * - Export generates terms.json with metadata
 * - Landing page generation embeds version parameter
 */
function runE2EPipeline() {
  const tmpDir = fs.mkdtempSync('/tmp/e2e-pipeline-');
  const tmpTermsPath = path.join(tmpDir, 'terms.yaml');
  const tmpSchemaPath = path.join(tmpDir, 'schema.json');
  const tmpDocsPath = path.join(tmpDir, 'docs');
  const tmpTermsJsonPath = path.join(tmpDocsPath, 'terms.json');
  const tmpIndexPath = path.join(tmpDocsPath, 'index.html');
  const tmpTemplatesPath = path.join(tmpDir, 'templates');

  // Create necessary directories
  fs.mkdirSync(tmpDocsPath, { recursive: true });
  fs.mkdirSync(tmpTemplatesPath, { recursive: true });

  // Initialize git repo to enable proper version detection
  spawnSync('git', ['init'], { cwd: tmpDir });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tmpDir });

  // Copy schema and template
  fs.copyFileSync(SCHEMA_PATH, tmpSchemaPath);
  fs.copyFileSync(
    path.join(__dirname, '..', 'templates', 'landing-page.hbs'),
    path.join(tmpTemplatesPath, 'landing-page.hbs')
  );

  // Create test terms.yaml with a new test term
  const testTermsData = {
    terms: [
      {
        slug: 'e2e-test-term',
        term: 'E2E Test Term',
        definition:
          'This is a test term created specifically to validate the end-to-end pipeline flow from merge to deployment with proper version tracking.',
        explanation: 'A comprehensive test that validates the complete CI/CD pipeline',
        humor: 'When your test covers more ground than a cross-country marathon',
        tags: ['testing', 'ci-cd', 'automation'],
        see_also: ['Integration Test', 'Unit Test'],
      },
      {
        slug: 'another-term',
        term: 'Another Term',
        definition:
          'A second term to ensure the pipeline handles multiple terms correctly and generates proper statistics and metadata.',
        tags: ['example'],
      },
    ],
  };

  fs.writeFileSync(tmpTermsPath, yaml.dump(testTermsData));

  // Commit the test terms to establish a git history
  spawnSync('git', ['add', '.'], { cwd: tmpDir });
  spawnSync('git', ['commit', '-m', 'Add test terms'], { cwd: tmpDir });

  const results = {
    validation: null,
    export: null,
    landing: null,
    termsJson: null,
    indexHtml: null,
  };

  try {
    // Step 1: Run validation
    const validationResult = spawnSync('node', [VALIDATE_SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    results.validation = {
      success: validationResult.status === 0,
      output: validationResult.stdout || validationResult.stderr,
      exitCode: validationResult.status,
    };

    if (!results.validation.success) {
      return results;
    }

    // Step 2: Run export (generates terms.json with metadata)
    const exportResult = spawnSync('node', [EXPORT_SCRIPT, '--out', tmpTermsJsonPath, '--pretty'], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    results.export = {
      success: exportResult.status === 0,
      output: exportResult.stdout || exportResult.stderr,
      exitCode: exportResult.status,
    };

    if (!results.export.success) {
      return results;
    }

    // Read and parse terms.json
    if (fs.existsSync(tmpTermsJsonPath)) {
      const termsJsonContent = fs.readFileSync(tmpTermsJsonPath, 'utf8');
      results.termsJson = JSON.parse(termsJsonContent);
    }

    // Step 3: Generate landing page (embeds version parameter)
    const landingResult = spawnSync('node', [GENERATE_LANDING_SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    results.landing = {
      success: landingResult.status === 0,
      output: landingResult.stdout || landingResult.stderr,
      exitCode: landingResult.status,
    };

    // Read generated index.html
    if (fs.existsSync(tmpIndexPath)) {
      results.indexHtml = fs.readFileSync(tmpIndexPath, 'utf8');
    }

    return results;
  } finally {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

test('E2E: complete pipeline from merge to deployment', () => {
  const results = runE2EPipeline();

  // Assert: Validation passes
  assert.equal(results.validation.success, true, 'Validation should pass for valid test terms');
  assert.match(
    results.validation.output,
    /✅|success|valid/i,
    'Validation should show success message'
  );

  // Assert: Export succeeds
  assert.equal(results.export.success, true, 'Export should succeed');

  // Assert: terms.json was created with correct metadata
  assert.ok(results.termsJson, 'terms.json should be created');
  assert.ok(results.termsJson.version, 'terms.json should contain version metadata');
  assert.ok(results.termsJson.generated_at, 'terms.json should contain generated_at timestamp');
  assert.equal(results.termsJson.terms_count, 2, 'terms.json should contain correct terms_count');
  assert.equal(results.termsJson.terms.length, 2, 'terms.json should contain all terms');

  // Assert: version is a non-empty string (git SHA or 'dev')
  assert.ok(
    typeof results.termsJson.version === 'string' && results.termsJson.version.length > 0,
    'Version should be a non-empty string'
  );

  // Assert: generated_at is a valid ISO 8601 timestamp
  assert.ok(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(results.termsJson.generated_at),
    'generated_at should be a valid ISO 8601 timestamp'
  );

  // Assert: Landing page generation succeeds
  assert.equal(results.landing.success, true, 'Landing page generation should succeed');

  // Assert: index.html was created
  assert.ok(results.indexHtml, 'index.html should be created');

  // Assert: index.html contains TERMS_JSON_URL with version parameter
  assert.match(
    results.indexHtml,
    /window\.__TERMS_JSON_URL\s*=\s*['"]\.\/terms\.json\?ver=/,
    'index.html should contain TERMS_JSON_URL with version parameter'
  );

  // Extract the version from index.html
  const versionMatch = results.indexHtml.match(
    /window\.__TERMS_JSON_URL\s*=\s*['"]\.\/terms\.json\?ver=([^'"]+)['"]/
  );
  assert.ok(versionMatch, 'Should be able to extract version from TERMS_JSON_URL');

  const htmlVersion = versionMatch[1];

  // Assert: Version in HTML matches version in terms.json
  assert.equal(
    htmlVersion,
    results.termsJson.version,
    'Version parameter in index.html should match version in terms.json'
  );

  // Assert: Terms are sorted alphabetically in the export
  const termSlugs = results.termsJson.terms.map((t) => t.slug);
  const sortedSlugs = [...termSlugs].sort();
  assert.deepEqual(termSlugs, sortedSlugs, 'Terms in JSON should be sorted alphabetically by slug');

  // Assert: index.html contains expected term count in metadata
  assert.match(
    results.indexHtml,
    /2 Terms and Growing!/,
    'index.html should show correct term count in title'
  );
});

test('E2E: pipeline handles validation failure gracefully', () => {
  const tmpDir = fs.mkdtempSync('/tmp/e2e-fail-');
  const tmpTermsPath = path.join(tmpDir, 'terms.yaml');
  const tmpSchemaPath = path.join(tmpDir, 'schema.json');

  fs.copyFileSync(SCHEMA_PATH, tmpSchemaPath);

  // Create invalid terms.yaml (definition too short - less than schema minLength requirement of 80 chars)
  const invalidTermsData = {
    terms: [
      {
        slug: 'invalid-term',
        term: 'Invalid Term',
        definition: 'Too short', // Less than 80 characters
      },
    ],
  };

  fs.writeFileSync(tmpTermsPath, yaml.dump(invalidTermsData));

  try {
    const validationResult = spawnSync('node', [VALIDATE_SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    // Assert: Validation fails
    assert.notEqual(validationResult.status, 0, 'Validation should fail for invalid terms');
    assert.match(
      validationResult.stdout || validationResult.stderr,
      /error|fail|invalid|minLength/i,
      'Should show validation error message'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('E2E: export --only-if-new flag works correctly', () => {
  // This test validates that the --only-if-new flag correctly detects new terms
  // This is important for the post-merge workflow which only exports when new terms are added

  const tmpDir = fs.mkdtempSync('/tmp/e2e-only-new-');
  const tmpTermsPath = path.join(tmpDir, 'terms.yaml');
  const tmpDocsPath = path.join(tmpDir, 'docs');
  const tmpTermsJsonPath = path.join(tmpDocsPath, 'terms.json');

  fs.mkdirSync(tmpDocsPath, { recursive: true });

  // Initialize a git repo (required for --only-if-new to work)
  spawnSync('git', ['init'], { cwd: tmpDir });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tmpDir });

  // Create initial terms.yaml
  const initialTerms = {
    terms: [
      {
        slug: 'initial-term',
        term: 'Initial Term',
        definition:
          'This is the initial term that exists from the beginning of the repository history.',
      },
    ],
  };

  fs.writeFileSync(tmpTermsPath, yaml.dump(initialTerms));
  spawnSync('git', ['add', 'terms.yaml'], { cwd: tmpDir });
  spawnSync('git', ['commit', '-m', 'Initial commit'], { cwd: tmpDir });

  try {
    // First export with --only-if-new should succeed (no previous commit)
    const firstExport = spawnSync(
      'node',
      [EXPORT_SCRIPT, '--out', tmpTermsJsonPath, '--only-if-new'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );

    // When there's no HEAD~1, it should export
    assert.equal(firstExport.status, 0, 'First export should succeed');

    // Create a second commit without changing terms.yaml
    // This simulates a commit that doesn't add new terms
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test Repo');
    spawnSync('git', ['add', 'README.md'], { cwd: tmpDir });
    spawnSync('git', ['commit', '-m', 'Add README'], { cwd: tmpDir });

    // Export again with same terms (no new terms between HEAD and HEAD~1)
    const secondExport = spawnSync(
      'node',
      [EXPORT_SCRIPT, '--out', tmpTermsJsonPath, '--only-if-new'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );

    // Should skip export when no new terms
    assert.equal(secondExport.status, 0, 'Export should exit successfully even when skipping');
    assert.match(
      secondExport.stdout,
      /No new terms|skipping/i,
      'Should indicate no new terms detected'
    );

    // Add a new term
    const updatedTerms = {
      terms: [
        ...initialTerms.terms,
        {
          slug: 'new-term',
          term: 'New Term',
          definition:
            'This is a brand new term added to test the --only-if-new functionality in the export script.',
        },
      ],
    };

    fs.writeFileSync(tmpTermsPath, yaml.dump(updatedTerms));

    // Export with new term
    const thirdExport = spawnSync(
      'node',
      [EXPORT_SCRIPT, '--out', tmpTermsJsonPath, '--only-if-new'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );

    // Should export when new terms detected
    assert.equal(thirdExport.status, 0, 'Export should succeed with new terms');
    assert.match(thirdExport.stdout, /Wrote|✅/, 'Should show success message for new terms');

    // Verify the exported file exists and has correct count
    assert.ok(fs.existsSync(tmpTermsJsonPath), 'terms.json should be created');

    const exportedData = JSON.parse(fs.readFileSync(tmpTermsJsonPath, 'utf8'));
    assert.equal(exportedData.terms_count, 2, 'Exported JSON should contain both terms');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
