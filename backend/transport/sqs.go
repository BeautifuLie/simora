package transport

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
)

// SqsAuth holds AWS credentials for request signing.
type SqsAuth struct {
	AccessKeyID     string
	SecretAccessKey string
	SessionToken    string
}

// SqsMessageAttribute maps to a single SQS message attribute.
type SqsMessageAttribute struct {
	Key   string
	Value string
	Type  string // "String" | "Number" | "Binary"
}

// SqsSendRequest is the payload sent from the frontend for producing a message.
type SqsSendRequest struct {
	QueueURL     string
	Body         string
	Region       string
	DelaySeconds int32
	Attributes   []SqsMessageAttribute
	Auth         SqsAuth
	// FIFO-only fields (ignored for standard queues)
	MessageGroupID         string
	MessageDeduplicationID string
}

// SqsReceiveRequest configures a one-shot receive from an SQS queue.
type SqsReceiveRequest struct {
	QueueURL    string
	Region      string
	MaxMessages int32
	WaitSeconds int32
	Auth        SqsAuth
}

// buildSqsClient creates an AWS SQS client with the given credentials and region.
// When explicit credentials are absent it falls back to the default credential
// chain (AWS_ACCESS_KEY_ID env vars, ~/.aws/credentials, IAM instance role, …).
func buildSqsClient(ctx context.Context, region string, auth SqsAuth) (*sqs.Client, error) {
	if auth.AccessKeyID != "" && auth.SecretAccessKey != "" {
		cfg := aws.Config{
			Region: region,
			Credentials: credentials.NewStaticCredentialsProvider(
				auth.AccessKeyID,
				auth.SecretAccessKey,
				auth.SessionToken,
			),
		}

		return sqs.NewFromConfig(cfg), nil
	}

	// Use the SDK default credential chain (env vars, ~/.aws/credentials, IAM role).
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}

	return sqs.NewFromConfig(cfg), nil
}

// buildSqsAttrs converts the request attribute list into the AWS SDK map type.
func buildSqsAttrs(attrs []SqsMessageAttribute) map[string]types.MessageAttributeValue {
	out := make(map[string]types.MessageAttributeValue, len(attrs))

	for _, a := range attrs {
		if strings.TrimSpace(a.Key) == "" {
			continue
		}

		dataType := a.Type
		if dataType == "" {
			dataType = sqsAttrTypeDefault
		}

		attr := types.MessageAttributeValue{DataType: aws.String(dataType)}
		if dataType == sqsAttrTypeBinary {
			attr.BinaryValue = []byte(a.Value)
		} else {
			attr.StringValue = aws.String(a.Value)
		}

		out[a.Key] = attr
	}

	return out
}

// SqsSend sends a message to an SQS queue and returns a JSON result summary.
func SqsSend(ctx context.Context, req SqsSendRequest) (string, error) {
	if strings.TrimSpace(req.QueueURL) == "" {
		return "", errors.New("queue URL is required")
	}

	if strings.TrimSpace(req.Region) == "" {
		req.Region = sqsDefaultRegion
	}

	client, err := buildSqsClient(ctx, req.Region, req.Auth)
	if err != nil {
		return "", err
	}

	input := &sqs.SendMessageInput{
		QueueUrl:          aws.String(req.QueueURL),
		MessageBody:       aws.String(req.Body),
		DelaySeconds:      req.DelaySeconds,
		MessageAttributes: buildSqsAttrs(req.Attributes),
	}

	if strings.HasSuffix(strings.ToLower(req.QueueURL), ".fifo") {
		if req.MessageGroupID != "" {
			input.MessageGroupId = aws.String(req.MessageGroupID)
		}

		if req.MessageDeduplicationID != "" {
			input.MessageDeduplicationId = aws.String(req.MessageDeduplicationID)
		}
	}

	sendCtx, cancel := context.WithTimeout(ctx, sqsSendTimeout)
	defer cancel()

	out, err := client.SendMessage(sendCtx, input)
	if err != nil {
		return "", fmt.Errorf("sqs send: %w", err)
	}

	result := map[string]any{
		"status":    "sent",
		"messageId": aws.ToString(out.MessageId),
		"queueUrl":  req.QueueURL,
		"region":    req.Region,
	}

	if out.SequenceNumber != nil {
		result["sequenceNumber"] = aws.ToString(out.SequenceNumber)
	}

	b, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal send result: %w", err)
	}

	return string(b), nil
}

// sqsReceivedMsg is the per-message shape returned in the JSON response.
type sqsReceivedMsg struct {
	MessageID         string            `json:"messageId"`
	Body              string            `json:"body"`
	ReceiptHandle     string            `json:"receiptHandle"`
	Attributes        map[string]string `json:"attributes,omitempty"`
	MessageAttributes map[string]string `json:"messageAttributes,omitempty"`
}

// normaliseSqsReceiveReq applies defaults to fields that are out of range.
func normaliseSqsReceiveReq(req *SqsReceiveRequest) {
	if strings.TrimSpace(req.Region) == "" {
		req.Region = sqsDefaultRegion
	}

	if req.MaxMessages <= 0 || req.MaxMessages > sqsMaxMessages {
		req.MaxMessages = sqsMaxMessages
	}

	if req.WaitSeconds < 0 || req.WaitSeconds > sqsMaxWaitSeconds {
		req.WaitSeconds = sqsDefaultWaitSecs
	}
}

// decodeSqsMessages converts the AWS SDK response into a serialisable slice.
func decodeSqsMessages(out *sqs.ReceiveMessageOutput) []sqsReceivedMsg {
	msgs := make([]sqsReceivedMsg, 0, len(out.Messages))

	for _, m := range out.Messages {
		attrs := make(map[string]string, len(m.Attributes))
		for k, v := range m.Attributes {
			attrs[string(k)] = v
		}

		msgAttrs := make(map[string]string, len(m.MessageAttributes))
		for k, v := range m.MessageAttributes {
			if v.StringValue != nil {
				msgAttrs[k] = *v.StringValue
			}
		}

		msgs = append(msgs, sqsReceivedMsg{
			MessageID:         aws.ToString(m.MessageId),
			Body:              aws.ToString(m.Body),
			ReceiptHandle:     aws.ToString(m.ReceiptHandle),
			Attributes:        attrs,
			MessageAttributes: msgAttrs,
		})
	}

	return msgs
}

// SqsReceive fetches up to maxMessages messages from an SQS queue.
func SqsReceive(ctx context.Context, req SqsReceiveRequest) (string, error) {
	if strings.TrimSpace(req.QueueURL) == "" {
		return "", errors.New("queue URL is required")
	}

	normaliseSqsReceiveReq(&req)

	client, err := buildSqsClient(ctx, req.Region, req.Auth)
	if err != nil {
		return "", err
	}

	input := &sqs.ReceiveMessageInput{
		QueueUrl:              aws.String(req.QueueURL),
		MaxNumberOfMessages:   req.MaxMessages,
		WaitTimeSeconds:       req.WaitSeconds,
		MessageAttributeNames: []string{"All"},
		AttributeNames:        []types.QueueAttributeName{types.QueueAttributeNameAll},
	}

	recvCtx, cancel := context.WithTimeout(ctx, sqsReceiveTimeout)
	defer cancel()

	out, err := client.ReceiveMessage(recvCtx, input)
	if err != nil {
		return "", fmt.Errorf("sqs receive: %w", err)
	}

	msgs := decodeSqsMessages(out)

	result := map[string]any{
		"status":   "received",
		"queueUrl": req.QueueURL,
		"region":   req.Region,
		"count":    len(msgs),
		"messages": msgs,
	}

	b, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal receive result: %w", err)
	}

	return string(b), nil
}
