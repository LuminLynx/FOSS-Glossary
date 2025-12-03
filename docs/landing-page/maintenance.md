# Landing Page Maintenance

## Overview

The landing page (`docs/index.html`) is a dynamic, interactive showcase of the FOSS Glossary with real-time search, filtering, and sorting capabilities. It displays terms from `terms.yaml` with beautiful animations, responsive design, and full desktop/mobile support.

**Important**: `docs/index.html` is a **generated file** created by `scripts/generateLandingPage.js`. It should never be edited manually. Always regenerate it using `npm run generate:landing` when making changes.

## Features

### Visual Enhancements (v1.1.0)

- **Smooth Animations**: Entrance animations for cards, staggered loading, smooth hover effects
- **Modern Design**: Gradient backgrounds, glass-morphism effects, improved typography hierarchy
- **Responsive Layout**: Fully responsive for mobile, tablet, and desktop with optimized breakpoints
- **Dark/Light Theme**: Auto-detects user system preferences using CSS media queries

### Interactive Features

- **Real-Time Search**: Fuzzy search across term names, definitions, and humor sections
- **Advanced Filtering**: Filter by score range (90+, 80-89, etc.) or category tags
- **Dynamic Sorting**: Sort by most recent, highest score, lowest score, or alphabetical
- **Featured Term**: Displays the highest-scoring term in a spotlight section
- **Tag Filtering**: Click any tag to instantly filter terms by that category
- **Result Counter**: Shows how many terms match current filters
- **Empty State**: Friendly message when no terms match filters

### What the Landing Page Displays

The landing page now includes:

- **Statistics Section**: Total terms, funny terms, humor rate, and category count (4 animated stat cards)
- **Latest Additions**: The 3 most recently added terms
- **Featured Term Spotlight**: The highest-scoring term with badge, definition, humor, and tags
- **Search & Filter Controls**: Real-time search input, score filters, sort options, tag chips
- **All Terms Grid**: 16 terms visible by default, searchable and filterable (all terms available client-side)
- **Scoring Explanation**: Visual breakdown of how terms are scored (5 scoring criteria)
- **Call-to-Action**: Links to GitHub, PWA glossary, and documentation hub

### Performance

- **~5KB JavaScript**: Vanilla JavaScript with no external dependencies
- **Client-Side Processing**: All search, filter, and sort operations run in the browser
- **No Page Reloads**: Instant results as you type or filter
- **Debounced Search**: 150ms debounce prevents excessive DOM updates
- **Lightweight CSS**: Comprehensive styling with optimized selectors
- **Page Size**: ~25KB HTML/CSS/JS (gzipped)

## How It Works

### Components

1. **Data Source**: `terms.yaml` - The canonical source of all glossary terms
2. **Generator Script**: `scripts/generateLandingPage.js` - Generates HTML from terms.yaml (includes enhanced data preparation)
3. **Template**: `templates/landing-page.hbs` - Handlebars template with search/filter UI and JavaScript
4. **Validation Script**: `scripts/validateLandingPage.js` - Ensures HTML is in sync with data
5. **Deployment Workflow**: `.github/workflows/update-landing-page.yml` - Auto-generates on changes

### Data Preparation

The generator now prepares:

- **16+ Terms**: All terms (or recent ones) ready for client-side filtering
- **Featured Term**: The highest-scoring term selected automatically
- **Score Indicators**: Visual progress bars and color-coded scores
- **Sort Dates**: ISO timestamps for sorting terms chronologically
- **Tag Metadata**: All tags extracted for filtering UI

### JavaScript Engine

The embedded `SearchEngine` object provides:

- **Search Algorithm**: Case-insensitive substring matching across term, definition, humor, and tags
- **Filter Logic**: Score range filtering (e.g., 90-100, 80-89)
- **Tag Filtering**: Click any tag to filter terms with that tag
- **Sort Options**:
  - `date-desc`: Most recent first (default)
  - `score-desc`: Highest score first
  - `score-asc`: Lowest score first
  - `alpha-asc`: Alphabetical (A-Z)
- **Filter Chips**: Display active filters as removable chips
- **Result Rendering**: Updates DOM visibility in real-time

## Automatic Updates

### When Changes Are Pushed to Main

The `update-landing-page.yml` workflow automatically runs when:

- `terms.yaml` is modified
- Landing page generator script is updated
- Template is updated
- Any file in `docs/` changes

**Workflow steps:**

1. Checks out the repository
2. Installs dependencies
3. Runs `generateLandingPage.js` to regenerate HTML with all features
4. Validates the HTML is in sync with `validateLandingPage.js`
5. Exports terms bundle if new terms were added
6. Deploys to GitHub Pages

### When PRs Are Created

The `pr-comment.yml` workflow includes:

- Validates terms.yaml schema and content
- Checks if landing page needs regeneration (informational)
- Scores new/modified terms
- Posts comment with validation results

## Prevention Measures

### 1. Automated Regeneration

- **Trigger**: Any push to `main` that modifies `terms.yaml`
- **Action**: Workflow automatically regenerates HTML and deploys
- **Verification**: Built-in validation ensures sync after generation

### 2. Validation Script

- **Script**: `scripts/validateLandingPage.js`
- **Usage**: `npm run validate:landing`
- **Checks**:
  - Total terms count matches between HTML and YAML
  - Latest additions are not stale test data
  - All required UI sections present (search, featured term, stats, etc.)
  - No broken internal links

### 3. NPM Scripts

```bash
# Generate landing page
npm run generate:landing

# Validate landing page is in sync
npm run validate:landing
```

### 4. CI/CD Integration

- Landing page validation runs after generation in deployment workflow
- Informational check in PR workflow warns if regeneration needed
- Prevents deployment of out-of-sync HTML

## Manual Regeneration

If you need to regenerate the landing page for local testing:

```bash
# Install dependencies (if not already installed)
npm ci

# Generate the landing page with all features
npm run generate:landing

# Validate it's in sync
npm run validate:landing
```

**Note**: After regenerating `docs/index.html`, commit it to the repository. The deployment workflow will also regenerate it when changes are pushed to main.

## Testing the Features

### Local Testing

```bash
# Generate the landing page
npm run generate:landing

# Open in browser (choose one)
open docs/index.html              # macOS
xdg-open docs/index.html          # Linux
start docs/index.html             # Windows
```

### Testing Search & Filters

1. Type in the search box to filter terms in real-time
2. Check score filter checkboxes to limit by score range
3. Click on any tag in a term card to filter by that category
4. Use the sort dropdown to change term order
5. Verify results update instantly without page reload

### Testing Responsive Design

- Use browser DevTools (F12) to test mobile/tablet breakpoints
- Test on actual mobile devices if available
- Verify filters are readable on mobile (stacked layout)
- Check that search input is large enough for touch

### Testing Accessibility

- Test keyboard navigation: Tab through filters and search input
- Test with screen reader (NVDA, JAWS, VoiceOver)
- Verify color contrast meets WCAG 2.1 AA standards
- Check that all interactive elements have proper ARIA labels

## Troubleshooting

### Landing Page Shows Old Data

**Symptoms:**

- Statistics show incorrect count
- Latest additions outdated
- Featured term incorrect

**Solution:**

```bash
npm run generate:landing
```

### Search/Filters Don't Work

**Check:**

1. Open browser console (F12) for JavaScript errors
2. Verify JavaScript is enabled in browser
3. Check that search input has focus
4. Ensure terms are visible in grid before filtering

**Verify:**

```bash
npm run validate:landing
```

### Performance Issues

**If page is slow:**

1. Clear browser cache (Ctrl+Shift+Delete)
2. Verify network tab shows reasonable load time (<1s)
3. Check browser console for JavaScript warnings
4. Limit number of terms displayed if needed

### Workflow Doesn't Run

**Check:**

1. Does the commit modify `terms.yaml` or trigger files?
2. Is the workflow enabled in repository settings?
3. Check GitHub Actions logs for errors
4. Verify workflow file syntax

## Architecture

### Data Flow (Enhanced)

```
terms.yaml (source)
    ↓
generateLandingPage.js (prepares data)
    ├── Selects 16 terms for display
    ├── Calculates featured term (highest score)
    ├── Extracts all tags for filtering
    └── Prepares sort dates
    ↓
templates/landing-page.hbs (template)
    ├── Renders UI with search/filter controls
    ├── Embeds SearchEngine JavaScript
    └── Includes animations & responsive CSS
    ↓
docs/index.html (output)
    ├── Static HTML with client-side interactivity
    └── All features work without server
    ↓
validateLandingPage.js (verification)
    ├── Checks term counts
    └── Validates UI integrity
    ↓
GitHub Pages (deployment)
```

### Template System

The generator uses Handlebars with:

- **Template**: `templates/landing-page.hbs` (enhanced with search UI & JS)
- **Data preparation**: `scripts/generateLandingPage.js` (includes featured term, tag extraction)
- **Auto-escaping**: HTML entities automatically escaped for XSS protection
- **Scoring**: Calculated via `scripts/scoring.js`
- **Animations**: CSS keyframes + JavaScript initialization

### Client-Side Architecture

```
HTML DOM (term cards with data attributes)
    ↓
SearchEngine.init()
    ├── Extract terms from DOM
    ├── Setup event listeners
    └── Initial render
    ↓
User Interaction
    ├── Type in search → debounced filter()
    ├── Check filter → filter() → render()
    ├── Click tag → toggle filter → render()
    ├── Change sort → sort() → render()
    ↓
DOM Updates
    └── Show/hide cards, update counter, show filters
```

## Best Practices

1. **Never edit `docs/index.html` directly** - It's generated and will be overwritten
2. **Always regenerate before committing** - Run `npm run generate:landing`
3. **Commit the generated file** - Required for GitHub Pages to serve it
4. **Test features before pushing** - Verify search, filters, and animations work
5. **Check mobile experience** - Use DevTools to test responsive design
6. **Trust the automation** - The workflow handles regeneration on merge

## Related Documentation

- [Landing Page Enhancement Roadmap](./ENHANCEMENT_ROADMAP.md) - Design decisions and implementation details
- [Workflow Documentation](./workflows/documentation.md) - General workflow information
- [Terms JSON Deployment](./technical/terms-json-deploy.md) - How terms.json is exported
- [Terms JSON Spec](./technical/terms-json-spec.md) - Structure of the exported JSON

## Version History

- **v1.1.0** (Nov 2025): Added search, filtering, sorting, featured term, animations, improved responsive design
- **v1.0.0** (Nov 2025): Initial release with basic display
