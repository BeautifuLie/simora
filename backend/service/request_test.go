package service_test

import (
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"simora/backend/domain"
	"simora/backend/service"
)

type requestTestEnv struct {
	svc        *service.RequestService
	settingDir string
}

func newRequestTestEnv(t *testing.T) *requestTestEnv {
	t.Helper()

	dir := t.TempDir()
	cfgDir := filepath.Join(dir, ".config", "simora")
	require.NoError(t, os.MkdirAll(cfgDir, 0o755))

	t.Setenv("HOME", dir)
	t.Setenv("USERPROFILE", dir)

	svc, err := service.NewRequestService(service.NewContextHolder())
	require.NoError(t, err)

	return &requestTestEnv{
		svc:        svc,
		settingDir: cfgDir,
	}
}

func writeSettings(t *testing.T, dir string, cfg domain.Settings) {
	t.Helper()

	data, err := json.MarshalIndent(cfg, "", "  ")
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(dir, "settings.json"), data, 0o600))
}

func TestExecuteRequest_GET_Success(t *testing.T) {
	te := newRequestTestEnv(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	t.Cleanup(server.Close)

	resp, err := te.svc.ExecuteRequest(http.MethodGet, server.URL, "", nil)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Contains(t, resp.Body, "ok")
}

func TestExecuteRequest_POST_WithBody(t *testing.T) {
	te := newRequestTestEnv(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"created":true}`))
	}))
	t.Cleanup(server.Close)

	resp, err := te.svc.ExecuteRequest(http.MethodPost, server.URL, `{"name":"test"}`, map[string]string{
		"Content-Type": "application/json",
	})

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	assert.Contains(t, resp.Body, "created")
}

func TestExecuteRequest_Headers_AreSent(t *testing.T) {
	te := newRequestTestEnv(t)

	receivedHeader := ""

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedHeader = r.Header.Get("X-Custom-Token")
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	_, err := te.svc.ExecuteRequest(http.MethodGet, server.URL, "", map[string]string{
		"X-Custom-Token": "secret-token-123",
	})

	require.NoError(t, err)
	assert.Equal(t, "secret-token-123", receivedHeader)
}

func TestClearCookies_ResetsJar(t *testing.T) {
	te := newRequestTestEnv(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.SetCookie(w, &http.Cookie{Name: "session", Value: "abc123"})
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	_, err := te.svc.ExecuteRequest(http.MethodGet, server.URL, "", nil)
	require.NoError(t, err)

	require.NoError(t, te.svc.ClearCookies())

	parsedURL, err := url.Parse(server.URL)
	require.NoError(t, err)

	jar, err := cookiejar.New(nil)
	require.NoError(t, err)
	assert.Empty(t, jar.Cookies(parsedURL))
}

func TestExecuteRequest_Timeout_ReturnsError(t *testing.T) {
	te := newRequestTestEnv(t)

	writeSettings(t, te.settingDir, domain.Settings{
		Timeout:         1,
		FollowRedirects: true,
		ValidateSSL:     true,
		MaxRedirects:    10,
	})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	_, err := te.svc.ExecuteRequest(http.MethodGet, server.URL, "", nil)

	require.Error(t, err)
	assert.ErrorContains(t, err, "execute request")
}
