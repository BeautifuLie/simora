package storage

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"simora/backend/domain"
)

type Organisation struct{}

func NewOrganization() *Organisation {
	return &Organisation{}
}

func (o *Organisation) LoadOrganizations() ([]domain.Organisation, error) {
	path, err := simoraFile("config.json")
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []domain.Organisation{}, nil
		}

		return nil, fmt.Errorf("read config: %w", err)
	}

	var organisations []domain.Organisation
	if err := json.Unmarshal(data, &organisations); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	return organisations, nil
}

func (o *Organisation) SaveOrganizations(organisations []domain.Organisation) error {
	path, err := simoraFile("config.json")
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), dirPerm); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}

	data, err := json.MarshalIndent(organisations, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}

	if err := os.WriteFile(path, data, filePerm); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	return nil
}
