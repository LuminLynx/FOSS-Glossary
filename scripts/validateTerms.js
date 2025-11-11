#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { normalizeName } = require('../utils/normalization');
const { formatAjvError } = require('../utils/validation');
const { loadJson } = require('../utils/fileSystem');

/**
 * Load and parse a YAML file with user-friendly error handling
 *
 * @param {string} filePath - Path to the YAML file
 * @returns {*} Parsed YAML content
 * @throws {Error} Exits process with code 1 if file cannot be read or parsed
 */
function loadYamlWithFriendlyErrors(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    // Handle YAML parse errors with detailed, user-friendly output
    if (error.name === 'YAMLException' && error.mark) {
      const line = error.mark.line + 1;
      const col = error.mark.column + 1;

      // Read file lines for context
      const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
      const startLine = Math.max(0, line - 2);
      const endLine = Math.min(lines.length, line + 2);
      const contextLines = [];

      for (let i = startLine; i < endLine; i++) {
        const lineNum = i + 1;
        const marker = lineNum === line ? '→' : ' ';
        contextLines.push(`${marker} ${lineNum}: ${lines[i]}`);
      }

      const context = contextLines.join('\n');

      // Extract the main error message
      const mainError = error.message.split('\n')[0];

      // Create user-friendly validation output
      const output = [
        `Validation failed: YAML parse error in ${filePath}`,
        `Line: ${line}, Column: ${col}`,
        '',
        mainError,
        '',
        'Context:',
        context,
        '',
        'Suggested fix: Check indentation for the list item starting near the shown line.',
        'Ensure keys (term, definition, etc.) are properly indented under "- slug:".',
        'YAML requires consistent spacing - use spaces (not tabs) for indentation.',
      ].join('\n');

      // Write to validation-output.txt for CI workflows
      fs.writeFileSync('validation-output.txt', output);

      // Print to stderr for immediate visibility
      console.error(output);
      process.exit(1);
    }

    // Handle other file read errors
    console.error(`❌ Error: Failed to read ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Resolve the base terms path from command line arguments or environment variable
 * Supports both --base flag and BASE_TERMS_PATH environment variable
 * Validates that the resolved path exists and warns if not found
 *
 * @returns {string|null} Absolute path to base terms file, or null if not specified or invalid
 */
function resolveBasePathFromArgs() {
  const args = process.argv.slice(2);
  let basePath = process.env.BASE_TERMS_PATH || null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--base') {
      const next = args[index + 1];
      if (!next) {
        console.error('❌ Error: Missing value for --base option');
        process.exit(1);
      }
      basePath = next;
      index += 1;
    } else if (arg.startsWith('--base=')) {
      basePath = arg.slice('--base='.length);
    }
  }

  if (!basePath) {
    return null;
  }

  const resolved = path.resolve(basePath);
  if (!fs.existsSync(resolved)) {
    console.warn(
      `⚠️ Warning: Base glossary file not found at ${resolved}; skipping slug change checks`
    );
    return null;
  }

  return resolved;
}

/**
 * Main validation function for FOSS Glossary terms
 * Validates terms.yaml against schema.json and performs additional checks:
 * - Schema validation using AJV
 * - Duplicate slug detection
 * - Duplicate term/alias name detection (normalized)
 * - Slug change detection (when base terms file is provided)
 *
 * @throws {Error} Exits process with code 1 if validation fails
 */
function main() {
  const data = loadYamlWithFriendlyErrors('terms.yaml');
  const schema = loadJson('config/schema.json');

  const basePath = resolveBasePathFromArgs();
  let baseTerms = [];
  if (basePath) {
    const baseData = loadYamlWithFriendlyErrors(basePath);
    if (baseData && Array.isArray(baseData.terms)) {
      baseTerms = baseData.terms;
    }
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  if (!validate(data)) {
    console.error('❌ Error: Schema validation failed');
    for (const err of validate.errors || []) {
      console.error(`  - ${formatAjvError(err)}`);
    }
    process.exit(1);
  }

  const errors = [];
  const slugSet = new Map();
  const nameSet = new Map();

  const terms = Array.isArray(data.terms) ? data.terms : [];
  const redirects = data.redirects || {};

  (terms || []).forEach((term, index) => {
    const pos = `term #${index + 1}`;

    if (slugSet.has(term.slug)) {
      const other = slugSet.get(term.slug);
      errors.push(`${pos} slug '${term.slug}' duplicates ${other}`);
    } else {
      slugSet.set(term.slug, pos);
    }

    const addName = (raw, label) => {
      if (!raw) return;
      const key = normalizeName(raw);
      if (!key) return;
      if (nameSet.has(key)) {
        const prev = nameSet.get(key);
        errors.push(`${pos} ${label} '${raw}' conflicts with ${prev}`);
      } else {
        nameSet.set(key, `${pos} ${label} '${raw}'`);
      }
    };

    addName(term.term, 'term');

    if (Array.isArray(term.aliases)) {
      term.aliases.forEach((alias) => addName(alias, 'alias'));
    }
  });

  if (baseTerms.length > 0 && terms.length > 0) {
    const baseNameMap = new Map();
    const newNameMap = new Map();

    // Build base terms index - optimized single pass
    for (let i = 0; i < baseTerms.length; i++) {
      const term = baseTerms[i];
      if (!term || typeof term !== 'object') {
        continue;
      }
      const slug = term.slug;
      if (typeof slug !== 'string' || !slug) {
        continue;
      }

      // Inline name collection to avoid function call overhead
      const names = [];
      if (typeof term.term === 'string') {
        names.push(term.term);
      }
      if (Array.isArray(term.aliases)) {
        for (const alias of term.aliases) {
          if (typeof alias === 'string') {
            names.push(alias);
          }
        }
      }

      // Process names with early duplicate detection
      for (const name of names) {
        const key = normalizeName(name);
        if (key && !baseNameMap.has(key)) {
          baseNameMap.set(key, {
            slug,
            term: term.term || slug,
            label: name,
            index: i + 1,
          });
        }
      }
    }

    // Build new terms index and check for slug changes in one pass
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      if (!term || typeof term !== 'object') {
        continue;
      }
      const slug = term.slug;
      if (typeof slug !== 'string' || !slug) {
        continue;
      }

      // Inline name collection to avoid function call overhead
      const names = [];
      if (typeof term.term === 'string') {
        names.push(term.term);
      }
      if (Array.isArray(term.aliases)) {
        for (const alias of term.aliases) {
          if (typeof alias === 'string') {
            names.push(alias);
          }
        }
      }

      // Process names and check for slug changes simultaneously
      for (const name of names) {
        const key = normalizeName(name);
        if (!key) {
          continue;
        }

        // Check for slug change while building the map
        if (baseNameMap.has(key)) {
          const baseInfo = baseNameMap.get(key);
          if (baseInfo.slug !== slug) {
            errors.push(
              `Slug immutability violation: Term '${baseInfo.term}' slug changed from '${baseInfo.slug}' to '${slug}'. ` +
                `Use redirects instead: add 'redirects: { "${baseInfo.slug}": "${slug}" }' to preserve the old URL.`
            );
          }
        }

        // Only add to newNameMap if not already present
        if (!newNameMap.has(key)) {
          newNameMap.set(key, {
            slug,
            term: term.term || slug,
            label: name,
            index: i + 1,
          });
        }
      }
    }
  }

  // Validate redirects: old slugs must not exist, target slugs must exist
  // Note: slugSet is already populated from the terms loop above, enabling O(1) lookups
  Object.entries(redirects).forEach(([oldSlug, newSlug]) => {
    if (slugSet.has(oldSlug)) {
      errors.push(`Redirect source '${oldSlug}' conflicts with an active term slug`);
    }
    if (!slugSet.has(newSlug)) {
      errors.push(`Redirect target '${newSlug}' does not exist in terms`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ Error: Validation failed\n');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`✅ Validation passed! ${terms.length} terms are valid.`);
}

main();
