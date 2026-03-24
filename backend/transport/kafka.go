package transport

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/IBM/sarama"
	"github.com/bufbuild/protocompile"
	avro "github.com/hamba/avro/v2"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/dynamicpb"
)

// SchemaRegistryConfig holds connection details for a Confluent-compatible
// Schema Registry (used for Avro serialisation / deserialisation).
type SchemaRegistryConfig struct {
	URL      string // e.g. http://localhost:8081
	Subject  string // subject name used during produce (e.g. my-topic-value)
	Username string
	Password string
}

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
	MessageFormat    string // "json" | "proto" | "avro"
	ProtoSchema      string
	ProtoMessageType string
	SchemaRegistry   SchemaRegistryConfig
}

// KafkaConsumeRequest configures a one-shot consume poll.
type KafkaConsumeRequest struct {
	Bootstrap      string
	Topic          string
	Group          string
	Offset         string // "earliest" | "latest"
	MaxMessages    int    // 0 → kafkaDefaultMaxMsgs
	Auth           KafkaAuth
	SchemaRegistry SchemaRegistryConfig
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

// schemaRegistryGet performs an authenticated GET request to a Schema Registry URL.
func schemaRegistryGet(ctx context.Context, rawURL, username, password string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	if username != "" {
		req.SetBasicAuth(username, password)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("schema registry request: %w", err)
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("schema registry returned HTTP %d: %s", resp.StatusCode, body)
	}

	return body, nil
}

// FetchSchemaBySubject fetches the latest schema for a subject from the registry.
// It returns the schema ID and schema JSON string.
func FetchSchemaBySubject(ctx context.Context, cfg SchemaRegistryConfig) (int, string, error) {
	endpoint := strings.TrimRight(cfg.URL, "/") +
		"/subjects/" + url.PathEscape(cfg.Subject) + "/versions/latest"

	body, err := schemaRegistryGet(ctx, endpoint, cfg.Username, cfg.Password)
	if err != nil {
		return 0, "", fmt.Errorf("fetch schema by subject: %w", err)
	}

	var resp struct {
		ID     int    `json:"id"`
		Schema string `json:"schema"`
	}

	if err := json.Unmarshal(body, &resp); err != nil {
		return 0, "", fmt.Errorf("parse schema registry response: %w", err)
	}

	return resp.ID, resp.Schema, nil
}

// FetchSchemaByID fetches a schema from the registry by its numeric ID.
func FetchSchemaByID(ctx context.Context, baseURL string, id int, username, password string) (string, error) {
	endpoint := strings.TrimRight(baseURL, "/") + "/schemas/ids/" + strconv.Itoa(id)

	body, err := schemaRegistryGet(ctx, endpoint, username, password)
	if err != nil {
		return "", fmt.Errorf("fetch schema by ID: %w", err)
	}

	var resp struct {
		Schema string `json:"schema"`
	}

	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("parse schema registry response: %w", err)
	}

	return resp.Schema, nil
}

// AvroSerialise encodes a JSON string to Confluent wire-format Avro bytes
// (magic byte 0x00 + 4-byte big-endian schema ID + Avro binary payload).
func AvroSerialise(schemaJSON string, schemaID int, jsonPayload string) ([]byte, error) {
	schema, err := avro.Parse(schemaJSON)
	if err != nil {
		return nil, fmt.Errorf("parse avro schema: %w", err)
	}

	var data any

	if err := json.Unmarshal([]byte(jsonPayload), &data); err != nil {
		return nil, fmt.Errorf("parse JSON payload: %w", err)
	}

	avroBytes, err := avro.Marshal(schema, data)
	if err != nil {
		return nil, fmt.Errorf("avro marshal: %w", err)
	}

	buf := make([]byte, 1+kafkaSchemaIDLen+len(avroBytes))
	buf[0] = kafkaSchemaMagicByte
	binary.BigEndian.PutUint32(buf[1:1+kafkaSchemaIDLen], uint32(schemaID)) //nolint:gosec
	copy(buf[1+kafkaSchemaIDLen:], avroBytes)

	return buf, nil
}

// AvroDeserialise decodes raw Avro binary bytes (without Confluent header)
// to a JSON string using the provided schema JSON.
func AvroDeserialise(schemaJSON string, data []byte) (string, error) {
	schema, err := avro.Parse(schemaJSON)
	if err != nil {
		return "", fmt.Errorf("parse avro schema: %w", err)
	}

	var result any

	if err := avro.Unmarshal(schema, data, &result); err != nil {
		return "", fmt.Errorf("avro unmarshal: %w", err)
	}

	b, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal to JSON: %w", err)
	}

	return string(b), nil
}

// DecodeAvroMessages replaces Confluent wire-format Avro values with their
// JSON representation for each message that carries the magic byte 0x00.
// Non-Avro messages are left unchanged. Errors for individual messages are
// silently skipped so that partial decodes are still returned.
func DecodeAvroMessages(ctx context.Context, msgs []KafkaMsg, cfg SchemaRegistryConfig) []KafkaMsg {
	if cfg.URL == "" {
		return msgs
	}

	schemaCache := map[int]string{}

	for i, m := range msgs {
		raw := []byte(m.Value)

		if len(raw) < 1+kafkaSchemaIDLen || raw[0] != kafkaSchemaMagicByte {
			continue
		}

		id := int(binary.BigEndian.Uint32(raw[1 : 1+kafkaSchemaIDLen]))

		schemaJSON, ok := schemaCache[id]
		if !ok {
			fetched, err := FetchSchemaByID(ctx, cfg.URL, id, cfg.Username, cfg.Password)
			if err != nil {
				msgs[i].Value = base64.StdEncoding.EncodeToString(raw)
				continue
			}

			schemaCache[id] = fetched
			schemaJSON = fetched
		}

		decoded, err := AvroDeserialise(schemaJSON, raw[1+kafkaSchemaIDLen:])
		if err != nil {
			msgs[i].Value = base64.StdEncoding.EncodeToString(raw)
			continue
		}

		msgs[i].Value = decoded
	}

	return msgs
}

// produceBytes serialises req.Message to bytes according to the configured format.
func produceBytes(ctx context.Context, req KafkaProduceRequest) ([]byte, error) {
	switch strings.ToLower(req.MessageFormat) {
	case kafkaFormatProto:
		b, err := protoSerialise(ctx, req.ProtoSchema, req.ProtoMessageType, req.Message)
		if err != nil {
			return nil, fmt.Errorf("proto: %w", err)
		}

		return b, nil

	case kafkaFormatAvro:
		schemaID, schemaJSON, err := FetchSchemaBySubject(ctx, req.SchemaRegistry)
		if err != nil {
			return nil, fmt.Errorf("fetch schema: %w", err)
		}

		b, err := AvroSerialise(schemaJSON, schemaID, req.Message)
		if err != nil {
			return nil, fmt.Errorf("avro: %w", err)
		}

		return b, nil

	default: // "json" or empty — send as-is
		return []byte(req.Message), nil
	}
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
	msgBytes, err := produceBytes(ctx, req)
	if err != nil {
		return "", fmt.Errorf("serialise message: %w", err)
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

type KafkaMsg struct {
	Partition int32  `json:"partition"`
	Offset    int64  `json:"offset"`
	Key       string `json:"key"`
	Value     string `json:"value"`
	Timestamp string `json:"timestamp"`
}

// drainPartition reads up to maxMessages from a partition consumer until the
// channel is closed or the idle timer fires (no new messages for idleTimeout).
func drainPartition(pc sarama.PartitionConsumer, idleTimeout time.Duration, maxMessages int) []KafkaMsg {
	msgs := make([]KafkaMsg, 0, maxMessages)
	idle := time.NewTimer(idleTimeout)

	defer idle.Stop()

	for len(msgs) < maxMessages {
		select {
		case m, ok := <-pc.Messages():
			if !ok {
				return msgs
			}

			msgs = append(msgs, KafkaMsg{
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
// When req.Group is non-empty a consumer group is used (offsets are committed
// to Kafka after the poll, allowing resumable consumption across calls).
// Without a group, the function performs a stateless partition scan.
func KafkaConsume(ctx context.Context, req KafkaConsumeRequest, maxMessages int) (string, error) {
	if maxMessages <= 0 {
		maxMessages = kafkaDefaultMaxMsgs
	}

	if req.Group != "" {
		return kafkaConsumeGroup(ctx, req, maxMessages)
	}

	return kafkaConsumeStateless(ctx, req, maxMessages)
}

// kafkaConsumeStateless is the original partition-scan consumer (no group).
func kafkaConsumeStateless(ctx context.Context, req KafkaConsumeRequest, maxMessages int) (string, error) {
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

	messages = DecodeAvroMessages(ctx, messages, req.SchemaRegistry)

	result := map[string]any{
		"status":   "consumed",
		"mode":     "stateless",
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

// groupHandler implements sarama.ConsumerGroupHandler and collects messages
// until maxMessages is reached or the context is cancelled.
type groupHandler struct {
	maxMessages int
	messages    []KafkaMsg
	done        chan struct{}
}

func (h *groupHandler) Setup(_ sarama.ConsumerGroupSession) error   { return nil }
func (h *groupHandler) Cleanup(_ sarama.ConsumerGroupSession) error { return nil }

func (h *groupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for {
		select {
		case m, ok := <-claim.Messages():
			if !ok {
				return nil
			}

			h.messages = append(h.messages, KafkaMsg{
				Partition: m.Partition,
				Offset:    m.Offset,
				Key:       string(m.Key),
				Value:     string(m.Value),
				Timestamp: m.Timestamp.Format(time.RFC3339),
			})

			session.MarkMessage(m, "")

			if len(h.messages) >= h.maxMessages {
				select {
				case h.done <- struct{}{}:
				default:
				}

				return nil
			}

		case <-session.Context().Done():
			return nil
		}
	}
}

// kafkaConsumeGroup uses a Kafka consumer group to poll messages, committing
// offsets so subsequent calls resume from where the previous one left off.
func kafkaConsumeGroup(ctx context.Context, req KafkaConsumeRequest, maxMessages int) (string, error) {
	brokers := splitBrokers(req.Bootstrap)

	cfg, err := buildSaramaConfig(req.Auth)
	if err != nil {
		return "", err
	}

	cfg.Consumer.Return.Errors = true
	cfg.Consumer.Offsets.AutoCommit.Enable = true

	startOffset, idleTimeout := consumeOffsetParams(req.Offset)
	cfg.Consumer.Offsets.Initial = startOffset

	cg, err := sarama.NewConsumerGroup(brokers, req.Group, cfg)
	if err != nil {
		return "", fmt.Errorf("create consumer group: %w", err)
	}

	defer cg.Close()

	handler := &groupHandler{
		maxMessages: maxMessages,
		done:        make(chan struct{}, 1),
	}

	// Cancel the context when we have enough messages or the idle timer fires.
	pollCtx, cancel := context.WithTimeout(ctx, idleTimeout+kafkaGroupJoinTimeout)
	defer cancel()

	consumeErr := make(chan error, 1)

	go func() {
		consumeErr <- cg.Consume(pollCtx, []string{req.Topic}, handler)
	}()

	select {
	case <-handler.done:
		cancel()
	case <-pollCtx.Done():
	}

	// Wait for the Consume goroutine to exit.
	if err = <-consumeErr; err != nil && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) {
		return "", fmt.Errorf("consumer group error: %w", err)
	}

	decoded := DecodeAvroMessages(ctx, handler.messages, req.SchemaRegistry)

	result := map[string]any{
		"status":   "consumed",
		"mode":     "group",
		"group":    req.Group,
		"topic":    req.Topic,
		"count":    len(decoded),
		"messages": decoded,
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
) ([]KafkaMsg, error) {
	messages := make([]KafkaMsg, 0, maxMessages)

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

		select {
		case <-errDone:
		case <-time.After(2 * time.Second):
			log.Println("warn: kafka error channel drain timeout")
		}

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
