package service_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"simora/backend/domain"
	"simora/backend/service"
)

type settingsTestEnv struct {
	svc         *service.SettingsService
	settingsDir string
}

func newSettingsTestEnv(t *testing.T) *settingsTestEnv {
	t.Helper()

	dir := t.TempDir()
	cfgDir := filepath.Join(dir, ".config", "simora")
	require.NoError(t, os.MkdirAll(cfgDir, 0o755))

	t.Setenv("HOME", dir)
	t.Setenv("USERPROFILE", dir)

	return &settingsTestEnv{
		svc:         service.NewSettingsService(),
		settingsDir: cfgDir,
	}
}

func TestSettingsLoad_ReturnsDefaults(t *testing.T) {
	te := newSettingsTestEnv(t)

	cfg, err := te.svc.Load()

	require.NoError(t, err)
	assert.Equal(t, domain.DefaultSettings(), cfg)
}

func TestSettingsSaveAndLoad_RoundTrip(t *testing.T) {
	te := newSettingsTestEnv(t)

	custom := domain.Settings{
		Timeout:         5000,
		FollowRedirects: false,
		ValidateSSL:     false,
		MaxRedirects:    3,
		SendOnEnter:     true,
		FontSize:        "lg",
		Theme:           "light",
		AccentColor:     "#ff0000",
	}

	require.NoError(t, te.svc.Save(custom))

	loaded, err := te.svc.Load()

	require.NoError(t, err)
	assert.Equal(t, custom, loaded)
}

func TestSettingsLoad_InvalidJSON_ReturnsError(t *testing.T) {
	te := newSettingsTestEnv(t)

	settingsPath := filepath.Join(te.settingsDir, "settings.json")
	require.NoError(t, os.WriteFile(settingsPath, []byte(`{bad json`), 0o600))

	_, err := te.svc.Load()

	require.Error(t, err)
	assert.ErrorContains(t, err, "parse settings")
}

func TestSettingsSave_PersistsToFile(t *testing.T) {
	te := newSettingsTestEnv(t)

	cfg := domain.Settings{
		Timeout:         10000,
		FollowRedirects: true,
		ValidateSSL:     true,
		MaxRedirects:    5,
		FontSize:        "sm",
		Theme:           "dark",
	}

	require.NoError(t, te.svc.Save(cfg))

	settingsPath := filepath.Join(te.settingsDir, "settings.json")
	data, err := os.ReadFile(settingsPath)
	require.NoError(t, err)

	var persisted domain.Settings
	require.NoError(t, json.Unmarshal(data, &persisted))
	assert.Equal(t, cfg.Timeout, persisted.Timeout)
	assert.Equal(t, cfg.Theme, persisted.Theme)
}
