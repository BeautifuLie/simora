package transport_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"simora/backend/transport"
)

const (
	sqsEndpoint  = "http://localhost:4566"
	sqsRegion    = "us-east-1"
	sqsAccessKey = "test"
	sqsSecretKey = "test"
)

// createTestQueue provisions a temporary SQS queue on LocalStack.
// The queue is deleted automatically when the test ends.
func createTestQueue(t *testing.T, name string) string {
	t.Helper()

	cfg := aws.Config{
		Region:       sqsRegion,
		Credentials:  credentials.NewStaticCredentialsProvider(sqsAccessKey, sqsSecretKey, ""),
		BaseEndpoint: aws.String(sqsEndpoint),
	}

	client := sqs.NewFromConfig(cfg)
	ctx := context.Background()

	out, err := client.CreateQueue(ctx, &sqs.CreateQueueInput{
		QueueName: aws.String(name),
	})
	require.NoError(t, err)

	queueURL := *out.QueueUrl
	t.Cleanup(func() {
		_, _ = client.DeleteQueue(context.Background(), &sqs.DeleteQueueInput{
			QueueUrl: aws.String(queueURL),
		})
	})

	return queueURL
}

func TestSqs_SendAndReceive_Integration(t *testing.T) {
	t.Setenv("AWS_ACCESS_KEY_ID", sqsAccessKey)
	t.Setenv("AWS_SECRET_ACCESS_KEY", sqsSecretKey)
	t.Setenv("AWS_REGION", sqsRegion)
	t.Setenv("AWS_ENDPOINT_URL", sqsEndpoint)

	queueName := fmt.Sprintf("simora-test-%d", time.Now().UnixNano())
	queueURL := createTestQueue(t, queueName)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	sendResult, err := transport.SqsSend(ctx, transport.SqsSendRequest{
		QueueURL: queueURL,
		Body:     `{"hello":"simora"}`,
		Region:   sqsRegion,
	})
	require.NoError(t, err)
	assert.NotEmpty(t, sendResult)

	recvResult, err := transport.SqsReceive(ctx, transport.SqsReceiveRequest{
		QueueURL:    queueURL,
		Region:      sqsRegion,
		MaxMessages: 1,
		WaitSeconds: 1,
	})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal([]byte(recvResult), &result))
	msgs, ok := result["messages"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, msgs)
	first, ok := msgs[0].(map[string]any)
	require.True(t, ok)
	assert.JSONEq(t, `{"hello":"simora"}`, first["body"].(string))
}
