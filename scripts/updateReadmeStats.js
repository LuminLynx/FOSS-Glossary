#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');

function updateReadme() {
  const fileContents = fs.readFileSync('terms.yaml', 'utf8');
  const data = yaml.load(fileContents);
  const terms = data.terms || [];
  
  const totalTerms = terms.length;
  const termsWithHumor = terms.filter(t => t.humor).length;
  const recentTerms = terms.slice(-3).reverse().map(t => t.term);
  
  const statsSection = `
<!-- STATS-START -->
## 📊 Glossary Stats

**Total Terms:** ${totalTerms} | **Terms with Humor:** ${termsWithHumor} (${Math.round(termsWithHumor/totalTerms*100)}%)

**Recent additions:** ${recentTerms.map(t => `\`${t}\``).join(', ')}
<!-- STATS-END -->`;

  let readme = fs.readFileSync('README.md', 'utf8');
  const statsRegex = /<!-- STATS-START -->[\s\S]*<!-- STATS-END -->/;
  
  if (statsRegex.test(readme)) {
    readme = readme.replace(statsRegex, statsSection);
  } else {
    const lines = readme.split('\n');
    lines.splice(2, 0, statsSection);
    readme = lines.join('\n');
  }
  
  fs.writeFileSync('README.md', readme);
  console.log('✅ README stats updated!');
}

updateReadme();
