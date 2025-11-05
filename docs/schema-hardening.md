# Schema Hardening & Type Safety

This document describes the schema validation, TypeScript type generation, and YAML formatting rules implemented in PR #2.

## Overview

The FOSS Glossary now enforces strict schema validation with the following features:

1. **Kebab-case tag enforcement** - All tags must be lowercase with hyphens
2. **TypeScript type generation** - Automatic generation of types from schema.json
3. **YAML sorting** - Alphabetical term sorting and consistent key ordering
4. **CI validation** - Automated checks for schema compliance and formatting

## Schema Rules

### Tag Format

Tags **must** follow kebab-case pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`

**Valid tags:**

- `foss`
- `open-source`
- `pull-requests`
- `gpl-license`
- `code-review`

**Invalid tags:**

- `FOSS` (uppercase)
- `Open Source` (spaces, mixed case)
- `pull_requests` (underscores)
- `GPL` (uppercase)

### Slug Format

Slugs must also follow kebab-case pattern and be between 3-48 characters:

**Valid slugs:**

- `yak-shaving`
- `rtfm`
- `bus-factor`

**Invalid slugs:**

- `Yak-Shaving` (uppercase)
- `yak_shaving` (underscores)
- `-yak-shaving` (leading hyphen)
- `yak-shaving-` (trailing hyphen)
- `ab` (too short, minimum 3 chars)

## TypeScript Types

TypeScript types are automatically generated from `schema.json` to provide type safety for tooling.

### Location

Generated types are stored in `types/terms.d.ts`

### Interface

```typescript
export interface FOSSGlossaryTerms {
  redirects?: {
    [k: string]: string;
  };
  terms: {
    slug: string;
    term: string;
    definition: string;
    explanation?: string;
    humor?: string;
    see_also?: string[];
    tags?: string[];
    aliases?: string[];
    controversy_level?: 'low' | 'medium' | 'high';
  }[];
}
```

### Usage

```typescript
import { FOSSGlossaryTerms } from './types/terms';

const data: FOSSGlossaryTerms = {
  terms: [
    {
      slug: 'rtfm',
      term: 'RTFM',
      definition: 'Read The F***ing Manual...',
      tags: ['documentation', 'support']
    }
  ]
};
```

### Generating Types

```bash
# Generate types from schema
npm run generate:types

# Validate types are up to date
npm run validate:types
```

## YAML Sorting

To ensure stable diffs and consistent formatting, `terms.yaml` is automatically sorted:

### Term Order

Terms are sorted **alphabetically by slug**

### Key Order

Within each term, keys appear in this order:

1. `slug`
2. `term`
3. `definition`
4. `explanation`
5. `humor`
6. `see_also`
7. `tags`
8. `aliases`
9. `controversy_level`

### Sorting Script

```bash
# Sort terms.yaml
npm run sort:yaml
```

This script:

- Sorts terms array by slug
- Arranges keys in canonical order
- Sorts redirects alphabetically
- Maintains consistent YAML formatting

## Tag Fixing

If you have tags in the wrong format, use the fix script:

```bash
# Convert tags to kebab-case
npm run fix:tags
```

This script:

- Converts tags to lowercase
- Replaces spaces and underscores with hyphens
- Trims leading/trailing whitespace and hyphens

## CI Validation

The PR workflow validates:

1. ✅ Schema compliance (AJV validation)
2. ✅ TypeScript types are up to date
3. ✅ YAML is properly sorted
4. ✅ Tags match kebab-case pattern
5. ✅ Slugs are valid and immutable
6. ✅ No duplicate terms or slugs

### CI Workflow Steps

```yaml
- name: Validate terms.yaml
- name: Check TypeScript types are up to date
- name: Check YAML is sorted
- name: Dry-run exporter schema check
- name: Score latest term
```

If any validation fails, the PR is blocked until fixed.

## Benefits

### For Contributors

- **Clear validation errors** - Know exactly what needs to be fixed
- **Consistent formatting** - No merge conflicts from formatting differences
- **Type safety** - Use TypeScript types when building tools

### For Maintainers

- **Stable diffs** - Easy to review changes
- **Automatic validation** - Reduce manual review time
- **Schema evolution** - Types auto-update when schema changes

### For the Project

- **Data quality** - Enforce consistent tag naming
- **Searchability** - Standardized tags improve filtering
- **Maintainability** - Consistent structure reduces bugs
- **Documentation** - Types serve as living documentation

## Migration Guide

### Existing Contributors

If you have a PR open before these changes:

1. Pull the latest changes from main
2. Run `npm run fix:tags` to fix tag formatting
3. Run `npm run sort:yaml` to sort your changes
4. Commit and push the formatting fixes

### Schema Changes

If you modify `schema.json`:

1. Update the schema
2. Run `npm run generate:types` to regenerate types
3. Commit both `schema.json` and `types/terms.d.ts`
4. Update tests if validation rules changed

## Troubleshooting

### "TypeScript types are out of sync"

```bash
npm run generate:types
git add types/terms.d.ts
git commit -m "Update TypeScript types"
```

### "YAML is not sorted"

```bash
npm run sort:yaml
git add terms.yaml
git commit -m "Sort terms.yaml"
```

### "Tags must match pattern"

```bash
npm run fix:tags
npm run validate
git add terms.yaml
git commit -m "Fix tag formatting"
```

### "Slug immutability violation"

You cannot change a slug once merged. Instead, use redirects:

```yaml
redirects:
  old-slug: new-slug

terms:
  - slug: new-slug
    term: "New Term Name"
    # ...
```

## Related Documentation

- [Contributing Guide](../CONTRIBUTING.md)
- [Slug Policy](slug-policy.md)
- [Schema Specification](../schema.json)
- [Workflow Documentation](WORKFLOW_DOCUMENTATION.md)
