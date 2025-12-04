# AI Implementation Roadmap

This document summarizes the AI implementation ideas discussed for the FOSS Glossary project, organized by priority and status.

## Implemented/In-Progress

### AI Term Drafter

**Status:** PR Created

A CLI tool (`npm run draft`) using GitHub Models to generate new glossary terms instantly. This tool streamlines the contribution process by providing AI-assisted term drafting capabilities.

## Maintenance & Quality (Short Term)

### Smart Linking Assistant

A maintenance script (`scripts/groomLinks.js`) that uses AI to scan all terms and suggest missing `see_also` connections. This ensures the glossary remains tightly interconnected as it scales.

**Key Features:**

- Scans existing terms for relationship opportunities
- Suggests cross-references based on semantic similarity
- Helps maintain glossary cohesion at scale

## Innovation & Growth (Medium/Long Term)

### The "Living" Repository (Trend Watcher)

A scheduled GitHub Action that scans industry trends (e.g., GitHub Trending, Hacker News) for new FOSS slang and automatically opens PRs with drafted definitions.

**Key Features:**

- Automated trend monitoring
- Draft term generation from trending topics
- PR-based contribution workflow

### The "FOSS Dojo" (Interactive Challenges)

An extension that adds AI-generated code challenges for terms (e.g., "Fix this Race Condition"). Implemented via a parallel `challenges/` directory to preserve the strict `terms.yaml` schema.

**Key Features:**

- Interactive learning experiences
- Term-specific coding challenges
- Separate structure to maintain schema integrity

## Discarded/Deprioritized

### AI Reviewer

**Decision:** Deprioritized

Redundant; existing scripts (`validateTerms.js`, `quickScore.js`) and linters handle validation effectively.

### Adaptive Personas

**Decision:** Deprioritized

Too complex for the current static architecture; risks bloating data or exposing API keys.
