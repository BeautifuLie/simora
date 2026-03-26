package transport

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WsConnectRequest is the payload sent from the frontend.
type WsConnectRequest struct {
	URL         string
	Headers     map[string]string
	Message     string // optional message sent immediately after connect
	MaxMessages int    // 0 → wsDefaultMaxMsgs
	IdleTimeout int    // seconds, 0 → wsIdleTimeout
	TLSInsecure bool   // skip TLS certificate verification
}

type wsReceivedMsg struct {
	Type      string `json:"type"` // "text" | "binary"
	Data      string `json:"data"`
	Timestamp string `json:"timestamp"`
}

// WsIncomingMsg is pushed to the frontend via Wails events for persistent connections.
type WsIncomingMsg struct {
	Type      string `json:"type"` // "text" | "binary"
	Data      string `json:"data"`
	Timestamp string `json:"timestamp"`
}

// WsOpenRequest carries parameters for opening a persistent WebSocket connection.
type WsOpenRequest struct {
	URL         string
	Headers     map[string]string
	TLSInsecure bool
}

// wsConn wraps an active persistent WebSocket connection.
type wsConn struct {
	conn      *websocket.Conn
	cancel    context.CancelFunc
	onMessage func(WsIncomingMsg)
	onClose   func(err error)
}

// WsPool manages a set of persistent WebSocket connections keyed by connection ID.
type WsPool struct {
	conns sync.Map // string → *wsConn
}

// DefaultWsPool is the application-level pool used by WsService.
var DefaultWsPool = &WsPool{}

// Open dials a WebSocket, registers it in the pool, and starts a reader goroutine.
// onMsg is called for every incoming message; onClose is called when the connection ends.
func (p *WsPool) Open(
	ctx context.Context,
	connID string,
	req WsOpenRequest,
	onMsg func(WsIncomingMsg),
	onClose func(err error),
) error {
	dialer := wsDialer(req.TLSInsecure)

	conn, _, err := dialer.DialContext(ctx, req.URL, wsHeaders(req.Headers))
	if err != nil {
		return fmt.Errorf("connect to %s: %w", req.URL, err)
	}

	conn.SetReadLimit(wsMaxMsgBytes)

	connCtx, cancel := context.WithCancel(context.Background())

	wc := &wsConn{
		conn:      conn,
		cancel:    cancel,
		onMessage: onMsg,
		onClose:   onClose,
	}

	p.conns.Store(connID, wc)

	go p.readLoop(connID, wc, connCtx)

	return nil
}

func (p *WsPool) readLoop(connID string, wc *wsConn, ctx context.Context) {
	var readErr error

	defer func() {
		wc.cancel()
		p.conns.Delete(connID)
		wc.conn.Close()
		wc.onClose(readErr)
	}()

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		mt, data, err := wc.conn.ReadMessage()
		if err != nil {
			readErr = err
			return
		}

		msg := WsIncomingMsg{Timestamp: time.Now().UTC().Format(time.RFC3339)}

		switch mt {
		case websocket.TextMessage:
			msg.Type = "text"
			msg.Data = string(data)
		case websocket.BinaryMessage:
			msg.Type = "binary"
			msg.Data = base64.StdEncoding.EncodeToString(data)
		default:
			continue
		}

		wc.onMessage(msg)
	}
}

// Send writes a text message to the identified connection.
func (p *WsPool) Send(connID, message string) error {
	val, ok := p.conns.Load(connID)
	if !ok {
		return fmt.Errorf("connection %s not found", connID)
	}

	wc, ok := val.(*wsConn)
	if !ok {
		return fmt.Errorf("invalid connection entry for %s", connID)
	}

	if err := wc.conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
		return fmt.Errorf("send to %s: %w", connID, err)
	}

	return nil
}

// Close terminates the identified persistent connection.
func (p *WsPool) Close(connID string) error {
	val, ok := p.conns.Load(connID)
	if !ok {
		return nil
	}

	wc, ok := val.(*wsConn)
	if !ok {
		return nil
	}

	wc.cancel()
	wc.conn.Close()
	p.conns.Delete(connID)

	return nil
}

// wsDialer builds a gorilla dialer, optionally skipping TLS verification.
func wsDialer(insecure bool) *websocket.Dialer {
	d := &websocket.Dialer{
		HandshakeTimeout: wsConnectTimeout,
	}

	if insecure {
		d.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec
	}

	return d
}

// wsHeaders converts a map to HTTP headers for the upgrade request.
func wsHeaders(h map[string]string) http.Header {
	out := http.Header{}

	for k, v := range h {
		out.Set(k, v)
	}

	return out
}

// WsConnect dials a WebSocket endpoint, optionally sends one message,
// then collects up to maxMessages replies until the idle timer fires.
func WsConnect(ctx context.Context, req WsConnectRequest) (string, error) {
	maxMsgs := req.MaxMessages
	if maxMsgs <= 0 {
		maxMsgs = wsDefaultMaxMsgs
	}

	idle := time.Duration(req.IdleTimeout) * time.Second
	if idle <= 0 {
		idle = wsIdleTimeout
	}

	dialer := wsDialer(req.TLSInsecure)

	conn, _, err := dialer.DialContext(ctx, req.URL, wsHeaders(req.Headers))
	if err != nil {
		return "", fmt.Errorf("connect to %s: %w", req.URL, err)
	}

	defer conn.Close()

	conn.SetReadLimit(wsMaxMsgBytes)

	if strings.TrimSpace(req.Message) != "" {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(req.Message)); err != nil {
			return "", fmt.Errorf("send initial message: %w", err)
		}
	}

	messages, err := collectWsMessages(ctx, conn, maxMsgs, idle)
	if err != nil && len(messages) == 0 {
		return "", err
	}

	result := map[string]any{
		"status":   "connected",
		"url":      req.URL,
		"count":    len(messages),
		"messages": messages,
	}

	b, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal result: %w", err)
	}

	return string(b), nil
}

// collectWsMessages reads up to maxMsgs messages from conn, stopping when
// ctx is done or no message arrives within the idle window.
func collectWsMessages(
	ctx context.Context,
	conn *websocket.Conn,
	maxMsgs int,
	idle time.Duration,
) ([]wsReceivedMsg, error) {
	msgs := make([]wsReceivedMsg, 0, maxMsgs)
	done := make(chan struct{})

	go func() {
		select {
		case <-ctx.Done():
		case <-done:
		}

		conn.Close()
	}()

	defer close(done)

	deadline := time.Now().Add(idle)

	for len(msgs) < maxMsgs {
		if err := conn.SetReadDeadline(deadline); err != nil {
			break
		}

		mt, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		m := wsReceivedMsg{Timestamp: time.Now().UTC().Format(time.RFC3339)}

		switch mt {
		case websocket.TextMessage:
			m.Type = "text"
			m.Data = string(data)
		case websocket.BinaryMessage:
			m.Type = "binary"
			m.Data = base64.StdEncoding.EncodeToString(data)
		default:
			continue
		}

		msgs = append(msgs, m)
		deadline = time.Now().Add(idle)
	}

	return msgs, nil
}
