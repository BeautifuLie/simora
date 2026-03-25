package transport_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"simora/backend/transport"
)

const (
	kafkaBootstrap = "localhost:9096"
	kafkaUsername  = "kafkauser"
	kafkaPassword  = "kafkapassword"
)

var kafkaAuth = transport.KafkaAuth{
	SaslMechanism: "scram-sha-512",
	SaslUsername:  kafkaUsername,
	SaslPassword:  kafkaPassword,
}

func TestKafka_ProduceAndConsume_Integration(t *testing.T) {
	topic := "simora-integration-" + t.Name()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := transport.KafkaProduce(ctx, transport.KafkaProduceRequest{
		Bootstrap:     kafkaBootstrap,
		Topic:         topic,
		Key:           "k1",
		Message:       `{"hello":"world"}`,
		MessageFormat: "json",
		Auth:          kafkaAuth,
	})
	require.NoError(t, err)
	assert.NotEmpty(t, result)

	consumed, err := transport.KafkaConsume(ctx, transport.KafkaConsumeRequest{
		Bootstrap: kafkaBootstrap,
		Topic:     topic,
		Offset:    "earliest",
		Auth:      kafkaAuth,
	}, 1)
	require.NoError(t, err)

	var consumeResult map[string]any
	require.NoError(t, json.Unmarshal([]byte(consumed), &consumeResult))
	msgs, ok := consumeResult["messages"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, msgs)
	first, ok := msgs[0].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "k1", first["key"])
}

func TestKafka_ProduceWithHeaders_Integration(t *testing.T) {
	topic := "simora-integration-headers"
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := transport.KafkaProduce(ctx, transport.KafkaProduceRequest{
		Bootstrap:     kafkaBootstrap,
		Topic:         topic,
		Key:           "hdr-key",
		Message:       `{"event":"test"}`,
		MessageFormat: "json",
		Headers:       map[string]string{"x-source": "simora-test"},
		Auth:          kafkaAuth,
	})
	require.NoError(t, err)
}
