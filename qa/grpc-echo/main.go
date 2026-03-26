// Minimal gRPC echo server with server reflection.
// Implements helloworld.Greeter/SayHello (standard grpc-go example service).
package main

import (
	"context"
	"log"
	"net"

	"google.golang.org/grpc"
	pb "google.golang.org/grpc/examples/helloworld/helloworld"
	"google.golang.org/grpc/reflection"
)

type server struct{ pb.UnimplementedGreeterServer }

func (s *server) SayHello(_ context.Context, req *pb.HelloRequest) (*pb.HelloReply, error) {
	return &pb.HelloReply{Message: "Hello, " + req.GetName()}, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterGreeterServer(s, &server{})
	reflection.Register(s)

	log.Println("gRPC echo server listening on :50051 (reflection enabled)")

	if err := s.Serve(lis); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
