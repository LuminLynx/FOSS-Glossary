#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');

// Load terms
const termsData = yaml.load(fs.readFileSync('terms.yaml', 'utf8'));
const terms = termsData.terms || [];

// Calculate statistics
const stats = {
  totalTerms: terms.length,
  termsWithHumor: terms.filter(t => t.humor).length,
  termsWithExplanation: terms.filter(t => t.explanation).length,
  totalTags: new Set(terms.flatMap(t => t.tags || [])).size,
  recentTerms: terms.slice(-3).reverse().map(t => t.term),
  topScorers: [] // We'll calculate this when we have contributor data
};

// Generate term cards HTML
function generateTermCards(count = 6) {
  // Filter out invalid terms before displaying
  const validTerms = terms.filter(term =>
    term &&
    term.term &&
    typeof term.term === 'string' &&
    term.term.trim() !== '' &&
    term.definition &&
    typeof term.definition === 'string' &&
    term.definition.trim() !== ''
  );
  
  const displayTerms = validTerms.slice(-count).reverse();
  
  return displayTerms.map(term => {
    const score = calculateTermScore(term);
    const scoreColor = score >= 80 ? '#00d4e4' : score >= 60 ? '#00f0ff' : '#ffd93d';
    
    return `
    <div class="term-card">
      <div class="term-header">
        <h3>${term.term}</h3>
        <span class="term-score" style="color: ${scoreColor}">${score}/100</span>
      </div>
      <p class="term-definition">${term.definition}</p>
      ${term.humor ? `<p class="term-humor">😂 "${term.humor}"</p>` : ''}
      ${term.tags ? `<div class="term-tags">${term.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('\n');
}

// Calculate term score (matching your scoring logic)
function calculateTermScore(term) {
  let score = 0;
  
  // Base: term and definition (20 points)
  if (term.term && term.definition) score += 20;
  
  // Humor (up to 30 points)
  if (term.humor) {
    score += Math.min(30, Math.floor(term.humor.length / 10) * 5);
  }
  
  // Explanation (20 points)
  if (term.explanation) score += 20;
  
  // Cross-references (up to 20 points)
  if (term.see_also && term.see_also.length > 0) {
    score += Math.min(20, term.see_also.length * 10);
  }
  
  // Tags (10 points)
  if (term.tags && term.tags.length > 0) score += 10;
  
  return score;
}

// Generate the full HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FOSS Glossary - ${stats.totalTerms} Terms and Growing!</title>
    <meta name="description" content="A gamified glossary of FOSS terms with humor. ${stats.totalTerms} terms defined by the community!">
    <style>
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
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo-section">
                <div class="logo">
                    <img src="https://raw.githubusercontent.com/LuminLynx/FOSS-Glossary/main/assets/logo.png" alt="FOSS Glossary Logo" />
                </div>
            </div>
            
            <h1>🚀 FOSS Glossary</h1>
            <p class="tagline" style="text-align: center; font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9;">A gamified glossary of Free and Open Source Software terms, with humor, sarcasm, and honest truths.</p>
            
            <!-- LIVE STATISTICS -->
            <div class="live-stats">
                <div class="stat-card">
                    <span class="stat-number">${stats.totalTerms}</span>
                    <span class="stat-label">Total Terms</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.termsWithHumor}</span>
                    <span class="stat-label">Funny Terms</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${Math.round((stats.termsWithHumor / stats.totalTerms) * 100)}%</span>
                    <span class="stat-label">Humor Rate</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.totalTags}</span>
                    <span class="stat-label">Categories</span>
                </div>
            </div>

            <!-- RECENT ADDITIONS -->
            <div class="recent-terms">
                <h2>🆕 Latest Additions</h2>
                <p>Just added: <strong>${stats.recentTerms.join(', ')}</strong></p>
            </div>

            <!-- SAMPLE TERMS -->
            <h2>📖 Recent Terms</h2>
            <div class="term-grid">
                ${generateTermCards()}
            </div>

            <!-- SCORING SYSTEM -->
            <h2>📊 How Scoring Works</h2>
            <div style="background: rgba(0, 0, 0, 0.3); padding: 1.5rem; border-radius: 10px; margin: 2rem 0;">
                <ul style="list-style: none; padding: 0;">
                    <li>✅ <strong>Base Definition</strong> - 20 points</li>
                    <li>😂 <strong>Humor</strong> - Up to 30 points (be funny!)</li>
                    <li>📝 <strong>Explanation</strong> - 20 points</li>
                    <li>🔗 <strong>Cross-references</strong> - Up to 20 points</li>
                    <li>🏷️ <strong>Tags</strong> - 10 points</li>
                </ul>
                <p style="margin-top: 1rem; font-weight: bold;">💯 Score 90+ to become a legend!</p>
            </div>

            <!-- CALL TO ACTION -->
            <div class="cta">
                <a href="https://github.com/LuminLynx/FOSS-Glossary" class="button">
                    🎮 Contribute on GitHub
                </a>
                <a href="https://github.com/LuminLynx/FOSS-Glossary/blob/main/terms.yaml" class="button button-secondary">
                    📝 View All ${stats.totalTerms} Terms
                </a>
            </div>

            <p class="last-updated">
                Last updated: ${new Date().toLocaleString('en-US', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                })} | 
                ${stats.totalTerms} terms and growing! | 
                Made with 💙 by the FOSS community
            </p>
        </div>
    </div>
</body>
</html>`;

// Write the file
fs.writeFileSync('docs/index.html', html);
console.log(`✅ Generated landing page with ${stats.totalTerms} terms!`);
console.log(`📊 Stats: ${stats.termsWithHumor}/${stats.totalTerms} terms have humor (${Math.round((stats.termsWithHumor/stats.totalTerms)*100)}%)`);
console.log(`🆕 Recent: ${stats.recentTerms.join(', ')}`);