package service

import (
	"context"
	"fmt"
	"time"

	"simora/backend/transport"
)

const grpcServiceTimeout = 35 * time.Second // dial + reflect + invoke

// GrpcService exposes gRPC invocation to Wails.
type GrpcService struct {
	appCtx *ContextHolder
}

func NewGrpcService(appCtx *ContextHolder) *GrpcService { return &GrpcService{appCtx: appCtx} }

// Invoke performs a unary gRPC call using server reflection.
func (s *GrpcService) Invoke(req transport.GrpcRequest) (string, error) {
	ctx, cancel := context.WithTimeout(s.appCtx.Get(), grpcServiceTimeout)
	defer cancel()

	result, err := transport.GrpcInvoke(ctx, req)
	if err != nil {
		return "", fmt.Errorf("grpc invoke: %w", err)
	}

	return result, nil
}

// ListServices returns all service names exposed by the server via reflection.
func (s *GrpcService) ListServices(server string, useTLS bool) ([]string, error) {
	ctx, cancel := context.WithTimeout(s.appCtx.Get(), grpcServiceTimeout)
	defer cancel()

	services, err := transport.GrpcListServices(ctx, server, useTLS)
	if err != nil {
		return nil, fmt.Errorf("list services: %w", err)
	}

	return services, nil
}

// ListMethods returns all method names for a given service via reflection.
func (s *GrpcService) ListMethods(server, serviceName string, useTLS bool) ([]string, error) {
	ctx, cancel := context.WithTimeout(s.appCtx.Get(), grpcServiceTimeout)
	defer cancel()

	methods, err := transport.GrpcListMethods(ctx, server, serviceName, useTLS)
	if err != nil {
		return nil, fmt.Errorf("list methods: %w", err)
	}

	return methods, nil
}

// DescribeService fetches the full descriptor tree for a service via reflection.
// Returns a JSON string containing the service name, all methods, and their
// input/output message fields.
func (s *GrpcService) DescribeService(server, serviceName string, useTLS bool) (string, error) {
	ctx, cancel := context.WithTimeout(s.appCtx.Get(), grpcServiceTimeout)
	defer cancel()

	desc, err := transport.GrpcDescribeService(ctx, server, serviceName, useTLS)
	if err != nil {
		return "", fmt.Errorf("describe service: %w", err)
	}

	return desc, nil
}
