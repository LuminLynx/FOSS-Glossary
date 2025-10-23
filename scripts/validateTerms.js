#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { normalizeName } = require('../utils/normalization');
const { formatAjvError } = require('../utils/validation');
const { loadYaml, loadJson } = require('../utils/fileSystem');

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
    console.warn(`⚠️ Warning: Base glossary file not found at ${resolved}; skipping slug change checks`);
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
  const data = loadYaml('terms.yaml');
  const schema = loadJson('schema.json');

  const basePath = resolveBasePathFromArgs();
  let baseTerms = [];
  if (basePath) {
    const baseData = loadYaml(basePath);
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
      term.aliases.forEach(alias => addName(alias, 'alias'));
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
              `Slug for term '${baseInfo.term}' changed from '${baseInfo.slug}' to '${slug}' (label '${baseInfo.label}')`
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

  if (errors.length > 0) {
    console.error('❌ Error: Validation failed\n');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`✅ Validation passed! ${terms.length} terms are valid.`);
}

main();
