# === Paths ===

FRONTEND_DIR := frontend
GO := go
WAILS := wails
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

# === Frontend ===

frontend.deps:
	cd $(FRONTEND_DIR) && npm ci

frontend.lint:
	cd $(FRONTEND_DIR) && npm run lint

frontend.format:
	cd $(FRONTEND_DIR) && npx prettier --check .

frontend.build:
	cd $(FRONTEND_DIR) && npm run build

frontend.check: frontend.lint frontend.format

# === Backend ===

backend.tidy:
	@echo "Checking go.mod tidy..."
	@original=$$(cat go.sum); \
	$(GO) mod tidy; \
	new=$$(cat go.sum); \
	if [ "$$original" != "$$new" ]; then \
		echo "go.mod or go.sum is not tidy. Run 'go mod tidy'."; \
		exit 1; \
	else \
		echo "go.mod tidy check passed."; \
	fi

.SILENT:backend.lint
backend.lint:
	original_content=$$(cat go.sum); \
	go mod tidy; \
	new_content=$$(cat go.sum); \
	if [ "$$original_content" != "$$new_content" ]; then \
		echo "Please tidy the modules with go mod tidy"; \
		exit 1; \
	fi
	golangci-lint run

backend.lint.fix:
	go mod tidy
	golangci-lint run --fix ./...

backend.check: backend.tidy backend.lint test.backend

# === Tests — Backend ===

test.backend: ## unit tests, no docker (used by CI via make all)
	$(GO) test -race -count=1 -skip Integration ./...

test.backend.unit: ## unit tests with gotestsum + junit report
	@mkdir -p test-reports
	gotestsum --junitfile test-reports/junit.xml -- -timeout 1m -count=1 -coverprofile=cp.out -race -skip Integration -v ./...

test.backend.integration.setup:
	docker compose up -d
	@echo "waiting for kafka..."
	timeout 40s bash -c "until kcat -b localhost:9096 -L -J -X security.protocol=SASL_PLAINTEXT -X sasl.mechanism=SCRAM-SHA-512 -X sasl.username=kafkauser -X sasl.password=kafkapassword 2>/dev/null | jq -e -r '.brokers | length == 1' > /dev/null 2>&1; do sleep 2; done"
	@echo "dependencies started"

test.backend.integration.run:
	@mkdir -p test-reports
	gotestsum --junitfile test-reports/junit.xml -- -timeout 2m -count=1 -coverprofile=cp.out -failfast -race -run Integration -v ./...

test.backend.integration.teardown:
	docker compose down -v
	docker compose rm -s -f -v

test.backend.integration: test.backend.integration.setup test.backend.integration.run test.backend.integration.teardown

test.backend.all:
	@mkdir -p test-reports
	docker compose up -d
	@echo "waiting for kafka..."
	timeout 40s bash -c "until kcat -b localhost:9096 -L -J -X security.protocol=SASL_PLAINTEXT -X sasl.mechanism=SCRAM-SHA-512 -X sasl.username=kafkauser -X sasl.password=kafkapassword 2>/dev/null | jq -e -r '.brokers | length == 1' > /dev/null 2>&1; do sleep 2; done"
	gotestsum --junitfile test-reports/junit.xml -- -timeout 3m -count=1 -coverprofile=cp.out -race -v ./... ; \
	docker compose down -v ; \
	docker compose rm -s -f -v

# === Project ===

dev:
	$(WAILS) dev

build: frontend.deps
	$(WAILS) build -ldflags "-X main.Version=$(VERSION)"

install: build
	sudo cp build/bin/simora /usr/local/bin/simora

# === CI Entry Point ===
# Runs: frontend deps, lint, format-check, TS build, Go lint, backend unit tests.
# Does NOT run integration tests — use test.backend.integration for that.

all: frontend.deps frontend.check frontend.build backend.check

clean:
	rm -rf build bin $(FRONTEND_DIR)/dist

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Frontend:"
	@echo "  frontend.deps                  Install frontend deps"
	@echo "  frontend.lint                  Lint frontend"
	@echo "  frontend.format                Format check"
	@echo "  frontend.build                 Build frontend"
	@echo "  frontend.check                 Lint + format"
	@echo ""
	@echo "Backend:"
	@echo "  backend.tidy                   Check go.mod/sum"
	@echo "  backend.lint                   Run Go linter"
	@echo "  backend.lint.fix               Auto-fix lint issues"
	@echo "  backend.check                  Tidy + lint + unit tests"
	@echo ""
	@echo "Tests — Backend:"
	@echo "  test.backend                   Unit tests, no docker (CI)"
	@echo "  test.backend.unit              Unit tests with gotestsum + junit"
	@echo "  test.backend.integration       Integration tests (docker up → run → down)"
	@echo "  test.backend.integration.setup Start docker services"
	@echo "  test.backend.integration.run   Run integration tests"
	@echo "  test.backend.integration.teardown Stop docker services"
	@echo "  test.backend.all               All backend tests (unit + integration)"
	@echo ""
	@echo "Project:"
	@echo "  dev                            Run in dev mode"
	@echo "  build                          Build project"
	@echo "  install                        Build and install to /usr/local/bin"
	@echo "  all                            CI entry point"
	@echo "  clean                          Remove artifacts"
