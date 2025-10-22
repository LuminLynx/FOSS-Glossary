#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

function getShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

function buildExport(yamlText) {
  const parsed = yaml.load(yamlText) || {};
  const terms = Array.isArray(parsed.terms) ? parsed.terms : [];
  const metadata = {
    version: getShortSha(),
    generated_at: new Date().toISOString(),
    terms_count: terms.length,
  };

  return { metadata, terms };
}

function writeHeaders(etag) {
  const headerPath = path.join('docs', '_headers');
  const block = `/terms.json\n  Cache-Control: public,max-age=31536000,immutable\n  ETag: ${etag}\n`;

  let existing = '';
  if (fs.existsSync(headerPath)) {
    existing = fs.readFileSync(headerPath, 'utf8');
  }

  const lines = existing.split(/\r?\n/);
  const kept = [];
  let skip = false;
  for (const line of lines) {
    if (skip) {
      if (/^[ \t]/.test(line)) {
        continue;
      }
      skip = false;
    }
    if (!skip && line.trim() === '/terms.json') {
      skip = true;
      continue;
    }
    if (line !== '' || kept.length > 0) {
      kept.push(line);
    }
  }

  let next = kept.join('\n').trimEnd();
  if (next) {
    next += '\n\n' + block;
  } else {
    next = block;
  }

  if (!next.endsWith('\n')) {
    next += '\n';
  }

  fs.writeFileSync(headerPath, next);
}

function writeJsonFromYaml(yamlText) {
  const exportPayload = buildExport(yamlText);
  const json = JSON.stringify(exportPayload, null, 2) + '\n';

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(OUT_PATH, json);

  const etag = `"${crypto.createHash('sha256').update(json).digest('hex')}"`;
  writeHeaders(etag);

  console.log(
    `✅ Wrote ${OUT_PATH} (${exportPayload.metadata.terms_count} terms, version ${exportPayload.metadata.version}).`
  );
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
