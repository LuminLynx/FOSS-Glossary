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
const CSS_STYLES = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
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
        
        /* DARK THEME (Default) */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #f5f5f0;
            background: linear-gradient(135deg, #1a3a52 0%, #0f2234 100%);
            min-height: 100vh;
            padding-bottom: 2rem;
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
            border: 1px solid rgba(0, 212, 228, 0.2);
            animation: slideUp 0.6s ease-out forwards;
            opacity: 0;
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
            background: linear-gradient(135deg, rgba(0, 212, 228, 0.1) 0%, rgba(0, 240, 255, 0.05) 100%);
            border: 2px solid rgba(0, 212, 228, 0.3);
            padding: 4rem 2rem;
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
            box-shadow: 0 10px 40px rgba(0, 212, 228, 0.5), inset 0 0 20px rgba(0, 212, 228, 0.2);
            overflow: hidden;
            border: 2px solid rgba(0, 212, 228, 0.4);
            transition: all 0.3s ease;
        }
        .logo:hover {
            box-shadow: 0 15px 50px rgba(0, 212, 228, 0.7), inset 0 0 30px rgba(0, 212, 228, 0.3);
            transform: scale(1.05);
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
            color: #00d4e4;
            margin-bottom: 1rem;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        h2 {
            color: #00d4e4;
            margin: 2rem 0 1rem 0;
            font-weight: 600;
            font-size: 1.8rem;
        }
        h3, h4 {
            margin-bottom: 0.5rem;
        }
        .tagline {
            text-align: center;
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
        }
        
        /* Statistics Section */
        .stats-card {
            background: rgba(0, 212, 228, 0.05);
            border: 1px solid rgba(0, 212, 228, 0.3);
        }
        .live-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .stat-card {
            background: rgba(0, 212, 228, 0.1);
            border: 2px solid #00d4e4;
            color: #f5f5f0;
            padding: 2rem 1.5rem;
            border-radius: 12px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: default;
        }
        .stat-card:hover {
            background: rgba(0, 212, 228, 0.15);
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 212, 228, 0.2);
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            display: block;
            color: #00f0ff;
        }
        .stat-label {
            font-size: 0.95rem;
            opacity: 0.85;
            margin-top: 0.5rem;
        }
        
        /* Featured Term Section */
        .featured-section {
            background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(0, 212, 228, 0.05) 100%);
            border: 2px solid #00d4e4;
            position: relative;
            overflow: hidden;
        }
        .featured-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 212, 228, 0.2), transparent);
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
            color: #00f0ff;
            margin: 0;
            flex: 1;
        }
        .score-badge {
            background: linear-gradient(135deg, #00d4e4 0%, #00f0ff 100%);
            color: #0d1f2d;
            padding: 0.8rem 1.5rem;
            border-radius: 50px;
            font-weight: 700;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 4px 15px rgba(0, 212, 228, 0.4);
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
            color: #f5f5f0;
        }
        .featured-humor {
            background: rgba(255, 217, 61, 0.1);
            border-left: 4px solid #ffd93d;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }
        .featured-humor p {
            color: #ffd93d;
            font-style: italic;
            margin: 0;
        }
        .featured-tags {
            display: flex;
            gap: 0.8rem;
            flex-wrap: wrap;
        }
        .featured-tag {
            background: rgba(0, 212, 228, 0.3);
            border: 1px solid #00d4e4;
            font-size: 0.9rem;
        }
        
        /* Recent Additions */
        .recent-additions {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(0, 212, 228, 0.2);
        }
        .recent-additions p {
            margin: 0;
            font-size: 1.1rem;
        }
        
        /* Search & Filter Section */
        .search-section {
            background: rgba(0, 212, 228, 0.05);
            border: 1px solid rgba(0, 212, 228, 0.3);
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
            background: rgba(0, 212, 228, 0.1);
            border: 2px solid rgba(0, 212, 228, 0.3);
            border-radius: 10px;
            color: #f5f5f0;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .search-input::placeholder {
            color: rgba(245, 245, 240, 0.5);
        }
        .search-input:focus {
            outline: none;
            border-color: #00d4e4;
            background: rgba(0, 212, 228, 0.15);
            box-shadow: 0 0 20px rgba(0, 212, 228, 0.2);
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
        }
        .filter-label:hover {
            color: #00f0ff;
        }
        .filter-label input[type="checkbox"] {
            cursor: pointer;
            width: 18px;
            height: 18px;
            accent-color: #00d4e4;
        }
        .sort-label {
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }
        .sort-select {
            padding: 0.6rem 0.8rem;
            background: rgba(0, 212, 228, 0.1);
            border: 1px solid rgba(0, 212, 228, 0.3);
            color: #f5f5f0;
            border-radius: 6px;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .sort-select:hover,
        .sort-select:focus {
            border-color: #00d4e4;
            background: rgba(0, 212, 228, 0.15);
        }
        .sort-select option {
            background: #1a3a52;
            color: #f5f5f0;
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
            background: rgba(0, 212, 228, 0.2);
            border: 1px solid #00d4e4;
            color: #00d4e4;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
            animation: fadeInUp 0.3s ease;
        }
        .chip-remove {
            background: none;
            border: none;
            color: #00d4e4;
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
            color: rgba(245, 245, 240, 0.7);
            font-size: 0.95rem;
            margin-top: 1rem;
        }
        
        /* Term Grid & Cards */
        .terms-section {
            background: rgba(0, 212, 228, 0.03);
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
            border-radius: 12px;
            transition: all 0.3s ease;
            opacity: 1;
        }
        .term-card.visible {
            animation: fadeInUp 0.4s ease-out;
        }
        .term-card:hover {
            border-color: #00d4e4;
            transform: translateY(-4px);
            box-shadow: 0 12px 36px rgba(0, 212, 228, 0.25);
            background: rgba(255, 255, 255, 0.08);
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
            color: #00d4e4;
            margin: 0;
            font-size: 1.3rem;
            flex: 1;
            word-break: break-word;
        }
        .score-bar-container {
            width: 100px;
            height: 6px;
            background: rgba(0, 212, 228, 0.2);
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
        }
        .term-definition {
            color: #f5f5f0;
            margin-bottom: 1rem;
            line-height: 1.6;
        }
        .term-humor {
            color: #ffd93d;
            font-style: italic;
            font-size: 0.95rem;
            padding: 0.8rem;
            background: rgba(255, 217, 61, 0.08);
            border-left: 3px solid #ffd93d;
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
            background: rgba(0, 212, 228, 0.2);
            color: #00d4e4;
            padding: 0.35rem 0.7rem;
            border-radius: 16px;
            font-size: 0.8rem;
            border: 1px solid rgba(0, 212, 228, 0.3);
            transition: all 0.2s;
            cursor: pointer;
        }
        .tag:hover {
            background: rgba(0, 212, 228, 0.3);
            border-color: #00d4e4;
        }
        .empty-state {
            text-align: center;
            padding: 3rem 2rem;
            color: rgba(245, 245, 240, 0.6);
            font-size: 1.1rem;
        }
        
        /* Scoring Section */
        .scoring-section {
            background: rgba(0, 212, 228, 0.05);
        }
        .scoring-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .scoring-item {
            background: rgba(0, 212, 228, 0.08);
            border: 1px solid rgba(0, 212, 228, 0.2);
            padding: 1.5rem;
            border-radius: 12px;
            text-align: center;
            transition: all 0.3s ease;
        }
        .scoring-item:hover {
            background: rgba(0, 212, 228, 0.12);
            transform: translateY(-4px);
            border-color: rgba(0, 212, 228, 0.5);
        }
        .scoring-emoji {
            font-size: 2.5rem;
            margin-bottom: 0.8rem;
        }
        .scoring-item h4 {
            color: #00d4e4;
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
        }
        .scoring-item p {
            color: rgba(245, 245, 240, 0.8);
            font-size: 0.95rem;
            margin: 0;
        }
        .scoring-note {
            text-align: center;
            padding: 1.5rem;
            background: rgba(0, 212, 228, 0.1);
            border-left: 4px solid #00d4e4;
            border-radius: 8px;
            margin-top: 2rem;
        }
        .scoring-note p {
            font-weight: 600;
            color: #00f0ff;
            margin: 0;
        }
        
        /* CTA Section */
        .cta-section {
            background: linear-gradient(135deg, rgba(0, 212, 228, 0.08) 0%, rgba(0, 240, 255, 0.05) 100%);
            text-align: center;
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
            background: #00d4e4;
            color: #0d1f2d;
            padding: 1rem 2.5rem;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 700;
            font-size: 1rem;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 212, 228, 0.4);
            border: 2px solid transparent;
            cursor: pointer;
        }
        .button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 212, 228, 0.6);
            background: #00f0ff;
        }
        .button:active {
            transform: translateY(-1px);
        }
        .button-secondary {
            background: transparent;
            color: #00d4e4;
            border: 2px solid #00d4e4;
        }
        .button-secondary:hover {
            background: rgba(0, 212, 228, 0.1);
            border-color: #00f0ff;
            color: #00f0ff;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(0, 212, 228, 0.2);
        }
        .last-updated {
            color: rgba(245, 245, 240, 0.7);
            font-size: 0.9rem;
            margin: 0;
            line-height: 1.6;
        }
        
        /* Release Banner */
        .release-banner {
            background: linear-gradient(135deg, rgba(0, 212, 228, 0.15) 0%, rgba(0, 240, 255, 0.1) 100%);
            border: 2px solid #00d4e4;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 212, 228, 0.2);
        }
        .release-badge {
            color: #f5f5f0;
            font-weight: 600;
            margin: 0 0 0.5rem 0;
        }
        .release-banner h2 {
            color: #00f0ff;
            margin: 0 0 0.5rem 0;
        }
        .release-banner p {
            color: #f5f5f0;
            margin: 0.5rem 0;
        }
        .release-banner a {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.6rem 1.5rem;
            background: #00d4e4;
            color: #0d1f2d;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            border: 2px solid #00d4e4;
            transition: all 0.3s ease;
        }
        .release-banner a:hover {
            background: #00f0ff;
            border-color: #00f0ff;
            transform: translateY(-2px);
        }
        
        /* LIGHT THEME */
        @media (prefers-color-scheme: light) {
            body {
                color: #1a3a52;
                background: linear-gradient(135deg, #f0f4f8 0%, #e8f2f7 100%);
            }
            .card {
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(0, 163, 184, 0.2);
                box-shadow: 0 10px 40px rgba(26, 58, 82, 0.1);
            }
            .hero-card {
                background: linear-gradient(135deg, rgba(0, 212, 228, 0.08) 0%, rgba(0, 240, 255, 0.05) 100%);
            }
            h1, h2, .hero-title {
                color: #00838f;
            }
            .tagline {
                color: #2d3e50;
            }
            .logo {
                box-shadow: 0 10px 40px rgba(0, 163, 184, 0.3), inset 0 0 20px rgba(0, 163, 184, 0.1);
                border-color: rgba(0, 163, 184, 0.3);
            }
            .stat-card {
                background: linear-gradient(135deg, #e0f7fa 0%, #b3e5fc 100%);
                border: none;
                color: #1a3a52;
            }
            .stat-card:hover {
                background: linear-gradient(135deg, #b3e5fc 0%, #81d4fa 100%);
                box-shadow: 0 8px 24px rgba(0, 163, 184, 0.2);
            }
            .stat-number {
                color: #00838f;
            }
            .stat-label {
                color: #1a3a52;
            }
            .featured-section {
                background: rgba(0, 212, 228, 0.05);
                border-color: #00a3b8;
            }
            .featured-header h3 {
                color: #00838f;
            }
            .score-badge {
                background: linear-gradient(135deg, #00a3b8 0%, #00d4e4 100%);
                color: white;
            }
            .featured-definition {
                color: #2d3e50;
            }
            .featured-humor {
                background: rgba(217, 119, 6, 0.08);
                border-left-color: #d97706;
            }
            .featured-humor p {
                color: #d97706;
            }
            .featured-tag {
                background: rgba(0, 131, 143, 0.1);
                border-color: #00a3b8;
                color: #00838f;
            }
            .term-card {
                background: white;
                border: 1px solid #e0e7ed;
            }
            .term-card:hover {
                border-color: #00d4e4;
                background: rgba(0, 212, 228, 0.02);
            }
            .term-header h3 {
                color: #00838f;
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
            .tag:hover {
                background: #b2ebf2;
                color: white;
            }
            .search-input {
                background: white;
                border-color: rgba(0, 163, 184, 0.3);
                color: #1a3a52;
            }
            .search-input:focus {
                background: rgba(0, 212, 228, 0.05);
                border-color: #00a3b8;
            }
            .sort-select,
            .sort-select option {
                background: white;
                color: #1a3a52;
                border-color: rgba(0, 163, 184, 0.3);
            }
            .filter-label {
                color: #2d3e50;
            }
            .scoring-item {
                background: rgba(0, 212, 228, 0.05);
                border-color: rgba(0, 163, 184, 0.2);
            }
            .scoring-item h4 {
                color: #00838f;
            }
            .scoring-item p {
                color: #2d3e50;
            }
            .button {
                background: linear-gradient(135deg, #00a3b8 0%, #00d4e4 100%);
                color: white;
            }
            .button:hover {
                background: linear-gradient(135deg, #00d4e4 0%, #00f0ff 100%);
            }
            .button-secondary {
                background: white;
                color: #00a3b8;
                border-color: #00d4e4;
            }
            .button-secondary:hover {
                background: #e0f7fa;
                border-color: #00a3b8;
                color: #00838f;
            }
            .release-banner {
                background: linear-gradient(135deg, #e0f7fa 0%, #b3e5fc 100%);
                border-color: #00a3b8;
                box-shadow: 0 4px 20px rgba(0, 163, 184, 0.15);
            }
            .release-banner p {
                color: #1a3a52;
            }
            .release-banner h2 {
                color: #00838f;
            }
            .release-banner a {
                background: #00a3b8;
                border-color: #00a3b8;
                color: white;
            }
            .release-banner a:hover {
                background: #00d4e4;
                border-color: #00d4e4;
            }
            .empty-state {
                color: rgba(45, 62, 80, 0.6);
            }
            .result-count {
                color: rgba(45, 62, 80, 0.7);
            }
            .last-updated {
                color: rgba(45, 62, 80, 0.7);
                border-top-color: rgba(0, 163, 184, 0.2);
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
    termCards: prepareTermCardsData(), // Now returns 16 terms for search/filter
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
