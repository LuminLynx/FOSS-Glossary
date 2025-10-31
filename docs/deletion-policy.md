# Term Deletion Policy

This document defines the policy and procedures for removing terms from the FOSS Glossary.

## Guiding Principle

**Terms should rarely be deleted.** Once a term is published and indexed, external systems, bookmarks, and documentation may reference it. Deletion breaks these references and degrades the user experience.

## When to Delete a Term

A term may be deleted only in the following circumstances:

1. **Duplicate Entry**: The term is an exact duplicate of another term (same definition, same content). In this case, use a redirect instead of deletion.

2. **Policy Violation**: The term violates the Code of Conduct, contains offensive content, or includes copyrighted material used without permission.

3. **Spam or Test Data**: The term was added as spam, a test entry, or placeholder that was accidentally merged.

4. **Legal Requirement**: Removal is required by law or valid DMCA takedown notice.

## Preferred Alternatives to Deletion

Before deleting a term, consider these alternatives:

### 1. Redirects (Preferred)

If a term needs to be merged with another or renamed:

- Add an entry to the `redirects` mapping in `terms.yaml`
- Map the old slug to the new/target slug
- Keep the target term active

Example:
```yaml
terms:
  - slug: continuous-integration
    term: "Continuous Integration"
    definition: "A practice where developers frequently merge code changes..."
    # ... rest of term definition

redirects:
  ci-cd: continuous-integration  # Old slug redirects to new one
  ci: continuous-integration     # Alternate slug also redirects
```

### 2. Edit and Improve

If a term has quality issues:
- Edit the definition to improve accuracy
- Add missing context or examples
- Update tags or cross-references
- Add a controversy level if appropriate

### 3. Mark as Deprecated (Not Implemented)

For obsolete but historically important terms:
- Keep the term but add a note about deprecation in the explanation
- Update the definition to indicate current status
- Add cross-references to replacement terms

## Deletion Procedure

If deletion is unavoidable, follow these steps:

### 1. Document the Reason

Open an issue explaining:
- Which term is being removed (slug and term name)
- Why deletion is necessary
- Why alternatives (redirects, edits) are insufficient
- Any impact analysis (broken links, references)

### 2. Maintainer Approval

- At least one maintainer must review and approve
- For controversial deletions, seek consensus from multiple maintainers
- Document the decision in the issue

### 3. Create a Redirect First (If Applicable)

If the term is being merged or has a replacement:
- Add a redirect entry mapping the old slug to the replacement
- Test the redirect in a PR before deletion
- Keep the redirect indefinitely

### 4. Submit Pull Request

- Remove the term from `terms.yaml`
- Keep any redirect entry in the `redirects` section
- Reference the approval issue in the PR description
- Add a clear commit message: `Remove term: [slug] - [reason]`

### 5. Update Documentation

After merge:
- Update any documentation that referenced the deleted term
- Add an entry to a changelog if maintained
- Notify affected contributors if appropriate

## Redirect Governance

Redirects are governed by these rules:

### Creating Redirects

- **Old slug must not exist** in the current terms list
- **Target slug must exist** in the current terms list
- Redirects are validated automatically during PR checks

### Redirect Format

```yaml
redirects:
  old-slug-1: current-target-slug
  old-slug-2: current-target-slug
  renamed-term: new-term-slug
```

### Redirect Permanence

- Redirects should be kept indefinitely
- Do not delete redirects without strong justification
- Old URLs with redirected slugs should continue to work

### Chaining Redirects

- Avoid redirect chains (A→B→C)
- Always redirect to the final target slug
- Update existing redirects if a target term is itself renamed

Example of fixing a chain:
```yaml
# Before (has a chain):
redirects:
  old-term: intermediate-term
  intermediate-term: final-term

# After (direct redirect):
redirects:
  old-term: final-term
  intermediate-term: final-term
```

## Validation

The validation script (`scripts/validateTerms.js`) enforces:

1. **No conflicts**: Redirect sources cannot match active term slugs
2. **Valid targets**: Redirect targets must exist in the terms list
3. **Schema compliance**: Redirects follow the slug format pattern

Example validation errors:

```
❌ Error: Validation failed

  - Redirect source 'existing-term' conflicts with an active term slug
  - Redirect target 'non-existent' does not exist in terms
```

## Examples

### Example 1: Merging Duplicate Terms

Two similar terms exist: `ci-cd` and `continuous-integration`. Merge them:

```yaml
terms:
  - slug: continuous-integration
    term: "Continuous Integration"
    definition: "A practice where developers frequently merge code..."
    aliases: ["CI", "CI/CD"]

redirects:
  ci-cd: continuous-integration
```

### Example 2: Renaming a Term

A term slug needs to change from `git-workflow` to `gitflow`:

```yaml
terms:
  - slug: gitflow
    term: "Gitflow"
    definition: "A branching model for Git..."

redirects:
  git-workflow: gitflow
```

### Example 3: Removing Policy Violation

A term contains offensive content and has no suitable replacement:

1. Open issue: "Remove term: offensive-term - Code of Conduct violation"
2. Get maintainer approval
3. Submit PR removing only the term (no redirect needed)
4. Commit message: `Remove term: offensive-term - CoC violation (#123)`

## Summary

- **Delete rarely**: Only for duplicates, violations, spam, or legal requirements
- **Prefer redirects**: When merging or renaming terms
- **Document everything**: Explain the reason and get approval
- **Keep redirects**: Maintain them indefinitely to avoid breaking links
- **Validate**: Automated checks ensure redirects are configured correctly

## Questions?

If you're unsure whether to delete a term or need guidance:
- Open an issue describing the situation
- Tag maintainers for review
- Consider alternatives first

Remember: **Deletion is permanent, but redirects preserve the user experience.**
