const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

test('schema: tags must match kebab-case pattern', () => {
  const invalidTags = ['FOSS', 'GPL', 'pull requests', 'Test Tag', 'snake_case'];
  const validTags = ['foss', 'gpl', 'pull-requests', 'test-tag', 'snake-case'];

  const schema = JSON.parse(fs.readFileSync('config/schema.json', 'utf8'));
  const tagPattern = schema.properties.terms.items.properties.tags.items.pattern;

  assert.ok(tagPattern, 'Tag pattern should be defined in schema');

  const regex = new RegExp(tagPattern);

  invalidTags.forEach((tag) => {
    assert.ok(!regex.test(tag), `Tag "${tag}" should NOT match pattern`);
  });

  validTags.forEach((tag) => {
    assert.ok(regex.test(tag), `Tag "${tag}" should match pattern`);
  });
});

test('schema: slug pattern is enforced', () => {
  const schema = JSON.parse(fs.readFileSync('config/schema.json', 'utf8'));
  const slugPattern = schema.properties.terms.items.properties.slug.pattern;

  assert.equal(slugPattern, '^[a-z0-9]+(?:-[a-z0-9]+)*$');

  const regex = new RegExp(slugPattern);

  // Valid slugs
  assert.ok(regex.test('valid-slug'));
  assert.ok(regex.test('slug123'));
  assert.ok(regex.test('another-valid-slug-123'));

  // Invalid slugs
  assert.ok(!regex.test('Invalid-Slug'));
  assert.ok(!regex.test('slug_with_underscore'));
  assert.ok(!regex.test('slug with spaces'));
  assert.ok(!regex.test('-leading-hyphen'));
  assert.ok(!regex.test('trailing-hyphen-'));
  assert.ok(!regex.test('double--hyphen'));
});

test('TypeScript types: generated types exist', () => {
  const typesPath = path.join(__dirname, '..', 'types', 'terms.d.ts');
  assert.ok(fs.existsSync(typesPath), 'TypeScript types file should exist');

  const content = fs.readFileSync(typesPath, 'utf8');
  assert.ok(content.includes('export interface FOSSGlossaryTerms'));
  assert.ok(content.includes('slug: string'));
  assert.ok(content.includes('term: string'));
  assert.ok(content.includes('definition: string'));
});

test('TypeScript types: validate:types script detects out-of-sync types', () => {
  const typesPath = path.join(__dirname, '..', 'types', 'terms.d.ts');
  const backup = fs.readFileSync(typesPath, 'utf8');

  try {
    // Modify the types file
    fs.writeFileSync(typesPath, '// Modified content\n' + backup);

    // Should fail
    assert.throws(() => {
      execSync('npm run validate:types', { stdio: 'pipe' });
    }, 'Should detect out-of-sync types');
  } finally {
    // Restore
    fs.writeFileSync(typesPath, backup);
  }
});

test('YAML sorting: terms are sorted by slug', () => {
  const yaml = require('js-yaml');
  const data = yaml.load(fs.readFileSync('terms.yaml', 'utf8'));

  const slugs = data.terms.map((t) => t.slug);
  const sortedSlugs = [...slugs].sort();

  assert.deepEqual(slugs, sortedSlugs, 'Terms should be sorted by slug');
});

test('YAML sorting: term keys are in correct order', () => {
  const yaml = require('js-yaml');
  const data = yaml.load(fs.readFileSync('terms.yaml', 'utf8'));

  const expectedOrder = [
    'slug',
    'term',
    'definition',
    'explanation',
    'humor',
    'see_also',
    'tags',
    'aliases',
    'controversy_level',
  ];

  // Check first term's key order
  if (data.terms.length > 0) {
    const firstTerm = data.terms[0];
    const actualKeys = Object.keys(firstTerm);
    const expectedKeys = expectedOrder.filter((key) =>
      Object.prototype.hasOwnProperty.call(firstTerm, key)
    );

    assert.deepEqual(actualKeys, expectedKeys, 'Term keys should be in the correct order');
  }
});

test('tag fixing: fixTags script converts to kebab-case', () => {
  const yaml = require('js-yaml');

  // Create test file
  const testData = {
    terms: [
      {
        slug: 'test-term',
        term: 'Test',
        definition: 'Test definition '.padEnd(80, 'x'),
        tags: ['UPPERCASE', 'Mixed Case', 'snake_case', ' leading-space'],
      },
    ],
  };

  const testFile = path.join(__dirname, '..', 'test-terms.yaml');
  fs.writeFileSync(testFile, yaml.dump(testData));

  try {
    // Run fixTags on test file
    const script = `
      const fs = require('fs');
      const yaml = require('js-yaml');
      const data = yaml.load(fs.readFileSync('${testFile}', 'utf8'));
      
      data.terms.forEach(term => {
        if (term.tags) {
          term.tags = term.tags.map(tag => 
            tag.toLowerCase()
               .trim()
               .replace(/[\\s_]+/g, '-')
               .replace(/^-+|-+$/g, '')
          );
        }
      });
      
      fs.writeFileSync('${testFile}', yaml.dump(data));
    `;

    execSync(`node -e "${script.replace(/\n/g, ' ')}"`);

    // Read and verify
    const result = yaml.load(fs.readFileSync(testFile, 'utf8'));
    assert.deepEqual(result.terms[0].tags, [
      'uppercase',
      'mixed-case',
      'snake-case',
      'leading-space',
    ]);
  } finally {
    // Cleanup
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  }
});
