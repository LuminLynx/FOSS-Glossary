# Security Policy

This document outlines the security considerations and practices for the FOSS
Glossary project.

## Project Overview

FOSS Glossary is a community-driven glossary of open source terms. The project
consists of:

- **Data layer**: `terms.yaml` (validated against JSON schema)
- **Processing layer**: Node.js scripts for validation, scoring, and export
- **Presentation layer**: Static HTML landing page and JSON API deployed to
  GitHub Pages

## Security Considerations

### 1. GitHub Actions Workflows

Our CI/CD workflows are designed with security in mind:

**Fork PR Handling (`pr-comment.yml`)**

- Uses `pull_request_target` trigger to safely handle PRs from forks
- **Only fetches `terms.yaml` via GitHub API** — does not checkout or execute
  forked code
- Prevents code injection from untrusted contributors

**Permission Minimization**

- Workflows use minimal required permissions (e.g., `contents: read`,
  `pull-requests: write`)
- `GITHUB_TOKEN` is scoped appropriately per workflow
- Optional `COMMENT_TOKEN` secret for enhanced fork PR commenting

**Input Sanitization**

- Release workflow (`create-release.yml`) sanitizes tag inputs to prevent path
  traversal
- Tag format is validated against semantic versioning pattern

### 2. XSS Prevention

The landing page generator implements multiple layers of XSS protection:

- **Handlebars auto-escaping**: All content rendered via `{{variable}}` is
  automatically HTML-escaped
- **Client-side escaping**: The search engine uses `escapeHtml()` for
  dynamically loaded content
- **CSS isolation**: Styles are inlined and use triple-braces `{{{styles}}}`
  only for trusted CSS

### 3. Input Validation

All term contributions are validated:

- **JSON Schema validation** using AJV with strict mode
- **Slug pattern enforcement** (kebab-case, 3-48 characters)
- **Duplicate detection** (case-insensitive, punctuation-normalized)
- **Required field validation** (term, definition minimum length)

### 4. Dependency Management

We use standard npm packages with security considerations:

| Package         | Purpose            | Security Note                |
| --------------- | ------------------ | ---------------------------- |
| `ajv`           | Schema validation  | Well-maintained, widely used |
| `handlebars`    | Template rendering | Auto-escapes HTML by default |
| `js-yaml`       | YAML parsing       | Standard YAML parser         |
| `@octokit/rest` | GitHub API         | Official GitHub SDK          |

**Recommendations for contributors:**

- Run `npm audit` periodically to check for vulnerabilities
- Keep dependencies updated via `npm update`

### 5. File System Operations

Scripts perform limited file system operations:

- Reading: `terms.yaml`, `config/schema.json`, templates
- Writing: `docs/index.html`, `docs/terms.json`, `types/terms.d.ts`
- All paths are relative to the repository root
- No user-supplied paths are used in file operations

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not open a public issue** for security vulnerabilities
2. **Email the maintainers** directly (see repository owner's profile for
   contact)
3. **Include details**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial response**: Within 7 days
- **Status update**: Within 14 days
- **Fix deployment**: Depends on severity (critical: 24-48 hours, others: next
  release)

## Security Best Practices for Contributors

### When Adding Terms

- Do not include executable code in term definitions
- Avoid including URLs that could be used for phishing
- Do not include personal information or credentials

### When Modifying Scripts

- Never use `eval()` or similar dynamic code execution
- Sanitize all user inputs before processing
- Use parameterized queries/operations where applicable
- Validate file paths to prevent directory traversal

### When Working with Workflows

- Never log secrets or tokens
- Use environment variables for sensitive data
- Minimize workflow permissions to required scope
- Be cautious with `pull_request_target` — only process data, not code

## Supply Chain Security

### Protecting Against Supply Chain Attacks

- **Lock file integrity**: `package-lock.json` is committed and should be
  reviewed for unexpected changes
- **Minimal dependencies**: We keep dependencies to a minimum
- **CI verification**: All PRs run through validation before merge

### Workflow Security

- Workflows use pinned action versions (e.g., `actions/checkout@v4`)
- Third-party actions are limited and vetted
- Secrets are never exposed in workflow logs

## Scope

This security policy applies to:

- The FOSS Glossary repository (`LuminLynx/FOSS-Glossary`)
- The deployed GitHub Pages site
- All CI/CD automation workflows

Out of scope:

- Third-party services (GitHub, npm)
- User's local development environments
- Forked repositories

## Version Support

As a community glossary project, we maintain a single active branch (`main`).
Security updates are applied to the current version only.

| Version       | Status                              |
| ------------- | ----------------------------------- |
| `main`        | ✅ Supported                        |
| Tags/releases | Security fixes backported as needed |

---

_Last updated: November 2025_
