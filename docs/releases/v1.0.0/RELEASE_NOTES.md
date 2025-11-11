# Release Notes: v1.0.0

**Release Date:** 2025-11-06  
**Version:** v1.0.0  
**Compare:** First stable release - no previous version to compare

---

## 🎉 What is FOSS Glossary?

A community-driven, gamified glossary of Free and Open Source Software (FOSS) terms with humor, sarcasm, and honest truths about open source culture. Contributors earn scores (0-100 points) and achievements for adding high-quality terms with definitions, explanations, humor, and cross-references.

---

## ✨ What's New

### Core Features

- **28 curated FOSS terms** with definitions, humor, and cross-references
- **Gamified contribution system** scoring terms out of 100 points with achievement badges
- **JSON Schema validation** ensuring data quality and consistency
- **Automated scoring system** evaluating humor (30pt), explanation (20pt), cross-refs (20pt), definition (20pt), and tags (10pt)
- **Progressive Web App (PWA)** with offline support, installable on mobile and desktop
- **Live landing page** at [luminlynx.github.io/FOSS-Glossary](https://luminlynx.github.io/FOSS-Glossary/)
- **Terms API endpoint** at `/terms.json` for developer integration

### Contributor Experience

- **Instant PR validation** with schema checks, duplicate detection, and quality scoring
- **Automated feedback** posted as PR comments within 30 seconds
- **Achievement badges**: Comedy Gold (101+ char humor), Perfectionist (90+ score), score tiers (70+, 80+, 90+)
- **Contributor recognition** in README with top contributor leaderboard
- **Clear guidelines** in CONTRIBUTING.md and CODE_OF_CONDUCT.md

---

## 🔧 Notable Internals

### Data Model & Validation

- **Canonical source**: `terms.yaml` validated against `schema.json`
- **JSON Schema v7** with strict validation using AJV library
- **Duplicate detection**: Normalizes slugs, terms, and aliases (case/punctuation-insensitive)
- **Field requirements**: slug (3-48 chars), term, definition (80+ chars minimum)
- **Optional fields**: explanation, humor, tags, see_also, aliases, controversy_level
- **269 comprehensive tests** covering edge cases, boundaries, and full pipeline integration

### Scoring & Badges System

- **Multi-dimensional scoring**: `scripts/quickScore.js` and `scripts/scoring.js`
- **Score breakdown**: Base (20), Humor (30), Explanation (20), Cross-refs (20), Tags (10)
- **Badge thresholds**: 70 (Good), 80 (Great), 90 (Excellent), 100 (Perfect)
- **Special badges**: Comedy Gold, controversy levels (low/medium/high)
- **Current champion**: "License Proliferation" with ~98/100 points

### Scripts & Automation

- **`validateTerms.js`**: Schema validation with friendly error messages
- **`quickScore.js`**: Individual term scoring with badge calculation
- **`updateReadmeStats.js`**: Auto-updates README statistics (terms count, contributors, champion)
- **`generateLandingPage.js`**: Handlebars-based HTML generation for GitHub Pages
- **`exportTerms.js`**: Generates `docs/terms.json` with metadata (version, timestamp, count)
- **`sortYaml.js`**: Ensures alphabetical term ordering
- **`generateTypes.js`**: TypeScript type definitions from schema

### Landing Page & Frontend

- **Responsive design** with dark/light theme toggle
- **Static HTML generation** using Handlebars templates (`templates/landing-page.hbs`)
- **Auto-deployed** to GitHub Pages on every main branch push
- **SEO optimized** with Open Graph and Twitter Card meta tags
- **Performance**: Lightweight, no heavy frameworks
- **PWA features**:
  - Offline support via service worker
  - Installable on iOS/Android/Desktop
  - Deep linking to specific terms
  - Local favorites with localStorage persistence
  - Located at `/docs/pwa/` with full glossary UI

### CI/CD Pipeline

**PR Validation** (`.github/workflows/pr-complete.yml`):

1. Schema validation against `schema.json`
2. TypeScript types sync check
3. YAML alphabetical sorting verification
4. Duplicate slug/term/alias detection
5. Export schema dry-run validation
6. Term scoring with badge calculation
7. PR comment with results and score

**Post-Merge Publishing** (`.github/workflows/update-landing-page.yml`):

1. Regenerate `docs/index.html` from template
2. Validate landing page sync
3. Export `docs/terms.json` (only if new slugs added)
4. Deploy to GitHub Pages automatically

**Additional Workflows**:

- `readme-stats.yml`: Updates README stats block with contributor rankings
- `issue-task-pr.yml`: Automates issue → task branch → PR creation flow
- `pr-welcome.yml`: Welcomes first-time contributors

### Contributor Guidelines & Governance

- **CONTRIBUTING.md**: Step-by-step guide with scoring explanation and examples
- **CODE_OF_CONDUCT.md**: Community standards and enforcement procedures
- **AGENTS.md**: Automation playbook for bot agents (100% compliant badge)
- **RUNBOOK.md**: Operations guide for troubleshooting and emergency procedures

---

## 📋 Documentation Highlights

### Key Resources

- **README.md**: Project overview with live stats (28 terms, 5 contributors, 100% humor rate)
- **Schema file**: `schema.json` - Authoritative data model specification
- **Type definitions**: Auto-generated TypeScript types in `/types`
- **Workflow docs**: `/docs/WORKFLOW_DOCUMENTATION.md` - Complete CI/CD reference
- **Test coverage**: `/docs/TEST_COVERAGE_SUMMARY.md` - 232+ tests, 73% increase
- **PWA documentation**: `/docs/pwa/README.md` - Installation and usage guide

### Schema vs. Documentation Alignment

**Note**: Current implementation enforces these rules:

- Slug: 3-48 characters, lowercase alphanumeric with hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- Definition: Minimum 80 characters (enforced in schema)
- All validations match between `schema.json` and documentation

---

## 🤖 CI & Infrastructure

### Publishing Flow

1. **Contributor** submits PR modifying `terms.yaml`
2. **PR validation** runs automatically (validation → scoring → comment)
3. **Maintainer** reviews and approves
4. **Merge to main** triggers landing page rebuild
5. **Automated export** generates `docs/terms.json` if new terms added
6. **GitHub Pages** deploys updated site within 2-3 minutes
7. **Cache headers**: terms.json served with 1-year cache, immutable

### Repository Secrets

- `COMMENT_TOKEN` (optional): PAT for PR comments on forked repositories
- Fallback to `GITHUB_TOKEN` for same-repo PRs

---

## 🎯 Version Rationale

**Proposed version: v1.0.0**

Based on `package.json` current version and feature completeness:

- Stable data model with comprehensive validation
- Production-ready CI/CD pipeline
- Full test coverage (269 passing tests)
- Complete contributor workflow
- Live production deployment
- PWA with offline capabilities
- Comprehensive documentation

This represents the first stable, production-ready release.

---

## 🙏 Thanks

Special thanks to our contributors:

🥇 **copilot-swe-agent[bot]** | 🥈 **John Portley** | 🥉 **Joao Portela** | 🌟 **Aditya Kumar Singh** | 🌟 **Joe Port**

And to **@Axestein** for our very first community contribution!

---

## 📦 Assets

- **Landing Page**: https://luminlynx.github.io/FOSS-Glossary/
- **PWA**: https://luminlynx.github.io/FOSS-Glossary/pwa/
- **Terms API**: https://luminlynx.github.io/FOSS-Glossary/terms.json
- **Repository**: https://github.com/LuminLynx/FOSS-Glossary
- **License**: MIT (code) / CC0 (content)
