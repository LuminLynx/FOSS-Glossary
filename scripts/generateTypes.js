#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { compile } = require('json-schema-to-typescript');

/**
 * Generate TypeScript types from schema.json
 * This ensures type safety and catches schema changes at compile time
 * 
 * Usage:
 *   node scripts/generateTypes.js         # Generate types
 *   node scripts/generateTypes.js --check # Check if types are up to date
 */
async function generateTypes() {
  try {
    const checkMode = process.argv.includes('--check');
    const schemaPath = path.join(__dirname, '..', 'schema.json');
    const outputPath = path.join(__dirname, '..', 'types', 'terms.d.ts');
    
    // Read schema
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    // Generate TypeScript types
    const ts = await compile(schema, 'FOSSGlossaryTerms', {
      bannerComment: '',
      style: {
        bracketSpacing: true,
        printWidth: 100,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
      },
    });
    
    if (checkMode) {
      // Check mode: verify types are up to date
      if (!fs.existsSync(outputPath)) {
        console.error('❌ Error: TypeScript types file not found');
        console.error('   Run: npm run generate:types');
        process.exit(1);
      }
      
      const existingTypes = fs.readFileSync(outputPath, 'utf8');
      if (existingTypes !== ts) {
        console.error('❌ Error: TypeScript types are out of sync with schema.json');
        console.error('   Run: npm run generate:types');
        process.exit(1);
      }
      
      console.log('✅ TypeScript types are up to date');
    } else {
      // Generate mode: write types file
      const typesDir = path.dirname(outputPath);
      if (!fs.existsSync(typesDir)) {
        fs.mkdirSync(typesDir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, ts);
      console.log('✅ TypeScript types generated successfully:', outputPath);
    }
  } catch (error) {
    console.error('❌ Error generating TypeScript types:', error.message);
    process.exit(1);
  }
}

generateTypes();
