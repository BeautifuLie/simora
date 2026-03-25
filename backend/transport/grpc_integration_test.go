package transport_test

import (
	"context"
	"encoding/json"
	"net"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
	"simora/backend/transport"
)

// startGrpcServer starts a local gRPC server with the health-check service and
// server reflection registered, and returns the "host:port" address.
// The server is stopped when the test ends.
func startGrpcServer(t *testing.T) string {
	t.Helper()

	lis, err := (&net.ListenConfig{}).Listen(context.Background(), "tcp", "127.0.0.1:0")
	require.NoError(t, err)

	srv := grpc.NewServer()
	grpc_health_v1.RegisterHealthServer(srv, health.NewServer())
	reflection.Register(srv)

	t.Cleanup(func() { srv.Stop() })

	go func() { _ = srv.Serve(lis) }()

	return lis.Addr().String()
}

func TestGrpc_ListServices_Integration(t *testing.T) {
	addr := startGrpcServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	services, err := transport.GrpcListServices(ctx, addr, false)
	require.NoError(t, err)
	assert.Contains(t, services, "grpc.health.v1.Health")
}

func TestGrpc_ListMethods_Integration(t *testing.T) {
	addr := startGrpcServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	methods, err := transport.GrpcListMethods(ctx, addr, "grpc.health.v1.Health", false)
	require.NoError(t, err)
	assert.Contains(t, methods, "Check")
}

func TestGrpc_UnaryInvoke_Integration(t *testing.T) {
	addr := startGrpcServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := transport.GrpcInvoke(ctx, transport.GrpcRequest{
		Server:  addr,
		Service: "grpc.health.v1.Health",
		Method:  "Check",
		Message: `{}`,
	})
	require.NoError(t, err)

	var resp map[string]any
	require.NoError(t, json.Unmarshal([]byte(result), &resp))
	assert.NotEmpty(t, result)
}
