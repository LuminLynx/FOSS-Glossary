# 🚀 FOSS Glossary
[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue)](https://luminlynx.github.io/FOSS-Glossary/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple)](https://luminlynx.github.io/FOSS-Glossary/pwa/)
[![Terms Count](https://img.shields.io/badge/Terms-28-orange)](./terms.yaml)
[![Docs](https://img.shields.io/badge/docs-passing-brightgreen)](https://luminlynx.github.io/FOSS-Glossary/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/LuminLynx/FOSS-Glossary/blob/main/CONTRIBUTING.md)
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
- 📋 **[Terms Data (JSON API)](https://luminlynx.github.io/FOSS-Glossary/terms.json)** — Developer-friendly JSON endpoint
- 🤖 **[AGENTS.md](./AGENTS.md)** — Automation playbook (100% compliant)
- 📊 **[GitHub Actions](https://github.com/LuminLynx/FOSS-Glossary/actions)** — CI/CD status & workflows
- 🔧 **[RUNBOOK.md](./RUNBOOK.md)** — Troubleshooting & rollback procedures for maintainers

---

<!-- STATS-START -->
## 📊 Glossary Stats

**Total Terms:** 28 | **Contributors:** 4 | **Terms with Humor:** 28 (100%)

**🏆 Current Champion:** `License Proliferation` with ~98/100 points!

**Recent additions:** `PEBKAC`, `Pullpocalypse`, `Commitfog`

### 🎮 Top Contributors
🥇 John Portley | 🥈 Joao Portela | 🥉 Aditya Kumar Singh | 🌟 Joe Port
<!-- STATS-END -->

---

## 🔄 CI/CD Pipeline

Our automated pipeline ensures quality and consistency for every contribution:

### Pull Request Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Contributor submits PR                       │
│                      (modifies terms.yaml)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   pr-complete.yml (CI)       │
              ├──────────────────────────────┤
              │  ✓ Schema validation         │
              │  ✓ Duplicate detection       │
              │  ✓ Export dry-run            │
              │  ✓ Score calculation         │
              │  ✓ Comment on PR             │
              └──────────────┬───────────────┘
                             │
                             ▼
                    ✅ Ready for Review
                             │
                             ▼
                    👤 Maintainer Approval
                             │
                             ▼
                      Merge to main
```

### Deployment Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                       Merged to main                             │
│                    (terms.yaml updated)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ update-landing-page.yml      │
              ├──────────────────────────────┤
              │  1. Generate HTML            │
              │  2. Validate sync            │
              │  3. Export terms.json        │
              │     (if new terms)           │
              │  4. Upload artifact          │
              │  5. Deploy to Pages          │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   GitHub Pages (Live Site)   │
              ├──────────────────────────────┤
              │  📖 Landing Page             │
              │  📱 PWA App                  │
              │  📋 terms.json API           │
              └──────────────────────────────┘
                             │
                             ▼
                    🎉 Live for users!
```

**Pipeline Features:**
- ⚡ Automated validation and scoring on every PR
- 🚀 Zero-downtime deployments to GitHub Pages
- 🔒 Schema enforcement prevents breaking changes
- 📊 Automatic statistics updates
- 🎯 Smart exports (only when new terms added)

For troubleshooting failed workflows, see our **[Operations Runbook](./RUNBOOK.md)**.

---

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
  term: "Git"
  definition: "A distributed version control system that lets teams branch, merge, and rewind project history so collaboration happens without overwriting each other's work."
  explanation: "Git snapshots every commit locally, syncs through remotes, and helps keep parallel experiments manageable when they eventually converge."
  humor: "Like a time machine for code that mostly works—until you run `git push --force` and become the office supervillain."
  tags: ["vcs", "tools", "collaboration"]
  see_also: ["GitHub", "GitLab", "Mercurial"]
  aliases: ["git-scm", "version-control"]
  controversy_level: "medium"
```

## 🌐 [Visit our Documentation](https://luminlynx.github.io/FOSS-Glossary/)

Check out our beautiful docs site with scoring explanation and examples!
