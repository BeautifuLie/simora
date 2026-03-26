// qa-seed adds or removes the "QA" workspace from ~/.config/simora/config.json.
//
// Usage:
//
//	go run ./cmd/qa-seed            # add QA workspace
//	go run ./cmd/qa-seed --remove   # remove QA workspace
//
// The QA workspace always uses the fixed ID qaOrgID so --remove can locate
// and delete it precisely without touching any other data.
package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"simora/backend/domain"
)

const (
	qaOrgID     = "qa-seed-org"
	qaProjectID = "qa-seed-project"
)

func main() {
	remove := flag.Bool("remove", false, "remove the QA workspace instead of adding it")

	flag.Parse()

	configPath, err := configFile()
	if err != nil {
		fatalf("config path: %v", err)
	}

	orgs, err := loadOrgs(configPath)
	if err != nil {
		fatalf("load config: %v", err)
	}

	if *remove {
		orgs = removeQAOrg(orgs)

		if err := saveOrgs(configPath, orgs); err != nil {
			fatalf("save config: %v", err)
		}

		fmt.Println("QA workspace removed.")

		return
	}

	// Remove stale QA org if present, then re-add fresh.
	orgs = removeQAOrg(orgs)

	qaOrg, err := buildQAOrg()
	if err != nil {
		fatalf("build QA org: %v", err)
	}

	orgs = append(orgs, qaOrg)

	if err := saveOrgs(configPath, orgs); err != nil {
		fatalf("save config: %v", err)
	}

	fmt.Println("QA workspace added.")
	fmt.Println("Open Simora and switch to the 'QA' workspace to start testing.")
}

// ── helpers ──────────────────────────────────────────────────────────────────

func configFile() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("home dir: %w", err)
	}

	return filepath.Join(home, ".config", "simora", "config.json"), nil
}

func loadOrgs(path string) ([]domain.Organisation, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []domain.Organisation{}, nil
		}

		return nil, fmt.Errorf("read config: %w", err)
	}

	var orgs []domain.Organisation
	if err := json.Unmarshal(data, &orgs); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	return orgs, nil
}

func saveOrgs(path string, orgs []domain.Organisation) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("mkdir: %w", err)
	}

	data, err := json.MarshalIndent(orgs, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	return nil
}

func removeQAOrg(orgs []domain.Organisation) []domain.Organisation {
	out := make([]domain.Organisation, 0, len(orgs))

	for _, o := range orgs {
		if o.ID != qaOrgID {
			out = append(out, o)
		}
	}

	return out
}

// buildQAOrg reads every qa/*.json file relative to the working directory and
// assembles them into a single Organisation with one Project.
func buildQAOrg() (domain.Organisation, error) {
	files := []struct {
		path string
		desc string
	}{
		{"qa/http.json", "HTTP"},
		{"qa/grpc.json", "gRPC"},
		{"qa/kafka.json", "Kafka"},
		{"qa/sqs.json", "SQS"},
		{"qa/websocket.json", "WebSocket"},
	}

	collections := make([]domain.Collection, 0, len(files))

	for _, f := range files {
		data, err := os.ReadFile(f.path)
		if err != nil {
			return domain.Organisation{}, fmt.Errorf("read %s: %w", f.path, err)
		}

		var col domain.Collection
		if err := json.Unmarshal(data, &col); err != nil {
			return domain.Organisation{}, fmt.Errorf("parse %s: %w", f.path, err)
		}

		collections = append(collections, col)

		fmt.Printf("  loaded %s collection (%s)\n", f.desc, f.path)
	}

	return domain.Organisation{
		ID:   qaOrgID,
		Name: "QA",
		Projects: []domain.Project{
			{
				ID:          qaProjectID,
				Name:        "QA",
				Collections: collections,
			},
		},
	}, nil
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "qa-seed: "+format+"\n", args...)
	os.Exit(1)
}
