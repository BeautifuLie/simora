package main

import (
	"context"
	"fmt"
	"os"

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
