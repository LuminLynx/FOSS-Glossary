const fs = require('fs');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

function scoreTerm(term) {
  let score = 0;
  let earnedBadge = '';
  
  // Base score for having required fields (20 points)
  if (term.term && term.definition) {
    score += 20;
  }
  
  // Bonus for humor (up to 30 points)
  if (term.humor) {
    score += Math.min(30, 10 + Math.floor(term.humor.length / 5));
    if (term.humor.length > 100) {
      earnedBadge = '😂 Comedy Gold - Master of FOSS Humor!';
    }
  }
  
  // Bonus for explanation (20 points)
  if (term.explanation) {
    score += 20;
  }
  
  // Bonus for references/see_also (20 points)
  if (term.see_also && term.see_also.length > 0) {
    score += Math.min(20, term.see_also.length * 5);
  }
  
  // Bonus for tags (10 points)
  if (term.tags && term.tags.length > 0) {
    score += 10;
  }
  
  // Special badges
  if (!earnedBadge) {
    if (score >= 90) {
      earnedBadge = '💯 Perfectionist - Nearly perfect term!';
    } else if (term.controversy_level === 'high') {
      earnedBadge = '�� Flame Warrior - Documented the controversial!';
    }
  }
  
  return { score, badge: earnedBadge };
}

try {
  const termsContent = fs.readFileSync('terms.yaml', 'utf8');
  const termsData = yaml.load(termsContent);
  const terms = termsData.terms || [];
  const latestTerm = terms[terms.length - 1];
  
  if (latestTerm) {
    const result = scoreTerm(latestTerm);
    console.log(`SCORE:${result.score}`);
    if (result.badge) {
      console.log(`BADGE:${result.badge}`);
    }
    console.log('\n--- Score Breakdown ---');
    console.log(`Term: "${latestTerm.term}"`);
    console.log(`Total Score: ${result.score}/100`);
  }
} catch (error) {
  console.error('Error:', error.message);
  console.log('SCORE:0');
}
