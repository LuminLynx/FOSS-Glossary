#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');
const { OpenAI } = require('openai');
const { loadTermsYaml } = require('../utils/fileSystem');

// Configuration constants
const DEFAULT_BASE_URL = 'https://models.inference.ai.azure.com';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_TIMEOUT = 120000;
const DEFAULT_LANGUAGE = 'es';

// Language display names for user-friendly output
const LANGUAGE_NAMES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ru: 'Russian',
  ar: 'Arabic',
};

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
 * Parse command line arguments for translateTerms script
 *
 * @param {string[]} argv - Command line arguments (typically process.argv.slice(2))
 * @returns {Object} Options object with language property
 */
function parseArgs(argv) {
  const options = {
    language: DEFAULT_LANGUAGE,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('-')) {
      // Positional argument is the language code
      options.language = arg.toLowerCase();
      break;
    }
    if (arg === '--lang' || arg === '-l') {
      if (i + 1 < argv.length) {
        options.language = argv[i + 1].toLowerCase();
        i += 1;
      }
    }
  }

  return options;
}

/**
 * Get the display name for a language code
 *
 * @param {string} langCode - Two-letter language code
 * @returns {string} Human-readable language name
 */
function getLanguageName(langCode) {
  return LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
}

/**
 * Translate a single term's translatable fields using AI
 *
 * @param {Object} term - The term object to translate
 * @param {string} targetLang - Target language code (e.g., 'es', 'fr')
 * @param {OpenAI} client - OpenAI client instance
 * @param {string} model - Model name to use
 * @returns {Promise<Object>} Translated term object
 */
async function translateTerm(term, targetLang, client, model) {
  const languageName = getLanguageName(targetLang);

  // Build the fields to translate
  const fieldsToTranslate = {
    definition: term.definition,
  };

  if (term.explanation) {
    fieldsToTranslate.explanation = term.explanation;
  }

  if (term.humor) {
    fieldsToTranslate.humor = term.humor;
  }

  const prompt = `You are a professional translator specializing in technical documentation and FOSS (Free and Open Source Software) terminology.

Translate the following fields from English to ${languageName}. Preserve:
1. Technical accuracy - keep technical terms correct
2. The tone and style - especially humor should remain funny in ${languageName}
3. The original meaning and context

Input (JSON):
${JSON.stringify(fieldsToTranslate, null, 2)}

Requirements:
- Translate ONLY the values, keep the JSON structure intact
- Keep technical terms (like "Git", "PR", "CI/CD") in their original form if commonly used in ${languageName} tech communities
- Preserve any markdown formatting or special characters

Respond ONLY with the translated JSON object, no additional text.`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: DEFAULT_TEMPERATURE,
    max_tokens: DEFAULT_MAX_TOKENS,
  });

  // Validate response structure
  if (!response.choices || response.choices.length === 0) {
    throw new Error(`AI response did not contain any choices for term: ${term.slug}`);
  }

  const messageContent = response.choices[0].message?.content;
  if (!messageContent) {
    throw new Error(`AI response did not contain message content for term: ${term.slug}`);
  }

  const content = messageContent.trim();

  // Parse the JSON response
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    throw new Error(
      `Failed to parse AI response as JSON for term "${term.slug}": ${parseError.message}. Response preview: ${truncateForLogging(content)}`
    );
  }

  // Build the translated term, keeping non-translatable fields as-is
  const translatedTerm = {
    slug: term.slug,
    term: term.term, // Keep original term name (it's a proper noun/concept)
    definition: parsed.definition || term.definition,
  };

  // Add optional fields if they exist
  if (parsed.explanation) {
    translatedTerm.explanation = parsed.explanation;
  } else if (term.explanation) {
    translatedTerm.explanation = term.explanation;
  }

  if (parsed.humor) {
    translatedTerm.humor = parsed.humor;
  } else if (term.humor) {
    translatedTerm.humor = term.humor;
  }

  // Preserve other fields as-is (tags, see_also, aliases, controversy_level)
  if (term.see_also) {
    translatedTerm.see_also = term.see_also;
  }

  if (term.tags) {
    translatedTerm.tags = term.tags;
  }

  if (term.aliases) {
    translatedTerm.aliases = term.aliases;
  }

  if (term.controversy_level) {
    translatedTerm.controversy_level = term.controversy_level;
  }

  return translatedTerm;
}

/**
 * Translate all terms in the glossary
 *
 * @param {Object[]} terms - Array of term objects
 * @param {string} targetLang - Target language code
 * @returns {Promise<Object[]>} Array of translated term objects
 */
async function translateAllTerms(terms, targetLang) {
  // GITHUB_TOKEN is used for GitHub Models API (models.inference.ai.azure.com)
  // See: https://docs.github.com/en/github-models/prototyping-with-ai-models
  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) {
    throw new Error('GITHUB_TOKEN environment variable is required for GitHub Models API access');
  }

  // Configuration via environment variables with sensible defaults
  const baseURL = process.env.TRANSLATE_TERMS_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.TRANSLATE_TERMS_MODEL || DEFAULT_MODEL;
  const timeout = parseInt(process.env.TRANSLATE_TERMS_TIMEOUT, 10) || DEFAULT_TIMEOUT;

  const client = new OpenAI({
    baseURL,
    apiKey,
    timeout,
  });

  const translatedTerms = [];
  const languageName = getLanguageName(targetLang);

  console.log(`\nTranslating ${terms.length} terms to ${languageName}...\n`);

  for (let i = 0; i < terms.length; i += 1) {
    const term = terms[i];
    const progress = `[${i + 1}/${terms.length}]`;

    try {
      process.stdout.write(`${progress} Translating "${term.term}"...`);
      const translatedTerm = await translateTerm(term, targetLang, client, model);
      translatedTerms.push(translatedTerm);
      console.log(' ✓');
    } catch (error) {
      console.log(` ✗`);
      console.error(`   Error: ${error.message}`);
      // Continue with the original term if translation fails
      translatedTerms.push(term);
    }
  }

  return translatedTerms;
}

/**
 * Write translated terms to a YAML file
 *
 * @param {Object[]} terms - Array of translated term objects
 * @param {string} targetLang - Target language code
 * @returns {string} Path to the output file
 */
function writeTranslatedTerms(terms, targetLang) {
  const outputPath = `terms.${targetLang}.yaml`;
  const data = { terms };

  const yamlContent = yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    quotingType: "'",
    forceQuotes: false,
  });

  fs.writeFileSync(outputPath, yamlContent, 'utf8');
  return outputPath;
}

/**
 * Main function to translate terms to a target language
 *
 * @param {string[]} [argv=process.argv.slice(2)] - Command line arguments
 */
async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const { language } = options;
  const languageName = getLanguageName(language);

  console.log(`🌐 FOSS Glossary Translation Tool`);
  console.log(`   Target language: ${languageName} (${language})`);

  // Load terms from terms.yaml
  console.log('\nLoading terms from terms.yaml...');
  const terms = loadTermsYaml();
  console.log(`Loaded ${terms.length} terms from glossary.`);

  // Translate all terms
  const translatedTerms = await translateAllTerms(terms, language);

  // Write to output file
  const outputPath = writeTranslatedTerms(translatedTerms, language);

  console.log(`\n✅ Translation complete!`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Terms translated: ${translatedTerms.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  getLanguageName,
  translateTerm,
  translateAllTerms,
  writeTranslatedTerms,
  truncateForLogging,
  // Export constants for testing
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT,
  DEFAULT_LANGUAGE,
  LANGUAGE_NAMES,
};
