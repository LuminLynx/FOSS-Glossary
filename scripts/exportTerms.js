#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const process = require('process');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const yamlSchema = require('../schema.json');
const ONLY_IF_NEW = process.argv.includes('--only-if-new');
const OUT_PATH = 'docs/terms.json';  // serve via GitHub Pages
const MANIFEST_PATH = '.terms-slugs.txt';

function resolveVersion() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function buildExportPayload(yamlText) {
  const src = yaml.load(yamlText) || {};
  const terms = Array.isArray(src.terms) ? src.terms : [];

  return {
    version: resolveVersion(),
    generated_at: new Date().toISOString(),
    terms_count: terms.length,
    terms
  };
}

const DEFAULT_OUT_PATH = 'docs/terms.json';
const SIZE_WARN_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB

class ExporterError extends Error {}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const exportSchema = {
  type: 'object',
  required: ['version', 'generated_at', 'terms_count', 'terms'],
  additionalProperties: false,
  properties: {
    version: { type: 'string', minLength: 1 },
    generated_at: { type: 'string', format: 'date-time' },
    terms_count: { type: 'integer', minimum: 0 },
    terms: yamlSchema.properties.terms,
  },
};

const validateExport = ajv.compile(exportSchema);

function parseArgs(argv) {
  const options = {
    outPath: DEFAULT_OUT_PATH,
    pretty: false,
    check: false,
    onlyIfNew: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--pretty') {
      options.pretty = true;
    } else if (arg === '--check') {
      options.check = true;
    } else if (arg === '--only-if-new') {
      options.onlyIfNew = true;
    } else if (arg === '--out') {
      const next = argv[i + 1];
      if (!next) {
        throw new ExporterError('Missing value for --out');
      }
      options.outPath = next;
      i += 1;
    } else if (arg.startsWith('--out=')) {
      options.outPath = arg.slice('--out='.length);
    } else {
      throw new ExporterError(`Unknown flag: ${arg}`);
    }
  }

  return options;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readHeadYaml() {
  return readFile('terms.yaml');
}

function readPrevYaml() {
  try {
    return execSync('git show HEAD~1:terms.yaml', { encoding: 'utf8' });
  } catch {
    return null;
  }
}

function normalizeString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const str = String(value);
  return str.trim().length === 0 ? undefined : str;
}

function normalizeArray(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const arr = Array.isArray(value) ? value : [value];
  const normalized = arr
    .map((entry) => {
      if (entry === undefined || entry === null) {
        return undefined;
      }
      const str = String(entry);
      return str.trim().length === 0 ? undefined : str;
    })
    .filter((entry) => entry !== undefined);

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTerm(rawTerm) {
  if (!rawTerm || typeof rawTerm !== 'object') {
    throw new ExporterError('Each term must be an object.');
  }

  const slug = normalizeString(rawTerm.slug);
  const term = normalizeString(rawTerm.term);
  const definition = normalizeString(rawTerm.definition);

  if (!slug || !term || !definition) {
    throw new ExporterError('Terms require slug, term, and definition.');
  }

  const normalized = {
    slug,
    term,
    definition,
  };

  const explanation = normalizeString(rawTerm.explanation);
  if (explanation) {
    normalized.explanation = explanation;
  }

  const humor = normalizeString(rawTerm.humor);
  if (humor) {
    normalized.humor = humor;
  }

  const tags = normalizeArray(rawTerm.tags);
  if (tags) {
    normalized.tags = tags;
  }

  const seeAlso = normalizeArray(rawTerm.see_also);
  if (seeAlso) {
    normalized.see_also = seeAlso;
  }

  const aliases = normalizeArray(rawTerm.aliases);
  if (aliases) {
    normalized.aliases = aliases;
  }

  const controversy = normalizeString(rawTerm.controversy_level);
  if (controversy) {
    normalized.controversy_level = controversy;
  }

  return normalized;
}

function sortTerms(terms) {
  return [...terms].sort((a, b) => a.slug.localeCompare(b.slug));
}

function prepareTerms(rawTerms) {
  if (!Array.isArray(rawTerms)) {
    throw new ExporterError('Root "terms" must be an array.');
  }

  const normalized = rawTerms.map(normalizeTerm);
  return sortTerms(normalized);
}

function buildDocument(terms, metadata = {}) {
  const version = metadata.version || getGitSha();
  const generatedAt = metadata.generatedAt
    ? metadata.generatedAt instanceof Date
      ? metadata.generatedAt.toISOString()
      : new Date(metadata.generatedAt).toISOString()
    : new Date().toISOString();

  const document = {
    version,
    generated_at: generatedAt,
    terms_count: terms.length,
    terms,
  };

  if (!validateExport(document)) {
    throw new ExporterError(formatAjvError(validateExport.errors));
  }

  return document;
}

function buildExportDocumentFromYaml(yamlText, metadata) {
  const parsed = yaml.load(yamlText);
  if (!parsed || typeof parsed !== 'object') {
    throw new ExporterError('terms.yaml must contain an object with a terms array.');
  }

  const terms = prepareTerms(parsed.terms);
  return buildDocument(terms, metadata);
}

function serializeDocument(document, { pretty = false } = {}) {
  const space = pretty ? 2 : undefined;
  return `${JSON.stringify(document, null, space)}\n`;
}

function checkSizeLimit(serializedJson, logger = console) {
  const bytes = Buffer.byteLength(serializedJson, 'utf8');
  if (bytes > SIZE_WARN_THRESHOLD_BYTES) {
    logger.warn(`⚠️ Export size ${bytes} bytes exceeds ${SIZE_WARN_THRESHOLD_BYTES} byte limit.`);
    return true;
  }
  return false;
}

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function formatAjvError(errors) {
  if (!errors || errors.length === 0) {
    return 'Unknown validation error';
  }
  return errors
    .map((error) => `${error.instancePath || '(root)'} ${error.message}`.trim())
    .join('; ');
}

function ensureDirectoryForFile(filePath) {
  const dir = path.dirname(filePath);
  if (dir && dir !== '.') {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function extractSlugsFromYaml(yamlText) {
  try {
    const parsed = yaml.load(yamlText);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.terms)) {
      return [];
    }
    return parsed.terms
      .map((term) => normalizeString(term?.slug))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasNewTerms(currentYaml, previousYaml) {
  if (!previousYaml) {
    return true;
  }

  const currentSlugs = new Set(extractSlugsFromYaml(currentYaml));
  const previousSlugs = new Set(extractSlugsFromYaml(previousYaml));

  for (const slug of currentSlugs) {
    if (!previousSlugs.has(slug)) {
      return true;
    }
  }

  return false;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const headYaml = readHeadYaml();

  if (options.onlyIfNew) {
    const prevYaml = readPrevYaml();
    if (!hasNewTerms(headYaml, prevYaml)) {
      console.log('ℹ️ No new terms detected. Skipping export.');
      return;
    }
  }

  const document = buildExportDocumentFromYaml(headYaml, {
    version: getGitSha(),
    generatedAt: new Date(),
  });

  const serialized = serializeDocument(document, { pretty: options.pretty });
  checkSizeLimit(serialized);

  if (options.check) {
    console.log('✅ Export validation passed.');
    return;
  }

  ensureDirectoryForFile(options.outPath);
  fs.writeFileSync(options.outPath, serialized, 'utf8');
  console.log(`✅ Wrote ${options.outPath} (${document.terms_count} terms).`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    if (error instanceof ExporterError) {
      console.error(`❌ ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

module.exports = {
  ExporterError,
  parseArgs,
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
  formatAjvError,
  SIZE_WARN_THRESHOLD_BYTES,
};
