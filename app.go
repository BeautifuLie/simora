package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"simora/backend/service"
)

// App struct.
type App struct {
	ctx    context.Context
	appCtx *service.ContextHolder
}

// NewApp creates a new App application struct.
func NewApp(appCtx *service.ContextHolder) *App {
	return &App{appCtx: appCtx}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.appCtx.Set(ctx)
}

// GetVersion returns the application version set at build time.
func (a *App) GetVersion() string {
	return Version
}

// UpdateInfo is returned by CheckForUpdate.
type UpdateInfo struct {
	Available     bool   `json:"available"`
	LatestVersion string `json:"latestVersion"`
	ReleaseURL    string `json:"releaseURL"`
}

const githubReleasesURL = "https://api.github.com/repos/BeautifuLie/simora/releases/latest"

// CheckForUpdate fetches the latest GitHub release and reports whether a newer
// version than the currently running one is available.
func (a *App) CheckForUpdate() (UpdateInfo, error) {
	if Version == "dev" {
		return UpdateInfo{}, nil
	}

	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequestWithContext(a.appCtx.Get(), http.MethodGet, githubReleasesURL, nil)
	if err != nil {
		return UpdateInfo{}, fmt.Errorf("build request: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return UpdateInfo{}, fmt.Errorf("fetch releases: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return UpdateInfo{}, fmt.Errorf("fetch releases: unexpected status %d", resp.StatusCode)
	}

	var payload struct {
		TagName string `json:"tag_name"`
		HTMLURL string `json:"html_url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return UpdateInfo{}, fmt.Errorf("decode release: %w", err)
	}

	latest := strings.TrimPrefix(payload.TagName, "v")
	current := strings.TrimPrefix(Version, "v")

	return UpdateInfo{
		Available:     latest != current,
		LatestVersion: payload.TagName,
		ReleaseURL:    payload.HTMLURL,
	}, nil
}

// SaveFile opens a native save-file dialog and writes content to the chosen path.
// Returns an empty string if the user cancelled.
func (a *App) SaveFile(content, defaultFilename string) error {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultFilename,
	})
	if err != nil {
		return fmt.Errorf("save dialog: %w", err)
	}

	if path == "" {
		return nil
	}

	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	return nil
}
