package transport

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	reflectionpb "google.golang.org/grpc/reflection/grpc_reflection_v1"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protodesc"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/descriptorpb"
	"google.golang.org/protobuf/types/dynamicpb"
)

// GrpcRequest is the payload sent from the frontend for a gRPC invocation.
type GrpcRequest struct {
	Server  string            // "host:port"
	Service string            // "package.ServiceName"
	Method  string            // "MethodName"
	Message string            // JSON-encoded request body
	Meta    map[string]string // gRPC metadata headers
	TLS     bool
}

// dialGrpc opens a gRPC client connection with a dial timeout.
func dialGrpc(server string, useTLS bool) (*grpc.ClientConn, error) {
	var cred grpc.DialOption
	if useTLS {
		cred = grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(nil, ""))
	} else {
		cred = grpc.WithTransportCredentials(insecure.NewCredentials())
	}

	conn, err := grpc.NewClient(server, cred)
	if err != nil {
		return nil, fmt.Errorf("dial %s: %w", server, err)
	}

	return conn, nil
}

// reflectStream opens a server-reflection stream and returns a send/recv helper.
func reflectStream(ctx context.Context, conn *grpc.ClientConn) (reflectionpb.ServerReflection_ServerReflectionInfoClient, error) {
	rc := reflectionpb.NewServerReflectionClient(conn)

	stream, err := rc.ServerReflectionInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("start reflection stream: %w", err)
	}

	return stream, nil
}

// reflectFileDescs fetches FileDescriptorProto bytes for a symbol via gRPC reflection.
func reflectFileDescs(ctx context.Context, conn *grpc.ClientConn, symbol string) ([]*descriptorpb.FileDescriptorProto, error) {
	stream, err := reflectStream(ctx, conn)
	if err != nil {
		return nil, err
	}

	defer stream.CloseSend()

	req := &reflectionpb.ServerReflectionRequest{
		MessageRequest: &reflectionpb.ServerReflectionRequest_FileContainingSymbol{
			FileContainingSymbol: symbol,
		},
	}

	if err := stream.Send(req); err != nil {
		return nil, fmt.Errorf("send reflection request: %w", err)
	}

	resp, err := stream.Recv()
	if err != nil {
		return nil, fmt.Errorf("recv reflection response: %w", err)
	}

	return parseFileDescResponse(resp)
}

func parseFileDescResponse(resp *reflectionpb.ServerReflectionResponse) ([]*descriptorpb.FileDescriptorProto, error) {
	switch m := resp.MessageResponse.(type) {
	case *reflectionpb.ServerReflectionResponse_FileDescriptorResponse:
		fds := make([]*descriptorpb.FileDescriptorProto, 0, len(m.FileDescriptorResponse.FileDescriptorProto))
		for _, raw := range m.FileDescriptorResponse.FileDescriptorProto {
			fdp := &descriptorpb.FileDescriptorProto{}
			if err := proto.Unmarshal(raw, fdp); err != nil {
				return nil, fmt.Errorf("unmarshal file descriptor: %w", err)
			}

			fds = append(fds, fdp)
		}

		return fds, nil

	case *reflectionpb.ServerReflectionResponse_ErrorResponse:
		return nil, fmt.Errorf("reflection error %d: %s",
			m.ErrorResponse.ErrorCode, m.ErrorResponse.ErrorMessage)

	default:
		return nil, errors.New("unexpected reflection response type")
	}
}

// buildFileDescriptor builds a FileDescriptor from a list of raw protos,
// resolving cross-file imports by registering all returned descriptors.
// The primary file is assumed to be fds[0].
func buildFileDescriptor(fds []*descriptorpb.FileDescriptorProto) (protoreflect.FileDescriptor, error) {
	if len(fds) == 0 {
		return nil, errors.New("no file descriptors returned")
	}

	if len(fds) > maxReflectFileDescs {
		fds = fds[:maxReflectFileDescs]
	}

	reg, err := protodesc.NewFiles(&descriptorpb.FileDescriptorSet{File: fds})
	if err != nil {
		// Fall back to single-file resolution (works for protos without imports).
		fd, ferr := protodesc.NewFile(fds[0], (*protoregistry.Files)(nil))
		if ferr != nil {
			return nil, fmt.Errorf("build file descriptor: %w", err)
		}

		return fd, nil
	}

	fd, err := reg.FindFileByPath(fds[0].GetName())
	if err != nil {
		return nil, fmt.Errorf("find primary file descriptor: %w", err)
	}

	return fd, nil
}

// buildMethodDesc resolves a MethodDescriptor via server reflection.
func buildMethodDesc(ctx context.Context, conn *grpc.ClientConn, serviceName, methodName string) (protoreflect.MethodDescriptor, error) {
	reflectCtx, cancel := context.WithTimeout(ctx, grpcReflectTimeout)
	defer cancel()

	fds, err := reflectFileDescs(reflectCtx, conn, serviceName)
	if err != nil {
		return nil, err
	}

	fd, err := buildFileDescriptor(fds)
	if err != nil {
		return nil, fmt.Errorf("no file descriptors returned for %s: %w", serviceName, err)
	}

	return findMethod(fd, serviceName, methodName)
}

func findMethod(fd protoreflect.FileDescriptor, serviceName, methodName string) (protoreflect.MethodDescriptor, error) {
	shortName := serviceName
	if idx := strings.LastIndex(serviceName, "."); idx >= 0 {
		shortName = serviceName[idx+1:]
	}

	services := fd.Services()
	for i := range services.Len() {
		svc := services.Get(i)
		if string(svc.FullName()) != serviceName && string(svc.Name()) != shortName {
			continue
		}

		methods := svc.Methods()
		for j := range methods.Len() {
			m := methods.Get(j)
			if string(m.Name()) == methodName {
				return m, nil
			}
		}

		return nil, fmt.Errorf("method %q not found in service %s", methodName, svc.FullName())
	}

	return nil, fmt.Errorf("service %q not found in file", serviceName)
}

// applyMeta attaches gRPC metadata to the context if any entries are provided.
func applyMeta(ctx context.Context, meta map[string]string) context.Context {
	if len(meta) == 0 {
		return ctx
	}

	return metadata.NewOutgoingContext(ctx, metadata.New(meta))
}

// GrpcInvoke performs a unary or server-streaming gRPC call via server reflection.
func GrpcInvoke(ctx context.Context, req GrpcRequest) (string, error) {
	if err := validateGrpcRequest(req); err != nil {
		return "", err
	}

	conn, err := dialGrpc(req.Server, req.TLS)
	if err != nil {
		return "", err
	}

	defer conn.Close()

	md, err := buildMethodDesc(ctx, conn, req.Service, req.Method)
	if err != nil {
		return "", fmt.Errorf("resolve method: %w", err)
	}

	if md.IsStreamingClient() {
		return "", errors.New("client-streaming RPCs are not yet supported")
	}

	reqMsg, err := buildRequestMessage(md, req.Message)
	if err != nil {
		return "", err
	}

	fullMethod, err := buildFullMethod(md)
	if err != nil {
		return "", err
	}

	if md.IsStreamingServer() {
		return grpcInvokeServerStream(ctx, conn, md, fullMethod, reqMsg, req.Meta)
	}

	return grpcInvokeUnary(ctx, conn, md, fullMethod, reqMsg, req.Meta)
}

func grpcInvokeUnary(
	ctx context.Context,
	conn *grpc.ClientConn,
	md protoreflect.MethodDescriptor,
	fullMethod string,
	reqMsg proto.Message,
	meta map[string]string,
) (string, error) {
	invokeCtx, cancel := context.WithTimeout(applyMeta(ctx, meta), grpcInvokeTimeout)
	defer cancel()

	respMsg := dynamicpb.NewMessage(md.Output())
	if err := conn.Invoke(invokeCtx, fullMethod, reqMsg, respMsg); err != nil {
		return "", grpcError(err)
	}

	return marshalResponse(respMsg)
}

func grpcInvokeServerStream(
	ctx context.Context,
	conn *grpc.ClientConn,
	md protoreflect.MethodDescriptor,
	fullMethod string,
	reqMsg proto.Message,
	meta map[string]string,
) (string, error) {
	streamCtx, cancel := context.WithTimeout(applyMeta(ctx, meta), grpcStreamTimeout)
	defer cancel()

	return grpcServerStream(streamCtx, conn, md, fullMethod, reqMsg)
}

// grpcServerStream performs a server-streaming RPC, collecting up to maxServerStreamMessages
// responses and returning them as a JSON array.
func grpcServerStream(
	ctx context.Context,
	conn *grpc.ClientConn,
	md protoreflect.MethodDescriptor,
	fullMethod string,
	reqMsg proto.Message,
) (string, error) {
	streamDesc := &grpc.StreamDesc{ServerStreams: true}

	stream, err := conn.NewStream(ctx, streamDesc, fullMethod)
	if err != nil {
		return "", fmt.Errorf("open server stream: %w", err)
	}

	if err := stream.SendMsg(reqMsg); err != nil {
		return "", fmt.Errorf("send request: %w", err)
	}

	if err := stream.CloseSend(); err != nil {
		return "", fmt.Errorf("close send: %w", err)
	}

	var messages []json.RawMessage

	for len(messages) < maxServerStreamMessages {
		respMsg := dynamicpb.NewMessage(md.Output())
		if err := stream.RecvMsg(respMsg); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}

			return "", grpcError(err)
		}

		mo := protojson.MarshalOptions{EmitUnpopulated: true}

		b, err := mo.Marshal(respMsg)
		if err != nil {
			return "", fmt.Errorf("marshal stream message: %w", err)
		}

		messages = append(messages, json.RawMessage(b))
	}

	out, err := json.MarshalIndent(messages, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal stream response: %w", err)
	}

	return string(out), nil
}

func validateGrpcRequest(req GrpcRequest) error {
	if strings.TrimSpace(req.Server) == "" {
		return errors.New("server address is required")
	}

	if strings.TrimSpace(req.Service) == "" {
		return errors.New("service name is required")
	}

	if strings.TrimSpace(req.Method) == "" {
		return errors.New("method name is required")
	}

	return nil
}

func buildRequestMessage(md protoreflect.MethodDescriptor, jsonMsg string) (*dynamicpb.Message, error) {
	msg := dynamicpb.NewMessage(md.Input())

	if strings.TrimSpace(jsonMsg) == "" {
		jsonMsg = "{}"
	}

	if err := protojson.Unmarshal([]byte(jsonMsg), msg); err != nil {
		return nil, fmt.Errorf("unmarshal request JSON: %w", err)
	}

	return msg, nil
}

func buildFullMethod(md protoreflect.MethodDescriptor) (string, error) {
	svcDesc, ok := md.Parent().(protoreflect.ServiceDescriptor)
	if !ok {
		return "", errors.New("method parent is not a service descriptor")
	}

	prefix := ""

	if pf := md.ParentFile(); pf != nil {
		if pkg := string(pf.Package()); pkg != "" {
			prefix = pkg + "."
		}
	}

	return "/" + prefix + string(svcDesc.Name()) + "/" + string(md.Name()), nil
}

func grpcError(err error) error {
	st, _ := status.FromError(err)

	return fmt.Errorf("gRPC %s (%d): %s", st.Code(), st.Code(), st.Message())
}

func marshalResponse(msg proto.Message) (string, error) {
	mo := protojson.MarshalOptions{EmitUnpopulated: true}

	respJSON, err := mo.Marshal(msg)
	if err != nil {
		return "", fmt.Errorf("marshal response: %w", err)
	}

	var raw any
	if err := json.Unmarshal(respJSON, &raw); err == nil {
		if pretty, err := json.MarshalIndent(raw, "", "  "); err == nil {
			return string(pretty), nil
		}
	}

	return string(respJSON), nil
}

// GrpcListMethods uses server reflection to list all methods of a given service.
func GrpcListMethods(ctx context.Context, server, serviceName string, useTLS bool) ([]string, error) {
	conn, err := dialGrpc(server, useTLS)
	if err != nil {
		return nil, err
	}

	defer conn.Close()

	reflectCtx, cancel := context.WithTimeout(ctx, grpcReflectTimeout)
	defer cancel()

	fds, err := reflectFileDescs(reflectCtx, conn, serviceName)
	if err != nil {
		return nil, err
	}

	fd, err := buildFileDescriptor(fds)
	if err != nil {
		return nil, fmt.Errorf("no file descriptors for %s: %w", serviceName, err)
	}

	return extractMethods(fd, serviceName)
}

func extractMethods(fd protoreflect.FileDescriptor, serviceName string) ([]string, error) {
	shortName := serviceName
	if idx := strings.LastIndex(serviceName, "."); idx >= 0 {
		shortName = serviceName[idx+1:]
	}

	services := fd.Services()
	for i := range services.Len() {
		svc := services.Get(i)
		if string(svc.FullName()) != serviceName && string(svc.Name()) != shortName {
			continue
		}

		methods := svc.Methods()

		limit := methods.Len()
		if limit > maxReflectMethods {
			limit = maxReflectMethods
		}

		names := make([]string, 0, limit)
		for j := range limit {
			m := methods.Get(j)
			names = append(names, string(m.Name()))
		}

		return names, nil
	}

	return nil, fmt.Errorf("service %q not found", serviceName)
}

// ── Descriptor tree ────────────────────────────────────────────────────────

// GrpcField is a single field in a protobuf message.
type GrpcField struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Repeated bool   `json:"repeated"`
	Optional bool   `json:"optional"`
}

// GrpcMethodDesc describes a single RPC method.
type GrpcMethodDesc struct {
	Name            string      `json:"name"`
	ClientStreaming bool        `json:"clientStreaming"`
	ServerStreaming bool        `json:"serverStreaming"`
	InputType       string      `json:"inputType"`
	OutputType      string      `json:"outputType"`
	InputFields     []GrpcField `json:"inputFields"`
	OutputFields    []GrpcField `json:"outputFields"`
}

// GrpcServiceDesc is the full descriptor tree for one service.
type GrpcServiceDesc struct {
	Service string           `json:"service"`
	Methods []GrpcMethodDesc `json:"methods"`
}

// grpcFieldType returns a human-readable type name for a field descriptor.
func grpcFieldType(f protoreflect.FieldDescriptor) string {
	switch f.Kind() {
	case protoreflect.MessageKind:
		return string(f.Message().FullName())
	case protoreflect.EnumKind:
		return "enum " + string(f.Enum().FullName())
	default:
		return f.Kind().String()
	}
}

// grpcFields extracts GrpcField entries from a message descriptor.
func grpcFields(md protoreflect.MessageDescriptor) []GrpcField {
	fields := md.Fields()
	out := make([]GrpcField, 0, fields.Len())

	for i := range fields.Len() {
		f := fields.Get(i)
		out = append(out, GrpcField{
			Name:     string(f.Name()),
			Type:     grpcFieldType(f),
			Repeated: f.IsList(),
			Optional: f.HasOptionalKeyword(),
		})
	}

	return out
}

// GrpcDescribeService fetches the descriptor tree for a service via reflection.
// Returns a JSON-encoded GrpcServiceDesc.
func GrpcDescribeService(ctx context.Context, server, serviceName string, useTLS bool) (string, error) {
	conn, err := dialGrpc(server, useTLS)
	if err != nil {
		return "", err
	}

	defer conn.Close()

	reflectCtx, cancel := context.WithTimeout(ctx, grpcReflectTimeout)
	defer cancel()

	fds, err := reflectFileDescs(reflectCtx, conn, serviceName)
	if err != nil {
		return "", err
	}

	fd, err := buildFileDescriptor(fds)
	if err != nil {
		return "", fmt.Errorf("build file descriptor: %w", err)
	}

	shortName := serviceName
	if idx := strings.LastIndex(serviceName, "."); idx >= 0 {
		shortName = serviceName[idx+1:]
	}

	services := fd.Services()

	for i := range services.Len() {
		svc := services.Get(i)
		if string(svc.FullName()) != serviceName && string(svc.Name()) != shortName {
			continue
		}

		desc := buildServiceDesc(svc)

		b, err := json.MarshalIndent(desc, "", "  ")
		if err != nil {
			return "", fmt.Errorf("marshal descriptor: %w", err)
		}

		return string(b), nil
	}

	return "", fmt.Errorf("service %q not found", serviceName)
}

func buildServiceDesc(svc protoreflect.ServiceDescriptor) GrpcServiceDesc {
	methods := svc.Methods()

	limit := methods.Len()
	if limit > maxReflectMethods {
		limit = maxReflectMethods
	}

	desc := GrpcServiceDesc{
		Service: string(svc.FullName()),
		Methods: make([]GrpcMethodDesc, 0, limit),
	}

	for j := range limit {
		m := methods.Get(j)
		desc.Methods = append(desc.Methods, GrpcMethodDesc{
			Name:            string(m.Name()),
			ClientStreaming: m.IsStreamingClient(),
			ServerStreaming: m.IsStreamingServer(),
			InputType:       string(m.Input().FullName()),
			OutputType:      string(m.Output().FullName()),
			InputFields:     grpcFields(m.Input()),
			OutputFields:    grpcFields(m.Output()),
		})
	}

	return desc
}

// GrpcListServices uses server reflection to list all available service names.
func GrpcListServices(ctx context.Context, server string, useTLS bool) ([]string, error) {
	conn, err := dialGrpc(server, useTLS)
	if err != nil {
		return nil, err
	}

	defer conn.Close()

	reflectCtx, cancel := context.WithTimeout(ctx, grpcReflectTimeout)
	defer cancel()

	stream, err := reflectStream(reflectCtx, conn)
	if err != nil {
		return nil, err
	}

	defer stream.CloseSend()

	req := &reflectionpb.ServerReflectionRequest{
		MessageRequest: &reflectionpb.ServerReflectionRequest_ListServices{
			ListServices: "",
		},
	}

	if err := stream.Send(req); err != nil {
		return nil, fmt.Errorf("send list request: %w", err)
	}

	resp, err := stream.Recv()
	if err != nil {
		return nil, fmt.Errorf("recv list response: %w", err)
	}

	lsResp, ok := resp.MessageResponse.(*reflectionpb.ServerReflectionResponse_ListServicesResponse)
	if !ok {
		return nil, errors.New("unexpected response type")
	}

	svcs := lsResp.ListServicesResponse.Service
	if len(svcs) > maxReflectServices {
		svcs = svcs[:maxReflectServices]
	}

	names := make([]string, 0, len(svcs))
	for _, svc := range svcs {
		names = append(names, svc.Name)
	}

	return names, nil
}
