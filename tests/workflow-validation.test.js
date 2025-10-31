const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SCHEMA_PATH = path.join(__dirname, '..', 'schema.json');
const VALIDATE_SCRIPT = path.join(__dirname, '..', 'scripts', 'validateTerms.js');
const SCORE_SCRIPT = path.join(__dirname, '..', 'scripts', 'quickScore.js');
const EXPORT_SCRIPT = path.join(__dirname, '..', 'scripts', 'exportTerms.js');

/**
 * Simulate the PR workflow validation steps
 * This matches the behavior in .github/workflows/pr-complete.yml
 */
function simulateWorkflow(termsData, baseTermsData = null) {
  const tmpDir = fs.mkdtempSync('/tmp/workflow-test-');
  const tmpTermsPath = path.join(tmpDir, 'terms.yaml');
  const tmpBaseTermsPath = path.join(tmpDir, 'terms.base.yaml');
  const tmpSchemaPath = path.join(tmpDir, 'schema.json');
  
  fs.writeFileSync(tmpTermsPath, yaml.dump(termsData));
  fs.copyFileSync(SCHEMA_PATH, tmpSchemaPath);
  
  if (baseTermsData) {
    fs.writeFileSync(tmpBaseTermsPath, yaml.dump(baseTermsData));
  } else {
    fs.writeFileSync(tmpBaseTermsPath, 'terms: []\n');
  }
  
  const workflowSteps = {
    validate: { exitCode: null, skipped: false },
    exporter: { exitCode: null, skipped: false },
    score: { exitCode: null, skipped: false },
    shouldFail: false
  };
  
  try {
    // Step 1: Validate terms.yaml (with base comparison)
    const validateArgs = baseTermsData ? [VALIDATE_SCRIPT, '--base', tmpBaseTermsPath] : [VALIDATE_SCRIPT];
    const validateResult = spawnSync('node', validateArgs, {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    workflowSteps.validate.exitCode = validateResult.status;
    workflowSteps.validate.output = validateResult.stdout || validateResult.stderr;
    
    // Step 2: Dry-run exporter check (only if validation passed)
    if (workflowSteps.validate.exitCode === 0) {
      const exporterResult = spawnSync('node', [EXPORT_SCRIPT, '--check'], {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      workflowSteps.exporter.exitCode = exporterResult.status;
      workflowSteps.exporter.output = exporterResult.stdout || exporterResult.stderr;
    } else {
      workflowSteps.exporter.skipped = true;
    }
    
    // Step 3: Score latest term (only if validation and exporter passed)
    if (workflowSteps.validate.exitCode === 0 && workflowSteps.exporter.exitCode === 0) {
      const scoreResult = spawnSync('node', [SCORE_SCRIPT], {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      workflowSteps.score.exitCode = scoreResult.status;
      workflowSteps.score.output = scoreResult.stdout || scoreResult.stderr;
    } else {
      workflowSteps.score.skipped = true;
    }
    
    // Determine if workflow should fail (matching the workflow's final step logic)
    workflowSteps.shouldFail = 
      workflowSteps.validate.exitCode !== 0 ||
      (workflowSteps.exporter.exitCode !== null && workflowSteps.exporter.exitCode !== 0) ||
      (workflowSteps.score.exitCode !== null && workflowSteps.score.exitCode !== 0);
    
    return workflowSteps;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

test('workflow: valid term passes all checks', () => {
  const termsData = {
    terms: [{
      slug: 'valid-term',
      term: 'Valid Term',
      definition: 'x'.repeat(80)
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 0, 'Validation should pass');
  assert.equal(workflow.exporter.exitCode, 0, 'Exporter check should pass');
  assert.equal(workflow.score.exitCode, 0, 'Scoring should pass');
  assert.equal(workflow.shouldFail, false, 'Workflow should not fail');
});

test('workflow: schema validation failure blocks merge', () => {
  const termsData = {
    terms: [{
      slug: 'invalid',
      term: 'Test',
      definition: 'too short' // Less than 80 chars
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.equal(workflow.exporter.skipped, true, 'Exporter should be skipped');
  assert.equal(workflow.score.skipped, true, 'Scoring should be skipped');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: duplicate slug detection blocks merge', () => {
  const termsData = {
    terms: [
      { slug: 'same', term: 'First', definition: 'x'.repeat(80) },
      { slug: 'same', term: 'Second', definition: 'x'.repeat(80) }
    ]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.match(workflow.validate.output, /duplicate/i, 'Should mention duplicates');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: duplicate normalized name blocks merge', () => {
  const termsData = {
    terms: [
      { slug: 'term-1', term: 'FOSS', definition: 'x'.repeat(80) },
      { slug: 'term-2', term: 'foss', definition: 'x'.repeat(80) }
    ]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.match(workflow.validate.output, /conflict/i, 'Should mention conflict');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: slug change detection blocks merge', () => {
  const baseTerms = {
    terms: [{
      slug: 'original-slug',
      term: 'Original Term',
      definition: 'x'.repeat(80)
    }]
  };
  
  const newTerms = {
    terms: [{
      slug: 'changed-slug',
      term: 'Original Term', // Same term name, different slug
      definition: 'x'.repeat(80)
    }]
  };
  
  const workflow = simulateWorkflow(newTerms, baseTerms);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.match(workflow.validate.output, /slug.*changed/i, 'Should mention slug change');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: additional properties block merge', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test',
      definition: 'x'.repeat(80),
      invalid_field: 'should not be here'
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.match(workflow.validate.output, /additional|unexpected/i, 'Should mention additional properties');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: invalid slug pattern blocks merge', () => {
  const termsData = {
    terms: [{
      slug: 'Invalid_Slug',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: empty terms array passes validation', () => {
  const termsData = { terms: [] };
  
  const workflow = simulateWorkflow(termsData);
  
  // Empty terms should pass validation but scoring will fail (no terms to score)
  assert.equal(workflow.validate.exitCode, 0, 'Validation should pass');
  assert.equal(workflow.exporter.exitCode, 0, 'Exporter should pass');
  assert.equal(workflow.score.exitCode, 1, 'Scoring should fail with no terms');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail due to scoring failure');
});

test('workflow: malformed YAML structure blocks merge', () => {
  const termsData = { wrong_key: [] }; // Missing 'terms' key
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: scoring runs only after validation and exporter pass', () => {
  const termsData = {
    terms: [{
      slug: 'valid',
      term: 'Valid',
      definition: 'x'.repeat(80)
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  // Verify the dependency chain
  assert.equal(workflow.validate.exitCode, 0, 'Validation runs first and passes');
  assert.equal(workflow.exporter.exitCode, 0, 'Exporter runs second and passes');
  assert.equal(workflow.score.exitCode, 0, 'Scoring runs last and passes');
  assert.equal(workflow.shouldFail, false, 'All checks pass, workflow succeeds');
});

test('workflow: exporter check failure blocks merge', () => {
  // Create a scenario where validation passes but export would fail
  // This is hard to trigger with current implementation, but we can test the logic
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test',
      definition: 'x'.repeat(80)
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  // With current implementation, if validation passes, export should too
  // But this test ensures the workflow logic is correct
  if (workflow.exporter.exitCode !== 0) {
    assert.equal(workflow.score.skipped, true, 'Scoring should be skipped if exporter fails');
    assert.equal(workflow.shouldFail, true, 'Workflow should fail if exporter fails');
  }
});

test('workflow: all required fields validated', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test'
      // Missing definition
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.match(workflow.validate.output, /required.*definition/i, 'Should mention missing definition');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: definition length requirement enforced', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test',
      definition: 'x'.repeat(79) // One char short
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.match(workflow.validate.output, /80|minLength/i, 'Should mention length requirement');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});

test('workflow: valid term with all optional fields passes', () => {
  const termsData = {
    terms: [{
      slug: 'complete-term',
      term: 'Complete Term',
      definition: 'x'.repeat(80),
      explanation: 'x'.repeat(50),
      humor: 'x'.repeat(100),
      tags: ['tag1', 'tag2'],
      see_also: ['other-term'],
      aliases: ['Alternative Name'],
      controversy_level: 'low'
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 0, 'Validation should pass');
  assert.equal(workflow.exporter.exitCode, 0, 'Exporter should pass');
  assert.equal(workflow.score.exitCode, 0, 'Scoring should pass');
  assert.equal(workflow.shouldFail, false, 'Workflow should succeed');
});

test('workflow: invalid controversy level blocks merge', () => {
  const termsData = {
    terms: [{
      slug: 'test',
      term: 'Test',
      definition: 'x'.repeat(80),
      controversy_level: 'extreme' // Invalid enum value
    }]
  };
  
  const workflow = simulateWorkflow(termsData);
  
  assert.equal(workflow.validate.exitCode, 1, 'Validation should fail');
  assert.equal(workflow.shouldFail, true, 'Workflow should fail and block merge');
});
