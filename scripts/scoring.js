/**
 * Unified scoring module for FOSS Glossary terms
 * This module provides consistent scoring logic across all scripts
 */

/**
 * Calculate the score for a glossary term
 * @param {Object} term - The term object to score
 * @returns {Object} - Object containing score (number) and badges (array)
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
 * @param {Object} term - The term object to analyze
 * @returns {Object} - Object containing detailed scoring breakdown
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
      crossReferences: 20
    }
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
  getScoreBreakdown
};
