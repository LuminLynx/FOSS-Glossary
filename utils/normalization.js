/**
 * Shared normalization utilities for FOSS Glossary
 * 
 * This module provides consistent normalization functions used across
 * multiple scripts to reduce code duplication and ensure consistent
 * data processing throughout the application.
 */

/**
 * Normalize a string value by trimming whitespace
 * Returns undefined for null, undefined, or empty strings
 * 
 * @param {*} value - Value to normalize
 * @returns {string|undefined} Normalized string or undefined
 */
function normalizeString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const str = String(value);
  return str.trim().length === 0 ? undefined : str;
}

/**
 * Normalize an array value by trimming and filtering empty entries
 * Converts single values to arrays
 * Returns undefined for null, undefined, or empty arrays
 * 
 * @param {*} value - Value to normalize (array or single value)
 * @returns {string[]|undefined} Normalized array or undefined
 */
function normalizeArray(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const arr = Array.isArray(value) ? value : [value];
  const normalized = arr
    .map((entry) => {
      if (entry === undefined || entry === null) {
        return undefined;
      }
      const str = String(entry);
      return str.trim().length === 0 ? undefined : str;
    })
    .filter((entry) => entry !== undefined);

  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Normalize a glossary term object
 * Required fields: slug, term, definition
 * Optional fields: explanation, humor, tags, see_also, aliases, controversy_level
 * 
 * @param {Object} rawTerm - Raw term object to normalize
 * @returns {Object} Normalized term object
 * @throws {Error} If required fields are missing or invalid
 */
function normalizeTerm(rawTerm) {
  if (!rawTerm || typeof rawTerm !== 'object') {
    throw new Error('Each term must be an object');
  }

  const slug = normalizeString(rawTerm.slug);
  const term = normalizeString(rawTerm.term);
  const definition = normalizeString(rawTerm.definition);

  if (!slug || !term || !definition) {
    throw new Error('Terms require slug, term, and definition');
  }

  // Validate slug format: must be lowercase alphanumeric with hyphens
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    throw new Error(`Slug '${slug}' must contain only lowercase letters, numbers, and hyphens (pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$)`);
  }

  // Validate slug length
  if (slug.length < 3) {
    throw new Error(`Slug '${slug}' must be at least 3 characters long`);
  }
  if (slug.length > 48) {
    throw new Error(`Slug '${slug}' must be at most 48 characters long`);
  }

  // Validate definition length
  if (definition.length < 80) {
    throw new Error(`Definition for '${slug}' must be at least 80 characters long (current: ${definition.length})`);
  }

  const normalized = {
    slug,
    term,
    definition,
  };

  const explanation = normalizeString(rawTerm.explanation);
  if (explanation) {
    normalized.explanation = explanation;
  }

  const humor = normalizeString(rawTerm.humor);
  if (humor) {
    normalized.humor = humor;
  }

  const tags = normalizeArray(rawTerm.tags);
  if (tags) {
    normalized.tags = tags;
  }

  const seeAlso = normalizeArray(rawTerm.see_also);
  if (seeAlso) {
    normalized.see_also = seeAlso;
  }

  const aliases = normalizeArray(rawTerm.aliases);
  if (aliases) {
    normalized.aliases = aliases;
  }

  const controversy = normalizeString(rawTerm.controversy_level);
  if (controversy) {
    // Validate controversy_level enum values
    const validControversyLevels = ['low', 'medium', 'high'];
    if (!validControversyLevels.includes(controversy)) {
      throw new Error(`Controversy level '${controversy}' for '${slug}' must be one of: ${validControversyLevels.join(', ')}`);
    }
    normalized.controversy_level = controversy;
  }

  return normalized;
}

/**
 * Normalize a name for duplicate detection
 * Converts to lowercase and removes all non-alphanumeric characters
 * 
 * @param {*} value - Value to normalize
 * @returns {string} Normalized name (empty string if invalid)
 */
function normalizeName(value) {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

module.exports = {
  normalizeString,
  normalizeArray,
  normalizeTerm,
  normalizeName,
};
