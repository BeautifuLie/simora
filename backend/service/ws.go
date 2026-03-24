package service

import (
	"context"
	"fmt"
	"time"

	"simora/backend/transport"
)

const wsConnectTimeout = 5 * time.Minute

// WsService exposes WebSocket operations to the Wails frontend.
type WsService struct {
	appCtx *ContextHolder
}

// NewWsService creates a new WsService.
func NewWsService(appCtx *ContextHolder) *WsService { return &WsService{appCtx: appCtx} }

// Connect dials a WebSocket endpoint and returns received messages as JSON.
func (s *WsService) Connect(req transport.WsConnectRequest) (string, error) {
	ctx, cancel := context.WithTimeout(s.appCtx.Get(), wsConnectTimeout)
	defer cancel()

	result, err := transport.WsConnect(ctx, req)
	if err != nil {
		return "", fmt.Errorf("ws connect: %w", err)
	}

	return result, nil
}
