package service

import (
	"fmt"

	"simora/backend/domain"
	"simora/backend/storage"
)

// SettingsService exposes load/save for user preferences to Wails.
type SettingsService struct {
	store *storage.Settings
}

func NewSettingsService() *SettingsService {
	return &SettingsService{store: storage.NewSettings()}
}

func (s *SettingsService) Load() (domain.Settings, error) {
	cfg, err := s.store.Load()
	if err != nil {
		return cfg, fmt.Errorf("load settings: %w", err)
	}

	return cfg, nil
}

func (s *SettingsService) Save(cfg domain.Settings) error {
	if err := s.store.Save(cfg); err != nil {
		return fmt.Errorf("save settings: %w", err)
	}

	return nil
}
