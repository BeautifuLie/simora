package storage

import (
	"fmt"
	"os"
	"path/filepath"
)

// File permission constants shared across all storage files.
const (
	dirPerm  = 0o755 // ~/.config/simora/
	filePerm = 0o600 // config files (owner read/write only)
)

// simoraDir returns the application config directory (~/.config/simora).
func simoraDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("get home dir: %w", err)
	}

	return filepath.Join(home, ".config", "simora"), nil
}

// simoraFile returns the full path to a named file inside the app config dir.
func simoraFile(name string) (string, error) {
	dir, err := simoraDir()
	if err != nil {
		return "", err
	}

	return filepath.Join(dir, name), nil
}
