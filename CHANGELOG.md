# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `Cmd/Ctrl+D` keyboard shortcut to duplicate the active tab
- `Cmd/Ctrl+F` keyboard shortcut to open search in the response body panel
- Export collection as Insomnia v4 JSON (in addition to existing Postman v2.1 export)

## [v0.1.1] - 2026-03-24

### Fixed

- HTTP requests now respect the Wails application context and are cancelled on shutdown
- Nested `setTimeout` callbacks in WelcomeScreen now guard against component unmount
- Test worker Promise no longer resolves twice on timeout/message race
- Header map passed to `ExecuteRequest` is no longer mutated by body processing
- URL highlight in request editor now encodes `"` to prevent broken markup
- Kafka error channel drain no longer blocks indefinitely on partition close
- Recursive folder operations now have a depth limit of 100 to prevent stack overflow
- Version in status bar is now loaded dynamically instead of being hardcoded
- GraphQL responses with a top-level `errors` array now show a warning banner
- `parseCollection` now returns a typed `{ data, error }` result instead of `null`
- Active sidebar org/project/collection IDs are now reset when the entity is deleted
- gRPC reflection now caps file descriptors at 100 and resolves cross-file imports correctly
- Settings load failure is now shown as a warning banner in Settings → About
- Data load failure is now shown as an error banner in the sidebar

### Changed

- `ErrorBoundary` extracted to `components/ui/ErrorBoundary.tsx` and reused across the app
- gRPC, Kafka, and SQS panels each have their own `ErrorBoundary` so a crash in one does not
  affect the others

## [v0.1.0] - 2026-03-24

### Added

- **HTTP** — all methods, query params, headers, body (JSON / form / binary), auth (Bearer, Basic, API Key, OAuth2)
- **gRPC** — server reflection, method discovery, unary request/response
- **Kafka** — produce and consume messages (JSON, Avro, plain text), SASL authentication
- **SQS** — send and receive messages
- **Collections** — organize requests in workspaces → projects → collections → folders
- **Environments** — variable substitution with `{{variable}}` syntax, per-workspace
- **Import** — Postman v2.1 and Insomnia v4/v5 (JSON and YAML)
- **Test runner** — JS assertions per-request, run automatically after send
- **Response transform** — filter fields, export as JSON / CSV / YAML
- **Themes** — dark and light mode, 5 background presets each, custom color picker, accent color
- **Command palette** — `Cmd/Ctrl+K` to navigate and run actions
- **Keyboard shortcuts** — `Cmd/Ctrl+T` new tab, `Cmd/Ctrl+E` environments, `Cmd/Ctrl+,` settings
