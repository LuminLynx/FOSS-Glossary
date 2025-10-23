#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const process = require('process');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const yamlSchema = require('../schema.json');
const { normalizeString, normalizeArray, normalizeTerm } = require('../utils/normalization');
const { formatAjvError } = require('../utils/validation');
const { getGitSha } = require('../utils/git');
const { ensureDirectoryForFile } = require('../utils/fileSystem');

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

/**
 * Parse command line arguments for export script
 * Supported flags:
 * - --pretty: Format JSON with indentation
 * - --check: Validate without writing file
 * - --only-if-new: Only export if new terms detected
 * - --out <path> or --out=<path>: Custom output path
 * 
 * @param {string[]} argv - Command line arguments (typically process.argv.slice(2))
 * @returns {Object} Options object with outPath, pretty, check, and onlyIfNew properties
 * @throws {ExporterError} If unknown flag or missing value for --out
 */
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
        throw new ExporterError('Error: Missing value for --out');
      }
      options.outPath = next;
      i += 1;
    } else if (arg.startsWith('--out=')) {
      options.outPath = arg.slice('--out='.length);
    } else {
      throw new ExporterError(`Error: Unknown flag: ${arg}`);
    }
  }

  return options;
}

/**
 * Read a file synchronously with UTF-8 encoding
 * 
 * @param {string} filePath - Path to the file to read
 * @returns {string} File contents as string
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Read terms.yaml from HEAD (current working directory)
 * 
 * @returns {string} Contents of terms.yaml file
 */
function readHeadYaml() {
  return readFile('terms.yaml');
}

/**
 * Read terms.yaml from previous Git commit (HEAD~1)
 * Used to detect if new terms were added since last commit
 * 
 * @returns {string|null} Contents of terms.yaml from previous commit, or null if not available
 */
function readPrevYaml() {
  try {
    return execSync('git show HEAD~1:terms.yaml', { encoding: 'utf8' });
  } catch {
    return null;
  }
}

/**
 * Sort terms array alphabetically by slug
 * Creates a new array without mutating the input
 * 
 * @param {Object[]} terms - Array of term objects
 * @returns {Object[]} New sorted array of terms
 */
function sortTerms(terms) {
  return [...terms].sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Normalize a term with error handling
 * Wraps normalizeTerm to convert errors to ExporterError
 * 
 * @param {Object} rawTerm - Raw term object to normalize
 * @returns {Object} Normalized term object
 * @throws {ExporterError} If normalization fails
 */
function normalizeTermWithError(rawTerm) {
  try {
    return normalizeTerm(rawTerm);
  } catch (error) {
    throw new ExporterError(`Error: ${error.message}`);
  }
}

/**
 * Prepare terms array for export
 * Normalizes all terms and sorts them alphabetically by slug
 * 
 * @param {Object[]} rawTerms - Raw array of term objects from YAML
 * @returns {Object[]} Normalized and sorted array of terms
 * @throws {ExporterError} If rawTerms is not an array or normalization fails
 */
function prepareTerms(rawTerms) {
  if (!Array.isArray(rawTerms)) {
    throw new ExporterError('Error: Root "terms" must be an array');
  }

  const normalized = rawTerms.map(normalizeTermWithError);
  return sortTerms(normalized);
}

/**
 * Build export document with terms and metadata
 * Creates the final JSON structure with version, timestamp, count, and terms
 * Validates the document against export schema
 * 
 * @param {Object[]} terms - Array of normalized term objects
 * @param {Object} [metadata={}] - Metadata object with optional version and generatedAt
 * @param {string} [metadata.version] - Git SHA or version string
 * @param {Date|string} [metadata.generatedAt] - Timestamp for generation
 * @returns {Object} Complete export document
 * @throws {ExporterError} If document fails schema validation
 */
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

/**
 * Build export document from YAML text
 * Parses YAML, prepares terms, and builds complete export document
 * 
 * @param {string} yamlText - Raw YAML content from terms.yaml
 * @param {Object} [metadata] - Optional metadata for version and timestamp
 * @returns {Object} Complete export document ready for serialization
 * @throws {ExporterError} If YAML is invalid or document creation fails
 */
function buildExportDocumentFromYaml(yamlText, metadata) {
  const parsed = yaml.load(yamlText);
  if (!parsed || typeof parsed !== 'object') {
    throw new ExporterError('Error: terms.yaml must contain an object with a terms array');
  }

  const terms = prepareTerms(parsed.terms);
  return buildDocument(terms, metadata);
}

/**
 * Serialize export document to JSON string
 * Optionally formats with indentation for readability
 * Always adds trailing newline
 * 
 * @param {Object} document - Export document to serialize
 * @param {Object} [options] - Serialization options
 * @param {boolean} [options.pretty=false] - Format with 2-space indentation
 * @returns {string} JSON string with trailing newline
 */
function serializeDocument(document, { pretty = false } = {}) {
  const space = pretty ? 2 : undefined;
  return `${JSON.stringify(document, null, space)}\n`;
}

/**
 * Check if serialized JSON exceeds size threshold
 * Warns if document size exceeds SIZE_WARN_THRESHOLD_BYTES (2MB)
 * 
 * @param {string} serializedJson - Serialized JSON string
 * @param {Object} [logger=console] - Logger object with warn method
 * @returns {boolean} True if size exceeds threshold, false otherwise
 */
function checkSizeLimit(serializedJson, logger = console) {
  const bytes = Buffer.byteLength(serializedJson, 'utf8');
  if (bytes > SIZE_WARN_THRESHOLD_BYTES) {
    logger.warn(`⚠️ Warning: Export size ${bytes} bytes exceeds ${SIZE_WARN_THRESHOLD_BYTES} byte limit`);
    return true;
  }
  return false;
}

/**
 * Extract slugs from YAML text
 * Parses YAML and extracts normalized slugs from terms array
 * Returns empty array if parsing fails or structure is invalid
 * Logs warnings when failures occur to aid debugging
 * 
 * @param {string} yamlText - Raw YAML content
 * @returns {string[]} Array of normalized slug strings
 */
function extractSlugsFromYaml(yamlText) {
  try {
    const parsed = yaml.load(yamlText);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.terms)) {
      console.warn('⚠️ Warning: extractSlugsFromYaml - Invalid YAML structure: missing or invalid "terms" array');
      return [];
    }
    return parsed.terms
      .map((term) => normalizeString(term?.slug))
      .filter(Boolean);
  } catch (error) {
    console.warn(`⚠️ Warning: extractSlugsFromYaml - Failed to parse YAML: ${error.message}`);
    return [];
  }
}

/**
 * Check if current YAML has new terms compared to previous version
 * Compares slug sets between current and previous YAML
 * Returns true if any slug exists in current but not in previous
 * 
 * @param {string} currentYaml - Current terms.yaml content
 * @param {string} previousYaml - Previous terms.yaml content (or null)
 * @returns {boolean} True if new terms detected or previousYaml is null
 */
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

/**
 * Main export function
 * Parses arguments, reads YAML, builds export document, and writes output
 * Supports --only-if-new flag to skip export if no new terms detected
 * 
 * @param {string[]} [argv=process.argv.slice(2)] - Command line arguments
 * @throws {ExporterError} If export process fails
 */
function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const headYaml = readHeadYaml();

  if (options.onlyIfNew) {
    const prevYaml = readPrevYaml();
    if (!hasNewTerms(headYaml, prevYaml)) {
      console.log('ℹ️ No new terms detected; skipping export');
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
    console.log('✅ Export validation passed');
    return;
  }

  ensureDirectoryForFile(options.outPath);
  fs.writeFileSync(options.outPath, serialized, 'utf8');
  console.log(`✅ Wrote ${options.outPath} (${document.terms_count} terms)`);
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
  normalizeTerm: normalizeTermWithError,
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
