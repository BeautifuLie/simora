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

go-check: go-tidy go-lint test.backend

# === Tests — Backend ===

test.backend: ## unit tests, plain go test — used by CI via make all
	$(GO) test -race -count=1 -skip Integration ./...

test.backend.unit: ## unit tests with gotestsum + junit report (local)
	@mkdir -p test-reports
	gotestsum --junitfile test-reports/junit.xml -- -timeout 1m -count=1 -coverprofile=cp.out -race -skip Integration -v ./...

test.backend.integration.setup: ## start docker services for integration tests
	docker compose up -d
	@echo "waiting for kafka..."
	timeout 40s bash -c "until kcat -b localhost:9096 -L -J -X security.protocol=SASL_PLAINTEXT -X sasl.mechanism=SCRAM-SHA-512 -X sasl.username=kafkauser -X sasl.password=kafkapassword 2>/dev/null | jq -e -r '.brokers | length == 1' > /dev/null 2>&1; do sleep 2; done"
	@echo "dependencies started"

test.backend.integration.run: ## run backend integration tests (requires docker services)
	@mkdir -p test-reports
	gotestsum --junitfile test-reports/junit.xml -- -timeout 2m -count=1 -coverprofile=cp.out -failfast -race -run Integration -v ./...

test.backend.integration.teardown: ## stop and remove docker services
	docker compose down -v
	docker compose rm -s -f -v

test.backend.integration: test.backend.integration.setup test.backend.integration.run test.backend.integration.teardown ## run integration tests (docker up → run → docker down)

test.backend.all: ## run all backend tests (unit + integration, docker managed)
	@mkdir -p test-reports
	docker compose up -d
	@echo "waiting for kafka..."
	timeout 40s bash -c "until kcat -b localhost:9096 -L -J -X security.protocol=SASL_PLAINTEXT -X sasl.mechanism=SCRAM-SHA-512 -X sasl.username=kafkauser -X sasl.password=kafkapassword 2>/dev/null | jq -e -r '.brokers | length == 1' > /dev/null 2>&1; do sleep 2; done"
	gotestsum --junitfile test-reports/junit.xml -- -timeout 3m -count=1 -coverprofile=cp.out -race -v ./... ; \
	docker compose down -v ; \
	docker compose rm -s -f -v

# === QA environment ===

qa.up: ## start QA services (httpbin, grpc-echo, kafka, localstack, ws-echo)
	docker compose -f docker-compose.qa.yml up -d
	@echo "waiting for Kafka..."
	@timeout 60s bash -c "until docker compose -f docker-compose.qa.yml exec -T kafka kafka-topics.sh --bootstrap-server localhost:9092 --list >/dev/null 2>&1; do sleep 2; done"
	@echo "QA services are up."
	@echo "  HTTP:      http://localhost:8080"
	@echo "  gRPC:      localhost:50051"
	@echo "  Kafka:     localhost:9092"
	@echo "  SQS:       http://localhost:4566"
	@echo "  WebSocket: ws://localhost:8765"

qa.down: ## stop and remove QA services
	docker compose -f docker-compose.qa.yml down -v
	docker compose -f docker-compose.qa.yml rm -s -f -v

qa.status: ## show QA service status
	docker compose -f docker-compose.qa.yml ps

# === Project ===

dev:
	$(WAILS) dev

build: deps
	$(WAILS) build -ldflags "-X main.Version=$(VERSION)"

install: build
	sudo cp build/bin/simora /usr/local/bin/simora

# === CI Entry Point ===
# Runs: frontend deps, lint, format-check, TS build, Go lint, backend unit tests.
# Does NOT run integration tests — use test.backend.integration for that.

all: deps frontend-check frontend-build go-check

clean:
	rm -rf build bin $(FRONTEND_DIR)/dist

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Frontend:"
	@echo "  deps                           Install frontend deps"
	@echo "  frontend-lint                  Lint frontend"
	@echo "  frontend-format                Format check"
	@echo "  frontend-build                 Build frontend"
	@echo "  frontend-check                 Lint + format"
	@echo ""
	@echo "Go:"
	@echo "  go-tidy                        Check go.mod/sum"
	@echo "  go-lint                        Run Go linter"
	@echo "  go-lint.fix                    Auto-fix lint issues"
	@echo "  go-check                       Tidy + lint + unit tests"
	@echo ""
	@echo "Tests — Backend:"
	@echo "  test.backend.unit              Unit tests only (no docker)"
	@echo "  test.backend.integration       Integration tests (docker up → run → down)"
	@echo "  test.backend.integration.setup Start docker services"
	@echo "  test.backend.integration.run   Run integration tests (docker must be up)"
	@echo "  test.backend.integration.teardown Stop docker services"
	@echo "  test.backend.all               All backend tests (unit + integration)"
	@echo ""
	@echo "QA environment:"
	@echo "  qa.up                          Start QA docker services"
	@echo "  qa.down                        Stop and remove QA services"
	@echo "  qa.status                      Show QA service status"
	@echo ""
	@echo "Project:"
	@echo "  dev                            Run in dev mode"
	@echo "  build                          Build project"
	@echo "  install                        Build and install to /usr/local/bin"
	@echo "  all                            CI entry point (lint + build + unit tests)"
	@echo "  clean                          Remove artifacts"
