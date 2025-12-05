#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');
const { OpenAI } = require('openai');
const { loadTermsYaml } = require('../utils/fileSystem');

/**
 * Truncate a string for safe logging (avoid exposing sensitive data)
 *
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated string with ellipsis if needed
 */
function truncateForLogging(str, maxLength = 100) {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Parse command line arguments for suggestLinks script
 *
 * @param {string[]} argv - Command line arguments (typically process.argv.slice(2))
 * @returns {Object} Options object with fix flag
 */
function parseArgs(argv) {
  const options = {
    fix: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fix') {
      options.fix = true;
    }
  }

  return options;
}

/**
 * Get existing cross-references for a term
 *
 * @param {Object} term - The term object
 * @returns {Set<string>} Set of normalized see_also entries
 */
function getExistingLinks(term) {
  const links = new Set();
  if (Array.isArray(term.see_also)) {
    for (const link of term.see_also) {
      links.add(link.toLowerCase());
    }
  }
  return links;
}

/**
 * Build a map of term names/slugs for quick lookup
 *
 * @param {Object[]} terms - Array of term objects
 * @returns {Map<string, Object>} Map of normalized term identifiers to term objects
 */
function buildTermLookup(terms) {
  const lookup = new Map();
  for (const term of terms) {
    // Add by slug
    lookup.set(term.slug.toLowerCase(), term);
    // Add by term name
    lookup.set(term.term.toLowerCase(), term);
    // Add by aliases
    if (Array.isArray(term.aliases)) {
      for (const alias of term.aliases) {
        lookup.set(alias.toLowerCase(), term);
      }
    }
  }
  return lookup;
}

/**
 * Analyze terms and suggest missing cross-references using AI
 *
 * @param {Object[]} terms - Array of term objects
 * @returns {Promise<Object[]>} Array of suggestion objects
 */
async function analyzeSuggestedLinks(terms) {
  // GITHUB_TOKEN is used for GitHub Models API (models.inference.ai.azure.com)
  // See: https://docs.github.com/en/github-models/prototyping-with-ai-models
  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) {
    throw new Error('GITHUB_TOKEN environment variable is required for GitHub Models API access');
  }

  const client = new OpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey,
    timeout: 120000, // 120 second timeout for API calls
  });

  // Model can be configured via environment variable
  const model = process.env.SUGGEST_LINKS_MODEL || 'gpt-4o';

  // Build a summary of all terms for context
  const termsSummary = terms
    .map((t) => {
      const existingLinks = Array.isArray(t.see_also) ? t.see_also.join(', ') : 'none';
      return `- ${t.term} (slug: ${t.slug}): ${t.definition.slice(0, 150)}... [Current see_also: ${existingLinks}]`;
    })
    .join('\n');

  const prompt = `You are analyzing a FOSS (Free and Open Source Software) glossary to find missing cross-references between semantically related terms.

Here are all the terms in the glossary:

${termsSummary}

Your task:
1. Analyze the semantic relationships between terms based on their definitions
2. Identify terms that should be cross-referenced but are NOT currently listed in each other's see_also
3. Focus on meaningful connections (concepts that naturally relate, dependencies, antonyms, related workflows, etc.)
4. Do NOT suggest linking a term to itself
5. Do NOT suggest links that already exist in see_also

Respond with a JSON object containing exactly this field:
- suggestions: An array of suggestion objects, each with:
  - sourceTerm: The term that should add a new see_also link (use the exact term name)
  - targetTerm: The term to link to (use the exact term name)
  - reason: A brief explanation of why these terms should be linked

Example format:
{
  "suggestions": [
    {
      "sourceTerm": "Bus Factor",
      "targetTerm": "Maintainer Burnout",
      "reason": "Both relate to project sustainability and the risks of over-reliance on few contributors"
    }
  ]
}

Be selective - only suggest the most valuable missing connections (up to 15 suggestions max).
Respond ONLY with the JSON object, no additional text.`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3, // Lower temperature for more consistent suggestions
    max_tokens: 2000,
  });

  // Validate response structure
  if (!response.choices || response.choices.length === 0) {
    throw new Error('AI response did not contain any choices');
  }

  const messageContent = response.choices[0].message?.content;
  if (!messageContent) {
    throw new Error('AI response did not contain message content');
  }

  const content = messageContent.trim();

  // Parse the JSON response
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    throw new Error(
      `Failed to parse AI response as JSON: ${parseError.message}. Response preview: ${truncateForLogging(content)}`
    );
  }

  // Validate required fields in parsed response
  if (!Array.isArray(parsed.suggestions)) {
    throw new Error('AI response missing required "suggestions" array field');
  }

  return parsed.suggestions;
}

/**
 * Validate and filter suggestions to ensure they reference valid terms
 *
 * @param {Object[]} suggestions - Array of suggestion objects from AI
 * @param {Object[]} terms - Array of term objects
 * @returns {Object[]} Filtered array of valid suggestions
 */
function validateSuggestions(suggestions, terms) {
  const termLookup = buildTermLookup(terms);
  const validSuggestions = [];

  for (const suggestion of suggestions) {
    // Validate suggestion structure
    if (
      !suggestion.sourceTerm ||
      !suggestion.targetTerm ||
      typeof suggestion.sourceTerm !== 'string' ||
      typeof suggestion.targetTerm !== 'string'
    ) {
      continue;
    }

    // Find source and target terms
    const sourceTerm = termLookup.get(suggestion.sourceTerm.toLowerCase());
    const targetTerm = termLookup.get(suggestion.targetTerm.toLowerCase());

    if (!sourceTerm || !targetTerm) {
      // One of the terms doesn't exist
      continue;
    }

    if (sourceTerm.slug === targetTerm.slug) {
      // Self-reference, skip
      continue;
    }

    // Check if link already exists
    const existingLinks = getExistingLinks(sourceTerm);
    if (
      existingLinks.has(targetTerm.term.toLowerCase()) ||
      existingLinks.has(targetTerm.slug.toLowerCase())
    ) {
      continue;
    }

    validSuggestions.push({
      sourceTerm: sourceTerm.term,
      sourceSlug: sourceTerm.slug,
      targetTerm: targetTerm.term,
      targetSlug: targetTerm.slug,
      reason: suggestion.reason || 'Semantically related terms',
    });
  }

  return validSuggestions;
}

/**
 * Apply suggestions by updating terms.yaml
 *
 * @param {Object[]} suggestions - Array of valid suggestion objects
 * @param {Object[]} terms - Array of term objects
 * @returns {Object[]} Updated terms array
 */
function applySuggestions(suggestions, terms) {
  // Group suggestions by source slug
  const suggestionsBySource = new Map();
  for (const suggestion of suggestions) {
    if (!suggestionsBySource.has(suggestion.sourceSlug)) {
      suggestionsBySource.set(suggestion.sourceSlug, []);
    }
    suggestionsBySource.get(suggestion.sourceSlug).push(suggestion.targetTerm);
  }

  // Update terms with new see_also entries
  const updatedTerms = terms.map((term) => {
    const newLinks = suggestionsBySource.get(term.slug);
    if (!newLinks) {
      return term;
    }

    const existingLinks = Array.isArray(term.see_also) ? [...term.see_also] : [];
    const updatedLinks = [...existingLinks, ...newLinks];

    return {
      ...term,
      see_also: updatedLinks,
    };
  });

  return updatedTerms;
}

/**
 * Write updated terms to terms.yaml
 *
 * @param {Object[]} terms - Updated terms array
 */
function writeTermsYaml(terms) {
  const data = { terms };
  const yamlContent = yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    quotingType: "'",
    forceQuotes: false,
  });
  fs.writeFileSync('terms.yaml', yamlContent, 'utf8');
}

/**
 * Format and display suggestions to console
 *
 * @param {Object[]} suggestions - Array of valid suggestion objects
 */
function displaySuggestions(suggestions) {
  if (suggestions.length === 0) {
    console.log('✅ No missing cross-references found. The glossary is well-connected!');
    return;
  }

  console.log('\n📋 Suggested Cross-References:\n');
  console.log('─'.repeat(60));

  for (const suggestion of suggestions) {
    console.log(`\n  Term "${suggestion.sourceTerm}" should link to "${suggestion.targetTerm}"`);
    console.log(`  Reason: ${suggestion.reason}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 Total suggestions: ${suggestions.length}`);
  console.log('\n💡 Run with --fix to apply these changes automatically.');
}

/**
 * Main function to suggest missing cross-references
 *
 * @param {string[]} [argv=process.argv.slice(2)] - Command line arguments
 */
async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  // Load terms from terms.yaml
  console.log('Loading terms from terms.yaml...');
  const terms = loadTermsYaml();
  console.log(`Loaded ${terms.length} terms from glossary.`);

  // Analyze and get suggestions using AI
  console.log('Analyzing term relationships using AI...');
  const rawSuggestions = await analyzeSuggestedLinks(terms);
  console.log(`AI returned ${rawSuggestions.length} suggestions.`);

  // Validate and filter suggestions
  const validSuggestions = validateSuggestions(rawSuggestions, terms);
  console.log(`After validation: ${validSuggestions.length} valid suggestions.`);

  if (options.fix) {
    if (validSuggestions.length === 0) {
      console.log('✅ No changes needed. The glossary is well-connected!');
      return;
    }

    // Apply suggestions
    console.log('\n🔧 Applying suggestions...');
    const updatedTerms = applySuggestions(validSuggestions, terms);
    writeTermsYaml(updatedTerms);

    console.log(`✅ Updated terms.yaml with ${validSuggestions.length} new cross-references.`);
    console.log('   Run "npm run validate" to verify changes.');
    console.log('   Run "npm run sort:yaml" to sort the updated file.');
  } else {
    // Display suggestions
    displaySuggestions(validSuggestions);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  getExistingLinks,
  buildTermLookup,
  validateSuggestions,
  applySuggestions,
  displaySuggestions,
  truncateForLogging,
};
