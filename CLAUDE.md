# Simora — Instructions for Claude

## Workflow

Work through the backlog in `.claude/ROADMAP.md` top to bottom, one item at a time, without asking for confirmation between items unless something is genuinely ambiguous.

### Per feature

1. `git checkout main && git pull`
2. `git checkout -b feat/<slug>`
3. Implement the feature
4. `make all` — must pass before committing
5. Commit (single commit per feature, no `Co-Authored-By` line)
6. Push branch
7. Create PR using the `pr-description` agent for the body; English only, no mention of Claude Code
8. `gh pr merge <number> --merge --auto` — GitHub merges automatically once CI passes
9. Update `CHANGELOG.md` on the branch before pushing (add to `## [Unreleased] → ### Added`)
10. After merge, `git checkout main && git pull`, then start the next item

### Commit messages

- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`
- `Co-Authored-By` add only on a complex tasks
- Single sentence, imperative mood

### Tags / releases

- Do NOT create tags automatically — the owner decides when to tag
- Tags follow SemVer: bug-fix-only batches → patch (`0.1.x`), new features → minor (`0.2.0`)
- When owner tags, the GitHub Actions release workflow runs automatically

### Checks

- `make all` runs: ESLint, Prettier, TypeScript build, Go lint, Go tests
- All must pass before every commit

### CHANGELOG format

```markdown
## [Unreleased]

### Added
- Short description of new feature

### Fixed
- Short description of bug fix

### Changed
- Short description of non-breaking change
```

Move `[Unreleased]` content to a versioned section (e.g. `[v0.2.0] - YYYY-MM-DD`) only when the owner tags a release.

## Repository layout

```text
simora/
  main.go              # Wails entry, var Version injected via ldflags
  app.go               # Wails App struct, GetVersion() binding
  backend/
    domain/            # Pure domain types
    service/           # Business logic (org, project, collection, request, grpc, sqs)
    storage/           # BoltDB persistence
    transport/         # HTTP, gRPC, Kafka, SQS transport implementations
  frontend/
    src/
      app/             # App root, ErrorBoundary
      components/
        layout/        # Sidebar, TabBar, CollectionsHome, SettingsPanel, etc.
        request/       # RequestPanel, GrpcPanel, KafkaPanel, SqsPanel
        response/      # ResponsePanel
        ui/            # Shared UI primitives
      lib/             # Utilities, importParsers
      store/           # Zustand store (app.ts) — single source of truth
    wailsjs/           # Auto-generated Wails bindings (do not edit by hand)
  .claude/
    ROADMAP.md         # Backlog (gitignored)
    helpers.md         # Dev notes (gitignored)
```

## Key conventions

- State lives exclusively in `frontend/src/store/app.ts` (Zustand)
- All Go→TS IPC goes through `frontend/wailsjs/` bindings
- Styles use CSS variables (`var(--bg-1)`, `var(--accent)`, etc.) — no hardcoded colours except for one-off utility (e.g. `#f59e0b` for warning amber)
- Tailwind utility classes for layout, CSS variables for theming
- `crypto.randomUUID()` for all new IDs
- `make all` = `deps + lint + format-check + ts-build + go-lint + go-test`
