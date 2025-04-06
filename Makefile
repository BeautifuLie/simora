# === Paths ===

FRONTEND_DIR := frontend
BACKEND_DIR  := backend
GO           := go
WAILS        := wails

# === Frontend ===

install:
	cd $(FRONTEND_DIR) && npm install

frontend-lint:
	cd $(FRONTEND_DIR) && npm run lint

frontend-test:
	@if [ -z "$$(find frontend/src -name '*.test.ts' -o -name '*.spec.ts')" ]; then \
		echo "No frontend test files found, skipping Vitest"; \
	else \
		cd frontend && npm run test; \
	fi


frontend-format:
	cd $(FRONTEND_DIR) && npx prettier --check .

frontend-build:
	cd $(FRONTEND_DIR) && npm run build

frontend-check: frontend-lint frontend-format frontend-test

# === Backend ===

go-lint:
	@echo "🔍 Checking go.mod tidy..."
	original_content=$$(cat go.sum); \
	$(GO) mod tidy; \
	new_content=$$(cat go.sum); \
	if [ "$$original_content" != "$$new_content" ]; then \
		echo "❌ go.mod or go.sum is not tidy. Run 'go mod tidy'."; \
		exit 1; \
	fi
	@echo "✅ go.mod tidy check passed"
	@echo "🧹 Running golangci-lint..."
	golangci-lint run ./...

go-test:
	$(GO) test ./...

go-build:
	$(GO) build ./...

# === Project ===

dev:
	$(WAILS) dev

build:
	$(WAILS) build

check: frontend-check

lint-all: frontend-lint go-lint

all: install frontend-check go-lint go-test

clean:
	rm -rf build bin $(FRONTEND_DIR)/dist

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Frontend:"
	@echo "  install           Install frontend deps"
	@echo "  frontend-lint     Lint frontend code"
	@echo "  frontend-format   Prettier check"
	@echo "  frontend-test     Run frontend tests"
	@echo "  frontend-build    Build frontend"
	@echo "  frontend-check    All frontend checks"
	@echo ""
	@echo "Go:"
	@echo "  go-lint           Lint Go code"
	@echo "  go-test           Run Go tests"
	@echo "  go-build          Build Go backend"
	@echo ""
	@echo "Project:"
	@echo "  dev               Run dev mode (wails dev)"
	@echo "  build             Full build (Wails)"
	@echo "  all               install + checks + tests"
	@echo "  lint-all          Lint frontend + backend"
	@echo "  clean             Remove build artifacts"
