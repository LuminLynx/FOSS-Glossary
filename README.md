# 🚀 FOSS Glossary

A community-driven glossary of FOSS terms with humor, sarcasm, and honest truths about open source culture.


📄 Deployment details for the exported glossary live in [docs/terms-json-deploy.md](docs/terms-json-deploy.md).






<!-- STATS-START -->
## 📊 Glossary Stats

**Total Terms:** 28 | **Contributors:** 1 | **Terms with Humor:** 28 (100%)

**🏆 Current Champion:** `License Proliferation` with ~98/100 points!

**Recent additions:** `PEBKAC`, `Pullpocalypse`, `Commitfog`

### 🎮 Top Contributors
🥇 John Portley
<!-- STATS-END -->

## 🎮 How to Contribute

1. Fork this repo
2. Add your term to `terms.yaml`
3. Submit a PR
4. Get your quality score (try to beat 80/100!)
5. Earn achievements! 🏆

## 📊 Scoring System

Every term is scored out of 100 points:
- **Base Definition**: 20 points (requires both `term` and `definition` fields)
- **Humor**: Up to 30 points (1 point per 5 characters, be funny!)
- **Explanation**: 20 points (requires `explanation` field with length > 20 characters)
- **Cross-references**: Up to 20 points (5 points per `see_also` reference, max 4 refs)
- **Tags**: Up to 10 points (3 points per tag, max ~3 tags for full points)

### Detailed Scoring Formula

The scoring algorithm is implemented in [`scripts/scoring.js`](scripts/scoring.js) and used consistently across all scripts:

```javascript
Base Score       = 20 (if term.term && term.definition exist)
Humor Score      = min(30, floor(humor.length / 5))
Explanation Score = 20 (if explanation exists && explanation.length > 20)
Tags Score       = min(10, tags.length × 3)
Cross-refs Score = min(20, see_also.length × 5)
Total Score      = min(100, sum of all components)
```

**Pro tip:** To maximize your score:
- Write humor of at least 150 characters (max 30 points)
- Add a detailed explanation (20+ characters for full 20 points)
- Include at least 4 cross-references (5 × 4 = 20 points)
- Add at least 4 tags (3 × 4 = 12, capped at 10 points)

## 🏆 Achievements

- **😂 Comedy Gold** - Write humor over 100 characters
- **💯 Perfectionist** - Score 90+ points
- **🔥 Flame Warrior** - Document controversial topics
- **📜 Historian** - Add historical context

## Example Term
```yaml
terms:
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

## 🌐 [Visit our Landing Page](https://luminlynx.github.io/FOSS-Glossary/)

Check out our beautiful docs site with scoring explanation and examples!

## 📚 Data Contracts

- [`terms.json` export specification](docs/terms-json-spec.md)
- [Slug policy](docs/slug-policy.md)
