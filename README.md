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
- term: "Git"
  definition: "A distributed version control system"
  explanation: "Tracks changes in source code during software development"
  humor: "A tool that makes you feel like a time traveler, until you try to resolve a merge conflict and realize you're actually in hell"
  tags: ["vcs", "tools"]
  see_also: ["GitHub", "GitLab"]# Test change

## 🌐 [Visit our Documentation](https://luminlynx.github.io/FOSS-Glossary/)

 Check out our beautiful docs site with scoring explanation and examples!
