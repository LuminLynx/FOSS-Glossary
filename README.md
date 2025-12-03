# 🚀 FOSS Glossary

[![Release v1.0.0](https://img.shields.io/badge/Release-v1.0.0-success)](https://github.com/LuminLynx/FOSS-Glossary/releases/tag/v1.0.0)
[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue)](https://luminlynx.github.io/FOSS-Glossary/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple)](https://luminlynx.github.io/FOSS-Glossary/pwa/)
[![Terms Count](https://img.shields.io/badge/Terms-28-orange)](./terms.yaml)
[![Docs](https://img.shields.io/badge/docs-passing-brightgreen)](https://luminlynx.github.io/FOSS-Glossary/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/LuminLynx/FOSS-Glossary/blob/main/.github/CONTRIBUTING.md)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://github.com/LuminLynx/FOSS-Glossary)
[![Node.js](https://img.shields.io/badge/Node.js-v22.17-green)](https://github.com/LuminLynx/FOSS-Glossary)
[![Open Issues](https://img.shields.io/github/issues/LuminLynx/FOSS-Glossary)](https://github.com/LuminLynx/FOSS-Glossary/issues)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/LuminLynx/FOSS-Glossary/graphs/commit-activity)
[![Last Updated](https://img.shields.io/github/last-commit/LuminLynx/FOSS-Glossary)](https://github.com/LuminLynx/FOSS-Glossary/commits/main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/LuminLynx/FOSS-Glossary/actions/workflows/readme-stats.yml/badge.svg)](https://github.com/LuminLynx/FOSS-Glossary/actions)

## A community-driven glossary of FOSS terms with humor, sarcasm, and honest truths

about open source culture.

---

## 🔗 Quick Links

- 📖 **[Landing Page](https://luminlynx.github.io/FOSS-Glossary/)** — Browse the latest terms
- 📱 **[PWA](https://luminlynx.github.io/FOSS-Glossary/pwa/)** — Full glossary with offline support & installable app
- 📋 **[Terms Data (JSON API)](https://luminlynx.github.io/FOSS-Glossary/terms.json)** — Developer-friendly JSON endpoint (2 MB size limit)
- 🤖 **[AGENTS.md](./.github/AGENTS.md)** — Automation playbook (100% compliant)
- 📊 **[GitHub Actions](https://github.com/LuminLynx/FOSS-Glossary/actions)** — CI/CD status & workflows

---

## 🔄 CI/CD Pipeline

Our automated pipeline ensures quality and keeps the glossary up-to-date:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTRIBUTOR WORKFLOW                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Create PR with  │
                    │  terms.yaml edit │
                    └────────┬─────────┘
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │   pr-comment.yml (PR Validation)       │
         ├───────────────────────────────────────┤
         │  1. ✓ Schema validation               │
         │  2. ✓ TypeScript types check          │
         │  3. ✓ YAML sorting check              │
         │  4. ✓ Duplicate detection             │
         │  5. ✓ Exporter schema check           │
         │  6. ✓ Score new term (0-100)          │
         │  7. ✓ Post comment with results       │
         └───────────────┬───────────────────────┘
                         │
                    Pass │ Fail
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
    ┌──────────┐              ┌──────────────┐
    │  Merge   │              │  Fix Issues  │
    │  to main │              │  & Re-run CI │
    └────┬─────┘              └──────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│        POST-MERGE: update-landing-page.yml                 │
├────────────────────────────────────────────────────────────┤
│  Trigger: push to main (terms.yaml changes)                │
│                                                             │
│  Jobs:                                                      │
│  1. Generate landing page (docs/index.html)                │
│     └─ npm run generate:landing                            │
│  2. Validate landing page sync                             │
│     └─ npm run validate:landing                            │
│  3. Export terms bundle (if new slugs)                     │
│     └─ npm run export:new → docs/terms.json                │
│        • Metadata: version (SHA), timestamp, count         │
│        • Size limit: 2 MB                                  │
│  4. Deploy to GitHub Pages                                 │
│     └─ Uploads docs/ artifact                              │
│     └─ Deploys to luminlynx.github.io/FOSS-Glossary       │
└────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT COMPLETE                       │
├─────────────────────────────────────────────────────────────┤
│  ✓ Landing Page: https://luminlynx.github.io/FOSS-Glossary │
│  ✓ Terms API: .../terms.json (cache: 1yr, immutable)       │
│  ✓ PWA: .../pwa/ (offline support)                         │
└─────────────────────────────────────────────────────────────┘
```

### Other Automated Workflows

- **readme-stats.yml** - Updates README statistics (terms count, contributors)
- **issue-task-pr.yml** - Automates issue → task branch → PR creation
- **pr-comment.yml** - Validates PRs and provides scoring for all contributors
- **pr-welcome.yml** - Welcomes new contributors

📚 **[Detailed Pipeline Documentation](./docs/workflows/documentation.md)** | 🔧 **[Operations Runbook](./.github/RUNBOOK.md)**

---

<!-- STATS-START -->

## 📊 Glossary Stats

**Total Terms:** 28 | **Contributors:** 5 | **Terms with Humor:** 28 (100%)

**🏆 Current Champion:** `License Proliferation` with ~98/100 points!

**Recent additions:** `Zombie Dependencies`, `YOLO Deploy`, `Yak Shaving`

### 🎮 Top Contributors

🥇 copilot-swe-agent[bot] | 🥈 John Portley | 🥉 Joao Portela | 🌟 Aditya Kumar Singh | 🌟 Joe Port

<!-- STATS-END -->

## 🎮 How to Contribute

1. Fork this repo
2. Add your term to `terms.yaml`
3. Submit a PR
4. Get your quality score (try to beat 80/100!)
5. Earn achievements! 🏆

## 📊 Scoring System

Every term is scored out of 100 points:

- **Base Definition**: 20 points
- **Humor**: Up to 30 points (be funny!)
- **Explanation**: 20 points
- **Cross-references**: Up to 20 points
- **Tags**: 10 points

## 🏆 Achievements

- **😂 Comedy Gold** - Write humor over 100 characters
- **💯 Perfectionist** - Score 90+ points
- **🔥 Flame Warrior** - Document controversial topics
- **📜 Historian** - Add historical context

## Example Term

```yaml
- slug: git
  term: 'Git'
  definition: "A distributed version control system that lets teams branch, merge, and rewind project history so collaboration happens without overwriting each other's work."
  explanation: 'Git snapshots every commit locally, syncs through remotes, and helps keep parallel experiments manageable when they eventually converge.'
  humor: 'Like a time machine for code that mostly works—until you run `git push --force` and become the office supervillain.'
  tags: ['vcs', 'tools', 'collaboration']
  see_also: ['GitHub', 'GitLab', 'Mercurial']
  aliases: ['git-scm', 'version-control']
  controversy_level: 'medium'
```

## 🌐 [Visit our Documentation](https://luminlynx.github.io/FOSS-Glossary/)

Check out our beautiful docs site with scoring explanation and examples!
