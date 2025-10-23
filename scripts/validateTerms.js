#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

function loadYaml(filePath) {
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Error: Failed to read ${filePath}:`, error.message);
    process.exit(1);
  }
}

function loadSchema(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`❌ Error: Failed to read ${path}:`, error.message);
    process.exit(1);
  }
}

function formatAjvError(error) {
  const location = error.instancePath ? error.instancePath : '(root)';
  const message = error.message || 'validation error';
  if (error.keyword === 'additionalProperties' && error.params?.additionalProperty) {
    return `${location} has unexpected property '${error.params.additionalProperty}'`;
  }
  if (error.keyword === 'required' && error.params?.missingProperty) {
    return `${location} missing required property '${error.params.missingProperty}'`;
  }
  if (error.keyword === 'minLength' && error.params?.limit) {
    return `${location} ${message} (minLength ${error.params.limit})`;
  }
  return `${location} ${message}`;
}

function normalizeName(value) {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

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

function main() {
  const data = loadYaml('terms.yaml');
  const schema = loadSchema('schema.json');

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
