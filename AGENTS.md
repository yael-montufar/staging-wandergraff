# Project Custom Instructions

This document outlines custom guidelines and conventions for development on this project. These apply to all contributors, including AI assistants.

---

## Git Commit Checkpoints & Message Format

### When to Commit

Commit at logical checkpoints after completing meaningful units of work:

- ✅ After implementing a complete feature or user story
- ✅ After fixing a bug with tests/verification
- ✅ After significant refactoring with tests passing
- ✅ After updating configuration or dependencies (with brief explanation)
- ✅ After creating or updating documentation
- ✅ Before attempting major architectural changes

### Commit Message Format

Follow conventional commit formatting with strict structure:

```
<type>(<scope>): <subject>
<blank line>
<body>
```

**Rules:**
1. **Header line:** Maximum 50 characters total
   - Format: `<type>(<scope>): <subject>`
   - Keep concise and imperative (e.g., "Add", "Fix", "Remove" not "Added", "Fixed", "Removed")

2. **Blank line:** Required separator between header and body

3. **Body:** Optional but recommended
   - Explain *what* changed and *why*, not *how* (code shows how)
   - Wrap at ~72 characters
   - Use bullet points for multiple changes
   - Reference any related issues or decisions

### Types

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring without feature changes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `test` - Adding/updating tests
- `chore` - Maintenance, dependencies, build scripts
- `remove` - Removing features or code

### Scope

The area of the codebase affected:
- `auth` - Authentication and authorization
- `upload` - Photo upload functionality
- `artwork` - Artwork registration and management
- `ui` - UI components and styling
- `db` - Database schema and migrations
- `config` - Configuration files and environment setup
- `docs` - Documentation (DECISIONS.md, README, etc.)

### Examples

**Good commits:**

```
feat(artwork): Add photo upload to pinned murals

- Create /artwork/upload route with artworkId requirement
- Remove EXIF data extraction (no longer needed)
- Simplify flow: select → preview → upload
- Add privacy toggle for photos
```

```
fix(auth): Resolve user creation in callback

Foreign key constraints were violated because users
weren't being created in local DB during OAuth callback.
Implemented client-side API call to /api/auth/create-user
via Prisma upsert pattern.
```

```
docs: Update DECISIONS.md with EXIF removal rationale

Added section explaining why EXIF extraction was removed
and "pin first, upload later" workflow decision.
```

```
refactor(upload): Simplify photo upload component

Removed multi-step review flow, EXIF state management,
and artwork creation logic. Photos now only attach to
existing artwork via artworkId query parameter.
```

---

## Decisions Living Document (DECISIONS.md)

### Purpose
Maintain a living record of architectural, feature, and technical decisions made during development. This serves as:
- Onboarding reference for new developers
- Rationale documentation for design choices
- Change tracking for feature evolution
- Context preservation across chat sessions

### When to Update

Update `DECISIONS.md` when:

- ✅ Making a significant architectural decision
- ✅ Removing or substantially changing a feature
- ✅ Changing terminology or user-facing language
- ✅ Resolving a major issue with lessons learned
- ✅ Adding new setup instructions or configuration
- ✅ Discovering trade-offs in existing implementations

### Update Format

For each decision entry:

```markdown
### Decision: [Clear Title]
**Date:** [When decision was made]  
**Status:** [✅ Implemented / 🔄 In Progress / 📋 Proposed]

**Reasoning:**
- Why this decision was made
- What problems it solves
- What alternatives were considered

**Trade-offs:**
- What we gain
- What we lose or accept

**Implementation Details:**
- How it's implemented
- Key files involved
- Code patterns or examples

**Related Decisions:**
- Links to connected decisions
```

### Example Entry

```markdown
### Decision: Use Local Docker PostgreSQL for Development
**Date:** Early development phase  
**Status:** ✅ Implemented

**Reasoning:**
- Full control and transparency over database schema
- Faster iteration without cloud latency
- Cost efficiency (no cloud database fees)
- Better for team collaboration with Docker Compose

**Trade-offs:**
- More complex local setup (Docker required)
- Need to manage local ↔ Supabase user sync

**Implementation Details:**
- Docker Compose runs PostgreSQL on localhost
- Prisma schema defines all models locally
- Supabase handles OAuth only
- See docker-compose.yml and devcontainer.json

**Related Decisions:**
- Decision: "Cloud Supabase OAuth Integration"
```

### Document Structure

Maintain these sections in DECISIONS.md:

1. **Architecture & Infrastructure** - Database, hosting, external services
2. **Feature Decisions** - What to build/remove, feature scope
3. **Technical Choices** - Language, frameworks, patterns
4. **UX & Terminology** - User-facing language, interaction patterns
5. **Development Setup** - Local environment, tools, commands
6. **Current Status** - What's implemented vs planned
7. **Known Issues & Resolutions** - Problems and their fixes
8. **Future Considerations** - Potential improvements, growth path
9. **Document History** - Version tracking of this document itself

### Document Maintenance

- Update the document history table with each significant change
- Keep decisions concise but complete (150-300 words per decision)
- Link related decisions together
- Mark status clearly (Implemented, In Progress, Proposed, Deprecated)
- Date all entries for historical context
- Review quarterly for accuracy and relevance

---

## AI Assistant Guidelines

When working with this project, AI assistants should:

### Code Changes
1. Review existing code style and patterns before making changes
2. Follow the conventions defined in this file and DECISIONS.md
3. Add meaningful comments only for non-obvious logic
4. Avoid placeholder code or incomplete implementations
5. Test changes before completing a task

### Commits
1. Suggest commit checkpoints after completing meaningful work
2. Provide properly formatted commit messages (50 char header + body)
3. Group related changes into logical commits
4. Explain *why* changes were made, not just *what* was changed

### Documentation
1. Update DECISIONS.md when making architectural or feature changes
2. Add context about trade-offs and reasoning
3. Keep README and other docs in sync with code changes
4. Note any setup or configuration changes needed

### Communication
1. Ask clarifying questions if requirements are ambiguous
2. Explain trade-offs and alternatives considered
3. Reference this document when applying guidelines
4. Suggest documentation updates alongside code changes

---

## Project Standards Summary

| Aspect | Standard |
|--------|----------|
| **Commit Header** | Max 50 characters, imperative mood |
| **Commit Body** | Wrap at 72 chars, explain *why* |
| **Decisions Doc** | Update on major changes, maintain history |
| **Code Style** | Follow existing patterns in codebase |
| **Dependencies** | Avoid adding unless necessary, document rationale |
| **Testing** | Verify changes work before completing |
| **Documentation** | Keep in sync with code, update DECISIONS.md |

---

**Effective Date:** [Project Start]  
**Last Updated:** [Current Session]  
**Review Frequency:** When major decisions are made or quarterly
