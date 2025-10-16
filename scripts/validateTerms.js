#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

function loadYaml(path) {
  try {
    return yaml.load(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`❌ Failed to read ${path}: ${error.message}`);
    process.exit(1);
  }
}

function loadSchema(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`❌ Failed to read ${path}: ${error.message}`);
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

function main() {
  const data = loadYaml('terms.yaml');
  const schema = loadSchema('schema.json');

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  if (!validate(data)) {
    console.error('❌ Schema validation failed:');
    for (const err of validate.errors || []) {
      console.error(`  - ${formatAjvError(err)}`);
    }
    process.exit(1);
  }

  const errors = [];
  const slugSet = new Map();
  const nameSet = new Map();

  (data.terms || []).forEach((term, index) => {
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

  if (errors.length > 0) {
    console.error('❌ Validation failed:\n');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`✅ Validation passed! ${data.terms.length} terms are valid.`);
}

main();
