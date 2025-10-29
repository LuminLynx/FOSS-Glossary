#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');
const { scoreTerm, getScoreBreakdown } = require('./scoring');

/**
 * Main function to score a term from terms.yaml and display results
 * Scores either the term specified by TARGET_SLUG environment variable
 * or the latest term (last in the array)
 * Outputs score, badges, breakdown, and GitHub Actions compatible variables
 * 
 * @throws {Error} Exits process with code 1 if terms.yaml is invalid or term not found
 */
function main() {
  try {
    // Read the terms file
    const termsData = yaml.load(fs.readFileSync('terms.yaml', 'utf8'));

    if (!termsData || !termsData.terms || !Array.isArray(termsData.terms)) {
      console.error('❌ Error: Invalid terms.yaml structure');
      process.exit(1);
    }

    const { term: termToScore, errorMessage } = resolveTermToScore(termsData.terms);

    if (!termToScore) {
      console.error(errorMessage || '❌ Error: No terms found');
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

function getCliSlug(argv = process.argv) {
  if (!Array.isArray(argv)) {
    return undefined;
  }

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) {
      continue;
    }

    if (arg.startsWith('--slug=')) {
      const [, value] = arg.split('=');
      if (value) {
        return value;
      }
      continue;
    }

    if (arg === '--slug') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        return next;
      }
      continue;
    }

    if (!arg.startsWith('-')) {
      return arg;
    }
  }

  return undefined;
}

function resolveTermToScore(terms, { argv = process.argv, env = process.env } = {}) {
  if (!Array.isArray(terms) || terms.length === 0) {
    return { term: null, errorMessage: '❌ Error: No terms found' };
  }

  const cliSlug = getCliSlug(argv);
  const targetSlug = cliSlug || env.TARGET_SLUG;

  if (targetSlug) {
    const term = terms.find(candidate => candidate && candidate.slug === targetSlug);
    if (!term) {
      return {
        term: null,
        errorMessage: `❌ Error: No term found with slug "${targetSlug}".`
      };
    }
    return { term };
  }

  return { term: terms[terms.length - 1] };
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  getCliSlug,
  resolveTermToScore
};
