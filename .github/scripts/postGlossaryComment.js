#!/usr/bin/env node
/**
 * Post or update the glossary validation comment on a PR.
 * 
 * This script handles posting validation results to PRs, with support for:
 * - Fork PRs using a PAT token (COMMENT_TOKEN secret) when available
 * - Repository PRs using the default GITHUB_TOKEN
 * 
 * Environment variables required:
 * - GITHUB_TOKEN: Default GitHub Actions token (always available)
 * - COMMENT_TOKEN: (Optional) PAT for fork PR comments
 * - VALIDATION_EXIT: Exit code from validation step
 * - VALIDATION_OUTPUT: Output from validation step
 * - SCORE: Contributor score (if validation passed)
 * - BADGES: Badge list (if validation passed)
 * - TERM_NAME: Term name (if validation passed)
 * - TERM_SLUG: Term slug (if validation passed)
 * - GITHUB_REPOSITORY: Repository name (owner/repo)
 * - GITHUB_EVENT_PATH: Path to GitHub event JSON
 */

const fs = require('fs');
const { Octokit } = require('@octokit/rest');

/**
 * Read GitHub event context from the event payload file
 */
function getEventContext() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.error('❌ GITHUB_EVENT_PATH not found');
    process.exit(1);
  }

  try {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const prNumber = eventData.pull_request?.number;
    
    if (!prNumber) {
      console.error('❌ Pull request number not found in event data');
      process.exit(1);
    }

    return {
      prNumber,
      isFork: eventData.pull_request?.head?.repo?.fork || false,
    };
  } catch (error) {
    console.error('❌ Failed to read event context:', error.message);
    process.exit(1);
  }
}

/**
 * Parse repository owner and name from GITHUB_REPOSITORY
 */
function getRepoInfo() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    console.error('❌ GITHUB_REPOSITORY not found');
    process.exit(1);
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    console.error('❌ Invalid GITHUB_REPOSITORY format');
    process.exit(1);
  }

  return { owner, repo: repoName };
}

/**
 * Get the authentication token, preferring COMMENT_TOKEN for fork PRs
 */
function getAuthToken(isFork) {
  const commentToken = process.env.COMMENT_TOKEN;
  const githubToken = process.env.GITHUB_TOKEN;

  // Prefer COMMENT_TOKEN if available, especially for fork PRs
  const token = commentToken || githubToken;

  if (!token) {
    console.error('❌ No authentication token available');
    process.exit(1);
  }

  // Log which token is being used (without revealing the token)
  if (commentToken) {
    console.log('ℹ️  Using COMMENT_TOKEN for authentication');
  } else if (isFork) {
    console.log('⚠️  Using GITHUB_TOKEN for fork PR (may fail - consider adding COMMENT_TOKEN secret)');
  } else {
    console.log('ℹ️  Using GITHUB_TOKEN for authentication');
  }

  return token;
}

/**
 * Build the comment body using the same logic as the workflow
 */
function buildCommentBody() {
  const marker = '<!-- glossary-check -->';
  const validationExit = process.env.VALIDATION_EXIT || '';
  const validationOutput = (process.env.VALIDATION_OUTPUT || '').trim();
  const passed = validationExit === '0';
  const score = process.env.SCORE || '';
  const badges = process.env.BADGES || '';
  const termName = process.env.TERM_NAME || '';
  const termSlug = process.env.TERM_SLUG || '';
  const statusEmoji = passed ? '✅' : '❌';

  let body = `${marker}\n### Glossary Check ${statusEmoji}\n\n`;

  if (passed) {
    const badgeList = badges
      .split(',')
      .map(b => b.trim())
      .filter(Boolean);
    
    body += `- Status: **Passed** – schema, duplicates, and slug checks succeeded.\n`;
    
    if (termName || termSlug) {
      const slugPart = termSlug ? ` (${termSlug})` : '';
      const namePart = termName ? `\`${termName}\`` : 'Latest entry';
      body += `- Latest term: ${namePart}${slugPart}\n`;
    }
    
    if (score) {
      body += `- Score: ${score}/100\n`;
    }
    
    const badgeDisplay = badgeList.length > 0 ? badgeList.join(', ') : 'None';
    body += `- Badges: ${badgeDisplay}\n\n`;
  } else {
    body += `- Status: **Failed** – please address the errors below.\n\n`;
    
    if (validationOutput) {
      const trimmed = validationOutput
        .split('\n')
        .map(line => line.trimEnd())
        .filter(Boolean)
        .slice(0, 20)
        .join('\n');
      body += '```\n' + trimmed + '\n```\n\n';
    }
    
    body += `Scoring was skipped because validation did not succeed.\n\n`;
  }

  const { owner, repo } = getRepoInfo();
  const docsUrl = `https://github.com/${owner}/${repo}/blob/main/docs/REPOSITORY_REVIEW.md#data-model--validation-rules`;
  body += `[Validation docs](${docsUrl}) for field requirements and examples.`;

  return body;
}

/**
 * Post or update the comment on the PR
 */
async function postComment() {
  const { prNumber, isFork } = getEventContext();
  const { owner, repo } = getRepoInfo();
  const token = getAuthToken(isFork);
  const body = buildCommentBody();

  const octokit = new Octokit({ auth: token });

  try {
    // List existing comments to find our marker comment
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });

    const marker = '<!-- glossary-check -->';
    const existingComment = comments.find(
      comment => comment.body && comment.body.includes(marker)
    );

    if (existingComment) {
      // Update existing comment
      console.log(`📝 Updating existing comment (ID: ${existingComment.id})`);
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body,
      });
      console.log('✅ Comment updated successfully');
    } else {
      // Create new comment
      console.log('📝 Creating new comment');
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      console.log('✅ Comment created successfully');
    }
  } catch (error) {
    console.error('❌ Failed to post comment:', error.message);
    
    if (error.status === 403 || error.status === 401) {
      console.error('\n💡 This may be a fork PR requiring a PAT token.');
      console.error('   See docs/REPOSITORY_REVIEW.md for setup instructions.');
    }
    
    process.exit(1);
  }
}

// Run the script
postComment().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
