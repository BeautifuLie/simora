package transport

import "time"

// gRPC timeouts and limits.
const (
	grpcReflectTimeout = 10 * time.Second
	grpcInvokeTimeout  = 30 * time.Second

	// maxReflectFileDescs caps the number of FileDescriptorProto objects accepted
	// from a single server-reflection response to prevent runaway memory growth.
	maxReflectFileDescs = 100

	// maxReflectServices caps the number of service names returned by ListServices
	// to prevent a malicious server from flooding the client with entries.
	maxReflectServices = 200

	// maxReflectMethods caps the number of methods listed per service.
	maxReflectMethods = 200

	// maxServerStreamMessages is the maximum number of messages collected from a
	// server-streaming RPC before the stream is closed.
	maxServerStreamMessages = 100

	// grpcStreamTimeout is the wall-clock timeout for a full server-streaming RPC.
	grpcStreamTimeout = 60 * time.Second
)

// Kafka network timeouts and offset names.
const (
	kafkaNetTimeout   = 10 * time.Second
	kafkaIdleEarliest = 2 * time.Second
	kafkaIdleLatest   = 5 * time.Second

	kafkaOffsetEarliest  = "earliest"
	kafkaFormatProto     = "proto"
	kafkaFormatAvro      = "avro"
	kafkaInlineProtoFile = "inline.proto"

	// kafkaSchemaMagicByte is the first byte of the Confluent wire format
	// (magic byte 0x00 followed by 4-byte big-endian schema ID).
	kafkaSchemaMagicByte = byte(0x00)
	kafkaSchemaIDLen     = 4

	kafkaGroupJoinTimeout = 15 * time.Second // time to wait for group rebalance
	kafkaDefaultMaxMsgs   = 50
)

// Kafka SASL mechanism strings (as sent from the frontend).
const (
	saslPlain    = "plain"
	saslScram256 = "scram-sha-256"
	saslScram512 = "scram-sha-512"
)

// WebSocket defaults.
const (
	wsConnectTimeout = 10 * time.Second
	wsIdleTimeout    = 5 * time.Second
	wsDefaultMaxMsgs = 50
	wsMaxMsgBytes    = 1 << 20 // 1 MiB per message

	// Persistent connection batching — limits IPC traffic for high-frequency streams.
	wsBatchInterval = 100 * time.Millisecond
	wsBatchSize     = 20
	wsBatchBufSize  = 200 // channel buffer; messages dropped if Go can't keep up
)

// SQS defaults and validation limits.
const (
	sqsDefaultRegion   = "us-east-1"
	sqsMaxMessages     = int32(10) // upper bound and default for MaxMessages
	sqsMaxWaitSeconds  = int32(20)
	sqsDefaultWaitSecs = int32(5)
	sqsSendTimeout     = 15 * time.Second
	sqsReceiveTimeout  = 30 * time.Second

	sqsAttrTypeDefault = "String"
	sqsAttrTypeBinary  = "Binary"
)
