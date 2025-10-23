#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');
const { scoreTerm, getScoreBreakdown } = require('./scoring');

function main() {
  try {
    // Read the terms file
    const termsData = yaml.load(fs.readFileSync('terms.yaml', 'utf8'));

    if (!termsData || !termsData.terms || !Array.isArray(termsData.terms)) {
      console.error('❌ Error: Invalid terms.yaml structure');
      process.exit(1);
    }

    const targetSlug = process.env.TARGET_SLUG;
    let termToScore = null;

    if (targetSlug) {
      termToScore = termsData.terms.find(term => term && term.slug === targetSlug);
      if (!termToScore) {
        console.error(`❌ Error: No term found with slug "${targetSlug}".`);
        process.exit(1);
      }
    } else {
      // Get the latest term (assuming it's the last one added)
      termToScore = termsData.terms[termsData.terms.length - 1];
    }

    if (!termToScore) {
      console.error('❌ Error: No terms found');
      process.exit(1);
    }

    // Score the term
    const { score, badges } = scoreTerm(termToScore);

    // Output for GitHub Actions
    console.log(`\n📊 Scoring Results for "${termToScore.term}":\n`);
    console.log(`SCORE:${score}`);

    const badgesLine = badges.join(', ');
    if (badges.length > 0) {
      console.log(`BADGE:${badgesLine}`);
    }
    console.log(`BADGES:${badgesLine}`);
    console.log(`TERM_NAME:${termToScore.term || ''}`);
    console.log(`TERM_SLUG:${termToScore.slug || ''}`);

    // Detailed breakdown using the breakdown function
    const breakdown = getScoreBreakdown(termToScore);
    console.log('\n📋 Score Breakdown:');
    console.log(`- Base definition: ${breakdown.base}/${breakdown.maxScores.base}`);
    console.log(`- Humor: ${breakdown.humor}/${breakdown.maxScores.humor}`);
    console.log(`- Explanation: ${breakdown.explanation}/${breakdown.maxScores.explanation}`);
    console.log(`- Tags: ${breakdown.tags}/${breakdown.maxScores.tags}`);
    console.log(`- Cross-references: ${breakdown.crossReferences}/${breakdown.maxScores.crossReferences}`);

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
    console.error('❌ Error processing terms:', error.message);
    process.exit(1);
  }
}

main();