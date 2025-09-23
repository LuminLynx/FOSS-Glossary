#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');

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

function main() {
  try {
    // Read the terms file
    const termsData = yaml.load(fs.readFileSync('terms.yaml', 'utf8'));
    
    if (!termsData || !termsData.terms || !Array.isArray(termsData.terms)) {
      console.error('Error: Invalid terms.yaml structure');
      process.exit(1);
    }
    
    // Get the latest term (assuming it's the last one added)
    const latestTerm = termsData.terms[termsData.terms.length - 1];
    
    if (!latestTerm) {
      console.error('Error: No terms found');
      process.exit(1);
    }
    
    // Score the term
    const { score, badges } = scoreTerm(latestTerm);
    
    // Output for GitHub Actions
    console.log(`\n📊 Scoring Results for "${latestTerm.term}":\n`);
    console.log(`SCORE:${score}`);
    
    if (badges.length > 0) {
      console.log(`BADGE:${badges.join(', ')}`);
    }
    
    // Detailed breakdown
    console.log('\n📋 Score Breakdown:');
    console.log(`- Base definition: ${latestTerm.term && latestTerm.definition ? '20/20' : '0/20'}`);
    console.log(`- Humor: ${latestTerm.humor ? Math.min(30, Math.floor(latestTerm.humor.length / 5)) : '0'}/30`);
    console.log(`- Explanation: ${latestTerm.explanation ? '20/20' : '0/20'}`);
    console.log(`- Tags: ${latestTerm.tags ? Math.min(10, latestTerm.tags.length * 3) : '0'}/10`);
    console.log(`- Cross-references: ${latestTerm.see_also ? Math.min(20, latestTerm.see_also.length * 5) : '0'}/20`);
    
    console.log(`\nTotal: ${score}/100`);
    
    if (score >= 90) {
      console.log('\n🎉 OUTSTANDING! This is a legendary contribution!');
    } else if (score >= 80) {
      console.log('\n🔥 Excellent work! This is a high-quality term!');
    } else if (score >= 70) {
      console.log('\n💪 Great job! Solid contribution to the glossary!');
    } else if (score >= 60) {
      console.log('\n👍 Good work! Consider adding humor or references for more points!');
    } else {
      console.log('\n🌱 Thanks for contributing! Add more details to boost your score!');
    }
    
  } catch (error) {
    console.error('Error processing terms:', error.message);
    process.exit(1);
  }
}

main();