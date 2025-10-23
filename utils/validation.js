/**
 * Shared validation utilities for FOSS Glossary
 * 
 * This module provides consistent validation and error formatting functions
 * used across multiple scripts to reduce code duplication.
 */

/**
 * Format AJV validation errors into human-readable messages
 * Handles different error types (additionalProperties, required, minLength, etc.)
 * 
 * @param {Object|Array} errors - Single error object or array of AJV errors
 * @returns {string} Formatted error message
 */
function formatAjvError(errors) {
  // Handle both single error objects and arrays of errors
  if (!errors) {
    return 'Unknown validation error';
  }

  // If it's a single error object (validateTerms.js style)
  if (!Array.isArray(errors)) {
    const error = errors;
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

  // If it's an array of errors (exportTerms.js style)
  if (errors.length === 0) {
    return 'Unknown validation error';
  }
  
  return errors
    .map((error) => {
      const location = error.instancePath || '(root)';
      const message = error.message || 'validation error';
      return `${location} ${message}`.trim();
    })
    .join('; ');
}

module.exports = {
  formatAjvError,
};
