GO ?= $(shell command -v go 2>/dev/null || echo $(HOME)/tools/go/bin/go)
BIN := pokai

.PHONY: run test build vet fmt clean

run:
	$(GO) run ./cmd/pokai

test: vet
	$(GO) test ./...

vet:
	$(GO) vet ./...

build:
	$(GO) build -o $(BIN) ./cmd/pokai

fmt:
	gofmt -w .

clean:
	rm -f $(BIN)
