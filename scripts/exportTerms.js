#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');

const ONLY_IF_NEW = process.argv.includes('--only-if-new');
const OUT_PATH = 'docs/terms.json';  // serve via GitHub Pages
const MANIFEST_PATH = '.terms-slugs.txt';

function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}

function readHeadYaml() {
  return readFile('terms.yaml');
}

function writeJsonFromYaml(yamlText) {
  const obj = yaml.load(yamlText) || {};
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(obj, null, 2) + '\n');
  console.log(`✅ Wrote ${OUT_PATH} (${Array.isArray(obj.terms) ? obj.terms.length : 0} terms).`);
}

function extractSlugs(yamlText) {
  try {
    const data = yaml.load(yamlText) || {};
    if (!Array.isArray(data.terms)) return [];
    return data.terms
      .map((term) => {
        if (!term || typeof term.slug !== 'string') return null;
        const normalized = term.slug.trim().toLowerCase();
        return normalized.length > 0 ? normalized : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { slugs: [], exists: false };
  }
  const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const slugs = content
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  return { slugs, exists: true };
}

function diffSlugs(nextSlugs, manifestSlugs) {
  const nextSet = new Set(nextSlugs);
  const manifestSet = new Set(manifestSlugs);

  const newSlugs = Array.from(nextSet).filter((slug) => !manifestSet.has(slug));
  const removedSlugs = Array.from(manifestSet).filter((slug) => !nextSet.has(slug));

  newSlugs.sort();
  removedSlugs.sort();

  return { newSlugs, removedSlugs };
}

function writeManifest(slugs) {
  const unique = Array.from(new Set(slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean)));
  unique.sort();
  fs.writeFileSync(MANIFEST_PATH, unique.join('\n') + '\n');
  console.log(`✅ Updated ${MANIFEST_PATH} (${unique.length} slugs).`);
}

(function main() {
  const head = readHeadYaml();
  const headSlugs = extractSlugs(head);

  if (!ONLY_IF_NEW) {
    writeJsonFromYaml(head);
    writeManifest(headSlugs);
    return;
  }

  const { slugs: manifestSlugs, exists } = readManifest();
  const { newSlugs, removedSlugs } = diffSlugs(headSlugs, manifestSlugs);

  if (!exists) {
    console.log(`ℹ️ No manifest found at ${MANIFEST_PATH}. Treating all ${headSlugs.length} slugs as new.`);
  }

  if (removedSlugs.length > 0) {
    console.log(`ℹ️ Detected removed slugs: ${removedSlugs.join(', ')}`);
  }

  if (newSlugs.length === 0 && exists) {
    console.log('ℹ️ No new slugs — skipped.');
    return;
  }

  if (newSlugs.length > 0) {
    console.log(`ℹ️ New slugs detected: ${newSlugs.join(', ')}`);
  }

  writeJsonFromYaml(head);
  writeManifest(headSlugs);
})();
