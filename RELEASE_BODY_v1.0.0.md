# FOSS Glossary v1.0.0 - First Stable Release 🎉

**A community-driven, gamified glossary of FOSS terms with humor and honest truths about open source culture.**

## What's New

- **28 curated terms** with definitions, humor, explanations, and cross-references
- **Gamified scoring system**: Contributors earn 0-100 points and achievement badges
- **Progressive Web App** with offline support and installable on all platforms
- **Automated CI/CD**: Instant PR validation, scoring, and GitHub Pages deployment
- **Developer API**: JSON endpoint at `/terms.json` for integrations

## Internals

**Data & Validation:**

- JSON Schema v7 validation with duplicate detection (case/punctuation-insensitive)
- 269 comprehensive tests covering edge cases and full pipeline integration
- TypeScript type generation from schema

**Automation & Scoring:**

- Multi-dimensional scoring: humor (30pt), explanation (20pt), cross-refs (20pt), definition (20pt), tags (10pt)
- Automated stats updates and contributor leaderboard
- PR validation with instant feedback comments

**Site & Frontend:**

- Handlebars-based landing page generator
- Responsive design with dark/light themes
- PWA at `/docs/pwa/` with service worker and offline caching
- SEO optimized with Open Graph/Twitter Card metadata

**CI/Publishing:**

- PR workflow: validation → TypeScript check → YAML sort check → scoring → comment
- Post-merge: landing page regeneration → terms.json export → Pages deployment
- Additional workflows: stats updates, issue automation, contributor welcome

**Guidelines:**

- CONTRIBUTING.md with clear scoring explanation
- CODE_OF_CONDUCT.md for community standards
- AGENTS.md automation playbook (100% compliant)
- RUNBOOK.md for operations troubleshooting

**Current Index:** 28 terms, 5 contributors, 100% humor rate. Champion: "License Proliferation" (98/100).

---

**Deploy:** [Landing Page](https://luminlynx.github.io/FOSS-Glossary/) | [PWA](https://luminlynx.github.io/FOSS-Glossary/pwa/) | [API](https://luminlynx.github.io/FOSS-Glossary/terms.json)
