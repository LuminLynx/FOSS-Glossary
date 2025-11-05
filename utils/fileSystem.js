/**
 * File system utility functions for FOSS Glossary
 *
 * This module provides consistent file system operations used across
 * multiple scripts to reduce code duplication.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Ensure that the directory for a given file path exists
 * Creates parent directories recursively if they don't exist
 *
 * @param {string} filePath - Path to the file
 */
function ensureDirectoryForFile(filePath) {
  const dir = path.dirname(filePath);
  if (dir && dir !== '.') {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load and parse a YAML file
 *
 * @param {string} filePath - Path to the YAML file
 * @returns {*} Parsed YAML content
 * @throws {Error} If file cannot be read or parsed
 */
function loadYaml(filePath) {
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Error: Failed to read ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Load and parse a JSON file
 *
 * @param {string} filePath - Path to the JSON file
 * @returns {*} Parsed JSON content
 * @throws {Error} If file cannot be read or parsed
 */
function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Error: Failed to read ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Load terms from terms.yaml with comprehensive error handling
 * This is a specialized loader for the terms.yaml file used by generateLandingPage
 *
 * @returns {Array} Array of term objects
 * @throws {Error} Exits process if file cannot be loaded or is invalid
 */
function loadTermsYaml() {
  try {
    // Check if file exists
    if (!fs.existsSync('terms.yaml')) {
      console.error('❌ Error: terms.yaml file not found');
      console.error('   Make sure you are running this script from the repository root directory.');
      process.exit(1);
    }

    // Read file
    let yamlContent;
    try {
      yamlContent = fs.readFileSync('terms.yaml', 'utf8');
    } catch (error) {
      console.error('❌ Error reading terms.yaml file:', error.message);
      process.exit(1);
    }

    // Parse YAML
    let termsData;
    try {
      termsData = yaml.load(yamlContent);
    } catch (error) {
      console.error('❌ Error parsing terms.yaml:', error.message);
      if (error.mark) {
        console.error(`   Line ${error.mark.line + 1}, Column ${error.mark.column + 1}`);
      }
      process.exit(1);
    }

    // Validate structure
    if (!termsData || typeof termsData !== 'object') {
      console.error('❌ Error: terms.yaml must contain a valid YAML object');
      process.exit(1);
    }

    if (!Array.isArray(termsData.terms)) {
      console.error('❌ Error: terms.yaml must contain a "terms" array');
      process.exit(1);
    }

    return termsData.terms;
  } catch (error) {
    // Catch any unexpected errors
    console.error('❌ Error: Unexpected error loading terms:', error.message);
    process.exit(1);
  }
}

module.exports = {
  ensureDirectoryForFile,
  loadYaml,
  loadJson,
  loadTermsYaml,
};
