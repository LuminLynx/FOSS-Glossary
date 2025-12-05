#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const { OpenAI } = require('openai');
const { loadTermsYaml } = require('../utils/fileSystem');

// Configuration constants
const DEFAULT_BASE_URL = 'https://models.inference.ai.azure.com';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_TIMEOUT = 120000;

/**
 * Convert a term name to a slug (kebab-case)
 * @param {string} termName - The term name to convert
 * @returns {string} The slug in kebab-case
 */
function toSlug(termName) {
  return termName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse command line arguments
 * @param {string[]} argv - Command line arguments
 * @returns {Object} Parsed options with termName
 */
function parseArgs(argv) {
  const options = {
    termName: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('-')) {
      // Positional argument is the term name
      options.termName = arg;
      break;
    }
    if (arg === '--term' || arg === '-t') {
      if (i + 1 < argv.length) {
        options.termName = argv[i + 1];
        i += 1;
      }
    }
  }

  return options;
}

/**
 * Generate a glossary term using AI
 * @param {string} termName - The term name to generate content for
 * @param {OpenAI} client - OpenAI client instance
 * @param {string} model - Model name to use
 * @returns {Promise<Object>} Generated term object
 */
async function generateTerm(termName, client, model) {
  const slug = toSlug(termName);

  const prompt = `You are an expert in FOSS (Free and Open Source Software) terminology and culture. Generate a glossary entry for the term "${termName}".

The entry must follow this JSON structure exactly:
{
  "slug": "${slug}",
  "term": "${termName}",
  "definition": "A clear, informative definition (minimum 80 characters). This should explain what the term means in the FOSS context.",
  "explanation": "A longer explanation providing more context and examples (optional but recommended).",
  "humor": "A witty, sarcastic, or humorous take on the term that captures developer culture (optional but recommended for higher scores).",
  "see_also": ["Related Term 1", "Related Term 2"],
  "tags": ["tag-one", "tag-two"],
  "controversy_level": "low"
}

Requirements:
1. The definition MUST be at least 80 characters long.
2. The slug must be in kebab-case (lowercase with hyphens): "${slug}"
3. Tags must be in kebab-case (e.g., "open-source", "version-control").
4. The controversy_level must be one of: "low", "medium", or "high".
5. Include 2-4 relevant tags.
6. Include 1-4 related terms in see_also.
7. The humor should be clever and capture the essence of developer culture.
8. Make the content engaging and informative for the FOSS community.

Respond ONLY with the JSON object, no additional text or markdown formatting.`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
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

  let content = messageContent.trim();

  // Remove markdown code block formatting if present
  if (content.startsWith('```json')) {
    content = content.slice(7);
  } else if (content.startsWith('```')) {
    content = content.slice(3);
  }
  if (content.endsWith('```')) {
    content = content.slice(0, -3);
  }
  content = content.trim();

  // Parse the JSON response
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
  }

  // Validate required fields
  if (!parsed.definition || parsed.definition.length < 80) {
    throw new Error(
      `Generated definition is too short (${parsed.definition?.length || 0} chars, minimum 80 required)`
    );
  }

  // Ensure slug is correct
  parsed.slug = slug;
  parsed.term = termName;

  // Ensure tags are in kebab-case
  if (parsed.tags && Array.isArray(parsed.tags)) {
    parsed.tags = parsed.tags.map((tag) =>
      tag
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
    );
  }

  return parsed;
}

/**
 * Append a term to terms.yaml
 * @param {Object} newTerm - The term object to append
 */
function appendToTermsYaml(newTerm) {
  const termsPath = 'terms.yaml';

  // Read the current terms.yaml content
  const currentContent = fs.readFileSync(termsPath, 'utf8');
  const data = yaml.load(currentContent);

  // Check if slug already exists
  const existingTerm = data.terms.find((t) => t.slug === newTerm.slug);
  if (existingTerm) {
    throw new Error(`Term with slug "${newTerm.slug}" already exists`);
  }

  // Append the new term
  data.terms.push(newTerm);

  // Write back to file
  const yamlContent = yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    quotingType: "'",
    forceQuotes: false,
  });

  fs.writeFileSync(termsPath, yamlContent, 'utf8');
}

/**
 * Run prettier to format the file
 */
function runFormat() {
  try {
    execSync('npm run format', { encoding: 'utf8', stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️ Warning: Failed to run formatter:', error.message);
  }
}

/**
 * Main function
 * @param {string[]} [argv=process.argv.slice(2)] - Command line arguments
 */
async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (!options.termName) {
    console.error('❌ Error: Term name is required');
    console.error('Usage: npm run draft-term "Term Name"');
    console.error('       npm run draft-term -- --term "Term Name"');
    process.exit(1);
  }

  // Check for GITHUB_TOKEN
  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is required');
    console.error('   Set your GitHub token with: export GITHUB_TOKEN=your_token');
    process.exit(1);
  }

  console.log(`🤖 FOSS Glossary Term Drafter`);
  console.log(`   Term: "${options.termName}"`);
  console.log(`   Slug: "${toSlug(options.termName)}"`);

  // Configuration via environment variables with sensible defaults
  const baseURL = process.env.DRAFT_TERM_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.DRAFT_TERM_MODEL || DEFAULT_MODEL;
  const timeout = parseInt(process.env.DRAFT_TERM_TIMEOUT, 10) || DEFAULT_TIMEOUT;

  const client = new OpenAI({
    baseURL,
    apiKey,
    timeout,
  });

  console.log('\n📝 Generating term with AI...');

  try {
    const generatedTerm = await generateTerm(options.termName, client, model);

    console.log('\n✨ Generated term:');
    console.log(`   Definition: ${generatedTerm.definition.substring(0, 60)}...`);
    if (generatedTerm.explanation) {
      console.log(`   Explanation: ${generatedTerm.explanation.substring(0, 60)}...`);
    }
    if (generatedTerm.humor) {
      console.log(`   Humor: ${generatedTerm.humor.substring(0, 60)}...`);
    }
    console.log(`   Tags: ${generatedTerm.tags?.join(', ') || 'none'}`);
    console.log(`   See also: ${generatedTerm.see_also?.join(', ') || 'none'}`);
    console.log(`   Controversy: ${generatedTerm.controversy_level || 'low'}`);

    console.log('\n📄 Appending to terms.yaml...');
    appendToTermsYaml(generatedTerm);
    console.log('   ✓ Term appended successfully');

    console.log('\n🧹 Running formatter...');
    runFormat();

    console.log('\n✅ Done! Term has been added to terms.yaml');
    console.log('   Run "npm run validate" to verify the term is valid.');
    console.log('   Run "npm run score" to see the term score.');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  toSlug,
  generateTerm,
  appendToTermsYaml,
  runFormat,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT,
};
