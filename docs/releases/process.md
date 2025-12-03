# Release Process Guide

This document describes the complete process for creating and publishing releases for the FOSS Glossary project.

## Overview

The FOSS Glossary follows semantic versioning (semver) for releases. Release documentation is prepared in advance and stored in versioned files.

## Versioning System

- **Package version**: Defined in `package.json`
- **Git tags**: Used to mark release points in history
- **Terms API version**: Uses git commit SHA in `terms.json` metadata

### Current Version

The current version is **v1.0.0** (first stable release).

## Release Documentation Files

For each release, the following documentation files should be prepared:

1. **`CHANGELOG.md`** - Comprehensive changelog with all changes
2. **`RELEASE_NOTES_vX.Y.Z.md`** - Detailed technical release notes
3. **`RELEASE_BODY_vX.Y.Z.md`** - Concise GitHub release body (≤250 words)
4. **`RELEASE_SUMMARY.md`** - Implementation summary and instructions
5. **`templates/ISSUE_COMMENT.md`** - Template for issue responses

## Creating a Release

### Prerequisites

1. All release documentation files must be prepared and committed
2. All tests must pass (`npm test`)
3. Code must be linted and formatted (`npm run lint`)
4. The version in `package.json` must match the release version

### Method 1: Using GitHub Workflow (Recommended)

1. **Create and push the git tag:**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Trigger the release workflow:**
   - Go to Actions → Create Release
   - Click "Run workflow"
   - Enter the tag name (e.g., `v1.0.0`)
   - Choose draft/prerelease options if needed
   - Click "Run workflow"

3. **Verify the release:**
   - Check the Releases page
   - Verify the release body is correct
   - Publish if created as draft

### Method 2: Using the Release Script

1. **Create and push the git tag:**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Run the release script:**

   ```bash
   GITHUB_TOKEN=your_token_here node scripts/createRelease.js v1.0.0
   ```

   Options:
   - `--draft`: Create as draft release
   - `--prerelease`: Mark as prerelease

3. **Verify the release:**
   - Check the URL printed by the script
   - Verify the release body is correct

### Method 3: Manual GitHub Release

1. **Create and push the git tag:**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Create the release on GitHub:**
   - Go to: https://github.com/LuminLynx/FOSS-Glossary/releases/new
   - Select the tag: `v1.0.0`
   - Set the title: `FOSS Glossary v1.0.0`
   - Copy the content from `RELEASE_BODY_v1.0.0.md` and paste as description
   - Click "Publish release"

## Post-Release Checklist

After creating a release:

- [ ] Verify the release appears on the Releases page
- [ ] Check that the release body is formatted correctly
- [ ] Update any external documentation or announcements
- [ ] Close any related issues or milestones
- [ ] Announce the release (if applicable):
  - Project README
  - Social media
  - Community channels

## Release Workflow Integration

The release process integrates with existing workflows:

- **PR Validation** (`pr-comment.yml`): Ensures quality before merge
- **Landing Page** (`update-landing-page.yml`): Auto-deploys on merge to main
- **README Stats** (`readme-stats.yml`): Updates statistics

## Versioning Guidelines

### Semantic Versioning

Follow [semver](https://semver.org/) for version numbers:

- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
- **MINOR** (0.X.0): New features, backward-compatible
- **PATCH** (0.0.X): Bug fixes, backward-compatible

### Version Bumping

When preparing a new release:

1. Update `package.json` version
2. Update `CHANGELOG.md` with new version section
3. Create new `RELEASE_NOTES_vX.Y.Z.md`
4. Create new `RELEASE_BODY_vX.Y.Z.md`
5. Commit all changes
6. Create and push tag

## Troubleshooting

### Tag Already Exists

If you need to recreate a tag:

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# Recreate tag
git tag v1.0.0
git push origin v1.0.0
```

**⚠️ Warning**: Only do this before the release is published. Never delete published release tags.

### Release Creation Failed

If release creation fails:

1. Check that the tag exists: `git tag -l v1.0.0`
2. Verify the release body file exists
3. Check GitHub token permissions (needs `contents: write`)
4. Review error messages for specific issues

### Missing Release Documentation

If release documentation is missing:

1. Use previous release files as templates
2. Follow the structure in existing `RELEASE_*.md` files
3. Ensure all required sections are included
4. Verify file naming matches the tag version

## Future Improvements

Potential enhancements to the release process:

- [ ] Automated version bumping
- [ ] Changelog generation from commits
- [ ] Release notes generation from PRs
- [ ] Asset attachment (e.g., terms.json snapshot)
- [ ] Release announcement automation
- [ ] Version compatibility matrix

## References

- [Semantic Versioning](https://semver.org/)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Keep a Changelog](https://keepachangelog.com/)
