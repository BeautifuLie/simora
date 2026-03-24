package service

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"sync"
	"time"

	"simora/backend/domain"
)

type RequestService struct {
	mu        sync.Mutex
	settings  *SettingsService
	cookieJar http.CookieJar
}

func NewRequestService() (*RequestService, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, fmt.Errorf("create cookie jar: %w", err)
	}

	return &RequestService{settings: NewSettingsService(), cookieJar: jar}, nil
}

// ClearCookies resets the cookie jar, removing all stored cookies.
func (s *RequestService) ClearCookies() error {
	jar, err := cookiejar.New(nil)
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

	req, err := http.NewRequestWithContext(context.Background(), method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	for k, v := range headers {
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
		delete(headers, "X-Simora-Binary")

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

// readResponse reads the HTTP response body and returns a domain.Response.
func readResponse(resp *http.Response, start time.Time) (*domain.Response, error) {
	const maxResponseSize = 10 * 1024 * 1024 // 10 MB

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	return &domain.Response{
		StatusCode:       resp.StatusCode,
		Status:           resp.Status,
		TimeMilliseconds: time.Since(start).Milliseconds(),
		SizeBytes:        int64(len(respBody)),
		Body:             string(respBody),
		Headers:          resp.Header,
	}, nil
}
