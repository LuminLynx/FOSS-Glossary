/**
 * Unified scoring module for FOSS Glossary terms
 * This module provides consistent scoring logic across all scripts
 *
 * Scoring Formula:
 * - Base Score: 20 points (requires both term.term and term.definition)
 * - Humor: min(30, floor(humor.length / 5)) points
 * - Explanation: 20 points (requires explanation.length > 20)
 * - Tags: min(10, tags.length × 3) points
 * - Cross-references: min(20, see_also.length × 5) points
 * - Total: min(100, sum of all components)
 *
 * Achievement Badges:
 * - 😂 Comedy Gold: humor length > 100 characters
 * - 🔥 Flame Warrior: controversy_level = 'high'
 * - 🌶️ Spicy Take: controversy_level = 'medium'
 * - 💯 Perfectionist: score >= 90
 * - ⭐ Star Contributor: score >= 80
 * - 💪 Strong Entry: score >= 70
 */

/**
 * Calculate the score for a glossary term
 * @param {Object} term - The term object to score
 * @param {string} term.term - The term name (required for base score)
 * @param {string} term.definition - The term definition (required for base score)
 * @param {string} [term.humor] - Humorous take on the term (1 point per 5 chars, max 30)
 * @param {string} [term.explanation] - Detailed explanation (20 points if length > 20)
 * @param {string[]} [term.tags] - Category tags (3 points each, max 10 points)
 * @param {string[]} [term.see_also] - Cross-references (5 points each, max 20 points)
 * @param {string} [term.controversy_level] - 'high' or 'medium' for controversy badges
 * @returns {Object} Object containing score (number 0-100) and badges (string array)
 */
function scoreTerm(term) {
  let score = 0;
  let badges = [];

  // Base score for having required fields (20 points)
  if (term.term && term.definition) {
    score += 20;
  }

  // Humor (up to 30 points)
  if (term.humor) {
    const humorLength = term.humor.length;
    const humorPoints = Math.min(30, Math.floor(humorLength / 5));
    score += humorPoints;

    if (humorLength > 100) {
      badges.push('😂 Comedy Gold');
    }
  }

  // Explanation (20 points)
  if (term.explanation && term.explanation.length > 20) {
    score += 20;
  }

  // Tags (10 points)
  if (term.tags && Array.isArray(term.tags) && term.tags.length > 0) {
    score += Math.min(10, term.tags.length * 3);
  }

  // See also / cross-references (up to 20 points)
  if (term.see_also && Array.isArray(term.see_also)) {
    score += Math.min(20, term.see_also.length * 5);
  }

  // Controversy bonus
  if (term.controversy_level) {
    if (term.controversy_level === 'high') {
      badges.push('🔥 Flame Warrior');
    } else if (term.controversy_level === 'medium') {
      badges.push('🌶️ Spicy Take');
    }
  }

  // Achievement badges based on score
  if (score >= 90) {
    badges.push('💯 Perfectionist');
  } else if (score >= 80) {
    badges.push('⭐ Star Contributor');
  } else if (score >= 70) {
    badges.push('💪 Strong Entry');
  }

  return { score: Math.min(100, score), badges };
}

/**
 * Get a detailed breakdown of scoring components for a term
 * This function returns the individual score components and their maximum possible values,
 * useful for displaying scoring details to contributors.
 *
 * @param {Object} term - The term object to analyze
 * @param {string} term.term - The term name
 * @param {string} term.definition - The term definition
 * @param {string} [term.humor] - Humorous take on the term
 * @param {string} [term.explanation] - Detailed explanation
 * @param {string[]} [term.tags] - Category tags
 * @param {string[]} [term.see_also] - Cross-references
 * @returns {Object} Object containing detailed scoring breakdown
 * @returns {number} return.base - Points earned for base definition (0-20)
 * @returns {number} return.humor - Points earned for humor (0-30)
 * @returns {number} return.explanation - Points earned for explanation (0-20)
 * @returns {number} return.tags - Points earned for tags (0-10)
 * @returns {number} return.crossReferences - Points earned for cross-references (0-20)
 * @returns {Object} return.maxScores - Maximum possible score for each component
 */
function getScoreBreakdown(term) {
  const breakdown = {
    base: 0,
    humor: 0,
    explanation: 0,
    tags: 0,
    crossReferences: 0,
    maxScores: {
      base: 20,
      humor: 30,
      explanation: 20,
      tags: 10,
      crossReferences: 20,
    },
  };

  // Base definition
  if (term.term && term.definition) {
    breakdown.base = 20;
  }

  // Humor
  if (term.humor) {
    breakdown.humor = Math.min(30, Math.floor(term.humor.length / 5));
  }

  // Explanation
  if (term.explanation && term.explanation.length > 20) {
    breakdown.explanation = 20;
  }

  // Tags
  if (term.tags && Array.isArray(term.tags) && term.tags.length > 0) {
    breakdown.tags = Math.min(10, term.tags.length * 3);
  }

  // Cross-references
  if (term.see_also && Array.isArray(term.see_also)) {
    breakdown.crossReferences = Math.min(20, term.see_also.length * 5);
  }

  return breakdown;
}

module.exports = {
  scoreTerm,
  getScoreBreakdown,
};
