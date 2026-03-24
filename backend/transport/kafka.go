package transport

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/IBM/sarama"
	"github.com/bufbuild/protocompile"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/dynamicpb"
)

// KafkaAuth holds SASL / TLS configuration.
type KafkaAuth struct {
	SaslMechanism string // "none" | "plain" | "scram-sha-256" | "scram-sha-512"
	SaslUsername  string
	SaslPassword  string
	TLS           bool
}

// KafkaProduceRequest is the payload sent from the frontend.
type KafkaProduceRequest struct {
	Bootstrap        string
	Topic            string
	Key              string
	Message          string
	Headers          map[string]string
	Auth             KafkaAuth
	MessageFormat    string // "json" | "proto"
	ProtoSchema      string
	ProtoMessageType string
}

// KafkaConsumeRequest configures a one-shot consume poll.
type KafkaConsumeRequest struct {
	Bootstrap string
	Topic     string
	Group     string
	Offset    string // "earliest" | "latest"
	Auth      KafkaAuth
}

// buildSaramaConfig creates a sarama.Config with SASL / TLS applied.
func buildSaramaConfig(auth KafkaAuth) (*sarama.Config, error) {
	cfg := sarama.NewConfig()
	cfg.Version = sarama.V3_6_0_0
	cfg.Net.DialTimeout = kafkaNetTimeout
	cfg.Net.ReadTimeout = kafkaNetTimeout
	cfg.Net.WriteTimeout = kafkaNetTimeout

	if auth.TLS {
		cfg.Net.TLS.Enable = true
		cfg.Net.TLS.Config = &tls.Config{InsecureSkipVerify: false}
	}

	mech := strings.ToLower(auth.SaslMechanism)
	if mech != "" && mech != "none" {
		cfg.Net.SASL.Enable = true
		cfg.Net.SASL.User = auth.SaslUsername
		cfg.Net.SASL.Password = auth.SaslPassword

		switch mech {
		case saslPlain:
			cfg.Net.SASL.Mechanism = sarama.SASLTypePlaintext
		case saslScram256:
			cfg.Net.SASL.Mechanism = sarama.SASLTypeSCRAMSHA256
			cfg.Net.SASL.SCRAMClientGeneratorFunc = func() sarama.SCRAMClient {
				return &XDGSCRAMClient{HashGeneratorFcn: SHA256}
			}
		case saslScram512:
			cfg.Net.SASL.Mechanism = sarama.SASLTypeSCRAMSHA512
			cfg.Net.SASL.SCRAMClientGeneratorFunc = func() sarama.SCRAMClient {
				return &XDGSCRAMClient{HashGeneratorFcn: SHA512}
			}
		default:
			return nil, fmt.Errorf("unknown SASL mechanism: %s", mech)
		}

		if auth.TLS {
			cfg.Net.SASL.Handshake = true
		}
	}

	return cfg, nil
}

// protoSerialise converts a JSON string into protobuf binary bytes using
// an inline .proto schema and a fully-qualified message type name.
func protoSerialise(ctx context.Context, schema, messageType, jsonPayload string) ([]byte, error) {
	if strings.TrimSpace(schema) == "" {
		return nil, errors.New("proto schema is empty")
	}

	if strings.TrimSpace(messageType) == "" {
		return nil, errors.New("proto message type is empty")
	}

	compiler := protocompile.Compiler{
		Resolver: protocompile.WithStandardImports(&protocompile.SourceResolver{
			Accessor: func(filename string) (io.ReadCloser, error) {
				if filename == kafkaInlineProtoFile {
					return io.NopCloser(strings.NewReader(schema)), nil
				}

				return nil, fmt.Errorf("file not found: %s", filename)
			},
		}),
	}

	fds, err := compiler.Compile(ctx, kafkaInlineProtoFile)
	if err != nil {
		return nil, fmt.Errorf("parse proto schema: %w", err)
	}

	fd := fds.FindFileByPath(kafkaInlineProtoFile)
	msgs := fd.Messages()

	for i := range msgs.Len() {
		md := msgs.Get(i)
		if string(md.FullName()) == messageType || string(md.Name()) == messageType {
			msg := dynamicpb.NewMessage(md)
			if err := protojson.Unmarshal([]byte(jsonPayload), msg); err != nil {
				return nil, fmt.Errorf("unmarshal JSON to proto: %w", err)
			}

			b, err := proto.Marshal(msg)
			if err != nil {
				return nil, fmt.Errorf("marshal proto message: %w", err)
			}

			return b, nil
		}
	}

	return nil, fmt.Errorf("message type %q not found in schema", messageType)
}

// KafkaProduce sends a single message to a Kafka topic.
func KafkaProduce(ctx context.Context, req KafkaProduceRequest) (string, error) {
	brokers := splitBrokers(req.Bootstrap)

	cfg, err := buildSaramaConfig(req.Auth)
	if err != nil {
		return "", err
	}

	cfg.Producer.Return.Successes = true
	cfg.Producer.Return.Errors = true
	cfg.Producer.RequiredAcks = sarama.WaitForAll

	producer, err := sarama.NewSyncProducer(brokers, cfg)
	if err != nil {
		return "", fmt.Errorf("connect to Kafka: %w", err)
	}
	defer producer.Close()

	// Serialise the message payload.
	var msgBytes []byte

	switch strings.ToLower(req.MessageFormat) {
	case kafkaFormatProto:
		msgBytes, err = protoSerialise(ctx, req.ProtoSchema, req.ProtoMessageType, req.Message)
		if err != nil {
			return "", fmt.Errorf("proto serialise: %w", err)
		}
	default: // "json" or empty
		msgBytes = []byte(req.Message)
	}

	// Build sarama message headers.
	hdrs := make([]sarama.RecordHeader, 0, len(req.Headers))
	for k, v := range req.Headers {
		hdrs = append(hdrs, sarama.RecordHeader{Key: []byte(k), Value: []byte(v)})
	}

	msg := &sarama.ProducerMessage{
		Topic:   req.Topic,
		Value:   sarama.ByteEncoder(msgBytes),
		Headers: hdrs,
	}
	if req.Key != "" {
		msg.Key = sarama.StringEncoder(req.Key)
	}

	partition, offset, err := producer.SendMessage(msg)
	if err != nil {
		return "", fmt.Errorf("send message: %w", err)
	}

	result := map[string]any{
		"status":    "produced",
		"topic":     req.Topic,
		"partition": partition,
		"offset":    offset,
		"size":      len(msgBytes),
		"format":    req.MessageFormat,
	}

	b, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal produce result: %w", err)
	}

	return string(b), nil
}

type kafkaMsg struct {
	Partition int32  `json:"partition"`
	Offset    int64  `json:"offset"`
	Key       string `json:"key"`
	Value     string `json:"value"`
	Timestamp string `json:"timestamp"`
}

// drainPartition reads up to maxMessages from a partition consumer until the
// channel is closed or the idle timer fires (no new messages for idleTimeout).
func drainPartition(pc sarama.PartitionConsumer, idleTimeout time.Duration, maxMessages int) []kafkaMsg {
	msgs := make([]kafkaMsg, 0, maxMessages)
	idle := time.NewTimer(idleTimeout)

	defer idle.Stop()

	for len(msgs) < maxMessages {
		select {
		case m, ok := <-pc.Messages():
			if !ok {
				return msgs
			}

			msgs = append(msgs, kafkaMsg{
				Partition: m.Partition,
				Offset:    m.Offset,
				Key:       string(m.Key),
				Value:     string(m.Value),
				Timestamp: m.Timestamp.Format(time.RFC3339),
			})

			if !idle.Stop() {
				select {
				case <-idle.C:
				default:
				}
			}

			idle.Reset(idleTimeout)

		case <-idle.C:
			return msgs
		}
	}

	return msgs
}

// KafkaConsume fetches up to maxMessages messages from a topic.
//
// Strategy: connect, then for each partition start consuming from the
// requested offset. Use an idle timeout (no new message within N seconds)
// to decide the partition is drained. This avoids relying on ListOffsets
// which may not be available in all security configurations.
func KafkaConsume(ctx context.Context, req KafkaConsumeRequest, maxMessages int) (string, error) {
	brokers := splitBrokers(req.Bootstrap)

	cfg, err := buildSaramaConfig(req.Auth)
	if err != nil {
		return "", err
	}

	cfg.Consumer.Return.Errors = true

	client, err := sarama.NewClient(brokers, cfg)
	if err != nil {
		return "", fmt.Errorf("connect to Kafka: %w", err)
	}
	defer client.Close()

	consumer, err := sarama.NewConsumerFromClient(client)
	if err != nil {
		return "", fmt.Errorf("create consumer: %w", err)
	}
	defer consumer.Close()

	partitions, err := consumer.Partitions(req.Topic)
	if err != nil {
		return "", fmt.Errorf("list partitions: %w", err)
	}

	startOffset, idleTimeout := consumeOffsetParams(req.Offset)

	messages, firstErr := collectMessages(ctx, consumer, req.Topic, partitions, startOffset, idleTimeout, maxMessages)
	if len(messages) == 0 && firstErr != nil {
		return "", firstErr
	}

	result := map[string]any{
		"status":   "consumed",
		"topic":    req.Topic,
		"count":    len(messages),
		"messages": messages,
	}

	b, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal consume result: %w", err)
	}

	return string(b), nil
}

// consumeOffsetParams maps the offset string to a sarama offset constant and
// the appropriate idle timeout for draining each partition.
func consumeOffsetParams(offset string) (int64, time.Duration) {
	if strings.ToLower(offset) == kafkaOffsetEarliest {
		return sarama.OffsetOldest, kafkaIdleEarliest
	}

	return sarama.OffsetNewest, kafkaIdleLatest
}

// collectMessages drains each partition in turn, stopping when maxMessages is
// reached or ctx is cancelled. Returns all collected messages and the first
// partition error, if any.
func collectMessages(
	ctx context.Context,
	consumer sarama.Consumer,
	topic string,
	partitions []int32,
	startOffset int64,
	idleTimeout time.Duration,
	maxMessages int,
) ([]kafkaMsg, error) {
	messages := make([]kafkaMsg, 0, maxMessages)

	var firstErr error

	for _, p := range partitions {
		if ctx.Err() != nil {
			break
		}

		if len(messages) >= maxMessages {
			break
		}

		pc, err := consumer.ConsumePartition(topic, p, startOffset)
		if err != nil {
			if firstErr == nil {
				firstErr = fmt.Errorf("partition %d: %w", p, err)
			}

			continue
		}

		// Drain the error channel in a goroutine; wait for it to finish
		// after closing the partition consumer so it doesn't leak.
		errDone := make(chan struct{})

		go func() {
			defer close(errDone)

			for range pc.Errors() {
			}
		}()

		drained := drainPartition(pc, idleTimeout, maxMessages-len(messages))
		pc.Close()
		<-errDone

		messages = append(messages, drained...)
	}

	return messages, firstErr
}

func splitBrokers(bootstrap string) []string {
	var out []string

	for _, b := range strings.Split(bootstrap, ",") {
		b = strings.TrimSpace(b)
		if b != "" {
			out = append(out, b)
		}
	}

	return out
}
