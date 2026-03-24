package service

import (
	"context"
	"fmt"
	"time"

	"simora/backend/transport"
)

const (
	kafkaProduceTimeout = 30 * time.Second
	kafkaConsumeTimeout = 2 * time.Minute
)

type KafkaService struct {
	appCtx *ContextHolder
}

func NewKafkaService(appCtx *ContextHolder) *KafkaService { return &KafkaService{appCtx: appCtx} }

// Produce sends a message to a Kafka topic.
func (s *KafkaService) Produce(req transport.KafkaProduceRequest) (string, error) {
	ctx, cancel := context.WithTimeout(s.appCtx.Get(), kafkaProduceTimeout)
	defer cancel()

	result, err := transport.KafkaProduce(ctx, req)
	if err != nil {
		return "", fmt.Errorf("kafka produce: %w", err)
	}

	return result, nil
}

// Consume reads up to maxMessages messages from a Kafka topic.
func (s *KafkaService) Consume(req transport.KafkaConsumeRequest, maxMessages int) (string, error) {
	ctx, cancel := context.WithTimeout(s.appCtx.Get(), kafkaConsumeTimeout)
	defer cancel()

	result, err := transport.KafkaConsume(ctx, req, maxMessages)
	if err != nil {
		return "", fmt.Errorf("kafka consume: %w", err)
	}

	return result, nil
}
