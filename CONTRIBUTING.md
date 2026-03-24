# Contributing to Simora

Thanks for taking the time to contribute! Below are the guidelines to keep things consistent.

---

## Platform Prerequisites

### macOS

```bash
# Xcode command-line tools
xcode-select --install
# Dependencies via Homebrew
brew install go node
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Linux (Debian/Ubuntu)

```bash
sudo apt install golang nodejs npm libgtk-3-dev libwebkit2gtk-4.0-dev
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Windows

Install [Go](https://go.dev/dl/), [Node.js](https://nodejs.org/), and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 11), then:

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

---

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. Install frontend dependencies:
    ```bash
    make deps
    ```
3. Start the app in dev mode:
    ```bash
    wails dev
    ```

### Build a production binary

```bash
wails build
# Output: build/bin/simora  (build\bin\simora.exe on Windows)
```

---

## Making Changes

- **Open an issue first** for any non-trivial change (new feature, protocol support, breaking refactor). This avoids duplicated effort.
- Keep PRs focused — one logical change per PR.
- Follow existing code style. Backend is Go, formatted with `gofumpt` and linted with `golangci-lint`. Frontend is TypeScript with ESLint + Prettier.

### Branch naming

```
feat/<short-description>     # new feature
fix/<short-description>      # bug fix
chore/<short-description>    # tooling, CI, deps
```

---

## Before Submitting a PR

Run the full check suite — it must pass with zero errors:

```bash
make all
```

This runs:

- Frontend lint (`eslint`) and format check (`prettier`)
- `go mod tidy` verification
- `golangci-lint`
- Go tests with `-race`

Make sure:

- New logic in `backend/service/` or `backend/storage/` has a corresponding test.
- New frontend utilities in `src/lib/` or `src/store/` have tests.
- No new `//nolint` directives without a comment explaining why.

> `backend/transport/` (Kafka, gRPC, SQS adapters) currently has no unit tests due to the need for live infrastructure. Integration tests for these are tracked in [#issues](../../issues).

---

## Project Layout

| Path                       | What lives here                               |
| -------------------------- | --------------------------------------------- |
| `backend/domain/`          | Core types shared across layers               |
| `backend/service/`         | Business logic, bound to Wails                |
| `backend/storage/`         | JSON file persistence                         |
| `backend/transport/`       | Protocol adapters (Kafka, gRPC, SQS)          |
| `frontend/src/store/`      | Zustand store and all TypeScript types        |
| `frontend/src/components/` | UI components by feature area                 |
| `frontend/src/lib/`        | Pure utilities (parsers, formatters, presets) |

---

## Reporting Bugs

Open a [GitHub Issue](../../issues) with:

- OS and version
- Steps to reproduce
- Expected vs actual behaviour
- Logs if available (Wails dev console or `wails dev` output)

---

## License

By contributing you agree that your changes will be licensed under the [MIT License](./LICENSE).
