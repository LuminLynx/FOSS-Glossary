# Prebuilt Index Strategy

## Overview

When `terms.json` exceeds the **2 MB size threshold**, the repository will block merges to prevent performance degradation for client-side applications. This document outlines the migration strategy to a **static prebuilt index** that enables efficient search and browsing without downloading the entire dataset.

## Why the 2 MB Limit?

The `terms.json` file is currently loaded entirely by client applications (landing page, PWA) for:

- Real-time search across all terms
- Filtering by tags and categories
- Cross-reference navigation

At **2 MB**, the payload remains:

- Fast to download on mobile networks (< 1s on 3G)
- Quick to parse in JavaScript (< 100ms)
- Efficient for in-memory search operations

Beyond this threshold, user experience degrades significantly, especially on mobile devices and slower connections.

## Current Size Enforcement

The export script (`scripts/exportTerms.js`) enforces the size limit:

```javascript
const SIZE_WARN_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB

function checkSizeLimit(serializedJson, options = {}) {
  const bytes = Buffer.byteLength(serializedJson, 'utf8');
  if (bytes > SIZE_WARN_THRESHOLD_BYTES) {
    throw new ExporterError('Export size exceeds 2 MB limit');
  }
}
```

When the limit is exceeded:

- **Pull requests will fail** validation in CI
- **Merges are blocked** until the issue is resolved
- **Error message** directs maintainers to this document

## Migration Path: Prebuilt Index

When the 2 MB threshold is crossed, follow this strategy:

### Phase 1: Split Data Files (Immediate)

Instead of a single `terms.json`, generate multiple optimized files:

```
docs/
├── index.json          # Lightweight index (< 500 KB)
│   ├── version
│   ├── terms_count
│   └── index: [{slug, term, tags, score}]
│
├── terms/              # Individual term files
│   ├── bus-factor.json
│   ├── yak-shaving.json
│   └── ...
│
└── search/             # Prebuilt search indices
    ├── by-tag.json     # Terms grouped by tag
    ├── by-slug.json    # Slug → filename mapping
    └── full-text.json  # Inverted index for search
```

**Benefits:**

- Landing page loads only `index.json` (< 500 KB)
- Full term details loaded on-demand
- Search can use optimized inverted indices
- Total data unchanged, delivery optimized

### Phase 2: Implement Lazy Loading

Update client applications to:

1. **Initial load:** Fetch `index.json` only
2. **Browse view:** Display term cards from index (slug, title, tags)
3. **Detail view:** Fetch individual `terms/{slug}.json` when user clicks
4. **Search:** Use prebuilt `search/full-text.json` index

Example flow:

```javascript
// 1. Load index on page load
const index = await fetch('/terms.json'); // Now < 500 KB

// 2. Display list of terms
renderTermList(index.terms);

// 3. Load full term on click
async function showTerm(slug) {
  const term = await fetch(`/terms/${slug}.json`);
  renderTermDetail(term);
}
```

### Phase 3: Add Search Index

Generate a prebuilt inverted index for full-text search:

```json
{
  "version": "abc123",
  "index": {
    "git": ["git", "github", "gitlab"],
    "version": ["git", "semantic-versioning"],
    "control": ["git", "version-control"],
    ...
  },
  "metadata": {
    "terms_count": 1500,
    "index_size": "450 KB"
  }
}
```

**Search implementation:**

1. Load `search/full-text.json` (once, cached)
2. Tokenize user query
3. Lookup tokens in inverted index → get matching slugs
4. Fetch matching term cards from `index.json`
5. Rank and display results

### Phase 4: CDN & Caching (Optional)

For further optimization:

- Serve individual term files via CDN (GitHub Pages already does this)
- Set aggressive cache headers (immutable, versioned URLs)
- Generate compressed `.br` or `.gz` versions at build time

## Implementation Checklist

When the 2 MB threshold is reached:

- [ ] **Update `scripts/exportTerms.js`:**
  - Generate `index.json` (lightweight term list)
  - Generate individual `terms/{slug}.json` files
  - Generate search indices in `search/`
- [ ] **Update landing page (`docs/index.html`):**
  - Fetch `index.json` instead of `terms.json`
  - Implement lazy loading for term details
  - Update search to use prebuilt index
- [ ] **Update PWA (`docs/pwa/`):**
  - Modify service worker to cache index separately
  - Implement on-demand term loading
  - Prefetch popular terms for offline use
- [ ] **Update documentation:**
  - `docs/terms-json-spec.md` → document new structure
  - `README.md` → update API endpoints
  - `CONTRIBUTING.md` → explain new export process
- [ ] **Update tests:**
  - Test index generation
  - Test lazy loading in integration tests
  - Verify search index correctness
- [ ] **Performance validation:**
  - Measure initial page load (should be < 2s on 3G)
  - Measure time-to-interactive
  - Test offline functionality in PWA

## Estimated Timeline

- **Phase 1 (Data Split):** ~2-3 days
- **Phase 2 (Lazy Loading):** ~3-4 days
- **Phase 3 (Search Index):** ~2-3 days
- **Phase 4 (CDN/Caching):** ~1-2 days (optional)

**Total:** ~1-2 weeks for full implementation

## Alternative Strategies (Not Recommended)

### ❌ Increase the Size Limit

**Why not:** Degrades performance without solving the underlying problem. At 5 MB or 10 MB, the glossary becomes unusable on mobile networks.

### ❌ Pagination Only

**Why not:** Breaks full-text search unless paired with a backend API. Defeats the purpose of a static site.

### ❌ Remove Content

**Why not:** The glossary's value grows with more terms. Removing content contradicts the project's mission.

## Related Documentation

- [Terms JSON Specification](./terms-json-spec.md)
- [Landing Page Maintenance](./landing-page-maintenance.md)
- [PWA Architecture](./pwa/README.md)

## Questions?

For implementation questions or strategy discussion, open an issue labeled `documentation` and tag `@LuminLynx`.

---

**Last Updated:** 2025-10-31  
**Owner:** Data & Frontend Team
