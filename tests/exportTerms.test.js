const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  ExporterError,
  normalizeTerm,
  prepareTerms,
  buildDocument,
  buildExportDocumentFromYaml,
  serializeDocument,
  checkSizeLimit,
  sortTerms,
  hasNewTerms,
  extractSlugsFromYaml,
  normalizeArray,
  normalizeString,
  SIZE_WARN_THRESHOLD_BYTES,
} = require('../scripts/exportTerms');

const SNAPSHOT_PATH = path.join(__dirname, '__snapshots__', 'terms.snapshot.json');

function makeDefinition(id) {
  return `Definition ${id} `.padEnd(90, 'x');
}

test('snapshot: exported terms match snapshot ignoring metadata', () => {
  const yamlPath = path.join(__dirname, '..', 'terms.yaml');
  const yamlText = fs.readFileSync(yamlPath, 'utf8');
  const document = buildExportDocumentFromYaml(yamlText, {
    version: 'snapshot-sha',
    generatedAt: new Date('2024-01-01T00:00:00.000Z'),
  });

  assert.equal(document.terms_count, document.terms.length);

  const expected = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  assert.deepEqual(document.terms, expected);
});

test('normalizeTerm omits empty fields and normalizes arrays', () => {
  const term = normalizeTerm({
    slug: 'example',
    term: 'Example',
    definition: makeDefinition('example'),
    explanation: '  ',
    humor: 'Joke',
    tags: 'tag-one',
    see_also: ['Another', '   '],
    aliases: null,
    controversy_level: '',
  });

  assert.deepEqual(term, {
    slug: 'example',
    term: 'Example',
    definition: makeDefinition('example'),
    humor: 'Joke',
    tags: ['tag-one'],
    see_also: ['Another'],
  });
});

test('prepareTerms sorts by slug', () => {
  const prepared = prepareTerms([
    { slug: 'z-slug', term: 'Z', definition: makeDefinition('z') },
    { slug: 'a-slug', term: 'A', definition: makeDefinition('a') },
    { slug: 'm-slug', term: 'M', definition: makeDefinition('m') },
  ]);

  assert.deepEqual(prepared.map((term) => term.slug), ['a-slug', 'm-slug', 'z-slug']);
});

test('sortTerms returns new sorted array without mutating input', () => {
  const terms = [
    { slug: 'b', term: 'B', definition: makeDefinition('b') },
    { slug: 'a', term: 'A', definition: makeDefinition('a') },
  ];
  const sorted = sortTerms(terms);

  assert.deepEqual(sorted.map((t) => t.slug), ['a', 'b']);
  assert.deepEqual(terms.map((t) => t.slug), ['b', 'a']);
});

test('buildDocument handles large term counts', () => {
  const largeTerms = Array.from({ length: 1500 }, (_, index) => ({
    slug: `term-${index.toString().padStart(4, '0')}`,
    term: `Term ${index}`,
    definition: makeDefinition(index),
  }));

  const document = buildDocument(largeTerms, {
    version: 'test',
    generatedAt: new Date('2024-01-01T00:00:00.000Z'),
  });

  assert.equal(document.terms_count, 1500);
  assert.equal(document.terms[0].slug, 'term-0000');
  assert.equal(document.terms.at(-1).slug, 'term-1499');
});

test('serializeDocument respects pretty flag and ensures newline', () => {
  const document = buildDocument([
    {
      slug: 'example',
      term: 'Example',
      definition: makeDefinition('example'),
    },
  ], {
    version: 'v',
    generatedAt: new Date('2024-01-01T00:00:00.000Z'),
  });

  const pretty = serializeDocument(document, { pretty: true });
  const compact = serializeDocument(document, { pretty: false });

  assert.ok(pretty.endsWith('\n'));
  assert.ok(compact.endsWith('\n'));
  assert.ok(pretty.includes('\n  "terms"'));
  assert.ok(compact.indexOf('\n  "terms"') === -1);
});

test('checkSizeLimit throws when exceeding threshold', () => {
  const logger = { 
    errorCalled: false, 
    error() { this.errorCalled = true; } 
  };
  const largeContent = 'x'.repeat(SIZE_WARN_THRESHOLD_BYTES + 1);
  
  assert.throws(
    () => checkSizeLimit(largeContent, { logger, termsCount: 1000 }),
    ExporterError,
    'Should throw ExporterError when size exceeds threshold'
  );
  assert.equal(logger.errorCalled, true);
});

test('checkSizeLimit silent under threshold', () => {
  const logger = { 
    errorCalled: false, 
    error() { this.errorCalled = true; } 
  };
  const content = 'x'.repeat(1024);
  const result = checkSizeLimit(content, { logger });
  assert.equal(result, false);
  assert.equal(logger.errorCalled, false);
});

test('checkSizeLimit error message includes size and limit information', () => {
  const logger = { 
    errorCalled: false,
    lastError: null,
    error(msg) { 
      this.errorCalled = true; 
      this.lastError = msg;
    } 
  };
  const largeContent = 'x'.repeat(SIZE_WARN_THRESHOLD_BYTES + 1);
  
  try {
    checkSizeLimit(largeContent, { logger, termsCount: 500 });
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.ok(error instanceof ExporterError);
    assert.ok(error.message.includes('2.00 MB'));
    assert.ok(error.message.includes('500 terms'));
    assert.ok(error.message.includes('PREBUILT_INDEX_STRATEGY.md'));
  }
  assert.equal(logger.errorCalled, true);
});

test('hasNewTerms detects new slugs', () => {
  const prevYaml = `terms:\n  - slug: alpha\n    term: Alpha\n    definition: ${makeDefinition('alpha')}\n`;
  const headYaml = `terms:\n  - slug: alpha\n    term: Alpha\n    definition: ${makeDefinition('alpha')}\n  - slug: beta\n    term: Beta\n    definition: ${makeDefinition('beta')}\n`;

  assert.equal(hasNewTerms(headYaml, prevYaml), true);
  assert.equal(hasNewTerms(prevYaml, headYaml), false);
});

test('extractSlugsFromYaml normalizes entries', () => {
  const yamlText = `terms:\n  - slug: alpha\n    term: Alpha\n    definition: ${makeDefinition('alpha')}\n  - slug: ''\n    term: No Slug\n    definition: ${makeDefinition('noslug')}\n  - term: Missing\n    definition: ${makeDefinition('missing')}\n`;

  assert.deepEqual(extractSlugsFromYaml(yamlText), ['alpha']);
});

test('extractSlugsFromYaml logs warning on YAML parse error', () => {
  const warnings = [];
  const mockConsole = { warn(msg) { warnings.push(msg); } };
  const originalWarn = console.warn;
  console.warn = mockConsole.warn.bind(mockConsole);

  const invalidYaml = 'invalid: yaml: content: [unclosed';
  const result = extractSlugsFromYaml(invalidYaml);

  console.warn = originalWarn;

  assert.deepEqual(result, []);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('extractSlugsFromYaml'));
  assert.ok(warnings[0].includes('Failed to parse YAML'));
});

test('extractSlugsFromYaml logs warning on invalid structure', () => {
  const warnings = [];
  const mockConsole = { warn(msg) { warnings.push(msg); } };
  const originalWarn = console.warn;
  console.warn = mockConsole.warn.bind(mockConsole);

  const yamlWithoutTerms = 'foo: bar\nbaz: qux';
  const result = extractSlugsFromYaml(yamlWithoutTerms);

  console.warn = originalWarn;

  assert.deepEqual(result, []);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('extractSlugsFromYaml'));
  assert.ok(warnings[0].includes('Invalid YAML structure'));
});

test('extractSlugsFromYaml logs warning when terms is not an array', () => {
  const warnings = [];
  const mockConsole = { warn(msg) { warnings.push(msg); } };
  const originalWarn = console.warn;
  console.warn = mockConsole.warn.bind(mockConsole);

  const yamlWithInvalidTerms = 'terms: "not an array"';
  const result = extractSlugsFromYaml(yamlWithInvalidTerms);

  console.warn = originalWarn;

  assert.deepEqual(result, []);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('extractSlugsFromYaml'));
  assert.ok(warnings[0].includes('Invalid YAML structure'));
});

test('normalize helpers handle nullish values', () => {
  assert.equal(normalizeString(null), undefined);
  assert.equal(normalizeString('   '), undefined);
  assert.equal(normalizeString('value'), 'value');

  assert.equal(normalizeArray(null), undefined);
  assert.equal(normalizeArray(['  ']), undefined);
  assert.deepEqual(normalizeArray(['a', 'b']), ['a', 'b']);
  assert.deepEqual(normalizeArray('single'), ['single']);
});

test('buildExportDocumentFromYaml throws on invalid input', () => {
  assert.throws(() => buildExportDocumentFromYaml('[]'), ExporterError);
  assert.throws(
    () => buildExportDocumentFromYaml('terms: 42'),
    ExporterError,
  );
});

test('serializeDocument with pretty flag produces deterministic order', () => {
  const yamlText = `terms:\n  - term: Example\n    slug: example\n    definition: ${makeDefinition('example')}\n    tags:\n      - zeta\n      - alpha\n`;
  const document = buildExportDocumentFromYaml(yamlText, {
    version: 'v',
    generatedAt: new Date('2024-01-01T00:00:00.000Z'),
  });

  assert.deepEqual(document.terms.map((term) => Object.keys(term)), [
    ['slug', 'term', 'definition', 'tags'],
  ]);
});

test('check mode validation passes without writing file', () => {
  const yamlText = `terms:\n  - slug: gamma\n    term: Gamma\n    definition: ${makeDefinition('gamma')}\n`;
  const document = buildExportDocumentFromYaml(yamlText, {
    version: 'v',
    generatedAt: new Date('2024-01-01T00:00:00.000Z'),
  });
  const serialized = serializeDocument(document, { pretty: false });
  assert.ok(serialized.includes('"terms"'));
});
