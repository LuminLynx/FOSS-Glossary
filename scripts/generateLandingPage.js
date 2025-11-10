#!/usr/bin/env node
/**
 * Landing Page Generator with Handlebars Template Engine
 *
 * This script generates the FOSS Glossary landing page (docs/index.html) using:
 * - Handlebars template engine for better maintainability and readability
 * - Separation of concerns: data preparation vs. presentation
 * - Automatic HTML escaping for XSS protection (Handlebars built-in)
 *
 * Architecture:
 * 1. Load and validate terms.yaml
 * 2. Calculate statistics (total terms, humor rate, etc.)
 * 3. Prepare data structures for each section (meta tags, stats, term cards, etc.)
 * 4. Load and compile Handlebars template from templates/landing-page.hbs
 * 5. Render HTML by passing data to template
 * 6. Write output to docs/index.html
 *
 * Security:
 * - Handlebars automatically escapes HTML content to prevent XSS attacks
 * - CSS styles use triple-braces {{{ }}} in template to remain unescaped
 * - All user-provided content (terms, definitions, humor, tags) is escaped
 */
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { scoreTerm } = require('./scoring');
const { getGitSha } = require('../utils/git');
const { loadTermsYaml } = require('../utils/fileSystem');

// Module-level variables will be initialized in main()
let artifactVersion;
let terms;
let stats;

/**
 * Initialize data by loading terms and calculating statistics
 * This is called at the start of main() to ensure fresh data on each run
 */
function initializeData() {
  artifactVersion = getGitSha('dev');
  terms = loadTermsYaml();

  // Calculate statistics
  stats = {
    totalTerms: terms.length,
    termsWithHumor: terms.filter((t) => t.humor).length,
    termsWithExplanation: terms.filter((t) => t.explanation).length,
    totalTags: new Set(terms.flatMap((t) => t.tags || [])).size,
    recentTerms: terms
      .slice(-3)
      .reverse()
      .map((t) => t.term),
    topScorers: [], // We'll calculate this when we have contributor data
  };
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * Converts &, <, >, ", and ' to their HTML entity equivalents
 *
 * Note: This function is kept for backward compatibility but Handlebars
 * handles escaping automatically. Only use this for pre-processing if needed.
 *
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Register Handlebars helper for HTML escaping
// (available in template if needed, though Handlebars auto-escapes by default)
Handlebars.registerHelper('escapeHtml', escapeHtml);

/**
 * Get score color based on score value
 * Returns color hex code for score visualization
 * - 80+: Cyan (#00d4e4)
 * - 60-79: Bright cyan (#00f0ff)
 * - <60: Yellow (#ffd93d)
 *
 * @param {number} score - Score value (0-100)
 * @returns {string} Hex color code
 */
function getScoreColor(score) {
  if (score >= 80) return '#00d4e4';
  if (score >= 60) return '#00f0ff';
  return '#ffd93d';
}

/**
 * Prepare a single term card data object for template rendering
 * Calculates score, determines color, and structures all term properties
 * Returns a plain object with term data that Handlebars will auto-escape
 *
 * @param {Object} term - Term object from terms.yaml
 * @param {string} term.term - Term name
 * @param {string} term.definition - Term definition
 * @param {string} [term.humor] - Humorous description
 * @param {string[]} [term.tags] - Category tags
 * @returns {Object} Prepared term card data with term, score, scoreColor, definition, humor, and tags
 */
function prepareTermCardData(term) {
  const { score } = scoreTerm(term);
  const scoreColor = getScoreColor(score);

  return {
    term: term.term, // Handlebars auto-escapes
    score,
    scoreColor, // Color codes are safe, not escaped
    definition: term.definition, // Handlebars auto-escapes
    humor: term.humor || null, // Handlebars auto-escapes
    tags:
      term.tags && term.tags.length > 0
        ? term.tags // Handlebars auto-escapes each tag
        : [],
  };
}

/**
 * Validate if a term is displayable
 * Checks that term has required fields (term and definition)
 * and that they are non-empty strings
 *
 * @param {Object} term - Term object to validate
 * @returns {boolean} True if term is valid for display
 */
function isValidTerm(term) {
  return (
    term &&
    term.term &&
    typeof term.term === 'string' &&
    term.term.trim() !== '' &&
    term.definition &&
    typeof term.definition === 'string' &&
    term.definition.trim() !== ''
  );
}

/**
 * Prepare term cards data for landing page
 * Filters valid terms and returns the most recent ones in reverse order
 *
 * @param {number} [count=6] - Number of recent terms to display
 * @returns {Object[]} Array of prepared term card data objects
 */
function prepareTermCardsData(count = 6) {
  const validTerms = terms.filter(isValidTerm);
  const displayTerms = validTerms.slice(-count).reverse();
  return displayTerms.map(prepareTermCardData);
}

/**
 * Prepare meta tags data for HTML head
 * Creates structured meta tag objects for primary, Open Graph, and Twitter Card tags
 *
 * @param {Object} stats - Statistics object with totalTerms and other metrics
 * @returns {Object} Meta tags organized by type (primary, og, twitter)
 */
function prepareMetaTags(stats) {
  const description = `A gamified glossary of FOSS terms with humor. ${stats.totalTerms} terms defined by the community! Score points, unlock achievements, and learn with fun.`;
  const url = 'https://luminlynx.github.io/FOSS-Glossary/';
  const imageUrl =
    'https://raw.githubusercontent.com/LuminLynx/FOSS-Glossary/main/assets/twitter-card.png';

  return {
    primary: [
      { name: 'title', content: 'FOSS Glossary - Gamified Open Source Terms' },
      { name: 'description', content: description },
      {
        name: 'keywords',
        content:
          'FOSS, open source, glossary, gamification, github, programming, developer, community',
      },
      { name: 'author', content: 'LuminLynx' },
    ],
    og: [
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { property: 'og:title', content: 'FOSS Glossary - Gamified Open Source Terms' },
      {
        property: 'og:description',
        content: `Score points, unlock achievements, and learn FOSS terms with humor! ${stats.totalTerms} terms and growing.`,
      },
      { property: 'og:image', content: imageUrl },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '628' },
      { property: 'og:site_name', content: 'FOSS Glossary' },
    ],
    twitter: [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:url', content: url },
      { name: 'twitter:title', content: 'FOSS Glossary - Gamified Open Source Terms' },
      {
        name: 'twitter:description',
        content: `Score points, unlock achievements, and learn FOSS terms with humor! ${stats.totalTerms} terms and growing.`,
      },
      { name: 'twitter:image', content: imageUrl },
    ],
  };
}

// CSS styles as a constant for better maintainability
const CSS_STYLES = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* DARK THEME (Default) */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #f5f5f0;
            background: #1a3a52;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            padding: 3rem;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            margin-bottom: 2rem;
            animation: slideUp 0.5s ease-out;
            border: 1px solid rgba(0, 212, 228, 0.2);
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .logo-section {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .logo {
            width: 150px;
            height: 150px;
            margin: 0 auto 1rem;
            border-radius: 20%;
            box-shadow: 0 10px 40px rgba(0, 212, 228, 0.5);
            overflow: hidden;
            border: none;
        }
        
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        h1 {
            text-align: center;
            font-size: 3rem;
            color: #00d4e4;
            margin-bottom: 1rem;
        }
        h2 {
            color: #00d4e4;
            margin: 2rem 0 1rem 0;
        }
        .live-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        .stat-card {
            background: rgba(0, 212, 228, 0.1);
            border: 2px solid #00d4e4;
            color: #f5f5f0;
            padding: 1.5rem;
            border-radius: 10px;
            text-align: center;
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            display: block;
        }
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        .recent-terms {
            background: rgba(0, 0, 0, 0.3);
            padding: 1.5rem;
            border-radius: 10px;
            margin: 2rem 0;
        }
        .term-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .term-card {
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(0, 212, 228, 0.3);
            padding: 1.5rem;
            border-radius: 10px;
            transition: all 0.3s;
        }
        .term-card:hover {
            border-color: #00d4e4;
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0, 212, 228, 0.2);
        }
        .term-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        .term-header h3 {
            color: #00d4e4;
            margin: 0;
        }
        .term-score {
            font-weight: bold;
            font-size: 1.2rem;
        }
        .term-definition {
            color: #f5f5f0;
            margin-bottom: 0.5rem;
        }
        .term-humor {
            color: #ffd93d;
            font-style: italic;
            font-size: 0.9rem;
            padding: 0.5rem;
            background: rgba(0, 0, 0, 0.3);
            border-left: 3px solid #ffd93d;
            margin: 0.5rem 0;
        }
        .term-tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 0.5rem;
        }
        .tag {
            background: rgba(0, 212, 228, 0.2);
            color: #00d4e4;
            padding: 0.2rem 0.6rem;
            border-radius: 15px;
            font-size: 0.8rem;
        }
        .cta {
            text-align: center;
            margin: 3rem 0;
        }
        .button {
            display: inline-block;
            background: #00d4e4;
            color: #0d1f2d;
            padding: 1rem 2.5rem;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0, 212, 228, 0.4);
            margin: 0.5rem;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(0, 212, 228, 0.6);
            background: #00f0ff;
            color: #0d1f2d;
        }
        .button-secondary {
            background: transparent;
            color: #00d4e4;
            border: 2px solid #00d4e4;
        }
        .last-updated {
            text-align: center;
            color: #f5f5f0;
            font-size: 0.9rem;
            margin-top: 2rem;
            opacity: 0.7;
        }
        
        /* LIGHT THEME - Auto-detects when user has light mode enabled */
        @media (prefers-color-scheme: light) {
            body {
                color: #1a3a52;
                background: #f0f4f8;
            }
            .card {
                background: white;
                box-shadow: 0 10px 40px rgba(26, 58, 82, 0.1);
                border: 1px solid rgba(0, 212, 228, 0.2);
            }
            h1, h2 {
                color: #00a3b8;
            }
            .stat-card {
                background: linear-gradient(135deg, #00d4e4 0%, #00a3b8 100%);
                border: none;
                color: white;
            }
            .recent-terms {
                background: #e8f4f8;
                border-left: 4px solid #00d4e4;
            }
            .term-card {
                background: white;
                border: 2px solid #e0e7ed;
            }
            .term-card:hover {
                border-color: #00d4e4;
                box-shadow: 0 10px 30px rgba(0, 212, 228, 0.15);
            }
            .term-header h3 {
                color: #00a3b8;
            }
            .term-definition {
                color: #2d3e50;
            }
            .term-humor {
                color: #d97706;
                background: #fef3c7;
                border-left-color: #fbbf24;
            }
            .tag {
                background: #e0f7fa;
                color: #00838f;
                border: 1px solid #b2ebf2;
            }
            .button {
                background: linear-gradient(135deg, #00d4e4 0%, #00a3b8 100%);
                color: white;
            }
            .button:hover {
                background: linear-gradient(135deg, #00f0ff 0%, #00d4e4 100%);
                color: white;
            }
            .button-secondary {
                background: white;
                color: #00a3b8;
                border-color: #00d4e4;
            }
            .button-secondary:hover {
                background: #e0f7fa;
            }
            .last-updated {
                color: #5a6c7d;
            }
            /* Fix scoring section background for light mode */
            .card > div[style*="background: rgba(0, 0, 0, 0.3)"] {
                background: #e8f4f8 !important;
                border-left: 4px solid #00d4e4;
            }
        }
        
        @media (max-width: 768px) {
            h1 { font-size: 2rem; }
            .container { padding: 1rem; }
            .card { padding: 1.5rem; }
            .term-grid { grid-template-columns: 1fr; }
        }
`;

/**
 * Prepare stat cards data for statistics section
 * Creates array of stat card objects with numbers and labels
 *
 * @param {Object} stats - Statistics object
 * @param {number} stats.totalTerms - Total number of terms
 * @param {number} stats.termsWithHumor - Number of terms with humor field
 * @param {number} stats.totalTags - Total unique tags
 * @returns {Object[]} Array of stat card objects with number and label
 */
function prepareStatCardsData(stats) {
  const humorPercentage = Math.round((stats.termsWithHumor / stats.totalTerms) * 100);

  return [
    { number: String(stats.totalTerms), label: 'Total Terms' },
    { number: String(stats.termsWithHumor), label: 'Funny Terms' },
    { number: `${humorPercentage}%`, label: 'Humor Rate' },
    { number: String(stats.totalTags), label: 'Categories' },
  ];
}

/**
 * Prepare scoring items data for scoring section
 * Creates array of scoring criteria with emoji, description, and points
 *
 * @returns {Object[]} Array of scoring item objects with emoji, text, and points
 */
function prepareScoringItemsData() {
  return [
    { emoji: '✅', text: 'Base Definition', points: '20 points' },
    { emoji: '😂', text: 'Humor', points: 'Up to 30 points (be funny!)' },
    { emoji: '📝', text: 'Explanation', points: '20 points' },
    { emoji: '🔗', text: 'Cross-references', points: 'Up to 20 points' },
    { emoji: '🏷️', text: 'Tags', points: '10 points' },
  ];
}

/**
 * Prepare CTA (Call to Action) buttons data
 * Creates array of button objects with text, href, and CSS class
 *
 * @param {Object} stats - Statistics object with totalTerms
 * @returns {Object[]} Array of button objects with text, href, and className
 */
function prepareCTAButtonsData(stats) {
  return [
    {
      text: '🎮 Contribute on GitHub',
      href: 'https://github.com/LuminLynx/FOSS-Glossary',
      className: 'button',
    },
    {
      text: `📝 View All ${stats.totalTerms} Terms`,
      href: 'https://luminlynx.github.io/FOSS-Glossary/pwa/',
      className: 'button button-secondary',
    },
    {
      text: '📚 View Documentation Hub',
      href: './documentation.html',
      className: 'button button-secondary',
    },
  ];
}

/**
 * Load and compile the Handlebars template
 *
 * Reads the landing page template from templates/landing-page.hbs
 * and compiles it for use with data. The template uses:
 * - {{variable}} for HTML-escaped output
 * - {{{variable}}} for unescaped output (used for CSS styles)
 * - {{#if}}, {{#each}} for conditionals and loops
 *
 * @returns {Function} Compiled Handlebars template function
 */
function loadTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'landing-page.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    return Handlebars.compile(templateSource);
  } catch (error) {
    console.error('❌ Error loading template:', error.message);
    process.exit(1);
  }
}

/**
 * Generate HTML using Handlebars template
 *
 * Prepares all data structures and passes them to the compiled template.
 * Data preparation functions ensure proper structure while Handlebars
 * handles HTML escaping automatically.
 *
 * @param {Object} stats - Statistics object with term counts and metadata
 * @param {string} artifactVersion - Git commit SHA for cache-busting
 * @returns {string} Complete HTML document as string
 */
function generateHTML(stats, artifactVersion) {
  const template = loadTemplate();

  // Prepare all data for the template
  const templateData = {
    title: `FOSS Glossary - ${stats.totalTerms} Terms and Growing!`,
    canonicalUrl: 'https://luminlynx.github.io/FOSS-Glossary/',
    metaTags: prepareMetaTags(stats),
    styles: CSS_STYLES, // Use triple-braces in template for unescaped CSS
    statCards: prepareStatCardsData(stats),
    recentTermsList: stats.recentTerms.join(', '), // Handlebars auto-escapes
    termCards: prepareTermCardsData(),
    scoringItems: prepareScoringItemsData(),
    ctaButtons: prepareCTAButtonsData(stats),
    lastUpdated: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    stats,
    artifactVersion,
  };

  return template(templateData);
}

/**
 * Write generated HTML to output file
 * Ensures docs directory exists and writes docs/index.html
 * Logs statistics about the generation
 *
 * @param {string} html - Generated HTML content
 * @throws {Error} Exits process with code 1 if file write fails
 */
function writeOutputFile(html) {
  try {
    // Ensure docs directory exists
    if (!fs.existsSync('docs')) {
      fs.mkdirSync('docs', { recursive: true });
    }

    fs.writeFileSync('docs/index.html', html);
    console.log(`✅ Generated landing page with ${stats.totalTerms} terms!`);
    console.log(
      `📊 Stats: ${stats.termsWithHumor}/${stats.totalTerms} terms have humor (${Math.round((stats.termsWithHumor / stats.totalTerms) * 100)}%)`
    );
    console.log(`🆕 Recent: ${stats.recentTerms.join(', ')}`);
  } catch (error) {
    console.error('❌ Error writing landing page file:', error.message);
    process.exit(1);
  }
}

/**
 * Main function to generate the landing page
 * Initializes data, generates HTML, and writes output
 */
function main() {
  // Initialize data fresh on each run to avoid caching issues
  initializeData();

  // Generate HTML with current data
  const html = generateHTML(stats, artifactVersion);

  // Write output file
  writeOutputFile(html);
}

// Run the main function
main();
