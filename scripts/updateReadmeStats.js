#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const { scoreTerm } = require('./scoring');
const { loadYaml } = require('../utils/fileSystem');

function updateReadmeStats() {
  try {
    // Load terms
    const termsData = loadYaml('terms.yaml');
    const terms = termsData.terms || [];
    
    // Calculate stats
    const totalTerms = terms.length;
    const termsWithHumor = terms.filter(t => t.humor).length;
    const humorPercentage = totalTerms > 0 ? Math.round((termsWithHumor / totalTerms) * 100) : 0;
    
    // Get recent terms (last 3)
    const recentTerms = terms.slice(-3).reverse().map(t => `\`${t.term}\``).join(', ');
    
    // Get contributors using git log
    let contributors = new Set();
    try {
      const gitLog = execSync('git log --format="%an" terms.yaml', { encoding: 'utf8' });
      gitLog.split('\n').forEach(name => {
        if (name && name !== 'github-actions[bot]') {
          contributors.add(name);
        }
      });
    } catch (e) {
      console.log('Could not get git contributors');
    }
    
    // Calculate high scores (terms with 80+ score potential)
    let highScorers = [];
    terms.forEach(term => {
      const { score } = scoreTerm(term);
      
      if (score >= 80) {
        highScorers.push({ term: term.term, score });
      }
    });
    
    // Sort high scorers
    highScorers.sort((a, b) => b.score - a.score);
    const topScorer = highScorers[0];
    
    // Read current README
    let readme = fs.readFileSync('README.md', 'utf8');
    
    // Create stats section
    const statsSection = `<!-- STATS-START -->
## 📊 Glossary Stats

**Total Terms:** ${totalTerms} | **Contributors:** ${contributors.size} | **Terms with Humor:** ${termsWithHumor} (${humorPercentage}%)

${topScorer ? `**🏆 Current Champion:** \`${topScorer.term}\` with ~${topScorer.score}/100 points!` : ''}

**Recent additions:** ${recentTerms || 'No terms yet'}

### 🎮 Top Contributors
${Array.from(contributors).slice(0, 5).map((name, i) => {
  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🌟';
  return `${medal} ${name}`;
}).join(' | ') || 'Be the first contributor!'}
<!-- STATS-END -->`;
    
    // Update README with stats
    const statsRegex = /<!-- STATS-START -->[\s\S]*?<!-- STATS-END -->/;
    
    if (readme.match(statsRegex)) {
      // Replace existing stats
      readme = readme.replace(statsRegex, statsSection);
    } else {
      // Add stats after the title (first #)
      const lines = readme.split('\n');
      let inserted = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ') && !inserted) {
          // Insert after title and description
          let insertIndex = i + 1;
          
          // Skip any immediate description lines
          while (insertIndex < lines.length && 
                 !lines[insertIndex].startsWith('#') && 
                 lines[insertIndex].trim() !== '') {
            insertIndex++;
          }
          
          lines.splice(insertIndex, 0, '\n' + statsSection);
          inserted = true;
          break;
        }
      }
      
      if (!inserted) {
        // Just add at the top if no header found
        lines.splice(1, 0, '\n' + statsSection);
      }
      
      readme = lines.join('\n');
    }
    
    // Write updated README
    fs.writeFileSync('README.md', readme);
    
    console.log('✅ README stats updated!');
    console.log(`   Total terms: ${totalTerms}`);
    console.log(`   Contributors: ${contributors.size}`);
    console.log(`   Terms with humor: ${humorPercentage}%`);
    if (topScorer) {
      console.log(`   Top scorer: ${topScorer.term} (${topScorer.score}/100)`);
    }
    
  } catch (error) {
    console.error('❌ Error updating README:', error.message);
    process.exit(1);
  }
}

updateReadmeStats();
