package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"simora/backend/service"
	"simora/backend/storage"
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

// ── Crash reporter ─────────────────────────────────────────────────────────

// ReportCrash writes a crash report to the crashes directory.
// It is called from the frontend when an unhandled JS error is detected.
func (a *App) ReportCrash(message string) error {
	dir, err := storage.CrashesDir()
	if err != nil {
		return fmt.Errorf("crash dir: %w", err)
	}

	name := fmt.Sprintf("crash-%s.log", time.Now().UTC().Format("2006-01-02T15-04-05"))
	content := fmt.Sprintf("version: %s\ntime: %s\n\n%s\n",
		Version,
		time.Now().UTC().Format(time.RFC3339),
		message,
	)

	if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600); err != nil {
		return fmt.Errorf("write crash report: %w", err)
	}

	return nil
}

// GetCrashReport returns the content of the most recent crash report, or an
// empty string when no reports are present.
func (a *App) GetCrashReport() (string, error) {
	dir, err := storage.CrashesDir()
	if err != nil {
		return "", fmt.Errorf("crash dir: %w", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", fmt.Errorf("read crash dir: %w", err)
	}

	// Find the most recent crash file (files are named with timestamps, so the
	// last entry in lexicographic order is the most recent).
	var latest os.DirEntry

	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "crash-") {
			latest = e
		}
	}

	if latest == nil {
		return "", nil
	}

	data, err := os.ReadFile(filepath.Join(dir, latest.Name()))
	if err != nil {
		return "", fmt.Errorf("read crash report: %w", err)
	}

	return string(data), nil
}

// ClearCrashReports deletes all crash report files.
func (a *App) ClearCrashReports() error {
	dir, err := storage.CrashesDir()
	if err != nil {
		return fmt.Errorf("crash dir: %w", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read crash dir: %w", err)
	}

	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "crash-") {
			if err := os.Remove(filepath.Join(dir, e.Name())); err != nil {
				return fmt.Errorf("delete crash report: %w", err)
			}
		}
	}

	return nil
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
