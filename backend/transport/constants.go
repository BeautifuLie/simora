package transport

import "time"

// gRPC timeouts.
const (
	grpcDialTimeout    = 10 * time.Second
	grpcReflectTimeout = 10 * time.Second
	grpcInvokeTimeout  = 30 * time.Second
)

// Kafka network timeouts and offset names.
const (
	kafkaNetTimeout   = 10 * time.Second
	kafkaIdleEarliest = 2 * time.Second
	kafkaIdleLatest   = 5 * time.Second

	kafkaOffsetEarliest  = "earliest"
	kafkaFormatProto     = "proto"
	kafkaInlineProtoFile = "inline.proto"
)

// Kafka SASL mechanism strings (as sent from the frontend).
const (
	saslPlain    = "plain"
	saslScram256 = "scram-sha-256"
	saslScram512 = "scram-sha-512"
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
