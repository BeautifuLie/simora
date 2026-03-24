package service

import (
	"fmt"

	"simora/backend/transport"
)

// SqsService exposes SQS send/receive to Wails.
type SqsService struct {
	appCtx *ContextHolder
}

func NewSqsService(appCtx *ContextHolder) *SqsService { return &SqsService{appCtx: appCtx} }

// Send sends a message to an SQS queue.
func (s *SqsService) Send(req transport.SqsSendRequest) (string, error) {
	result, err := transport.SqsSend(s.appCtx.Get(), req)
	if err != nil {
		return "", fmt.Errorf("sqs send: %w", err)
	}

	return result, nil
}

// Receive fetches messages from an SQS queue.
func (s *SqsService) Receive(req transport.SqsReceiveRequest) (string, error) {
	result, err := transport.SqsReceive(s.appCtx.Get(), req)
	if err != nil {
		return "", fmt.Errorf("sqs receive: %w", err)
	}

	return result, nil
}
