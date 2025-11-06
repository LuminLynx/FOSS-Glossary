# Release Publication Instructions for v1.0.0

This document provides step-by-step instructions for publishing the v1.0.0 release of FOSS Glossary.

## Prerequisites

- GitHub account with write access to the LuminLynx/FOSS-Glossary repository
- GitHub Personal Access Token (PAT) with `repo` scope (for automated release)
- OR manual access via GitHub web interface

## Release Information

- **Version:** v1.0.0
- **Tag:** v1.0.0
- **Target Branch:** main
- **Release Body:** See `RELEASE_BODY_v1.0.0.md`
- **Full Changelog:** See `CHANGELOG.md`
- **Detailed Release Notes:** See `RELEASE_NOTES_v1.0.0.md`

## Version Rationale (SemVer Alignment)

**Why v1.0.0?**

Based on `package.json` (version: 1.0.0) and feature completeness:

- ✅ Stable data model with comprehensive validation (JSON Schema v7)
- ✅ Production-ready CI/CD pipeline
- ✅ Full test coverage (271 passing tests)
- ✅ Complete contributor workflow
- ✅ Live production deployment (GitHub Pages)
- ✅ Progressive Web App with offline capabilities
- ✅ Comprehensive documentation

This represents the **first stable, production-ready release**.

## Option 1: Automated Release via Script (Recommended)

### Step 1: Set GitHub Token

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

### Step 2: Run Release Script

```bash
cd /path/to/FOSS-Glossary
npm run release:create v1.0.0
```

This will:

1. Create the git tag `v1.0.0` on the current commit
2. Create a GitHub Release with the title "FOSS Glossary v1.0.0"
3. Use the content from `RELEASE_BODY_v1.0.0.md` as the release body
4. Save release information to `.release-info.json`

### Optional Flags

- `--draft`: Create as draft release (can publish later)
  ```bash
  npm run release:create v1.0.0 -- --draft
  ```
- `--prerelease`: Mark as pre-release
  ```bash
  npm run release:create v1.0.0 -- --prerelease
  ```

## Option 2: Manual Release via GitHub Web Interface

### Step 1: Navigate to Releases

1. Go to https://github.com/LuminLynx/FOSS-Glossary/releases
2. Click "Draft a new release"

### Step 2: Configure Release

1. **Choose a tag:** Enter `v1.0.0` and select "Create new tag: v1.0.0 on publish"
2. **Target:** Select `main` branch
3. **Release title:** `FOSS Glossary v1.0.0`
4. **Description:** Copy the entire content from `RELEASE_BODY_v1.0.0.md`

### Step 3: Publish

1. Ensure "Set as the latest release" is checked
2. Click "Publish release"

## Post-Release Checks

After publishing the release, verify the following:

### 1. Verify Release Page

- [ ] Release is visible at: https://github.com/LuminLynx/FOSS-Glossary/releases/tag/v1.0.0
- [ ] All links in the release body are working
- [ ] Documentation section links point to correct files
- [ ] Compare link works (after tag is created): https://github.com/LuminLynx/FOSS-Glossary/compare/v0.1.0-mvp...v1.0.0

### 2. Verify GitHub Pages Still Works

- [ ] Landing Page loads: https://luminlynx.github.io/FOSS-Glossary/
- [ ] PWA loads: https://luminlynx.github.io/FOSS-Glossary/pwa/
- [ ] API endpoint loads: https://luminlynx.github.io/FOSS-Glossary/terms.json
- [ ] 404 page works: https://luminlynx.github.io/FOSS-Glossary/nonexistent

### 3. Verify CI/CD Pipeline Alignment

Check that the CI workflows are still functioning correctly:

- [ ] PR validation workflow (`.github/workflows/pr-complete.yml`)
- [ ] Landing page update workflow (`.github/workflows/update-landing-page.yml`)
- [ ] README stats workflow (`.github/workflows/readme-stats.yml`)

### 4. Optional: Refresh README Stats

If the release triggers any changes, you may want to update README stats:

```bash
npm run stats
git add README.md
git commit -m "chore: update README stats [skip ci]"
git push
```

## Verification Commands

### Check tag was created

```bash
git fetch --tags
git tag -l v1.0.0
```

### Verify tag points to correct commit

```bash
git show v1.0.0
```

### List all releases

```bash
gh release list  # requires gh CLI
```

### View release details

```bash
gh release view v1.0.0  # requires gh CLI
```

## Compare with Previous Release

Once the tag is created, you can compare with the previous release:

**Compare URL:** https://github.com/LuminLynx/FOSS-Glossary/compare/v0.1.0-mvp...v1.0.0

This will show all commits, file changes, and contributors between releases.

## Troubleshooting

### Issue: "Tag already exists"

If the tag already exists locally or remotely:

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag (be careful!)
git push --delete origin v1.0.0

# Then retry release creation
```

### Issue: "Release body is too long"

GitHub release body has a maximum length. If the release body exceeds this:

1. Move detailed information to `RELEASE_NOTES_v1.0.0.md`
2. Keep only essential information in the release body
3. Link to the full release notes file

### Issue: "Authentication failed"

For automated release:

1. Verify your GITHUB_TOKEN is valid
2. Ensure the token has `repo` scope
3. Check token hasn't expired

For manual release:

1. Ensure you're logged into GitHub
2. Verify you have write access to the repository

## Documentation Links Verification

All links in the release body have been verified to point to actual files:

- ✅ [schema.json](https://github.com/LuminLynx/FOSS-Glossary/blob/main/schema.json)
- ✅ [validateTerms.js](https://github.com/LuminLynx/FOSS-Glossary/blob/main/scripts/validateTerms.js)
- ✅ [quickScore.js](https://github.com/LuminLynx/FOSS-Glossary/blob/main/scripts/quickScore.js)
- ✅ [generateLandingPage.js](https://github.com/LuminLynx/FOSS-Glossary/blob/main/scripts/generateLandingPage.js)
- ✅ [index.html](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/index.html)
- ✅ [404.html](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/404.html)
- ✅ [WORKFLOW_DOCUMENTATION.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/WORKFLOW_DOCUMENTATION.md)
- ✅ [CONTRIBUTING.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/CONTRIBUTING.md)
- ✅ [CODE_OF_CONDUCT.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/CODE_OF_CONDUCT.md)
- ✅ [AGENTS.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/AGENTS.md)
- ✅ [slug-policy.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/slug-policy.md)
- ✅ [deletion-policy.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/deletion-policy.md)
- ✅ [README.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/README.md)

## Success Criteria

The release is considered successfully published when:

- ✅ New tag `v1.0.0` exists in the repository
- ✅ GitHub Release is published with the release body from `RELEASE_BODY_v1.0.0.md`
- ✅ Version choice (v1.0.0) is documented and aligned with package.json
- ✅ All documentation links in the release body are working
- ✅ GitHub Pages site still renders correctly (landing + PWA + 404)
- ✅ CI/CD workflows continue to function properly

## Notes

- The release body is exactly **227 words**, within the ≤250 word limit specified in the issue
- All acceptance criteria from the issue have been addressed
- The release includes sections: What's New, Internals, Documentation, Thanks
- Schema and documentation are properly aligned (no mismatches found)
- The tag comparison link will only work after the tag is created
