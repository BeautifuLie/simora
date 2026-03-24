# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- gRPC server-streaming RPCs are now supported: all response messages are collected (up to 100) and returned as a JSON array; the status bar shows "N messages" instead of "200 OK"
- Confluent Schema Registry integration for Kafka: produce messages as Avro (JSON → Avro with wire-format header), auto-decode Avro messages on consume when a registry URL is configured

### Fixed

- Import parser now returns a specific hint for OpenAPI/Swagger, Postman v1, and HAR formats instead of a generic "unrecognised format" message
- Switching or closing a tab now syncs the sidebar org/project selection to match the newly active tab, preventing stale navigation after org or project deletion
- Deleting an org or project with multiple tabs open now keeps the sidebar navigation consistent with the new active tab
- gRPC server reflection now caps the number of returned services and methods (200 each) to prevent runaway memory growth from adversarial servers

### Added

- `Cmd/Ctrl+D` keyboard shortcut to duplicate the active tab
- `Cmd/Ctrl+F` keyboard shortcut to open search in the response body panel
- Export collection as Insomnia v4 JSON (in addition to existing Postman v2.1 export)
- Improved empty collections screen: Lucide icons instead of emoji, merged import cards into one, added keyboard shortcuts hints
- Drag-and-drop reordering of requests and folders in the sidebar with visual drop indicators
- HTTP cookie jar management panel in Settings: view all stored cookies, delete individual entries, or clear the entire jar
- SQS FIFO queue support: Message Group ID and Deduplication ID fields appear automatically when the queue URL ends with `.fifo`
- GraphQL schema introspection: "Schema" button runs an introspection query and shows available Query/Mutation/Subscription fields in a dedicated tab
- GraphQL variables panel validates JSON inline and shows parse errors
- GraphQL error formatting in the response panel now shows each error message individually
- Collection-level variables: per-collection key/value pairs that are substituted in requests, with lower priority than environment variables
- Duplicate folder: "Duplicate" context menu item for folders, with full recursive backend persistence
- Kafka consumer group support: when a Group ID is set, offsets are committed to Kafka enabling resumable consumption; configurable Max Messages field added to consume tab
- Request chaining: use `{{chain:RequestName.field}}` in any request field to reference the last response of a named request
- gRPC Schema tab: "Fetch Descriptor" button shows service methods with input/output message fields via server reflection
- Recent requests history: last 20 sent requests shown in Command Palette (⌘K) when search is empty

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
