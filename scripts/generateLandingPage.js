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
 * @param {string} term.slug - Term slug (kebab-case URL identifier)
 * @param {string} term.definition - Term definition
 * @param {string} [term.humor] - Humorous description
 * @param {string[]} [term.tags] - Category tags
 * @returns {Object} Prepared term card data with term, slug, score, scoreColor, definition, humor, tags, tagsString, and sortDate
 */
function prepareTermCardData(term) {
  const { score } = scoreTerm(term);
  const scoreColor = getScoreColor(score);
  const tags = term.tags && term.tags.length > 0 ? term.tags : [];

  return {
    term: term.term, // Handlebars auto-escapes
    slug: term.slug || '', // URL identifier for filtering
    score,
    scoreColor, // Color codes are safe, not escaped
    definition: term.definition, // Handlebars auto-escapes
    humor: term.humor || null, // Handlebars auto-escapes
    tags: tags, // Array for iteration in template
    tagsString: tags.join(' '), // Space-separated string for data attribute
    sortDate: new Date().toISOString(), // For client-side sorting
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
 * Shows the most recent terms (default 10) on initial page load
 * The search functionality will dynamically load and display search results
 *
 * @param {number} [count=10] - Number of recent terms to display
 * @returns {Object[]} Array of prepared term card data objects
 */
function prepareTermCardsData(count = 10) {
  const validTerms = terms.filter(isValidTerm);
  // Get the most recent N terms, ordered by most recent first
  return validTerms.slice(-count).reverse().map(prepareTermCardData);
}

/**
 * Prepare featured term data for spotlight section
 * Selects the highest-scoring term or a random one
 *
 * @returns {Object|null} Featured term card data or null if no terms available
 */
function prepareFeaturedTermData() {
  const validTerms = terms.filter(isValidTerm);
  if (validTerms.length === 0) return null;

  // Get the highest scoring term
  let featuredTerm = validTerms[0];
  let maxScore = -1;

  validTerms.forEach((term) => {
    const { score } = scoreTerm(term);
    if (score > maxScore) {
      maxScore = score;
      featuredTerm = term;
    }
  });

  return prepareTermCardData(featuredTerm);
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
      {
        property: 'og:title',
        content: 'FOSS Glossary - Gamified Open Source Terms',
      },
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
      {
        name: 'twitter:title',
        content: 'FOSS Glossary - Gamified Open Source Terms',
      },
      {
        name: 'twitter:description',
        content: `Score points, unlock achievements, and learn FOSS terms with humor! ${stats.totalTerms} terms and growing.`,
      },
      { name: 'twitter:image', content: imageUrl },
    ],
  };
}

// CSS styles as a constant for better maintainability
// FOSS Community Theme - Visual redesign with:
// - Dark mode as default theme
// - Terminal-inspired color palette (greens, amber, cyan, purple)
// - Monospace fonts for headers (Fira Code, JetBrains Mono)
// - GitHub ribbon, gradient card borders, terminal prompt decoration
const CSS_STYLES = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* FOSS THEME CSS CUSTOM PROPERTIES */
        :root {
            /* Terminal-inspired green palette */
            --foss-green: #00ff41;
            --foss-green-dim: #00cc33;
            --foss-green-bright: #39ff14;
            --foss-amber: #ffb000;
            --foss-cyan: #00d4ff;
            --foss-purple: #bd93f9;
            
            /* Dark theme colors (default) */
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-card: #21262d;
            --bg-elevated: #30363d;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --text-muted: #6e7681;
            --border-color: #30363d;
            --border-accent: #238636;
            
            /* Monospace font stack */
            --font-mono: 'Fira Code', 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', 'Liberation Mono', monospace;
            --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
        }
        
        /* ANIMATIONS */
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        /* DARK THEME (Default) - FOSS Community Style */
        body {
            font-family: var(--font-sans);
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-primary);
            min-height: 100vh;
            padding-bottom: 2rem;
        }
        
        /* Fork me ribbon */
        .github-ribbon {
            position: fixed;
            top: 0;
            right: 0;
            z-index: 1000;
            width: 150px;
            height: 150px;
            overflow: hidden;
            pointer-events: none;
        }
        .github-ribbon a {
            pointer-events: auto;
            position: absolute;
            width: 200px;
            padding: 8px 0;
            background: var(--foss-green-dim);
            color: var(--bg-primary);
            text-align: center;
            font-family: var(--font-mono);
            font-size: 0.75rem;
            font-weight: 700;
            text-decoration: none;
            transform: rotate(45deg);
            right: -50px;
            top: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            transition: background 0.3s ease;
        }
        .github-ribbon a:hover {
            background: var(--foss-green);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .card {
            background: var(--bg-card);
            backdrop-filter: blur(10px);
            padding: 3rem;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            margin-bottom: 2rem;
            border: 1px solid var(--border-color);
            animation: slideUp 0.6s ease-out forwards;
            opacity: 0;
            position: relative;
        }
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--foss-green), var(--foss-cyan), var(--foss-purple));
            border-radius: 8px 8px 0 0;
        }
        .card:nth-child(1) { animation-delay: 0ms; }
        .card:nth-child(2) { animation-delay: 100ms; }
        .card:nth-child(3) { animation-delay: 200ms; }
        .card:nth-child(4) { animation-delay: 300ms; }
        .card:nth-child(5) { animation-delay: 400ms; }
        .card:nth-child(n+6) { animation-delay: 500ms; }
        
        /* Animation class attachment */
        [data-animate].animate-on-load {
            animation: fadeInUp 0.6s ease-out forwards;
            opacity: 0;
        }
        .animate-fadeInUp { animation-name: fadeInUp; }
        .animate-fadeIn { animation-name: fadeIn; }
        .animate-slideInDown { animation-name: slideInDown; }
        .animate-scaleIn { animation-name: scaleIn; }
        .animate-bounce { animation-name: bounce; animation-duration: 1s; }
        
        /* Hero Section */
        .hero-card {
            text-align: center;
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-card) 100%);
            border: 1px solid var(--border-accent);
            padding: 4rem 2rem;
        }
        .hero-card::before {
            background: linear-gradient(90deg, var(--foss-green), var(--foss-green-bright));
        }
        .logo-section {
            text-align: center;
            margin-bottom: 2rem;
        }
        .logo {
            width: 150px;
            height: 150px;
            margin: 0 auto 1rem;
            border-radius: 16px;
            box-shadow: 0 0 30px rgba(0, 255, 65, 0.3), 0 0 60px rgba(0, 255, 65, 0.1);
            overflow: hidden;
            border: 2px solid var(--foss-green-dim);
            transition: all 0.3s ease;
        }
        .logo:hover {
            box-shadow: 0 0 40px rgba(0, 255, 65, 0.5), 0 0 80px rgba(0, 255, 65, 0.2);
            transform: scale(1.05);
            border-color: var(--foss-green);
        }
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        /* Typography */
        h1, .hero-title {
            text-align: center;
            font-size: 3rem;
            color: var(--foss-green);
            margin-bottom: 1rem;
            font-weight: 700;
            letter-spacing: -0.5px;
            font-family: var(--font-mono);
            text-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        }
        h2 {
            color: var(--foss-green);
            margin: 2rem 0 1rem 0;
            font-weight: 600;
            font-size: 1.8rem;
            font-family: var(--font-mono);
        }
        h3, h4 {
            margin-bottom: 0.5rem;
            font-family: var(--font-mono);
        }
        .tagline {
            text-align: center;
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
            color: var(--text-secondary);
        }
        
        /* Terminal prompt decoration */
        .hero-title::before {
            content: '$ ';
            color: var(--foss-green-dim);
            opacity: 0.7;
        }
        
        /* Statistics Section */
        .stats-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
        }
        .stats-card::before {
            background: linear-gradient(90deg, var(--foss-cyan), var(--foss-purple));
        }
        .live-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .stat-card {
            background: var(--bg-elevated);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 2rem 1.5rem;
            border-radius: 8px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: default;
            position: relative;
            overflow: hidden;
        }
        .stat-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--foss-green);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }
        .stat-card:hover::after {
            transform: scaleX(1);
        }
        .stat-card:hover {
            border-color: var(--foss-green-dim);
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 255, 65, 0.15);
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            display: block;
            color: var(--foss-green);
            font-family: var(--font-mono);
        }
        .stat-label {
            font-size: 0.95rem;
            opacity: 0.85;
            margin-top: 0.5rem;
            color: var(--text-secondary);
            font-family: var(--font-mono);
            text-transform: lowercase;
        }
        
        /* Featured Term Section */
        .featured-section {
            background: var(--bg-secondary);
            border: 1px solid var(--foss-amber);
            position: relative;
            overflow: hidden;
        }
        .featured-section::before {
            background: linear-gradient(90deg, var(--foss-amber), var(--foss-green));
        }
        .featured-section::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 176, 0, 0.08), transparent);
            animation: shine 3s infinite;
        }
        @keyframes shine {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        .featured-term-card {
            position: relative;
            z-index: 1;
        }
        .featured-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }
        .featured-header h3 {
            font-size: 1.8rem;
            color: var(--foss-amber);
            margin: 0;
            flex: 1;
        }
        .score-badge {
            background: linear-gradient(135deg, var(--foss-green-dim) 0%, var(--foss-green) 100%);
            color: var(--bg-primary);
            padding: 0.8rem 1.5rem;
            border-radius: 8px;
            font-weight: 700;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 4px 15px rgba(0, 255, 65, 0.3);
            font-family: var(--font-mono);
        }
        .score-value {
            font-size: 1.5rem;
        }
        .score-label {
            font-size: 0.7rem;
            opacity: 0.8;
        }
        .featured-definition {
            font-size: 1.1rem;
            line-height: 1.8;
            margin-bottom: 1.5rem;
            color: var(--text-primary);
        }
        .featured-humor {
            background: rgba(255, 176, 0, 0.1);
            border-left: 4px solid var(--foss-amber);
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1.5rem;
        }
        .featured-humor p {
            color: var(--foss-amber);
            font-style: italic;
            margin: 0;
        }
        .featured-tags {
            display: flex;
            gap: 0.8rem;
            flex-wrap: wrap;
        }
        .featured-tag {
            background: rgba(0, 255, 65, 0.1);
            border: 1px solid var(--foss-green-dim);
            font-size: 0.9rem;
            color: var(--foss-green);
            font-family: var(--font-mono);
        }
        
        /* Recent Additions */
        .recent-additions {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
        }
        .recent-additions::before {
            background: linear-gradient(90deg, var(--foss-purple), var(--foss-cyan));
        }
        .recent-additions p {
            margin: 0;
            font-size: 1.1rem;
            color: var(--text-primary);
        }
        .recent-additions strong {
            color: var(--foss-cyan);
            font-family: var(--font-mono);
        }
        
        /* Search & Filter Section */
        .search-section {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .search-section::before {
            background: linear-gradient(90deg, var(--foss-green), var(--foss-amber));
        }
        .search-container {
            margin: 2rem 0;
        }
        .search-input-wrapper {
            position: relative;
            margin-bottom: 1.5rem;
        }
        .search-input {
            width: 100%;
            padding: 1rem 1.2rem 1rem 3rem;
            background: var(--bg-primary);
            border: 2px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .search-input::placeholder {
            color: var(--text-muted);
        }
        .search-input:focus {
            outline: none;
            border-color: var(--foss-green);
            background: var(--bg-secondary);
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.15);
        }
        .search-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.6;
            pointer-events: none;
        }
        .filter-controls {
            display: flex;
            gap: 2rem;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
            align-items: center;
        }
        .filter-group {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .filter-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            transition: color 0.2s;
            color: var(--text-secondary);
            font-family: var(--font-mono);
            font-size: 0.9rem;
        }
        .filter-label:hover {
            color: var(--foss-green);
        }
        .filter-label input[type="checkbox"] {
            cursor: pointer;
            width: 18px;
            height: 18px;
            accent-color: var(--foss-green);
        }
        .sort-label {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            color: var(--text-secondary);
            font-family: var(--font-mono);
        }
        .sort-select {
            padding: 0.6rem 0.8rem;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            border-radius: 4px;
            font-size: 0.95rem;
            font-family: var(--font-mono);
            cursor: pointer;
            transition: all 0.2s;
        }
        .sort-select:hover,
        .sort-select:focus {
            border-color: var(--foss-green);
            background: var(--bg-secondary);
        }
        .sort-select option {
            background: var(--bg-primary);
            color: var(--text-primary);
        }
        .filter-tags-container {
            display: flex;
            gap: 0.8rem;
            flex-wrap: wrap;
            margin-bottom: 1rem;
        }
        .filter-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(0, 255, 65, 0.1);
            border: 1px solid var(--foss-green-dim);
            color: var(--foss-green);
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-size: 0.9rem;
            font-family: var(--font-mono);
            animation: fadeInUp 0.3s ease;
        }
        .chip-remove {
            background: none;
            border: none;
            color: var(--foss-green);
            cursor: pointer;
            font-size: 1.1rem;
            padding: 0;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        .chip-remove:hover {
            opacity: 1;
        }
        .result-count {
            color: var(--text-muted);
            font-size: 0.95rem;
            margin-top: 1rem;
            font-family: var(--font-mono);
        }
        
        /* Term Grid & Cards */
        .terms-section {
            background: var(--bg-secondary);
        }
        .terms-section::before {
            background: linear-gradient(90deg, var(--foss-cyan), var(--foss-green));
        }
        .term-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .term-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            padding: 1.5rem;
            border-radius: 6px;
            transition: all 0.3s ease;
            opacity: 1;
        }
        .term-card.visible {
            animation: fadeInUp 0.4s ease-out;
        }
        .term-card:hover {
            border-color: var(--foss-green-dim);
            transform: translateY(-4px);
            box-shadow: 0 12px 36px rgba(0, 255, 65, 0.1);
            background: var(--bg-elevated);
        }
        .term-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }
        .term-header h3 {
            color: var(--foss-cyan);
            margin: 0;
            font-size: 1.3rem;
            flex: 1;
            word-break: break-word;
        }
        .score-bar-container {
            width: 100px;
            height: 6px;
            background: var(--bg-elevated);
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 0.5rem;
        }
        .score-bar {
            height: 100%;
            border-radius: 3px;
            transition: width 0.4s ease;
            box-shadow: 0 0 8px currentColor;
        }
        .term-score {
            font-weight: 700;
            font-size: 1rem;
            white-space: nowrap;
            font-family: var(--font-mono);
        }
        .term-definition {
            color: var(--text-primary);
            margin-bottom: 1rem;
            line-height: 1.6;
        }
        .term-humor {
            color: var(--foss-amber);
            font-style: italic;
            font-size: 0.95rem;
            padding: 0.8rem;
            background: rgba(255, 176, 0, 0.1);
            border-left: 3px solid var(--foss-amber);
            margin: 1rem 0;
            border-radius: 4px;
        }
        .term-tags {
            display: flex;
            gap: 0.6rem;
            flex-wrap: wrap;
            margin-top: 1rem;
        }
        .tag {
            background: rgba(0, 255, 65, 0.1);
            color: var(--foss-green);
            padding: 0.35rem 0.7rem;
            border-radius: 4px;
            font-size: 0.8rem;
            border: 1px solid var(--foss-green-dim);
            transition: all 0.2s;
            cursor: pointer;
            font-family: var(--font-mono);
        }
        .tag:hover {
            background: rgba(0, 255, 65, 0.2);
            border-color: var(--foss-green);
        }
        .empty-state {
            text-align: center;
            padding: 3rem 2rem;
            color: var(--text-muted);
            font-size: 1.1rem;
        }
        
        /* Scoring Section */
        .scoring-section {
            background: var(--bg-secondary);
        }
        .scoring-section::before {
            background: linear-gradient(90deg, var(--foss-amber), var(--foss-purple));
        }
        .scoring-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .scoring-item {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            padding: 1.5rem;
            border-radius: 6px;
            text-align: center;
            transition: all 0.3s ease;
        }
        .scoring-item:hover {
            background: var(--bg-elevated);
            transform: translateY(-4px);
            border-color: var(--foss-green-dim);
        }
        .scoring-emoji {
            font-size: 2.5rem;
            margin-bottom: 0.8rem;
        }
        .scoring-item h4 {
            color: var(--foss-green);
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
        }
        .scoring-item p {
            color: var(--text-secondary);
            font-size: 0.95rem;
            margin: 0;
            font-family: var(--font-mono);
        }
        .scoring-note {
            text-align: center;
            padding: 1.5rem;
            background: rgba(0, 255, 65, 0.1);
            border-left: 4px solid var(--foss-green);
            border-radius: 4px;
            margin-top: 2rem;
        }
        .scoring-note p {
            font-weight: 600;
            color: var(--foss-green);
            margin: 0;
            font-family: var(--font-mono);
        }
        
        /* CTA Section */
        .cta-section {
            background: var(--bg-secondary);
            text-align: center;
        }
        .cta-section::before {
            background: linear-gradient(90deg, var(--foss-green), var(--foss-cyan));
        }
        .cta {
            display: flex;
            justify-content: center;
            gap: 1rem;
            flex-wrap: wrap;
            margin: 2rem 0;
        }
        .button {
            display: inline-block;
            background: var(--foss-green);
            color: var(--bg-primary);
            padding: 1rem 2.5rem;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 700;
            font-size: 1rem;
            font-family: var(--font-mono);
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 255, 65, 0.3);
            border: 2px solid var(--foss-green);
            cursor: pointer;
        }
        .button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 255, 65, 0.4);
            background: var(--foss-green-bright);
            border-color: var(--foss-green-bright);
        }
        .button:active {
            transform: translateY(-1px);
        }
        .button-secondary {
            background: transparent;
            color: var(--foss-green);
            border: 2px solid var(--foss-green-dim);
        }
        .button-secondary:hover {
            background: rgba(0, 255, 65, 0.1);
            border-color: var(--foss-green);
            color: var(--foss-green-bright);
        }
        
        /* Footer */
        .footer {
            text-align: center;
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border-color);
        }
        .last-updated {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin: 0;
            line-height: 1.6;
            font-family: var(--font-mono);
        }
        
        /* ASCII art decoration */
        .footer::before {
            content: '/* EOF */';
            display: block;
            color: var(--text-muted);
            font-family: var(--font-mono);
            font-size: 0.85rem;
            margin-bottom: 1rem;
            opacity: 0.6;
        }
        
        /* Release Banner */
        .release-banner {
            background: var(--bg-elevated);
            border: 1px solid var(--foss-purple);
            padding: 2rem;
            border-radius: 6px;
            margin-bottom: 2rem;
            text-align: center;
            box-shadow: 0 4px 20px rgba(189, 147, 249, 0.15);
        }
        .release-badge {
            color: var(--foss-purple);
            font-weight: 600;
            margin: 0 0 0.5rem 0;
            font-family: var(--font-mono);
        }
        .release-banner h2 {
            color: var(--foss-green);
            margin: 0 0 0.5rem 0;
        }
        .release-banner p {
            color: var(--text-secondary);
            margin: 0.5rem 0;
        }
        .release-banner a {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.6rem 1.5rem;
            background: var(--foss-green-dim);
            color: var(--bg-primary);
            text-decoration: none;
            border-radius: 4px;
            font-weight: 700;
            font-family: var(--font-mono);
            cursor: pointer;
            border: 2px solid var(--foss-green-dim);
            transition: all 0.3s ease;
        }
        .release-banner a:hover {
            background: var(--foss-green);
            border-color: var(--foss-green);
            transform: translateY(-2px);
        }
        
        /* LIGHT THEME - Overrides CSS custom properties for users who prefer light mode.
           The base styles above use CSS variables, so overriding only the color variables
           is sufficient to theme the entire page. Additional element-specific overrides
           below handle cases where shadows or text colors need adjustment for light backgrounds. */
        @media (prefers-color-scheme: light) {
            :root {
                --bg-primary: #ffffff;
                --bg-secondary: #f6f8fa;
                --bg-card: #ffffff;
                --bg-elevated: #f3f4f6;
                --text-primary: #1f2937;
                --text-secondary: #4b5563;
                --text-muted: #6b7280;
                --border-color: #e5e7eb;
                --border-accent: #22c55e;
                --foss-green: #16a34a;
                --foss-green-dim: #22c55e;
                --foss-green-bright: #4ade80;
                --foss-amber: #d97706;
                --foss-cyan: #0891b2;
                --foss-purple: #7c3aed;
            }
            body {
                background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
            }
            .card {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            }
            .hero-title {
                text-shadow: none;
            }
            .logo {
                box-shadow: 0 10px 40px rgba(22, 163, 74, 0.2);
            }
            .logo:hover {
                box-shadow: 0 15px 50px rgba(22, 163, 74, 0.3);
            }
            .github-ribbon a {
                background: var(--foss-green);
                color: white;
            }
            .github-ribbon a:hover {
                background: var(--foss-green-bright);
            }
            .button {
                color: white;
            }
            .stat-card:hover {
                box-shadow: 0 8px 24px rgba(22, 163, 74, 0.15);
            }
            .term-card:hover {
                box-shadow: 0 12px 36px rgba(22, 163, 74, 0.1);
            }
            .score-badge {
                color: white;
            }
            .release-banner a {
                color: white;
            }
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 768px) {
            .container { padding: 1rem; }
            .card { padding: 1.5rem; }
            .hero-card { padding: 2rem 1rem; }
            h1, .hero-title { font-size: 2rem; }
            h2 { font-size: 1.4rem; }
            .term-grid { grid-template-columns: 1fr; }
            .term-header { flex-direction: column; align-items: flex-start; }
            .featured-header { flex-direction: column; }
            .cta { flex-direction: column; }
            .button { width: 100%; }
            .filter-controls { flex-direction: column; align-items: stretch; gap: 1rem; }
            .filter-group { width: 100%; }
            .sort-label { flex-direction: column; width: 100%; }
            .sort-select { width: 100%; }
            .search-section h2 { margin-top: 0; }
            .scoring-grid { grid-template-columns: 1fr; }
            .stat-card { padding: 1.5rem 1rem; }
            .stat-number { font-size: 2rem; }
        }
        
        @media (max-width: 480px) {
            .container { padding: 0.75rem; }
            .card { padding: 1rem; }
            .hero-card { padding: 1.5rem 0.75rem; }
            h1, .hero-title { font-size: 1.5rem; margin-bottom: 0.5rem; }
            h2 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem 0; }
            h3 { font-size: 1.1rem; }
            .logo { width: 120px; height: 120px; }
            .term-definition { font-size: 0.95rem; }
            .term-humor { font-size: 0.85rem; padding: 0.6rem; }
            .tag { font-size: 0.75rem; padding: 0.25rem 0.5rem; }
            .live-stats { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
            .featured-header { gap: 1rem; }
            .score-badge { padding: 0.6rem 1rem; font-size: 0.9rem; }
            .filter-chip { font-size: 0.85rem; }
            .empty-state { padding: 2rem 1rem; font-size: 1rem; }
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
/**
 * Prepare release information data
 * Creates release announcement object with version and link
 *
 * @returns {Object} Release data with version, date, and link
 */
function prepareReleaseData() {
  return {
    version: '1.0.0',
    releaseDate: 'November 15, 2025',
    releaseUrl: 'https://github.com/LuminLynx/FOSS-Glossary/releases/tag/v1.0.0',
    description: 'First stable release of FOSS Glossary with gamification features!',
  };
}

function generateHTML(stats, artifactVersion) {
  const template = loadTemplate();

  // Prepare all data for the template
  const templateData = {
    title: `FOSS Glossary - ${stats.totalTerms} Terms and Growing!`,
    canonicalUrl: 'https://luminlynx.github.io/FOSS-Glossary/',
    metaTags: prepareMetaTags(stats),
    styles: CSS_STYLES, // Use triple-braces in template for unescaped CSS
    release: prepareReleaseData(),
    statCards: prepareStatCardsData(stats),
    recentTermsList: stats.recentTerms.join(', '), // Handlebars auto-escapes
    featuredTerm: prepareFeaturedTermData(), // Highest-scoring term
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
