#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const { scoreTerm } = require('./scoring');

function getShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

const artifactVersion = getShortSha();

// Load terms with error handling
function loadTerms() {
  try {
    // Check if file exists
    if (!fs.existsSync('terms.yaml')) {
      console.error('❌ Error: terms.yaml file not found');
      console.error('   Make sure you are running this script from the repository root directory.');
      process.exit(1);
    }

    // Read file
    let yamlContent;
    try {
      yamlContent = fs.readFileSync('terms.yaml', 'utf8');
    } catch (error) {
      console.error('❌ Error reading terms.yaml file:', error.message);
      process.exit(1);
    }

    // Parse YAML
    let termsData;
    try {
      termsData = yaml.load(yamlContent);
    } catch (error) {
      console.error('❌ Error parsing terms.yaml:', error.message);
      if (error.mark) {
        console.error(`   Line ${error.mark.line + 1}, Column ${error.mark.column + 1}`);
      }
      process.exit(1);
    }

    // Validate structure
    if (!termsData || typeof termsData !== 'object') {
      console.error('❌ Error: terms.yaml must contain a valid YAML object');
      process.exit(1);
    }

    if (!Array.isArray(termsData.terms)) {
      console.error('❌ Error: terms.yaml must contain a "terms" array');
      process.exit(1);
    }

    return termsData.terms;
  } catch (error) {
    // Catch any unexpected errors
    console.error('❌ Error: Unexpected error loading terms:', error.message);
    process.exit(1);
  }
}

const terms = loadTerms();

// Calculate statistics
const stats = {
  totalTerms: terms.length,
  termsWithHumor: terms.filter(t => t.humor).length,
  termsWithExplanation: terms.filter(t => t.explanation).length,
  totalTags: new Set(terms.flatMap(t => t.tags || [])).size,
  recentTerms: terms.slice(-3).reverse().map(t => t.term),
  topScorers: [] // We'll calculate this when we have contributor data
};

// Helper: Escape HTML special characters
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper: Get score color based on score value
function getScoreColor(score) {
  if (score >= 80) return '#00d4e4';
  if (score >= 60) return '#00f0ff';
  return '#ffd93d';
}

// Helper: Generate a single term card
function generateTermCard(term) {
  const { score } = scoreTerm(term);
  const scoreColor = getScoreColor(score);
  
  const parts = [
    '    <div class="term-card">',
    '      <div class="term-header">',
    `        <h3>${escapeHtml(term.term)}</h3>`,
    `        <span class="term-score" style="color: ${scoreColor}">${score}/100</span>`,
    '      </div>',
    `      <p class="term-definition">${escapeHtml(term.definition)}</p>`
  ];
  
  if (term.humor) {
    parts.push(`      <p class="term-humor">😂 "${escapeHtml(term.humor)}"</p>`);
  }
  
  if (term.tags && term.tags.length > 0) {
    const tagSpans = term.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    parts.push(`      <div class="term-tags">${tagSpans}</div>`);
  }
  
  parts.push('    </div>');
  return parts.join('\n');
}

// Helper: Validate if a term is displayable
function isValidTerm(term) {
  return term &&
    term.term &&
    typeof term.term === 'string' &&
    term.term.trim() !== '' &&
    term.definition &&
    typeof term.definition === 'string' &&
    term.definition.trim() !== '';
}

// Generate term cards HTML
function generateTermCards(count = 6) {
  const validTerms = terms.filter(isValidTerm);
  const displayTerms = validTerms.slice(-count).reverse();
  return displayTerms.map(generateTermCard).join('\n');
}

// Helper: Generate meta tag
function metaTag(name, content, property = false) {
  const attr = property ? 'property' : 'name';
  return `    <meta ${attr}="${name}" content="${escapeHtml(content)}">`;
}

// Generate HTML head section with meta tags
function generateHead(stats) {
  const title = `FOSS Glossary - ${stats.totalTerms} Terms and Growing!`;
  const description = `A gamified glossary of FOSS terms with humor. ${stats.totalTerms} terms defined by the community! Score points, unlock achievements, and learn with fun.`;
  const url = 'https://luminlynx.github.io/FOSS-Glossary/';
  const imageUrl = 'https://raw.githubusercontent.com/LuminLynx/FOSS-Glossary/main/assets/twitter-card.png';
  
  const metaTags = [
    // Primary Meta Tags
    metaTag('title', 'FOSS Glossary - Gamified Open Source Terms'),
    metaTag('description', description),
    metaTag('keywords', 'FOSS, open source, glossary, gamification, github, programming, developer, community'),
    metaTag('author', 'LuminLynx'),
    
    // Open Graph / Facebook
    metaTag('og:type', 'website', true),
    metaTag('og:url', url, true),
    metaTag('og:title', 'FOSS Glossary - Gamified Open Source Terms', true),
    metaTag('og:description', `Score points, unlock achievements, and learn FOSS terms with humor! ${stats.totalTerms} terms and growing.`, true),
    metaTag('og:image', imageUrl, true),
    metaTag('og:image:width', '1200', true),
    metaTag('og:image:height', '628', true),
    metaTag('og:site_name', 'FOSS Glossary', true),
    
    // Twitter
    metaTag('twitter:card', 'summary_large_image'),
    metaTag('twitter:url', url),
    metaTag('twitter:title', 'FOSS Glossary - Gamified Open Source Terms'),
    metaTag('twitter:description', `Score points, unlock achievements, and learn FOSS terms with humor! ${stats.totalTerms} terms and growing.`),
    metaTag('twitter:image', imageUrl)
  ];
  
  return `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- Primary Meta Tags -->
${metaTags.slice(0, 4).join('\n')}
    <link rel="canonical" href="${url}">
    
    <!-- Open Graph / Facebook -->
${metaTags.slice(4, 12).join('\n')}

    <!-- Twitter -->
${metaTags.slice(12).join('\n')}
 
    <!-- Favicon (optional - add later) -->
    <!-- <link rel="icon" type="image/png" href="assets/favicon.png"> -->

    ${generateStyles()}
</head>`;
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

// Generate CSS styles
function generateStyles() {
  return `<style>${CSS_STYLES}</style>`;
}

// Generate logo and header section
function generateHeader() {
  return `<div class="logo-section">
                <div class="logo">
                    <img src="https://raw.githubusercontent.com/LuminLynx/FOSS-Glossary/main/assets/logo.png" alt="FOSS Glossary Logo" />
                </div>
            </div>
            
            <h1>🚀 FOSS Glossary</h1>
            <p class="tagline" style="text-align: center; font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9;">A gamified glossary of Free and Open Source Software terms, with humor, sarcasm, and honest truths.</p>`;
}

// Helper: Generate a single stat card
function statCard(number, label) {
  return `                <div class="stat-card">
                    <span class="stat-number">${number}</span>
                    <span class="stat-label">${label}</span>
                </div>`;
}

// Generate statistics section
function generateStats(stats) {
  const humorPercentage = Math.round((stats.termsWithHumor / stats.totalTerms) * 100);
  
  const statCards = [
    statCard(stats.totalTerms, 'Total Terms'),
    statCard(stats.termsWithHumor, 'Funny Terms'),
    statCard(`${humorPercentage}%`, 'Humor Rate'),
    statCard(stats.totalTags, 'Categories')
  ];
  
  return `<!-- LIVE STATISTICS -->
            <div class="live-stats">
${statCards.join('\n')}
            </div>`;
}

// Generate recent additions section
function generateRecentAdditions(stats) {
  return `<!-- RECENT ADDITIONS -->
            <div class="recent-terms">
                <h2>🆕 Latest Additions</h2>
                <p>Just added: <strong>${stats.recentTerms.join(', ')}</strong></p>
            </div>`;
}

// Helper: Generate scoring list item
function scoringItem(emoji, text, points) {
  return `                    <li>${emoji} <strong>${text}</strong> - ${points}</li>`;
}

// Generate scoring section
function generateScoringSection() {
  const items = [
    scoringItem('✅', 'Base Definition', '20 points'),
    scoringItem('😂', 'Humor', 'Up to 30 points (be funny!)'),
    scoringItem('📝', 'Explanation', '20 points'),
    scoringItem('🔗', 'Cross-references', 'Up to 20 points'),
    scoringItem('🏷️', 'Tags', '10 points')
  ];
  
  return `<!-- SCORING SYSTEM -->
            <h2>📊 How Scoring Works</h2>
            <div style="background: rgba(0, 0, 0, 0.3); padding: 1.5rem; border-radius: 10px; margin: 2rem 0;">
                <ul style="list-style: none; padding: 0;">
${items.join('\n')}
                </ul>
                <p style="margin-top: 1rem; font-weight: bold;">💯 Score 90+ to become a legend!</p>
            </div>`;
}

// Helper: Generate a button
function button(text, href, secondary = false) {
  const className = secondary ? 'button button-secondary' : 'button';
  return `                <a href="${href}" class="${className}">
                    ${text}
                </a>`;
}

// Generate CTA section
function generateCTA(stats) {
  const buttons = [
    button('🎮 Contribute on GitHub', 'https://github.com/LuminLynx/FOSS-Glossary'),
    button(`📝 View All ${stats.totalTerms} Terms`, 'https://github.com/LuminLynx/FOSS-Glossary/blob/main/terms.yaml', true)
  ];
  
  return `<!-- CALL TO ACTION -->
            <div class="cta">
${buttons.join('\n')}
            </div>`;
}

// Generate footer with last updated info
function generateFooter(stats) {
  const lastUpdated = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  
  return `<p class="last-updated">
                Last updated: ${lastUpdated} |
                ${stats.totalTerms} terms and growing! |
                Made with 💙 by the FOSS community
            </p>`;
}

// Generate the full HTML by composing sections
function generateHTML(stats, artifactVersion) {
  return `<!DOCTYPE html>
<html lang="en">
${generateHead(stats)}
<body>
    <div class="container">
        <div class="card">
            ${generateHeader()}
            
            ${generateStats(stats)}

            ${generateRecentAdditions(stats)}

            <!-- SAMPLE TERMS -->
            <h2>📖 Recent Terms</h2>
            <div class="term-grid">
                ${generateTermCards()}
            </div>

            ${generateScoringSection()}

            ${generateCTA(stats)}

            ${generateFooter(stats)}
        </div>
    </div>
    <script>
        window.__TERMS_JSON_URL = './terms.json?ver=${artifactVersion}';
    </script>
</body>
</html>`;
}

const html = generateHTML(stats, artifactVersion);

// Write the file with error handling
function writeOutputFile() {
  try {
    // Ensure docs directory exists
    if (!fs.existsSync('docs')) {
      fs.mkdirSync('docs', { recursive: true });
    }

    fs.writeFileSync('docs/index.html', html);
    console.log(`✅ Generated landing page with ${stats.totalTerms} terms!`);
    console.log(`📊 Stats: ${stats.termsWithHumor}/${stats.totalTerms} terms have humor (${Math.round((stats.termsWithHumor/stats.totalTerms)*100)}%)`);
    console.log(`🆕 Recent: ${stats.recentTerms.join(', ')}`);
  } catch (error) {
    console.error('❌ Error writing landing page file:', error.message);
    process.exit(1);
  }
}

writeOutputFile();
