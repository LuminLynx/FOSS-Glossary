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
    const scoreColor = score >= 80 ? '#00ff00' : score >= 60 ? '#ffa500' : '#ffff00';
    
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
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .card {
            background: white;
            padding: 3rem;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            margin-bottom: 2rem;
            animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        h1 {
            font-size: 3rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }
        .live-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
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
            background: #f8f9fa;
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
        .ter        m-card {
            background: white;
            border: 2px solid #e9ecef;
            padding: 1.5rem;
            border-radius: 10px;
            transition: all 0.3s;
        }
        .term-card:hover {
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
        }
        .term-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        .term-header h3 {
            color: #667eea;
            margin: 0;
        }
        .term-score {
            font-weight: bold;
            font-size: 1.2rem;
        }
        .term-definition {
            color: #495057;
            margin-bottom: 0.5rem;
        }
        .term-humor {
            color: #6c757d;
            font-style: italic;
            font-size: 0.9rem;
            padding: 0.5rem;
            background: #f8f9fa;
            border-left: 3px solid #ffc107;
            margin: 0.5rem 0;
        }
        .term-tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 0.5rem;
        }
        .tag {
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2.5rem;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            margin: 0.5rem;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
        }
        .button-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
        }
        .last-updated {
            text-align: center;
            color: #6c757d;
            font-size: 0.9rem;
            margin-top: 2rem;
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
            <h1>🚀 FOSS Glossary</h1>
            <p class="tagline">A gamified glossary of Free and Open Source Software terms, with humor, sarcasm, and honest truths.</p>
            
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
            <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin: 2rem 0;">
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
                Made with 💜 by the FOSS community
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
