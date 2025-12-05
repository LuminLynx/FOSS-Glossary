#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { loadTermsYaml, ensureDirectoryForFile } = require('../utils/fileSystem');

const CHALLENGES_DIR = 'challenges';

/**
 * Validate that a required string field exists in the parsed response
 *
 * @param {Object} obj - The parsed response object
 * @param {string} fieldName - The name of the field to validate
 * @throws {Error} If the field is missing or not a string
 */
function validateRequiredStringField(obj, fieldName) {
  if (!obj[fieldName] || typeof obj[fieldName] !== 'string') {
    throw new Error(`AI response missing required "${fieldName}" field`);
  }
}

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
 * Parse command line arguments for generateChallenge script
 * Expects a term slug as the first positional argument
 *
 * @param {string[]} argv - Command line arguments (typically process.argv.slice(2))
 * @returns {Object} Options object with slug property
 * @throws {Error} If no slug is provided
 */
function parseArgs(argv) {
  const options = {
    slug: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('-')) {
      options.slug = arg;
      break;
    }
  }

  if (!options.slug) {
    throw new Error(
      'Usage: node scripts/generateChallenge.js <term-slug>\nExample: node scripts/generateChallenge.js race-condition'
    );
  }

  return options;
}

/**
 * Find a term by slug in the terms array
 *
 * @param {string} slug - The slug to search for
 * @param {Object[]} terms - Array of term objects
 * @returns {Object|null} The term object if found, null otherwise
 */
function findTermBySlug(slug, terms) {
  return terms.find((term) => term.slug === slug) || null;
}

/**
 * Generate coding challenge content using GitHub Models (OpenAI-compatible API)
 *
 * @param {Object} term - The term object containing slug, term name, definition, etc.
 * @returns {Promise<Object>} Generated challenge content with buggyCode, goal, and solutionCode
 */
async function generateChallengeContent(term) {
  // GITHUB_TOKEN is used for GitHub Models API (models.inference.ai.azure.com)
  // See: https://docs.github.com/en/github-models/prototyping-with-ai-models
  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) {
    throw new Error('GITHUB_TOKEN environment variable is required for GitHub Models API access');
  }

  const client = new OpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey,
    timeout: 60000, // 60 second timeout for API calls
  });

  // Model can be configured via environment variable
  const model = process.env.CHALLENGE_GENERATOR_MODEL || 'gpt-4o';

  const prompt = `You are creating an interactive coding challenge to teach the concept: "${term.term}"

Definition: ${term.definition}
${term.explanation ? `Explanation: ${term.explanation}` : ''}
${term.humor ? `Humor: ${term.humor}` : ''}

Generate a coding challenge with the following:
1. A "buggy" code snippet that demonstrates a common mistake related to this concept
2. A brief explanation of what the learner should fix
3. A corrected "solution" code snippet

Requirements:
- Use JavaScript/Node.js for the code examples
- Keep code snippets concise (10-30 lines each)
- The bug should clearly relate to the concept being taught
- Include helpful comments in the code

Respond with a JSON object containing exactly these fields:
- conceptExplanation: A brief 2-3 sentence explanation of the concept for learners
- buggyCode: The code snippet with the bug (as a string with newlines)
- goal: A 1-2 sentence description of what needs to be fixed
- solutionCode: The corrected code snippet (as a string with newlines)

Example format:
{
  "conceptExplanation": "Race conditions occur when...",
  "buggyCode": "// Example buggy code\\nconst value = getData();\\nprocess(value);",
  "goal": "Add proper synchronization to prevent the race condition.",
  "solutionCode": "// Fixed code\\nconst value = await getData();\\nprocess(value);"
}

Respond ONLY with the JSON object, no additional text.`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1500,
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
  validateRequiredStringField(parsed, 'conceptExplanation');
  validateRequiredStringField(parsed, 'buggyCode');
  validateRequiredStringField(parsed, 'goal');
  validateRequiredStringField(parsed, 'solutionCode');

  return parsed;
}

/**
 * Generate markdown content for the challenge file
 *
 * @param {Object} term - The term object
 * @param {Object} challenge - The generated challenge content
 * @returns {string} Markdown content
 */
function generateMarkdownContent(term, challenge) {
  const markdown = `# Challenge: ${term.term}

## Concept Explanation

${challenge.conceptExplanation}

## The Challenge (Buggy Code)

The following code has a bug related to **${term.term}**. Can you spot and fix it?

\`\`\`javascript
${challenge.buggyCode}
\`\`\`

## The Goal

${challenge.goal}

---

<details>
<summary>💡 Click to reveal the solution</summary>

## Solution

\`\`\`javascript
${challenge.solutionCode}
\`\`\`

</details>

---

*This challenge was generated to help you understand the concept of "${term.term}" from the FOSS Glossary.*
`;

  return markdown;
}

/**
 * Main function to generate a coding challenge for a term
 *
 * @param {string[]} [argv=process.argv.slice(2)] - Command line arguments
 */
async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const { slug } = options;

  // Load terms from terms.yaml
  console.log('Loading terms from terms.yaml...');
  const terms = loadTermsYaml();

  // Find the term by slug
  const term = findTermBySlug(slug, terms);
  if (!term) {
    console.error(`❌ Error: No term found with slug "${slug}"`);
    console.error(`\nAvailable slugs:`);
    terms.forEach((t) => console.error(`  - ${t.slug}`));
    process.exit(1);
  }

  console.log(`Found term: ${term.term}`);

  // Generate challenge content using AI
  console.log('Generating challenge content using AI...');
  const challenge = await generateChallengeContent(term);

  // Generate markdown content
  const markdownContent = generateMarkdownContent(term, challenge);

  // Ensure challenges directory exists and write file
  const outputPath = path.join(CHALLENGES_DIR, `${slug}.md`);
  ensureDirectoryForFile(outputPath);
  fs.writeFileSync(outputPath, markdownContent, 'utf8');

  console.log(`✅ Challenge generated: ${outputPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  findTermBySlug,
  generateChallengeContent,
  generateMarkdownContent,
  validateRequiredStringField,
  truncateForLogging,
  CHALLENGES_DIR,
};
