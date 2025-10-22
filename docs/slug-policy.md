# Slug Policy

This policy defines how glossary slugs are generated, validated, and maintained. Slugs appear in `terms.yaml`, the exported `terms.json`, and any URLs or anchors that reference individual terms, so consistency and immutability are critical.

## Format and character set

- Lowercase ASCII letters (`a-z`) and digits (`0-9`).
- Words are separated by single hyphens (`-`).
- No leading or trailing hyphen; no consecutive hyphens.
- Length must be between 3 and 48 characters inclusive.
- The canonical regex is `^[a-z0-9]+(?:-[a-z0-9]+)*$` (enforced by [`schema.json`](../schema.json)).

## Derivation rules

1. Start from the canonical term title (e.g., `Bus Factor`).
2. Normalize whitespace to single spaces and trim leading/trailing spaces.
3. Convert to lowercase ASCII.
4. Replace any spaces or punctuation with hyphens.
5. Remove non-alphanumeric characters that cannot be expressed in ASCII (perform simple transliteration when practical, otherwise drop the character).
6. Collapse duplicate hyphens created by the previous steps and trim residual hyphens from either end.
7. Ensure the final slug satisfies the format rules above.

If normalization produces fewer than three characters, append a descriptive qualifier (for example, `ai` → `ai-term`). Avoid stop words that do not add disambiguation.

## Uniqueness and collisions

- Slugs must be unique across the entire glossary. The validator treats duplicates (case- and punctuation-insensitive) as errors.
- When a proposed slug already exists, append a concise qualifier that describes the scope (e.g., `git-workflow`, `git-commit`) rather than modifying the incumbent slug.
- If two terms would naturally share the same slug, coordinate with maintainers to identify a shared root plus differentiating suffixes.

## Immutability

- Once merged into `main`, a slug is considered permanent. Renaming slugs breaks URLs, cached exports, and historical references.
- Corrections require a follow-up migration plan, explicit maintainer approval, and updates to any downstream systems that reference the slug.

## Validation and enforcement

- `npm run validate` applies the schema pattern and duplicate checks.
- The exporter preserves the slug verbatim from `terms.yaml`; it never rewrites slugs.
- Reviewers should confirm that new slugs follow these rules before approving changes.

## Examples

| Term title | Derived slug | Notes |
| --- | --- | --- |
| `Bus Factor` | `bus-factor` | Simple space-to-hyphen conversion. |
| `RTFM!!!` | `rtfm` | Punctuation removed after normalization. |
| `CI/CD Pipeline` | `ci-cd-pipeline` | Slash replaced with hyphen; duplicates collapsed. |
| `AI` | `ai-term` | Qualifier added to satisfy minimum length. |
| `OAuth 2.0` | `oauth-2-0` | Numeric punctuation preserved as hyphen-separated tokens. |
