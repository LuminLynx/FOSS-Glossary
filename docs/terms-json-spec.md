# `terms.json` Export Specification

This document defines the contract for the `docs/terms.json` artifact consumed by the FOSS Glossary UI and downstream tools. The goal is to keep the payload stable, reproducible, and self-describing so that clients can safely cache and parse it without inferring behavior from implementation details.

## Overview

- **Source of truth:** [`terms.yaml`](../terms.yaml)
- **Exporter:** [`scripts/exportTerms.js`](../scripts/exportTerms.js)
- **Consumers:** Static docs site (`/docs`) and any external integrations relying on the glossary dataset.
- **Update cadence:** Emitted on pushes to `main` when at least one new slug is added (see `npm run export:new`).
- **Size limit:** **2 MB maximum**. Exports exceeding this threshold will fail. See [PREBUILT_INDEX_STRATEGY.md](./PREBUILT_INDEX_STRATEGY.md) for the migration path when the limit is reached.

## Top-level structure

`terms.json` is a UTF-8 encoded JSON document with the following required fields:

| Field | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `version` | `string` | ✅ | Short Git commit SHA of the export. Fallbacks to `unknown` only if Git metadata is unavailable. | `4f2c9ab` |
| `generated_at` | `string` | ✅ | ISO-8601 timestamp for when the export was created (UTC). | `2024-07-12T18:43:21.913Z` |
| `terms_count` | `number` | ✅ | Count of term objects present in `terms`. Must match `terms.length`. | `42` |
| `terms` | `array<object>` | ✅ | Array of term definitions (see below). Order mirrors `terms.yaml`. | `[{...}]` |

No additional top-level properties are emitted. Clients should treat unknown properties as forward-compatible extensions should they ever appear.

## Term objects

Each entry in `terms` maps 1:1 with the canonical record in `terms.yaml`. The schema follows [`schema.json`](../schema.json) and rejects additional properties. Field summaries:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `slug` | `string` | ✅ | Stable identifier. Must follow the [slug policy](./slug-policy.md) and match the regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Length: 3–48 characters. |
| `term` | `string` | ✅ | Human-readable label for the concept. Case-preserving. |
| `definition` | `string` | ✅ | Concise definition; minimum 80 characters. |
| `explanation` | `string` | optional | Deeper dive or story. Free-form text. |
| `humor` | `string` | optional | Sarcastic or humorous flavor text. |
| `tags` | `string[]` | optional | Zero or more categorical tags. Strings are lowercase kebab-case where possible. |
| `see_also` | `string[]` | optional | Related terms or cross-references. |
| `aliases` | `string[]` | optional | Alternate spellings or nicknames. Must be unique per term. |
| `controversy_level` | `"low" \| "medium" \| "high"` | optional | Qualitative heat check. |
| `updated_at` | `string` | optional | ISO-8601 timestamp for future updates. Not currently emitted but reserved for backwards-compatible evolution. |

All strings are UTF-8. Arrays are emitted empty (`[]`) when present with no values. `null` is never emitted—fields are either omitted or populated.

## Examples

The snippet below illustrates the full document layout. Only two terms are shown for brevity.

```json
{
  "version": "4f2c9ab",
  "generated_at": "2024-07-12T18:43:21.913Z",
  "terms_count": 2,
  "terms": [
    {
      "slug": "bus-factor",
      "term": "Bus Factor",
      "definition": "The number of team members that can be hit by a bus before a project fails, highlighting how fragile knowledge sharing becomes when only a few people hold critical context.",
      "explanation": "A metric that measures how many developers need to suddenly disappear before a project can no longer continue.",
      "humor": "Also known as the 'lottery factor' for optimists who prefer their team members winning millions over getting flattened.",
      "tags": ["project-management", "risk", "metrics"],
      "see_also": ["Single Point of Failure", "Documentation"],
      "controversy_level": "low"
    },
    {
      "slug": "yak-shaving",
      "term": "Yak Shaving",
      "definition": "Doing a series of seemingly unrelated tasks before you can do what you actually intended because each prerequisite reveals yet another detour.",
      "explanation": "You start trying to fix a bug, and somehow end up updating your entire OS.",
      "humor": "I came here to write code, and somehow I'm now learning about Tibetan yak grooming techniques.",
      "tags": ["productivity", "procrastination"],
      "see_also": ["PEBKAC"],
      "aliases": ["yak-stacking"]
    }
  ]
}
```

## Validation expectations

- `terms_count` must equal `terms.length`; exporters should fail fast if a mismatch occurs.
- Slug uniqueness, definition length, and duplicate alias checks are enforced upstream by the YAML validator (`npm run validate`).
- Consumers should defensively ignore unknown fields to remain forward-compatible with additive changes.

## Size constraints

The export is subject to a **hard 2 MB limit** to ensure performant client-side loading:

- **Current enforcement:** The exporter (`scripts/exportTerms.js`) throws an error if the serialized JSON exceeds 2,097,152 bytes (2 MB).
- **CI integration:** Pull requests that exceed this limit will fail validation and cannot be merged.
- **Rationale:** At 2 MB, the payload remains fast to download (< 1s on 3G) and quick to parse in JavaScript (< 100ms). Beyond this, user experience degrades significantly on mobile devices.
- **Migration path:** When the limit is reached, the repository will migrate to a **prebuilt index architecture** with lazy-loaded individual term files. See [PREBUILT_INDEX_STRATEGY.md](./PREBUILT_INDEX_STRATEGY.md) for the detailed implementation plan.

**Current size:** ~16 KB (28 terms) — well within the limit.

## Change management

Any modification to this spec must be documented in this file and referenced in the commit/PR message. Breaking changes require a major version bump of the public dataset and coordination with all downstream clients.
