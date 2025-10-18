# 🚀 FOSS Glossary

A community-driven glossary of FOSS terms with humor, sarcasm, and honest truths about open source culture.






<!-- STATS-START -->
## 📊 Glossary Stats

**Total Terms:** 28 | **Contributors:** 4 | **Terms with Humor:** 28 (100%)

**🏆 Current Champion:** `License Proliferation` with ~98/100 points!

**Recent additions:** `PEBKAC`, `Pullpocalypse`, `Commitfog`

### 🎮 Top Contributors
🥇 John Portley | 🥈 Joao Portela | 🥉 Aditya Kumar Singh | 🌟 Joe Port
<!-- STATS-END -->

## 🎮 How to Contribute

1. Fork this repo
2. Add your term to `terms.yaml`
3. Submit a PR
4. Get your quality score (try to beat 80/100!)
5. Earn achievements! 🏆

## 🤖 Codex Issue Automation

Issues labeled `codex` and assigned to the bot account are acknowledged automatically:

1. Store the Fine-Grained PAT for `my-codex-bot` in a repository secret named `CODEX_FOSS_TOK`.
2. (Optional) Create a repository variable `CODEX_BOT_LOGIN` if you need to override the default bot login.
3. Assign the issue to `my-codex-bot` and apply the `codex` label. The workflow will comment as the bot and add the `in-progress` label when it picks up the task.

### After merging the automation

- Confirm the `CODEX_FOSS_TOK` secret exists. If it is missing, the workflow will fall back to the default `GITHUB_TOKEN` and note this in the run summary so you know to add the secret later.
- No other manual steps are required—the acknowledgement comment and progress label are applied automatically on the next qualifying issue.

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

## 🌐 [Visit our Landing Page](https://luminlynx.github.io/FOSS-Glossary/)

Check out our beautiful docs site with scoring explanation and examples!
