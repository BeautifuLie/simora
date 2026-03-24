package transport_test

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"simora/backend/transport"
)

const testAvroSchema = `{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "name",  "type": "string"},
    {"name": "email", "type": "string"}
  ]
}`

func TestAvroSerialiseDeserialise(t *testing.T) {
	payload := `{"name": "Alice", "email": "alice@example.com"}`

	data, err := transport.AvroSerialise(testAvroSchema, 42, payload)
	require.NoError(t, err)

	// First byte must be the magic byte.
	require.GreaterOrEqual(t, len(data), 5)
	assert.Equal(t, byte(0x00), data[0])

	// Schema ID in bytes 1-4 must be 42.
	id := int(binary.BigEndian.Uint32(data[1:5]))
	assert.Equal(t, 42, id)

	// Deserialise back to JSON.
	jsonStr, err := transport.AvroDeserialise(testAvroSchema, data[5:])
	require.NoError(t, err)

	var got map[string]any

	require.NoError(t, json.Unmarshal([]byte(jsonStr), &got))
	assert.Equal(t, "Alice", got["name"])
	assert.Equal(t, "alice@example.com", got["email"])
}

func TestAvroSerialise_InvalidSchema(t *testing.T) {
	_, err := transport.AvroSerialise("not-a-schema", 1, `{}`)
	require.Error(t, err)
}

func TestAvroSerialise_InvalidJSON(t *testing.T) {
	_, err := transport.AvroSerialise(testAvroSchema, 1, `{bad json}`)
	require.Error(t, err)
}

func TestDecodeAvroMessages_NoRegistry(t *testing.T) {
	msgs := []transport.KafkaMsg{{Value: "hello"}}

	result := transport.DecodeAvroMessages(context.Background(), msgs, transport.SchemaRegistryConfig{})

	assert.Equal(t, msgs, result)
}

func TestDecodeAvroMessages_NonAvroMessages(t *testing.T) {
	msgs := []transport.KafkaMsg{{Value: `{"plain": "json"}`}}
	cfg := transport.SchemaRegistryConfig{URL: "http://example.com"}

	result := transport.DecodeAvroMessages(context.Background(), msgs, cfg)

	assert.Equal(t, msgs, result)
}

func TestFetchSchemaBySubject(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/subjects/my-topic-value/versions/latest", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":7,"schema":"{\"type\":\"string\"}"}`))
	}))
	defer srv.Close()

	cfg := transport.SchemaRegistryConfig{URL: srv.URL, Subject: "my-topic-value"}

	id, schema, err := transport.FetchSchemaBySubject(context.Background(), cfg)
	require.NoError(t, err)
	assert.Equal(t, 7, id)
	assert.JSONEq(t, `{"type":"string"}`, schema)
}

func TestFetchSchemaByID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/schemas/ids/7", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"schema":"{\"type\":\"string\"}"}`))
	}))
	defer srv.Close()

	schema, err := transport.FetchSchemaByID(context.Background(), srv.URL, 7, "", "")
	require.NoError(t, err)
	assert.JSONEq(t, `{"type":"string"}`, schema)
}

func TestDecodeAvroMessages_WithRegistry(t *testing.T) {
	payload := `{"name": "Bob", "email": "bob@example.com"}`
	avroData, err := transport.AvroSerialise(testAvroSchema, 3, payload)
	require.NoError(t, err)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/schemas/ids/3", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")

		resp, _ := json.Marshal(map[string]string{"schema": testAvroSchema})
		_, _ = w.Write(resp)
	}))
	defer srv.Close()

	msgs := []transport.KafkaMsg{{Value: string(avroData)}}
	cfg := transport.SchemaRegistryConfig{URL: srv.URL}

	result := transport.DecodeAvroMessages(context.Background(), msgs, cfg)

	require.Len(t, result, 1)

	var decoded map[string]any

	require.NoError(t, json.Unmarshal([]byte(result[0].Value), &decoded))
	assert.Equal(t, "Bob", decoded["name"])
}
