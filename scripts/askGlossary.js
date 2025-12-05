#!/usr/bin/env node
const { OpenAI } = require('openai');
const { loadTermsYaml } = require('../utils/fileSystem');

// Configuration constants (consistent with other AI tools)
const DEFAULT_BASE_URL = 'https://models.inference.ai.azure.com';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 1500;
const DEFAULT_TIMEOUT = 120000;
const DEFAULT_TOP_K = 5;

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
 * Parse command line arguments
 *
 * @param {string[]} argv - Command line arguments
 * @returns {Object} Options object with question property
 */
function parseArgs(argv) {
  const options = {
    question: null,
    topK: DEFAULT_TOP_K,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--top-k' || arg === '-k') {
      if (i + 1 < argv.length) {
        options.topK = parseInt(argv[i + 1], 10);
        i += 1;
      }
    } else if (!arg.startsWith('-')) {
      // Positional argument is the question
      options.question = arg;
    }
  }

  return options;
}

/**
 * Calculate a simple relevance score between a question and a term
 * Uses keyword matching with field-specific weights
 *
 * @param {string} question - The user's question (lowercase)
 * @param {Object} term - A term object from the glossary
 * @returns {number} Relevance score (higher is better)
 */
function calculateRelevance(question, term) {
  const questionLower = question.toLowerCase();
  const questionWords = questionLower.split(/\s+/);
  let score = 0;

  // Check term name (highest weight)
  const termLower = term.term.toLowerCase();
  if (questionLower.includes(termLower)) {
    score += 10;
  }
  for (const word of questionWords) {
    if (word.length > 2 && termLower.includes(word)) {
      score += 3;
    }
  }

  // Check aliases
  if (term.aliases) {
    for (const alias of term.aliases) {
      const aliasLower = alias.toLowerCase();
      if (questionLower.includes(aliasLower)) {
        score += 8;
      }
      for (const word of questionWords) {
        if (word.length > 2 && aliasLower.includes(word)) {
          score += 2;
        }
      }
    }
  }

  // Check slug
  const slugWords = term.slug.split('-');
  for (const slugWord of slugWords) {
    if (questionLower.includes(slugWord)) {
      score += 2;
    }
  }

  // Check definition (medium weight)
  const defLower = (term.definition || '').toLowerCase();
  for (const word of questionWords) {
    if (word.length > 3 && defLower.includes(word)) {
      score += 1;
    }
  }

  // Check explanation (lower weight)
  const explanationLower = (term.explanation || '').toLowerCase();
  for (const word of questionWords) {
    if (word.length > 3 && explanationLower.includes(word)) {
      score += 0.5;
    }
  }

  // Check tags
  if (term.tags) {
    for (const tag of term.tags) {
      if (questionLower.includes(tag)) {
        score += 2;
      }
    }
  }

  return score;
}

/**
 * Retrieve the most relevant terms for a given question
 *
 * @param {string} question - The user's question
 * @param {Object[]} terms - Array of term objects
 * @param {number} topK - Number of top terms to retrieve
 * @returns {Object[]} Array of relevant terms with scores
 */
function retrieveRelevantTerms(question, terms, topK = DEFAULT_TOP_K) {
  const questionLower = question.toLowerCase();

  // Calculate relevance for all terms
  const scoredTerms = terms.map((term) => ({
    term,
    score: calculateRelevance(questionLower, term),
  }));

  // Sort by score descending and take top K
  scoredTerms.sort((a, b) => b.score - a.score);

  // Filter out terms with zero score and take top K
  return scoredTerms.filter((st) => st.score > 0).slice(0, topK);
}

/**
 * Format terms for inclusion in the prompt context
 *
 * @param {Object[]} retrievedTerms - Array of retrieved terms with scores
 * @returns {string} Formatted context string
 */
function formatTermsContext(retrievedTerms) {
  if (retrievedTerms.length === 0) {
    return 'No directly relevant terms found in the glossary.';
  }

  return retrievedTerms
    .map((rt) => {
      const t = rt.term;
      let context = `## ${t.term} (slug: ${t.slug})\n`;
      context += `**Definition:** ${t.definition}\n`;
      if (t.explanation) {
        context += `**Explanation:** ${t.explanation}\n`;
      }
      if (t.humor) {
        context += `**Humor:** ${t.humor}\n`;
      }
      if (t.see_also && t.see_also.length > 0) {
        context += `**Related terms:** ${t.see_also.join(', ')}\n`;
      }
      if (t.tags && t.tags.length > 0) {
        context += `**Tags:** ${t.tags.join(', ')}\n`;
      }
      if (t.controversy_level) {
        context += `**Controversy level:** ${t.controversy_level}\n`;
      }
      return context;
    })
    .join('\n---\n');
}

/**
 * Generate an answer using the AI model
 *
 * @param {string} question - The user's question
 * @param {Object[]} retrievedTerms - Array of retrieved terms with scores
 * @param {OpenAI} client - OpenAI client instance
 * @param {string} model - Model name to use
 * @returns {Promise<Object>} Answer object with response and sources
 */
async function generateAnswer(question, retrievedTerms, client, model) {
  const context = formatTermsContext(retrievedTerms);
  const sourceTerms = retrievedTerms.map((rt) => rt.term.term);

  const systemPrompt = `You are an expert assistant for the FOSS (Free and Open Source Software) Glossary. Your role is to answer questions about FOSS terminology and concepts using ONLY the information provided in the glossary context below.

Important guidelines:
1. Answer ONLY based on the glossary content provided. If the information is not in the glossary, say so clearly.
2. Be accurate and helpful, matching the informative yet humorous tone of the glossary.
3. When relevant, include the humor from the glossary to make answers engaging.
4. Always attribute information to the specific terms you're referencing.
5. If the question is about something not covered in the glossary, suggest related terms that might be helpful.
6. Keep answers concise but complete.

GLOSSARY CONTEXT:
${context}`;

  const userPrompt = `Question: ${question}

Please answer based on the glossary content above. If applicable, mention which terms you're referencing.`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: DEFAULT_TEMPERATURE,
    max_tokens: DEFAULT_MAX_TOKENS,
  });

  // Validate response structure
  if (!response.choices || response.choices.length === 0) {
    throw new Error('AI response did not contain any choices');
  }

  const messageContent = response.choices[0].message?.content;
  if (!messageContent) {
    throw new Error('AI response did not contain message content');
  }

  return {
    answer: messageContent.trim(),
    sources: sourceTerms,
    retrievedCount: retrievedTerms.length,
  };
}

/**
 * Create an OpenAI client configured for GitHub Models
 *
 * @returns {Object} Object containing client and model
 */
function createClient() {
  // GITHUB_TOKEN is used for GitHub Models API (models.inference.ai.azure.com)
  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) {
    throw new Error('GITHUB_TOKEN environment variable is required for GitHub Models API access');
  }

  const baseURL = process.env.ASK_GLOSSARY_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.ASK_GLOSSARY_MODEL || DEFAULT_MODEL;
  const timeout = parseInt(process.env.ASK_GLOSSARY_TIMEOUT, 10) || DEFAULT_TIMEOUT;

  const client = new OpenAI({
    baseURL,
    apiKey,
    timeout,
  });

  return { client, model };
}

/**
 * Main function to answer questions using the glossary
 *
 * @param {string[]} [argv=process.argv.slice(2)] - Command line arguments
 */
async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (!options.question) {
    console.error('❌ Error: Question is required');
    console.error('Usage: npm run ask "Your question about FOSS terminology"');
    console.error('       node scripts/askGlossary.js "What is a fork?"');
    console.error('');
    console.error('Options:');
    console.error('  --top-k, -k <number>  Number of terms to retrieve (default: 5)');
    process.exit(1);
  }

  console.log('🤖 FOSS Glossary Q&A');
  console.log(`   Question: "${truncateForLogging(options.question, 60)}"`);
  console.log(`   Top-K: ${options.topK}`);

  // Load terms
  console.log('\n📚 Loading glossary...');
  const terms = loadTermsYaml();
  console.log(`   Loaded ${terms.length} terms`);

  // Retrieve relevant terms
  console.log('\n🔍 Searching for relevant terms...');
  const retrievedTerms = retrieveRelevantTerms(options.question, terms, options.topK);

  if (retrievedTerms.length === 0) {
    console.log('   No directly relevant terms found.');
    console.log('\n💡 Tip: Try rephrasing your question or using specific FOSS terms.');
    process.exit(0);
  }

  console.log(`   Found ${retrievedTerms.length} relevant term(s):`);
  for (const rt of retrievedTerms) {
    console.log(`   - ${rt.term.term} (score: ${rt.score.toFixed(1)})`);
  }

  // Generate answer
  console.log('\n💭 Generating answer...');
  const { client, model } = createClient();
  const result = await generateAnswer(options.question, retrievedTerms, client, model);

  // Display answer
  console.log('\n' + '='.repeat(60));
  console.log('📖 ANSWER:');
  console.log('='.repeat(60));
  console.log(result.answer);
  console.log('='.repeat(60));

  // Display sources
  console.log('\n📌 Sources:');
  for (const source of result.sources) {
    console.log(`   - ${source}`);
  }

  console.log('\n✅ Done!');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  calculateRelevance,
  retrieveRelevantTerms,
  formatTermsContext,
  generateAnswer,
  createClient,
  truncateForLogging,
  // Export constants for testing
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT,
  DEFAULT_TOP_K,
};
