package service

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"simora/backend/domain"
)

type RequestService struct {
	mu        sync.Mutex
	appCtx    *ContextHolder
	settings  *SettingsService
	cookieJar *trackedJar
}

func NewRequestService(appCtx *ContextHolder) (*RequestService, error) {
	jar, err := newTrackedJar()
	if err != nil {
		return nil, fmt.Errorf("create cookie jar: %w", err)
	}

	return &RequestService{appCtx: appCtx, settings: NewSettingsService(), cookieJar: jar}, nil
}

// GetCookies returns all cookies currently stored in the jar.
func (s *RequestService) GetCookies() []CookieEntry {
	s.mu.Lock()
	jar := s.cookieJar
	s.mu.Unlock()

	return jar.All()
}

// DeleteCookie removes a single cookie from the tracked jar.
func (s *RequestService) DeleteCookie(domain, name string) {
	s.mu.Lock()
	jar := s.cookieJar
	s.mu.Unlock()
	jar.Delete(domain, name)
}

// ClearCookies resets the cookie jar, removing all stored cookies.
func (s *RequestService) ClearCookies() error {
	jar, err := newTrackedJar()
	if err != nil {
		return fmt.Errorf("create cookie jar: %w", err)
	}

	s.mu.Lock()
	s.cookieJar = jar
	s.mu.Unlock()

	return nil
}

// ExecuteRequest performs an HTTP request honouring the persisted user settings.
func (s *RequestService) ExecuteRequest(method, url, body string, headers map[string]string) (*domain.Response, error) {
	cfg, err := s.settings.Load()
	if err != nil {
		log.Printf("warn: settings load failed, using defaults: %v", err)

		cfg = domain.DefaultSettings()
	}

	s.mu.Lock()
	jar := s.cookieJar
	s.mu.Unlock()

	start := time.Now()

	reqBody, err := buildRequestBody(body, headers)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(s.appCtx.Get(), method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	for k, v := range headers {
		if k == "X-Simora-Binary" {
			continue
		}

		req.Header.Set(k, v)
	}

	client := s.buildClient(cfg, jar)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}

	defer resp.Body.Close()

	return readResponse(resp, start)
}

// buildRequestBody returns an io.Reader for the request body.
// If the X-Simora-Binary header is set, it decodes the base64 body and removes the marker header.
func buildRequestBody(body string, headers map[string]string) (io.Reader, error) {
	if headers["X-Simora-Binary"] == "base64" {
		decoded, err := base64.StdEncoding.DecodeString(body)
		if err != nil {
			return nil, fmt.Errorf("decode binary body: %w", err)
		}

		return bytes.NewReader(decoded), nil
	}

	if body != "" {
		return bytes.NewBufferString(body), nil
	}

	return nil, nil
}

// buildClient creates an http.Client with settings from cfg.
func (s *RequestService) buildClient(cfg domain.Settings, jar http.CookieJar) *http.Client {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: !cfg.ValidateSSL,
		},
	}

	timeout := time.Duration(cfg.Timeout) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}

	maxRedirects := cfg.MaxRedirects
	if maxRedirects <= 0 {
		maxRedirects = 10
	}

	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
		Jar:       jar,
		CheckRedirect: func(_ *http.Request, via []*http.Request) error {
			if !cfg.FollowRedirects {
				return http.ErrUseLastResponse
			}

			if len(via) >= maxRedirects {
				return fmt.Errorf("too many redirects (max %d)", maxRedirects)
			}

			return nil
		},
	}
}

// isTextContentType returns true when the Content-Type indicates human-readable text.
func isTextContentType(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(ct))
	// Strip params (e.g. "; charset=utf-8")
	if idx := strings.Index(ct, ";"); idx != -1 {
		ct = strings.TrimSpace(ct[:idx])
	}

	textTypes := []string{
		"text/",
		"application/json",
		"application/xml",
		"application/javascript",
		"application/graphql",
		"application/x-www-form-urlencoded",
		"application/ld+json",
		"application/geo+json",
		"application/atom+xml",
		"application/rss+xml",
		"application/xhtml+xml",
		"*/*",
	}

	for _, t := range textTypes {
		if strings.HasPrefix(ct, t) || ct == t {
			return true
		}
	}

	return ct == ""
}

// readResponse reads the HTTP response body and returns a domain.Response.
func readResponse(resp *http.Response, start time.Time) (*domain.Response, error) {
	const maxResponseSize = 10 * 1024 * 1024 // 10 MB

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	ct := resp.Header.Get("Content-Type")
	isBinary := !isTextContentType(ct)

	var bodyStr string
	if isBinary {
		bodyStr = base64.StdEncoding.EncodeToString(respBody)
	} else {
		bodyStr = string(respBody)
	}

	return &domain.Response{
		StatusCode:       resp.StatusCode,
		Status:           resp.Status,
		TimeMilliseconds: time.Since(start).Milliseconds(),
		SizeBytes:        int64(len(respBody)),
		Body:             bodyStr,
		Headers:          resp.Header,
		IsBinary:         isBinary,
		ContentType:      ct,
	}, nil
}
