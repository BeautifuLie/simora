# === Paths ===

FRONTEND_DIR := frontend
GO := go
WAILS := wails
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

# === Frontend ===

deps:
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

go-test:
	$(GO) test -race -count=1 ./...

.SILENT:go-lint
go-lint: ## lint Go code
	original_content=$$(cat go.sum); \
    go mod tidy; \
    new_content=$$(cat go.sum); \
    if [ "$$original_content" != "$$new_content" ]; then \
        echo "Please tidy the modules with go mod tidy"; \
        exit 1; \
    fi

	golangci-lint run

go-lint.fix: ## auto-fix lint issues (formatting, tidy, etc.)
	go mod tidy
	golangci-lint run --fix ./...

go-check: go-tidy go-lint go-test

# === Project ===

dev:
	$(WAILS) dev

build: deps
	$(WAILS) build -ldflags "-X main.Version=$(VERSION)"

install: build
	sudo cp build/bin/simora /usr/local/bin/simora

# === CI Entry Point ===

all: deps frontend-check frontend-build go-check

clean:
	rm -rf build bin $(FRONTEND_DIR)/dist

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Frontend:"
	@echo "  deps              Install frontend deps"
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
	@echo "  install           Build and install to /usr/local/bin"
	@echo "  all               CI entry point"
	@echo "  clean             Remove artifacts"
