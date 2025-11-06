#!/usr/bin/env node

/**
 * Create GitHub Release
 *
 * This script creates a GitHub release using the GitHub API.
 * It reads the release body from RELEASE_BODY_v1.0.0.md
 *
 * Usage:
 *   node scripts/createRelease.js <tag> [--draft] [--prerelease]
 *
 * Environment variables:
 *   GITHUB_TOKEN - GitHub Personal Access Token (required)
 *
 * Example:
 *   GITHUB_TOKEN=ghp_xxx node scripts/createRelease.js v1.0.0
 */

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

async function createRelease() {
  // Parse arguments
  const args = process.argv.slice(2);
  const tag = args[0];
  const isDraft = args.includes('--draft');
  const isPrerelease = args.includes('--prerelease');

  if (!tag) {
    console.error('❌ Error: Tag name is required');
    console.error('Usage: node scripts/createRelease.js <tag> [--draft] [--prerelease]');
    process.exit(1);
  }

  // Check for GitHub token
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is required');
    console.error('Please set GITHUB_TOKEN with a valid GitHub Personal Access Token');
    process.exit(1);
  }

  // Read release body
  const releaseBodyPath = path.join(__dirname, '..', `RELEASE_BODY_${tag}.md`);
  let releaseBody;

  try {
    releaseBody = fs.readFileSync(releaseBodyPath, 'utf8');
  } catch (error) {
    console.error(`❌ Error: Could not read release body from ${releaseBodyPath}`);
    console.error('Make sure the release body file exists');
    process.exit(1);
  }

  // Initialize Octokit
  const octokit = new Octokit({ auth: token });

  // Get repository information
  const [owner, repo] = ['LuminLynx', 'FOSS-Glossary'];

  console.log(`\n📦 Creating GitHub Release`);
  console.log(`   Repository: ${owner}/${repo}`);
  console.log(`   Tag: ${tag}`);
  console.log(`   Draft: ${isDraft}`);
  console.log(`   Prerelease: ${isPrerelease}\n`);

  try {
    // Create the release
    const response = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: `FOSS Glossary ${tag}`,
      body: releaseBody,
      draft: isDraft,
      prerelease: isPrerelease,
    });

    console.log(`✅ Release created successfully!`);
    console.log(`   URL: ${response.data.html_url}`);
    console.log(`   ID: ${response.data.id}\n`);

    // Save release info
    const releaseInfo = {
      tag: tag,
      url: response.data.html_url,
      id: response.data.id,
      created_at: response.data.created_at,
      published_at: response.data.published_at,
    };

    const releaseInfoPath = path.join(__dirname, '..', '.release-info.json');
    fs.writeFileSync(releaseInfoPath, JSON.stringify(releaseInfo, null, 2));
    console.log(`📝 Release info saved to .release-info.json`);
  } catch (error) {
    console.error(`❌ Error creating release: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

// Run the script
createRelease().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
