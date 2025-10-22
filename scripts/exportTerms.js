#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

const ONLY_IF_NEW = process.argv.includes('--only-if-new');
const OUT_PATH = 'docs/terms.json';  // serve via GitHub Pages

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

function countTerms(text) {
  try {
    const data = yaml.load(text);
    return Array.isArray(data?.terms) ? data.terms.length : 0;
  } catch {
    return 0;
  }
}

function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}

function readHeadYaml() {
  return readFile('terms.yaml');
}

function readPrevYaml() {
  try {
    // previous commit on main; safe on push-to-main workflows
    return execSync('git show HEAD~1:terms.yaml', { encoding: 'utf8' });
  } catch {
    return null; // first commit or file newly added
  }
}

function writeJsonFromYaml(yamlText) {
  const obj = buildExportPayload(yamlText);
  // (Optional) sanitize/normalize here if needed
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(obj, null, 2) + '\n');
  console.log(`✅ Wrote ${OUT_PATH} (${obj.terms_count} terms).`);
}

(function main() {
  const head = readHeadYaml();
  if (!ONLY_IF_NEW) {
    writeJsonFromYaml(head);
    return;
  }

  const prev = readPrevYaml();
  if (!prev) {
    // No previous version to compare → treat as "new"
    writeJsonFromYaml(head);
    return;
  }

  const cHead = countTerms(head);
  const cPrev = countTerms(prev);

  if (cHead > cPrev) {
    writeJsonFromYaml(head);
  } else {
    console.log(`ℹ️ No new terms (prev=${cPrev}, head=${cHead}). Skipping export.`);
  }
})();
