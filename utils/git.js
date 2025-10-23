/**
 * Git utility functions for FOSS Glossary
 * 
 * This module provides consistent Git operations used across
 * multiple scripts to reduce code duplication.
 */

const { execSync } = require('child_process');

/**
 * Get the short Git SHA of the current HEAD commit
 * Returns a default value if Git is not available or the command fails
 * 
 * @param {string} [defaultValue='unknown'] - Default value if Git SHA cannot be determined
 * @returns {string} Short Git SHA (7 characters) or default value
 */
function getGitSha(defaultValue = 'unknown') {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return defaultValue;
  }
}

module.exports = {
  getGitSha,
};
