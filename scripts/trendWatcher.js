#!/usr/bin/env node
const yaml = require('js-yaml');
const { OpenAI } = require('openai');
const { loadTermsYaml } = require('../utils/fileSystem');
const { normalizeName } = require('../utils/normalization');

// Candidate trending terms to simulate discovery
const TRENDING_CANDIDATES = ['Agentic Workflow', 'Data Gravity', 'Shifting Left'];

/**
 * Check if a term already exists in the glossary
 * Checks against slug, term name, and aliases using normalized comparison
 *
 * @param {string} candidateTerm - The term to check
 * @param {Object[]} existingTerms - Array of existing term objects
 * @returns {boolean} True if term already exists
 */
function termExists(candidateTerm, existingTerms) {
  const normalizedCandidate = normalizeName(candidateTerm);

  for (const term of existingTerms) {
    // Check slug
    if (normalizeName(term.slug) === normalizedCandidate) {
      return true;
    }

    // Check term name
    if (normalizeName(term.term) === normalizedCandidate) {
      return true;
    }

    // Check aliases
    if (Array.isArray(term.aliases)) {
      for (const alias of term.aliases) {
        if (normalizeName(alias) === normalizedCandidate) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Generate a slug from a term name
 *
 * @param {string} term - The term to generate a slug for
 * @returns {string} Kebab-case slug
 */
function generateSlug(term) {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate term content using OpenAI
 *
 * @param {string} term - The term to generate content for
 * @returns {Promise<Object>} Generated term object
 */
async function generateTermContent(term) {
  const client = new OpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey: process.env.GITHUB_TOKEN || process.env.OPENAI_API_KEY,
  });

  const prompt = `You are helping to create a glossary entry for FOSS (Free and Open Source Software) terms.

Generate content for the term: "${term}"

Respond with a JSON object containing exactly these fields:
- definition: A clear, informative definition (at least 80 characters, focusing on what it means in the FOSS/tech context)
- humor: A witty, humorous take on the term (like an inside joke for developers)
- tags: An array of 3-5 relevant kebab-case tags (e.g., "developer-habits", "workflow", "methodology")

Example format:
{
  "definition": "The process of moving testing, security, and quality checks earlier in the development lifecycle...",
  "humor": "Because apparently fixing bugs is more fun when you haven't deployed them to production yet.",
  "tags": ["methodology", "testing", "devops"]
}

Respond ONLY with the JSON object, no additional text.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = response.choices[0].message.content.trim();

  // Parse the JSON response
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${content}`);
  }

  return {
    slug: generateSlug(term),
    term,
    definition: parsed.definition,
    humor: parsed.humor,
    tags: parsed.tags,
  };
}

/**
 * Format a term object as YAML
 *
 * @param {Object} term - The term object to format
 * @returns {string} YAML-formatted term
 */
function formatTermAsYaml(term) {
  return yaml.dump([term], { indent: 2, lineWidth: -1 });
}

/**
 * Main function
 */
async function main() {
  // Load existing terms
  const existingTerms = loadTermsYaml();
  console.log(`Loaded ${existingTerms.length} existing terms from terms.yaml`);

  // Find a new term that doesn't exist
  let newTerm = null;
  for (const candidate of TRENDING_CANDIDATES) {
    if (!termExists(candidate, existingTerms)) {
      newTerm = candidate;
      break;
    }
  }

  if (!newTerm) {
    console.log('No new terms found');
    return;
  }

  console.log(`Found new term: ${newTerm}`);

  // Generate content using AI
  console.log('Generating content using AI...');
  const termData = await generateTermContent(newTerm);

  // Output the generated term as YAML
  console.log('\n--- Generated Term (YAML) ---');
  console.log(formatTermAsYaml(termData));
  console.log('--- End Generated Term ---\n');

  console.log('Add this term to terms.yaml to include it in the glossary.');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
