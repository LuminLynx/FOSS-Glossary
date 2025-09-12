#!/bin/bash
# Run this complete script in your Codespace to set up EVERYTHING!

echo "🚀 Setting up complete validation system..."

# ========================================
# FILE 1: Complete Validation Script
# ========================================
echo "Creating scripts/validateTerms.js..."

cat > scripts/validateTerms.js << 'VALIDATION_EOF'
#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');

function validateTerms() {
  let hasErrors = false;
  const errors = [];

  try {
    // Step 1: Try to read the file
    if (!fs.existsSync('terms.yaml')) {
      console.error('❌ Error: terms.yaml file not found!');
      process.exit(1);
    }

    const fileContents = fs.readFileSync('terms.yaml', 'utf8');
    
    // Step 2: Try to parse as YAML
    let data;
    try {
      data = yaml.load(fileContents);
    } catch (parseError) {
      console.error('❌ YAML Parse Error: The file is not valid YAML!');
      console.error(`   Details: ${parseError.message}`);
      console.error('\n   Common issues:');
      console.error('   - Missing colons after keys');
      console.error('   - Incorrect indentation (use 2 spaces, not tabs)');
      console.error('   - Missing quotes around values with special characters');
      console.error('   - Invalid structure');
      process.exit(1);
    }
    
    // Step 3: Check required structure
    if (!data) {
      console.error('❌ Error: terms.yaml is empty!');
      process.exit(1);
    }
    
    if (typeof data !== 'object') {
      console.error('❌ Error: terms.yaml must contain an object, not a plain value!');
      console.error(`   Found: "${data}"`);
      process.exit(1);
    }
    
    if (!data.terms) {
      console.error('❌ Error: terms.yaml must have a "terms" array at the root level!');
      console.error('   Expected structure:');
      console.error('   terms:');
      console.error('     - term: "Example"');
      console.error('       definition: "Example definition"');
      process.exit(1);
    }
    
    if (!Array.isArray(data.terms)) {
      console.error('❌ Error: "terms" must be an array!');
      console.error(`   Found: ${typeof data.terms}`);
      process.exit(1);
    }
    
    if (data.terms.length === 0) {
      console.error('❌ Error: The terms array is empty!');
      process.exit(1);
    }
    
    // Step 4: Validate each term
    const validTerms = [];
    const termNames = new Set();
    
    data.terms.forEach((term, index) => {
      const termErrors = [];
      const termNumber = index + 1;
      
      // Check if term is an object
      if (!term || typeof term !== 'object') {
        errors.push(`Term ${termNumber}: Must be an object with 'term' and 'definition' fields, got: ${JSON.stringify(term)}`);
        hasErrors = true;
        return;
      }
      
      // Check required field: term
      if (!term.term) {
        termErrors.push(`Missing required field 'term'`);
      } else if (typeof term.term !== 'string') {
        termErrors.push(`'term' must be a string, got: ${typeof term.term}`);
      } else if (term.term.trim().length === 0) {
        termErrors.push(`'term' cannot be empty`);
      } else if (term.term.trim().length < 2) {
        termErrors.push(`'term' is too short (minimum 2 characters)`);
      }
      
      // Check required field: definition  
      if (!term.definition) {
        termErrors.push(`Missing required field 'definition'`);
      } else if (typeof term.definition !== 'string') {
        termErrors.push(`'definition' must be a string, got: ${typeof term.definition}`);
      } else if (term.definition.trim().length === 0) {
        termErrors.push(`'definition' cannot be empty`);
      } else if (term.definition.trim().length < 10) {
        termErrors.push(`'definition' is too short (minimum 10 characters)`);
      }
      
      // Check optional fields
      if (term.explanation !== undefined) {
        if (typeof term.explanation !== 'string') {
          termErrors.push(`'explanation' must be a string, got: ${typeof term.explanation}`);
        } else if (term.explanation.trim().length === 0) {
          termErrors.push(`'explanation' cannot be empty if provided`);
        }
      }
      
      if (term.humor !== undefined) {
        if (typeof term.humor !== 'string') {
          termErrors.push(`'humor' must be a string, got: ${typeof term.humor}`);
        } else if (term.humor.trim().length === 0) {
          termErrors.push(`'humor' cannot be empty if provided`);
        }
      }
      
      if (term.tags !== undefined) {
        if (!Array.isArray(term.tags)) {
          termErrors.push(`'tags' must be an array, got: ${typeof term.tags}`);
        } else {
          term.tags.forEach((tag, i) => {
            if (typeof tag !== 'string') {
              termErrors.push(`Tag ${i + 1} must be a string, got: ${typeof tag}`);
            }
          });
        }
      }
      
      if (term.see_also !== undefined) {
        if (!Array.isArray(term.see_also)) {
          termErrors.push(`'see_also' must be an array, got: ${typeof term.see_also}`);
        } else {
          term.see_also.forEach((ref, i) => {
            if (typeof ref !== 'string') {
              termErrors.push(`Reference ${i + 1} must be a string, got: ${typeof ref}`);
            }
          });
        }
      }
      
      if (term.controversy_level !== undefined) {
        if (!['low', 'medium', 'high'].includes(term.controversy_level)) {
          termErrors.push(`'controversy_level' must be 'low', 'medium', or 'high', got: ${term.controversy_level}`);
        }
      }
      
      // Check for unknown fields
      const allowedFields = ['term', 'definition', 'explanation', 'humor', 'tags', 'see_also', 'controversy_level'];
      const unknownFields = Object.keys(term).filter(key => !allowedFields.includes(key));
      if (unknownFields.length > 0) {
        termErrors.push(`Unknown fields: ${unknownFields.join(', ')}. Did you make a typo?`);
      }
      
      // Add errors if any
      if (termErrors.length > 0) {
        errors.push(`Term ${termNumber} ("${term.term || 'UNNAMED'}"):\n  - ${termErrors.join('\n  - ')}`);
        hasErrors = true;
      } else if (term.term) {
        // Check for duplicates
        const termNameLower = term.term.toLowerCase();
        if (termNames.has(termNameLower)) {
          errors.push(`Term ${termNumber}: Duplicate term "${term.term}" (terms must be unique)`);
          hasErrors = true;
        } else {
          termNames.add(termNameLower);
          validTerms.push(term.term);
        }
      }
    });
    
    // Report results
    if (hasErrors) {
      console.error('❌ Validation FAILED!\n');
      console.error('Found the following errors:\n');
      errors.forEach(error => {
        console.error(error);
        console.error('');
      });
      
      console.error('---');
      console.error('Please fix these issues and try again.');
      console.error('\nExample of a valid term:');
      console.error(`
  - term: "RTFM"
    definition: "Read The F***ing Manual"
    explanation: "A reminder to check documentation"
    humor: "The solution to 90% of questions"
    tags: ["acronym", "support"]
    see_also: ["Documentation"]`);
      
      process.exit(1);
    }
    
    console.log('✅ Validation PASSED!');
    console.log(`   ${data.terms.length} terms validated successfully`);
    console.log(`   Terms: ${validTerms.slice(0, 5).join(', ')}${validTerms.length > 5 ? '...' : ''}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Unexpected error during validation:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

validateTerms();
VALIDATION_EOF

chmod +x scripts/validateTerms.js
echo "✅ Validation script created!"

# ========================================
# FILE 2: Complete GitHub Actions Workflow
# ========================================
echo "Creating .github/workflows/validate-score.yml..."

cat > .github/workflows/validate-score.yml << 'WORKFLOW_EOF'
name: Validate & Score Terms

on:
  pull_request:
    paths:
      - 'terms.yaml'
  push:
    branches: [main]
    paths:
      - 'terms.yaml'

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  validate-and-score:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install js-yaml
      
      - name: Validate terms
        id: validate
        continue-on-error: true
        run: |
          node scripts/validateTerms.js 2>&1 | tee validation-output.txt
          echo "valid=$?" >> $GITHUB_OUTPUT
          {
            echo 'validation_output<<EOF'
            cat validation-output.txt
            echo EOF
          } >> $GITHUB_OUTPUT
      
      - name: Score term (only if valid)
        id: score
        if: steps.validate.outputs.valid == '0'
        run: |
          node scripts/quickScore.js > output.txt
          cat output.txt
          echo "score=$(grep 'SCORE:' output.txt | cut -d: -f2)" >> $GITHUB_OUTPUT
          echo "badge=$(grep 'BADGE:' output.txt | cut -d: -f2-)" >> $GITHUB_OUTPUT
      
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const isValid = '${{ steps.validate.outputs.valid }}' === '0';
            const validationOutput = `${{ steps.validate.outputs.validation_output }}`;
            const score = '${{ steps.score.outputs.score }}' || '0';
            const badge = '${{ steps.score.outputs.badge }}' || '';
            
            let body = '## 🎮 Term Review\n\n';
            
            if (!isValid) {
              body += '### ❌ Validation FAILED!\n\n';
              body += 'Your submission has errors that need to be fixed:\n\n';
              body += '```\n';
              body += validationOutput.replace(/✅.*\n/g, '').trim();
              body += '\n```\n\n';
              body += '### 📝 How to Fix\n\n';
              body += '1. Check that your YAML syntax is correct (proper indentation, colons, etc.)\n';
              body += '2. Ensure each term has both `term` and `definition` fields\n';
              body += '3. Make sure text fields are strings (use quotes if needed)\n';
              body += '4. Arrays like `tags` and `see_also` should use proper YAML list syntax\n\n';
              body += '### ✨ Valid Term Example\n\n';
              body += '```yaml\n';
              body += '- term: "Example"\n';
              body += '  definition: "A sample to demonstrate correct format"\n';
              body += '  explanation: "Optional longer explanation"\n';
              body += '  humor: "Optional funny take"\n';
              body += '  tags: ["example", "demo"]\n';
              body += '  see_also: ["Sample", "Demo"]\n';
              body += '```\n';
            } else {
              body += '### ✅ Validation Passed!\n\n';
              body += `### 📊 Quality Score: ${score}/100\n\n`;
              
              if (score >= 90) {
                body += '# 🏆 LEGENDARY! \n';
                body += 'This is absolutely perfect! You are a FOSS Glossary champion! 🎉\n';
              } else if (score >= 80) {
                body += '## 🔥 AMAZING! \n';
                body += 'This is top-tier content! Outstanding contribution! 🌟\n';
              } else if (score >= 70) {
                body += '### 💪 Great job! \n';
                body += 'This is a solid contribution! Well done! 👏\n';
              } else if (score >= 60) {
                body += '### 👍 Good work! \n';
                body += 'Nice contribution! Consider adding humor or references for bonus points! 📈\n';
              } else if (score >= 40) {
                body += '### 🌱 Good start! \n';
                body += 'Thanks for contributing! Try adding more details to boost your score:\n';
                body += '- Add some humor (worth up to 30 points!)\n';
                body += '- Include an explanation (20 points)\n';
                body += '- Add related terms in see_also (up to 20 points)\n';
              } else {
                body += '### 🌱 Thanks for contributing! \n';
                body += 'Every term helps! Here\'s how to score higher:\n';
                body += '- **Humor**: Add a funny take (up to 30 points)\n';
                body += '- **Explanation**: Add context (20 points)\n';
                body += '- **Cross-references**: Link related terms (20 points)\n';
                body += '- **Tags**: Categorize your term (10 points)\n';
              }
              
              if (badge) {
                body += `\n### 🏆 Achievements Unlocked!\n`;
                const badges = badge.split(',').map(b => b.trim());
                badges.forEach(b => {
                  body += `- ${b}\n`;
                });
              }
              
              body += '\n---\n';
              body += '*💡 Pro tip: The best terms combine accuracy with humor. Make us laugh while we learn!*';
            }
            
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            
            const botComment = comments.find(comment => 
              comment.user.type === 'Bot' && comment.body.includes('🎮 Term Review')
            );
            
            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body
              });
            } else {
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: body
              });
            }

  update-stats:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Setup Node
        uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm install js-yaml
      
      - name: Validate before updating stats
        run: |
          node scripts/validateTerms.js
          if [ $? -ne 0 ]; then
            echo "❌ Terms validation failed on main branch!"
            exit 1
          fi
        
      - name: Update README
        run: node scripts/updateReadmeStats.js
      
      - name: Commit and push changes
        run: |
          git config --local user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add README.md
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "📊 Update stats [skip ci]"
            git push
          fi
WORKFLOW_EOF

echo "✅ GitHub Actions workflow created!"

# ========================================
# TEST THE VALIDATION
# ========================================
echo ""
echo "🧪 Testing validation with different inputs..."
echo ""

# Test 1: Valid input
echo "Test 1: Testing with valid terms.yaml..."
npm run validate
if [ $? -eq 0 ]; then
  echo "✅ Test 1 passed: Valid terms accepted"
else
  echo "⚠️ Test 1: Check your current terms.yaml"
fi

# Test 2: Invalid input
echo ""
echo "Test 2: Testing with invalid input 'test'..."
echo "test" > terms.yaml.test
node scripts/validateTerms.js 2>/dev/null
if [ $? -ne 0 ]; then
  echo "✅ Test 2 passed: Invalid input rejected"
else
  echo "❌ Test 2 failed: Invalid input was accepted!"
fi
rm -f terms.yaml.test

echo ""
echo "🎉 Complete validation system installed!"
echo ""
echo "Next steps:"
echo "1. Commit these changes: git add . && git commit -m '🛡️ Add proper validation'"
echo "2. Push to GitHub: git push"
echo "3. Test with a PR that has broken YAML - it will be rejected!"