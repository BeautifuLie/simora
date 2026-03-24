package storage

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"simora/backend/domain"
)

type Settings struct{}

func NewSettings() *Settings {
	return &Settings{}
}

func (s *Settings) Load() (domain.Settings, error) {
	path, err := simoraFile("settings.json")
	if err != nil {
		return domain.DefaultSettings(), err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return domain.DefaultSettings(), nil
		}

		return domain.DefaultSettings(), fmt.Errorf("read settings: %w", err)
	}

	// Start from defaults so unknown fields keep their defaults.
	out := domain.DefaultSettings()
	if err := json.Unmarshal(data, &out); err != nil {
		return domain.DefaultSettings(), fmt.Errorf("parse settings: %w", err)
	}

	return out, nil
}

func (s *Settings) Save(cfg domain.Settings) error {
	path, err := simoraFile("settings.json")
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), dirPerm); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal settings: %w", err)
	}

	if err := os.WriteFile(path, data, filePerm); err != nil {
		return fmt.Errorf("write settings: %w", err)
	}

	return nil
}
