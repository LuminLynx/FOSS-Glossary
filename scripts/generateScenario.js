#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { loadTermsYaml, ensureDirectoryForFile } = require('../utils/fileSystem');

const EXAMPLES_DIR = 'examples';

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
 * Parse command line arguments for generateScenario script
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
      'Usage: node scripts/generateScenario.js <term-slug>\nExample: node scripts/generateScenario.js bus-factor'
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
 * Generate scenario content using GitHub Models (OpenAI-compatible API)
 *
 * @param {Object} term - The term object containing slug, term name, definition, etc.
 * @returns {Promise<Object>} Generated scenario content with title, story, lesson, and takeaways
 */
async function generateScenarioContent(term) {
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
  const model = process.env.SCENARIO_GENERATOR_MODEL || 'gpt-4o';

  const prompt = `You are creating an educational scenario to help developers understand the concept: "${term.term}"

Definition: ${term.definition}
${term.explanation ? `Explanation: ${term.explanation}` : ''}
${term.humor ? `Humor: ${term.humor}` : ''}

Generate a realistic scenario or story that illustrates this concept in action. The scenario should:
1. Be relatable to software developers
2. Show how this concept manifests in real-world situations
3. Include characters or team situations that developers can identify with
4. Have a clear lesson or moral that reinforces understanding

Requirements:
- Keep the story concise but engaging (200-400 words)
- Use a narrative style that's easy to follow
- Include specific, concrete details that make the scenario memorable
- End with actionable takeaways

Respond with a JSON object containing exactly these fields:
- title: A catchy, descriptive title for the scenario (e.g., "The Day Everything Broke")
- story: The main scenario narrative (200-400 words)
- lesson: A 2-3 sentence summary of what this scenario teaches about the concept
- takeaways: An array of 2-4 actionable lessons learned from this scenario

Example format:
{
  "title": "The Vacation That Changed Everything",
  "story": "Sarah was the only developer who understood the legacy billing system...",
  "lesson": "This scenario illustrates how relying on a single person for critical knowledge creates significant project risk.",
  "takeaways": ["Document critical systems before they become tribal knowledge", "Cross-train team members on essential systems"]
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
  validateRequiredStringField(parsed, 'title');
  validateRequiredStringField(parsed, 'story');
  validateRequiredStringField(parsed, 'lesson');

  // Validate takeaways array
  if (!parsed.takeaways || !Array.isArray(parsed.takeaways) || parsed.takeaways.length === 0) {
    throw new Error('AI response missing required "takeaways" array');
  }

  return parsed;
}

/**
 * Generate markdown content for the scenario file
 *
 * @param {Object} term - The term object
 * @param {Object} scenario - The generated scenario content
 * @returns {string} Markdown content
 */
function generateMarkdownContent(term, scenario) {
  const takeawaysList = scenario.takeaways.map((takeaway) => `- ${takeaway}`).join('\n');

  const markdown = `# ${scenario.title}

> A scenario illustrating **${term.term}**

## The Story

${scenario.story}

## The Lesson

${scenario.lesson}

## Key Takeaways

${takeawaysList}

---

*This scenario was generated to help you understand the concept of "${term.term}" from the FOSS Glossary.*

**Definition:** ${term.definition}
`;

  return markdown;
}

/**
 * Main function to generate a scenario for a term
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

  // Generate scenario content using AI
  console.log('Generating scenario content using AI...');
  const scenario = await generateScenarioContent(term);

  // Generate markdown content
  const markdownContent = generateMarkdownContent(term, scenario);

  // Ensure examples directory exists and write file
  const outputPath = path.join(EXAMPLES_DIR, `${slug}.md`);
  ensureDirectoryForFile(outputPath);
  fs.writeFileSync(outputPath, markdownContent, 'utf8');

  console.log(`✅ Scenario generated: ${outputPath}`);
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
  generateScenarioContent,
  generateMarkdownContent,
  validateRequiredStringField,
  truncateForLogging,
  EXAMPLES_DIR,
};
