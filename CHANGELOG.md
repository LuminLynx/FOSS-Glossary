# CHANGELOG

## Version: v1.1.0

**Date:** 2025-11-16  
**Status:** Enhanced landing page with interactive features

### Added

- 🔍 **Real-Time Search**: Fuzzy search across term names, definitions, humor, and tags
- 🎯 **Advanced Filtering**: Filter by score range (90+, 80-89, etc.) and category tags
- 📊 **Dynamic Sorting**: Sort by date, score (high-to-low, low-to-high), or alphabetically
- ⭐ **Featured Term Spotlight**: Automatically displays the highest-scoring term
- 🎨 **Enhanced Animations**: 6 new CSS keyframes (slideUp, fadeInUp, fadeIn, slideInDown, scaleIn, bounce, shine)
- 📈 **Visual Score Indicators**: Color-coded progress bars showing term quality scores
- 💻 **Client-Side Engine**: ~5KB vanilla JavaScript with zero dependencies for search/filter/sort
- 📱 **Improved Responsive Design**: Enhanced mobile layout with optimized breakpoints (768px, 480px)
- 🎭 **Modern Visual Improvements**: Gradient backgrounds, glass-morphism effects, improved typography hierarchy
- 📍 **16-Term Display**: Expanded from 6 to 16 visible terms (all searchable via client-side engine)
- 🏷️ **Click-to-Filter Tags**: Select tags to instantly filter related terms
- 🔢 **Result Counter**: Real-time feedback showing matching terms
- ⌨️ **Keyboard Navigation**: Full keyboard support for search and filters
- 🎯 **Empty State Handling**: Friendly messages when no terms match filters

### Enhanced

- **Landing Page Generator** (`generateLandingPage.js`):
  - New `prepareFeaturedTermData()` function for featured term selection
  - Enhanced `prepareTermCardData()` with slug and sortDate fields
  - Expanded CSS from ~450 to ~1100+ lines with complete animation system
  - Improved data structure for client-side filtering

- **Landing Page Template** (`templates/landing-page.hbs`):
  - Embedded SearchEngine JavaScript object with 8+ methods
  - Embedded Animations JavaScript object with IntersectionObserver support
  - New hero section with animated statistics
  - New featured term spotlight section
  - New search/filter UI with controls and chips
  - Complete redesign with modern visual hierarchy

- **PR Validation Workflow** (`.github/workflows/pr-complete.yml`):
  - Added dedicated landing page validation step
  - Enhanced error reporting for landing page sync issues
  - Informational checks without blocking merge

- **Documentation** (`docs/landing-page/maintenance.md`):
  - Complete rewrite with search/filter feature documentation
  - Architecture explanation for client-side SearchEngine
  - Updated troubleshooting guide with new features
  - Mobile responsiveness testing instructions
  - Accessibility testing guidance

### Performance

- **Bundle Size**: Landing page HTML ~25KB (gzipped from ~1858 lines)
- **Search Performance**: Debounced at 150ms for optimal responsiveness
- **Dependencies**: Zero external dependencies (vanilla JavaScript)
- **Animations**: GPU-accelerated CSS animations with IntersectionObserver optimization

### Testing

- All 80+ existing test cases in `generateLandingPage.test.js` pass with enhancements
- XSS protection verified across all new dynamic content
- Responsive design tested on mobile (480px), tablet (768px), and desktop
- SearchEngine functionality verified in generated output

### Breaking Changes

- Landing page now requires JavaScript to be enabled (search/filter features)
- Generated HTML size increased from ~800 to ~1858 lines (all client-side, no server calls)

## Version: v1.0.0

**Date:** 2025-11-06  
**Compare:** First stable release

### Added

- ✨ Initial glossary with 28 curated FOSS terms
- 🎮 Gamified contribution system with 0-100 point scoring
- 🏆 Achievement badge system: Comedy Gold, Perfectionist, score tiers (70+, 80+, 90+)
- 📱 Progressive Web App (PWA) with offline support and installable capability
- 🌐 Live landing page at luminlynx.github.io/FOSS-Glossary
- 🔌 Developer API endpoint: `/terms.json` with metadata (version, timestamp, count)
- ✅ JSON Schema v7 validation with AJV library
- 🔍 Duplicate detection with case/punctuation-insensitive normalization
- 📊 Multi-dimensional scoring system:
  - Humor: up to 30 points
  - Explanation: 20 points
  - Cross-references: up to 20 points
  - Definition: 20 points (required)
  - Tags: up to 10 points
- 🤖 Automated PR validation workflow
- 💬 Instant PR comment feedback with scores and badges
- 📝 Contributor guidelines (CONTRIBUTING.md) with examples
- 🤝 Code of Conduct (CODE_OF_CONDUCT.md)
- 🤖 AGENTS.md automation playbook (100% compliance badge)
- 📚 Operations runbook (RUNBOOK.md) for troubleshooting
- 📈 Automated README stats updates with contributor leaderboard
- 🎨 Responsive landing page with dark/light theme toggle
- 🔧 Handlebars-based static site generation
- 🎯 SEO optimization with Open Graph and Twitter Card metadata
- 🔄 TypeScript type generation from JSON Schema
- ✨ YAML alphabetical sorting enforcement
- 📦 Export system with smart detection (only exports when new terms added)

### Scripts & Tools

- `validateTerms.js` - Schema validation with friendly error messages
- `quickScore.js` - Individual term scoring engine
- `scoring.js` - Core scoring logic and badge calculation
- `updateReadmeStats.js` - README statistics auto-updater
- `generateLandingPage.js` - Handlebars-based HTML generator
- `exportTerms.js` - Terms bundle exporter with `--only-if-new` flag
- `sortYaml.js` - Alphabetical term sorting utility
- `generateTypes.js` - TypeScript definition generator
- `fixTags.js` - Tag normalization utility
- `validateLandingPage.js` - Landing page sync validator

### CI / Infra

- 🔄 PR validation workflow (`pr-complete.yml`):
  1. Schema validation
  2. TypeScript types sync check
  3. YAML sorting verification
  4. Duplicate detection
  5. Export schema dry-run
  6. Term scoring and badge calculation
  7. Automated PR comment with results
- 🚀 Landing page deployment workflow (`update-landing-page.yml`):
  1. Regenerate landing page from template
  2. Validate landing page sync
  3. Export terms.json (conditional on new slugs)
  4. Deploy to GitHub Pages
- 📊 README stats update workflow (`readme-stats.yml`)
- 🔧 Issue task automation workflow (`issue-task-pr.yml`)
- 👋 New contributor welcome workflow (`pr-welcome.yml`)
- 💬 Fork PR comment workflow (`pr-comment.yml`)
- 🧹 Linting workflow (`lint.yml`) with Prettier, Markdownlint, CSpell

### Tests

- 269 comprehensive tests covering:
  - Validation edge cases (85 tests)
  - Scoring edge cases (68 tests)
  - Pipeline integration (45 tests)
  - Schema hardening (34 tests)
  - Landing page generation (37 tests)
- Test coverage: boundary conditions, Unicode handling, duplicate detection, invalid inputs
- Full pipeline integration testing (validation → scoring → export)
- 100% pass rate with ~10s execution time

### Docs

- README.md with live statistics and CI/CD pipeline diagram
- CONTRIBUTING.md with step-by-step contribution guide
- CODE_OF_CONDUCT.md with community standards
- AGENTS.md automation playbook for bot agents
- RUNBOOK.md operations and troubleshooting guide
- `/docs/WORKFLOW_DOCUMENTATION.md` - Complete CI/CD reference
- `/docs/WORKFLOW_CHANGELOG.md` - Workflow enhancement history
- `/docs/WORKFLOW_EXAMPLES.md` - Common workflow scenarios
- `/docs/TEST_COVERAGE_SUMMARY.md` - Test expansion summary
- `/docs/REPOSITORY_REVIEW.md` - Repository orientation guide
- `/docs/terms-json-spec.md` - Terms API specification
- `/docs/schema-hardening.md` - Schema evolution notes
- `/docs/slug-policy.md` - Slug naming guidelines
- `/docs/deletion-policy.md` - Term removal procedures
- `/docs/landing-page-maintenance.md` - Landing page update guide
- `/docs/pwa/README.md` - PWA installation and usage guide
- `PWA_TEST_CHECKLIST.md` - PWA testing procedures

### Frontend

- **Landing Page** (`/docs/index.html`):
  - Generated from Handlebars template
  - Responsive design (mobile-first)
  - Dark/light theme toggle
  - Term cards with scores and badges
  - SEO optimized meta tags
  - Fast loading, no heavy frameworks
- **PWA** (`/docs/pwa/`):
  - Full glossary interface
  - Offline support via service worker
  - Installable on all platforms (iOS/Android/Desktop)
  - Deep linking to specific terms
  - Favorites with localStorage persistence
  - Search functionality
  - Responsive styles
- **404 Page** (`/docs/404.html`) with helpful navigation

### Changed / Improved

N/A - Initial release

### Fixed

N/A - Initial release

### Breaking Changes

N/A - Initial release

### Schema Notes

- **Slug format**: `^[a-z0-9]+(?:-[a-z0-9]+)*$` (3-48 characters)
- **Definition length**: Minimum 80 characters (enforced)
- **Required fields**: `slug`, `term`, `definition`
- **Optional fields**: `explanation`, `humor`, `tags`, `see_also`, `aliases`, `controversy_level`
- **Controversy levels**: `low`, `medium`, `high`
- All rules documented and enforced consistently

### Known Limitations

- No versioning system implemented for terms (planned for future)
- Terms API (`terms.json`) has 2 MB size limit
- Service worker cache limited to browser capabilities
- No automated spell-checking for term content (manual review required)

---

## Thanks

🥇 copilot-swe-agent[bot]  
🥈 John Portley  
🥉 Joao Portela  
🌟 Aditya Kumar Singh  
🌟 Joe Port

Special mention: **@Axestein** for the first community contribution!

---

**Full release notes:** [RELEASE_NOTES_v1.0.0.md](./RELEASE_NOTES_v1.0.0.md)  
**Concise release body:** [RELEASE_BODY_v1.0.0.md](./RELEASE_BODY_v1.0.0.md)
