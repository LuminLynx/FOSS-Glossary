# FOSS Glossary v1.0.0 🎉

**A community-driven, gamified glossary of FOSS terms with humor and honest truths.**

## What's New

- 28 curated terms with definitions, humor, and cross-references
- Gamified scoring (0-100 points) and achievement badges
- Progressive Web App with offline support, installable on all platforms
- Automated CI/CD: instant PR validation, scoring, GitHub Pages deployment
- Developer API: `/terms.json` endpoint

## Internals

**Data & Validation:** JSON Schema v7 with duplicate detection, 271 tests, TypeScript type generation from [schema.json](https://github.com/LuminLynx/FOSS-Glossary/blob/main/schema.json) via [validateTerms.js](https://github.com/LuminLynx/FOSS-Glossary/blob/main/scripts/validateTerms.js).

**Scoring & Automation:** Multi-dimensional scoring (humor 30pt, explanation 20pt, cross-refs 20pt, definition 20pt, tags 10pt) via [quickScore.js](https://github.com/LuminLynx/FOSS-Glossary/blob/main/scripts/quickScore.js). Automated stats updates and contributor leaderboard.

**Site & Frontend:** Handlebars-based [landing page generator](https://github.com/LuminLynx/FOSS-Glossary/blob/main/scripts/generateLandingPage.js), responsive design with dark/light themes, PWA with service worker ([index.html](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/index.html), [404.html](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/404.html)).

**CI/Publishing:** PR workflow (validation → TypeScript → YAML → scoring → comment). Post-merge: landing page rebuild → terms.json export → Pages deployment. See [WORKFLOW_DOCUMENTATION.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/WORKFLOW_DOCUMENTATION.md).

**Guidelines:** [CONTRIBUTING.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/CONTRIBUTING.md), [CODE_OF_CONDUCT.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/CODE_OF_CONDUCT.md), [AGENTS.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/AGENTS.md) automation playbook. See also [slug-policy.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/slug-policy.md), [deletion-policy.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/docs/deletion-policy.md).

**Current Stats:** 28 terms, 5 contributors, 100% humor rate. Champion: "License Proliferation" (98/100).

## Documentation

**Overview:** [README.md](https://github.com/LuminLynx/FOSS-Glossary/blob/main/README.md) · **Full Docs:** See links above in Internals section

## Thanks

🥇 copilot-swe-agent[bot] | 🥈 John Portley | 🥉 Joao Portela | 🌟 Aditya Kumar Singh | 🌟 Joe Port

Special mention: **@Axestein** for the first community contribution!

---

**Compare:** [v0.1.0-mvp...v1.0.0](https://github.com/LuminLynx/FOSS-Glossary/compare/v0.1.0-mvp...v1.0.0) (when tag is created)  
**Deploy:** [Landing Page](https://luminlynx.github.io/FOSS-Glossary/) | [PWA](https://luminlynx.github.io/FOSS-Glossary/pwa/) | [API](https://luminlynx.github.io/FOSS-Glossary/terms.json)
