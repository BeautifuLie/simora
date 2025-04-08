# === Paths ===

FRONTEND_DIR := frontend
GO := go
WAILS := wails

# === Frontend ===

install:
	cd $(FRONTEND_DIR) && npm ci

frontend-lint:
	cd $(FRONTEND_DIR) && npm run lint

frontend-format:
	cd $(FRONTEND_DIR) && npx prettier --check .

frontend-build:
	cd $(FRONTEND_DIR) && npm run build

frontend-check: frontend-lint frontend-format

# === Backend ===

go-tidy:
	@echo "🔍 Checking go.mod tidy..."
	@original=$$(cat go.sum); \
	$(GO) mod tidy; \
	new=$$(cat go.sum); \
	if [ "$$original" != "$$new" ]; then \
		echo "❌ go.mod or go.sum is not tidy. Run 'go mod tidy'."; \
		exit 1; \
	else \
		echo "✅ go.mod tidy check passed."; \
	fi

go-test: frontend-build
	$(GO) test ./...

go-lint:
	@if ! command -v golangci-lint >/dev/null 2>&1; then \
		echo "⚠️ golangci-lint not found. Skipping Go lint."; \
	else \
		golangci-lint run ./...; \
	fi

go-check: go-tidy go-lint go-test

# === Project ===

dev:
	$(WAILS) dev

build:
	$(WAILS) build

# === CI Entry Point ===

all: install frontend-check frontend-build go-check

clean:
	rm -rf build bin $(FRONTEND_DIR)/dist

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Frontend:"
	@echo "  install           Install frontend deps"
	@echo "  frontend-lint     Lint frontend"
	@echo "  frontend-format   Format check"
	@echo "  frontend-build    Build frontend"
	@echo "  frontend-check    Lint + format"
	@echo ""
	@echo "Go:"
	@echo "  go-tidy           Check go.mod/sum"
	@echo "  go-test           Run Go tests"
	@echo "  go-lint           Run Go linter"
	@echo "  go-check          All Go checks"
	@echo ""
	@echo "Project:"
	@echo "  dev               Run in dev mode"
	@echo "  build             Build project"
	@echo "  all               CI entry point"
	@echo "  clean             Remove artifacts"
