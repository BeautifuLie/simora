package transport

import (
	"crypto/sha256"
	"crypto/sha512"
	"fmt"

	"github.com/IBM/sarama"
	"github.com/xdg-go/scram"
)

var (
	SHA256 scram.HashGeneratorFcn = sha256.New
	SHA512 scram.HashGeneratorFcn = sha512.New
)

// XDGSCRAMClient implements sarama.SCRAMClient using xdg-go/scram.
type XDGSCRAMClient struct {
	*scram.Client
	*scram.ClientConversation
	scram.HashGeneratorFcn
}

func (x *XDGSCRAMClient) Begin(userName, password, authzID string) error {
	client, err := x.NewClient(userName, password, authzID)
	if err != nil {
		return fmt.Errorf("create SCRAM client: %w", err)
	}

	x.Client = client
	x.ClientConversation = x.NewConversation()

	return nil
}

func (x *XDGSCRAMClient) Step(challenge string) (string, error) {
	response, err := x.ClientConversation.Step(challenge)
	if err != nil {
		return "", fmt.Errorf("SCRAM step: %w", err)
	}

	return response, nil
}

func (x *XDGSCRAMClient) Done() bool {
	return x.ClientConversation.Done()
}

var _ sarama.SCRAMClient = &XDGSCRAMClient{}
