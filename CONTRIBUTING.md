# Contributing to FOSS Glossary

First off, **thank you!** 🎉 We're excited to have you contribute to making FOSS terminology more accessible and fun.

## 🌟 Hall of Fame

### First Contributors

- **@Axestein** - Pioneer! Added [It's a Feature, LGTM] - Our very first community contribution! 🎉

First off, **thank you!** 🎉 We're excited to have you contribute...

## 🎮 How It Works

When you add a term to our glossary, you'll receive:

- **Instant validation** (within 30 seconds)
- **Quality score** out of 100 points
- **Achievement badges** for exceptional contributions
- **Recognition** in the community

## 📝 How to Add a Term

### Step 1: Fork the Repository

Click the "Fork" button at the top right of this page.

### Step 2: Add Your Term to `terms.yaml`

Open `terms.yaml` and add your term following this structure:

```yaml
- term: 'Your Term'
  definition: 'A clear, concise definition'
  explanation: 'Optional: More context about when/why this term is used'
  humor: 'Optional: A funny take, sarcastic comment, or honest truth'
  tags: ['category1', 'category2']
  see_also: ['Related Term 1', 'Related Term 2']
```

### Step 3: Understanding the Scoring System

Your contribution will be scored out of **100 points**:

- **Base** (20 points): Include `term` and `definition` (required)
- **Humor** (30 points): Add a funny, sarcastic, or brutally honest take
- **Explanation** (20 points): Provide context about when/why the term is used
- **Cross-references** (20 points): Link to related terms with `see_also`
- **Tags** (10 points): Categorize your term appropriately

**Score 90+ to become a legend!** 🏆

### Step 4: Submit Your Pull Request

1. Commit your changes with a descriptive message
2. Create a Pull Request on GitHub
3. Fill out the PR template
4. Wait for the bot to score your contribution!

## 🏆 Achievement Badges

You can unlock special badges:

- **😂 Comedy Gold** - Write humor over 100 characters
- **💯 Perfectionist** - Score 90+ points
- **🔥 Flame Warrior** - Document a controversial topic
- **📜 Historian** - Include historical context
- **🌱 First Contribution** - Your first merged PR

## ✅ Quality Guidelines

### Do ✅

- **Be accurate**: Verify your definition is correct
- **Be clear**: Write for someone new to FOSS
- **Be funny**: Humor makes learning fun (and scores points!)
- **Be respectful**: Keep it professional despite the sarcasm

### Don't ❌

- Copy definitions from other sources verbatim
- Add offensive or discriminatory content
- Create duplicate terms (search first!)
- Submit incomplete entries

## 📋 YAML Formatting Tips

Common mistakes to avoid:

```yaml
# ❌ Wrong - missing quotes around values with colons
definition: This is: a definition

# ✅ Correct
definition: "This is: a definition"

# ❌ Wrong - inconsistent indentation
- term: "Example"
definition: "Missing indent"

# ✅ Correct - 2 spaces for indentation
- term: "Example"
  definition: "Proper indent"

# ❌ Wrong - uppercase or mixed-case tags
tags: ['FOSS', 'GPL', 'Mixed Case']

# ✅ Correct - lowercase kebab-case tags
tags: ['foss', 'gpl', 'mixed-case']
```

### Tag Formatting Rules

Starting with PR #2, tags **must** use lowercase kebab-case format:

- ✅ Valid: `foss`, `open-source`, `pull-requests`, `gpl`
- ❌ Invalid: `FOSS`, `Open Source`, `pull_requests`, `GPL`

If you have tags that don't match this pattern, run:

```bash
npm run fix:tags
```

### YAML Sorting

To ensure stable diffs and consistent formatting, terms should be:

1. Sorted alphabetically by slug
2. Have keys in the proper order (slug, term, definition, explanation, humor, see_also, tags, aliases, controversy_level)

Before submitting your PR, run:

```bash
npm run sort:yaml
```

The CI will fail if your YAML is not properly sorted.

## 🐛 Found a Bug or Issue?

- **Typos or errors?** Submit a PR with fixes
- **Technical issues?** Open an issue with details
- **Feature ideas?** We'd love to hear them!

## 🤔 Need Help?

- Check existing terms for examples
- Review the README for project overview
- Open an issue if you're stuck

## 📜 Code of Conduct

Be excellent to each other:

- Be welcoming to newcomers
- Be patient with questions
- Be constructive with feedback
- Be respectful of different perspectives

See our full [Code of Conduct](CODE_OF_CONDUCT.md) for details.

## 🎯 What Happens After You Submit?

1. **Automated Validation** (~30 seconds) - Bot checks your YAML and calculates score
2. **Maintainer Review** (~1-3 days) - We check for accuracy
3. **Merge!** 🎉 - Your term goes live on the website

## 🚀 Local Development (Optional)

Test your changes before submitting:

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/FOSS-Glossary.git
cd FOSS-Glossary

# Install dependencies
npm install

# Validate your changes
npm run validate

# Check your score
npm run score

# Fix tag formatting (if needed)
npm run fix:tags

# Sort YAML (required before PR)
npm run sort:yaml

# Generate TypeScript types (if schema changed)
npm run generate:types

# Validate TypeScript types are up to date
npm run validate:types
```

### Available Scripts

- `npm run validate` - Validate terms.yaml against schema
- `npm run validate:types` - Check if TypeScript types are up to date
- `npm run validate:landing` - Validate landing page
- `npm run generate:types` - Generate TypeScript types from schema
- `npm run generate:landing` - Generate landing page HTML
- `npm run sort:yaml` - Sort terms.yaml alphabetically
- `npm run fix:tags` - Convert tags to kebab-case format
- `npm run score` - Score the latest term
- `npm test` - Run all validation and tests

## 📚 Governance & Policies

### Slug Immutability

Once a term is merged, its slug (URL identifier) is **permanent**. This ensures:

- External links don't break
- Bookmarks continue to work
- Search engines maintain proper references

See [docs/slug-policy.md](docs/slug-policy.md) for slug formatting rules.

### Redirects

If a term needs to be renamed or merged, use the `redirects` mapping instead of changing the slug:

```yaml
terms:
  - slug: new-term-name
    term: 'New Term'
    definition: '...'

redirects:
  old-term-name: new-term-name
```

### Deletion Policy

Terms should rarely be deleted. Before removing a term, consider:

- Using redirects to merge with another term
- Editing to improve quality
- Marking as deprecated in the explanation

See [docs/deletion-policy.md](docs/deletion-policy.md) for complete guidance.

### Repository Organization

To maintain a clean and professional repository structure:

- **Avoid placing files in the root directory to prevent clutter**
- Configuration files belong in the `config/` directory
- Documentation files belong in the `docs/` directory
- Template files belong in the `templates/` directory
- Only essential project files should remain in the root:
  - Core documentation (README, CONTRIBUTING, CODE_OF_CONDUCT, CHANGELOG, LICENSE)
  - Essential project files (package.json, terms.yaml)
  - IDE/system configuration files (.editorconfig, .gitignore)

This organization ensures the repository remains easy to navigate and maintain.

## 💡 Pro Tips

1. Check for duplicates before adding
2. Start simple - your first contribution doesn't need 100 points
3. Read existing terms to get the style
4. Iterate - you can always improve later
5. Have fun! This project is meant to be enjoyable

## 🙏 Thank You!

Every contribution makes the FOSS community more accessible. Whether it's your first term or your fiftieth, we appreciate you!

---

**Questions?** Open an issue or reach out to maintainers.

**Ready to contribute?** Head to [terms.yaml](terms.yaml) and add your term!
