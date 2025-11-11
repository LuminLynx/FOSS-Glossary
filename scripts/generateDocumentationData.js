#!/usr/bin/env node

/**
 * Generate documentation data by scanning all markdown files in the repository
 * and categorizing them appropriately for the documentation page.
 */

const fs = require('fs');
const path = require('path');

// Directories to exclude from scanning
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.husky',
  'tests',
  'tasks',
  'templates',
  'types',
  'utils',
  'assets',
  'scripts',
  '.codex',
];

// Files to exclude
const EXCLUDE_FILES = ['ISSUE_COMMENT.md', 'pull_request_template.md'];

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const dirName = path.basename(filePath);
      if (!EXCLUDE_DIRS.includes(dirName)) {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      if (!EXCLUDE_FILES.includes(file)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Extract title from markdown file (first h1)
 */
function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+?)(?:\s+<.*)?$/);
    if (match) {
      // Remove any badges or links from title
      return match[1].replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '').trim();
    }
  }
  return null;
}

/**
 * Extract description from markdown file (first paragraph after title)
 */
function extractDescription(content) {
  const lines = content.split('\n');
  let foundTitle = false;
  let description = [];

  for (const line of lines) {
    if (line.match(/^#\s+/)) {
      foundTitle = true;
      continue;
    }

    if (foundTitle) {
      const trimmedLine = line.trim();

      // Skip empty lines at start
      if (!trimmedLine && description.length === 0) {
        continue;
      }

      // Stop at next heading
      if (trimmedLine.match(/^#{2,}\s+/)) {
        break;
      }

      // Skip blockquotes and collect description
      if (trimmedLine && !trimmedLine.startsWith('>') && !trimmedLine.startsWith('---')) {
        description.push(trimmedLine);
        if (description.join(' ').length > 150) {
          break;
        }
      }

      // Stop after first paragraph
      if (trimmedLine === '' && description.length > 0) {
        break;
      }
    }
  }

  let desc = description.join(' ').substring(0, 200);
  if (description.join(' ').length > 200) {
    desc += '...';
  }
  return desc || 'Documentation file';
}

/**
 * Categorize a document based on its path and content
 */
function categorizeDocument(filePath, title, description) {
  const relativePath = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath, '.md');

  // Getting Started
  if (fileName === 'README' || fileName === 'CONTRIBUTING') {
    return {
      category: 'Getting Started',
      icon: fileName === 'README' ? '📖' : '✍️',
      priority: fileName === 'README' ? 1 : 2,
    };
  }

  // Automation & Workflows
  if (
    fileName === 'AGENTS' ||
    fileName === 'RUNBOOK' ||
    relativePath.includes('workflows/') ||
    relativePath.includes('.github/workflows') ||
    relativePath.includes('.github/AGENTS') ||
    relativePath.includes('.github/RUNBOOK')
  ) {
    return {
      category: 'Automation & Workflows',
      icon: fileName === 'AGENTS' ? '🤖' : '⚙️',
      priority: 10,
    };
  }

  // Project Policies
  if (
    fileName === 'CODE_OF_CONDUCT' ||
    fileName.includes('policy') ||
    fileName.includes('deletion-policy') ||
    fileName.includes('slug-policy')
  ) {
    return {
      category: 'Project Policies',
      icon: fileName === 'CODE_OF_CONDUCT' ? '🤝' : '📋',
      priority: 20,
    };
  }

  // Technical Documentation
  if (
    fileName.includes('spec') ||
    fileName.includes('schema') ||
    fileName.includes('json') ||
    fileName.includes('strategy') ||
    relativePath.includes('docs/technical/')
  ) {
    return {
      category: 'Technical Documentation',
      icon: '📐',
      priority: 30,
    };
  }

  // Release Documentation
  if (
    fileName.includes('RELEASE') ||
    fileName.includes('release') ||
    relativePath.includes('docs/releases/')
  ) {
    return {
      category: 'Release Documentation',
      icon: '🚀',
      priority: 40,
    };
  }

  // PWA Documentation
  if (relativePath.includes('pwa/')) {
    return {
      category: 'PWA Documentation',
      icon: '📱',
      priority: 35,
    };
  }

  // Workflow Documentation
  if (fileName.includes('WORKFLOW')) {
    return {
      category: 'Workflow Documentation',
      icon: '🔄',
      priority: 25,
    };
  }

  // Testing & Quality
  if (
    fileName.includes('TEST') ||
    fileName.includes('COVERAGE') ||
    relativePath.includes('docs/testing/')
  ) {
    return {
      category: 'Testing & Quality',
      icon: '✅',
      priority: 45,
    };
  }

  // Landing Page Documentation
  if (relativePath.includes('docs/landing-page/')) {
    return {
      category: 'Landing Page',
      icon: '🏠',
      priority: 15,
    };
  }

  // Archive
  if (relativePath.includes('docs/archive/')) {
    return {
      category: 'Archive',
      icon: '📦',
      priority: 60,
    };
  }

  // Additional Resources (default)
  return {
    category: 'Additional Resources',
    icon: fileName === 'CHANGELOG' ? '📝' : '📚',
    priority: 50,
  };
}

/**
 * Generate tags for a document
 */
function generateTags(fileName, category) {
  const tags = [];

  if (fileName.includes('README')) tags.push('overview');
  if (fileName.includes('CONTRIBUTING')) tags.push('contributing', 'guide');
  if (fileName.includes('policy')) tags.push('policy');
  if (fileName.includes('spec')) tags.push('spec', 'format');
  if (fileName.includes('schema')) tags.push('schema', 'validation');
  if (fileName.includes('RELEASE')) tags.push('release');
  if (fileName.includes('WORKFLOW')) tags.push('workflow');
  if (fileName.includes('TEST')) tags.push('testing');
  if (fileName.includes('PWA')) tags.push('pwa', 'offline');
  if (fileName.includes('CHANGELOG')) tags.push('history', 'releases');
  if (fileName === 'AGENTS') tags.push('automation', 'bots', '100%');
  if (fileName === 'RUNBOOK') tags.push('ops', 'maintenance');
  if (fileName === 'CODE_OF_CONDUCT') tags.push('community', 'conduct');

  return tags.length > 0 ? tags : ['documentation'];
}

/**
 * Main function to generate documentation data
 */
function generateDocumentationData() {
  const rootDir = process.cwd();
  const markdownFiles = findMarkdownFiles(rootDir);

  const documents = [];

  markdownFiles.forEach((filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath, '.md');
      const relativePath = path.relative(rootDir, filePath);

      // Extract metadata
      let title = extractTitle(content);
      if (!title) {
        title = fileName.replace(/-/g, ' ').replace(/_/g, ' ');
      }

      const description = extractDescription(content);
      const categorization = categorizeDocument(filePath, title, description);
      const tags = generateTags(fileName, categorization.category);

      // Generate GitHub URL
      const githubUrl = `https://github.com/LuminLynx/FOSS-Glossary/blob/main/${relativePath}`;

      documents.push({
        title,
        description,
        category: categorization.category,
        icon: categorization.icon,
        priority: categorization.priority,
        tags,
        url: githubUrl,
        fileName: fileName,
        path: relativePath,
      });
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  });

  // Sort by category priority, then by title
  documents.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.title.localeCompare(b.title);
  });

  return documents;
}

// Run if called directly
if (require.main === module) {
  const documents = generateDocumentationData();
  console.log(JSON.stringify(documents, null, 2));
}

module.exports = { generateDocumentationData };
