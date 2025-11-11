# v1.0.0 Release Instructions

This document provides step-by-step instructions for creating the first official release (v1.0.0) of the FOSS Glossary project.

## Pre-Release Checklist

- [x] **Version verified**: package.json shows v1.0.0
- [x] **All tests passing**: 269/269 tests pass
- [x] **Linting passes**: Prettier, Markdownlint, CSpell all clean
- [x] **Documentation prepared**:
  - [x] CHANGELOG.md
  - [x] RELEASE_NOTES_v1.0.0.md
  - [x] RELEASE_BODY_v1.0.0.md
  - [x] RELEASE_SUMMARY.md
  - [x] ISSUE_COMMENT.md
- [x] **Release tools created**:
  - [x] scripts/createRelease.js
  - [x] .github/workflows/create-release.yml
  - [x] docs/RELEASE_PROCESS.md

## Release Steps

### Step 1: Merge the PR

Once this PR is reviewed and approved:

```bash
# Merge to main
# This will trigger the landing page deployment workflow
```

### Step 2: Create the Git Tag

After the PR is merged to main:

```bash
# Pull the latest main
git checkout main
git pull origin main

# Create the v1.0.0 tag
git tag -a v1.0.0 -m "Release v1.0.0 - First stable release"

# Push the tag
git push origin v1.0.0
```

### Step 3: Create the GitHub Release

You have three options:

#### Option A: Using GitHub Workflow (Recommended)

1. Go to: https://github.com/LuminLynx/FOSS-Glossary/actions/workflows/create-release.yml
2. Click "Run workflow"
3. Fill in the fields:
   - **Tag**: `v1.0.0`
   - **Draft**: `false`
   - **Prerelease**: `false`
4. Click "Run workflow"
5. Wait for the workflow to complete
6. Verify the release at: https://github.com/LuminLynx/FOSS-Glossary/releases

#### Option B: Using the Release Script

```bash
# Ensure you have a GitHub token with repo access
export GITHUB_TOKEN=your_github_token_here

# Run the release script
npm run release:create v1.0.0
```

The script will:

- Read RELEASE_BODY_v1.0.0.md
- Create a GitHub release for tag v1.0.0
- Print the release URL
- Save release info to .release-info.json

#### Option C: Manual GitHub Release

1. Go to: https://github.com/LuminLynx/FOSS-Glossary/releases/new
2. Click "Choose a tag" and select `v1.0.0`
3. Set the release title: `FOSS Glossary v1.0.0`
4. Copy the content from `RELEASE_BODY_v1.0.0.md` into the description field
5. Verify the preview looks correct
6. Click "Publish release"

## Post-Release Verification

After creating the release, verify:

- [ ] Release appears on: https://github.com/LuminLynx/FOSS-Glossary/releases
- [ ] Release body is formatted correctly
- [ ] Tag is visible: https://github.com/LuminLynx/FOSS-Glossary/tags
- [ ] Landing page is accessible: https://luminlynx.github.io/FOSS-Glossary/
- [ ] PWA is accessible: https://luminlynx.github.io/FOSS-Glossary/pwa/
- [ ] Terms API is accessible: https://luminlynx.github.io/FOSS-Glossary/terms.json

## Post-Release Tasks

After the release is published:

1. **Update README badges** (if applicable)
2. **Close related issues**:
   - Close the "Creating a New Release" issue
   - Reference the release in the issue comment
3. **Update milestones**:
   - Close the v1.0.0 milestone (if exists)
   - Create v1.1.0 milestone for next iteration
4. **Announce the release** (optional):
   - Post on project homepage
   - Share on social media
   - Notify community channels

## Troubleshooting

### Tag Creation Issues

If the tag already exists:

```bash
# View existing tags
git tag -l

# Delete local tag (if needed)
git tag -d v1.0.0

# Delete remote tag (if needed)
git push origin :refs/tags/v1.0.0
```

### Workflow Failures

If the GitHub workflow fails:

1. Check the Actions tab for error details
2. Verify the tag exists: `git ls-remote --tags origin`
3. Ensure RELEASE_BODY_v1.0.0.md exists
4. Check GitHub token permissions

### Script Errors

If the release script fails:

1. Verify GITHUB_TOKEN is set and valid
2. Check token has `repo` scope
3. Ensure RELEASE_BODY_v1.0.0.md exists
4. Review error message for specific issues

## What This Release Includes

### Features

- 28 curated FOSS terms (as of v1.0.0) with definitions, humor, and cross-references
- Gamified scoring system (0-100 points with achievement badges)
- Progressive Web App with offline support
- Automated CI/CD pipeline with instant PR validation
- Developer API at /terms.json
- Responsive landing page with dark/light themes

### Infrastructure

- JSON Schema v7 validation
- 269 comprehensive tests
- TypeScript type generation
- Multi-dimensional scoring system
- Automated stats updates
- PR validation workflow
- Landing page auto-deployment

### Documentation

- CONTRIBUTING.md with clear guidelines
- CODE_OF_CONDUCT.md for community standards
- AGENTS.md automation playbook
- RUNBOOK.md for operations
- Complete API documentation
- PWA installation guide

## References

- Full changelog: [CHANGELOG.md](../CHANGELOG.md)
- Detailed release notes: [RELEASE_NOTES_v1.0.0.md](../RELEASE_NOTES_v1.0.0.md)
- Release process guide: [docs/RELEASE_PROCESS.md](RELEASE_PROCESS.md)

## Contact

For questions or issues with the release process, please:

- Open an issue: https://github.com/LuminLynx/FOSS-Glossary/issues
- Check the runbook: [RUNBOOK.md](../RUNBOOK.md)
- Review the release process: [docs/RELEASE_PROCESS.md](RELEASE_PROCESS.md)
