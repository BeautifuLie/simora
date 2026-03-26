package service

import (
	"context"
	"fmt"
	"time"

	wailsrt "github.com/wailsapp/wails/v2/pkg/runtime"
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
// Kept for backward compatibility with integration tests.
func (s *WsService) Connect(req transport.WsConnectRequest) (string, error) {
	ctx, cancel := context.WithTimeout(s.appCtx.Get(), wsConnectTimeout)
	defer cancel()

	result, err := transport.WsConnect(ctx, req)
	if err != nil {
		return "", fmt.Errorf("ws connect: %w", err)
	}

	return result, nil
}

// Open dials a persistent WebSocket connection and registers it in the pool.
// Incoming messages and close events are emitted as Wails events to the frontend.
func (s *WsService) Open(req transport.WsOpenRequest) (string, error) {
	connID := fmt.Sprintf("ws_%d", time.Now().UnixNano())
	appCtx := s.appCtx.Get()

	onMsg := func(msg transport.WsIncomingMsg) {
		wailsrt.EventsEmit(appCtx, "ws:msg:"+connID, msg)
	}

	onClose := func(err error) {
		errStr := ""
		if err != nil {
			errStr = err.Error()
		}

		wailsrt.EventsEmit(appCtx, "ws:close:"+connID, errStr)
	}

	ctx, cancel := context.WithTimeout(s.appCtx.Get(), wsConnectTimeout)
	defer cancel()

	if err := transport.DefaultWsPool.Open(ctx, connID, req, onMsg, onClose); err != nil {
		return "", fmt.Errorf("ws open: %w", err)
	}

	return connID, nil
}

// Send writes a text message to an open persistent connection.
func (s *WsService) Send(connID string, message string) error {
	if err := transport.DefaultWsPool.Send(connID, message); err != nil {
		return fmt.Errorf("ws send: %w", err)
	}

	return nil
}

// Close terminates a persistent connection.
func (s *WsService) Close(connID string) error {
	if err := transport.DefaultWsPool.Close(connID); err != nil {
		return fmt.Errorf("ws close: %w", err)
	}

	return nil
}
