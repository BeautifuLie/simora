package storage_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"simora/backend/domain"
	"simora/backend/storage"
)

type testEnv struct {
	repo    *storage.Organisation
	cfgPath string
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()

	dir := t.TempDir()
	cfgDir := filepath.Join(dir, ".config", "simora")
	require.NoError(t, os.MkdirAll(cfgDir, 0o755))
	cfgPath := filepath.Join(cfgDir, "config.json")

	t.Setenv("HOME", dir)
	t.Setenv("USERPROFILE", dir)

	return &testEnv{
		repo:    storage.NewOrganization(),
		cfgPath: cfgPath,
	}
}

func TestLoadOrganizations_EmptyFile_ReturnsEmptySlice(t *testing.T) {
	te := newTestEnv(t)

	orgs, err := te.repo.LoadOrganizations()

	require.NoError(t, err)
	assert.Equal(t, []domain.Organisation{}, orgs)
}

func TestLoadOrganizations_ValidJSON_ReturnsOrganizations(t *testing.T) {
	te := newTestEnv(t)

	expected := []domain.Organisation{
		{ID: "org-1", Name: "Test Org", Projects: []domain.Project{}},
	}
	data, err := json.Marshal(expected)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(te.cfgPath, data, 0o600))

	orgs, err := te.repo.LoadOrganizations()

	require.NoError(t, err)
	require.Len(t, orgs, 1)
	assert.Equal(t, "org-1", orgs[0].ID)
	assert.Equal(t, "Test Org", orgs[0].Name)
}

func TestSaveAndLoad_RoundTrip(t *testing.T) {
	te := newTestEnv(t)

	original := []domain.Organisation{
		{ID: "org-1", Name: "First Org", Projects: []domain.Project{}},
		{ID: "org-2", Name: "Second Org", Projects: []domain.Project{}},
	}

	require.NoError(t, te.repo.SaveOrganizations(original))

	loaded, err := te.repo.LoadOrganizations()

	require.NoError(t, err)
	require.Len(t, loaded, 2)
	assert.Equal(t, original[0].ID, loaded[0].ID)
	assert.Equal(t, original[0].Name, loaded[0].Name)
	assert.Equal(t, original[1].ID, loaded[1].ID)
	assert.Equal(t, original[1].Name, loaded[1].Name)
}

func TestSaveOrganizations_CreatesFile(t *testing.T) {
	te := newTestEnv(t)

	orgs := []domain.Organisation{
		{ID: "org-1", Name: "My Org", Projects: []domain.Project{}},
	}

	require.NoError(t, te.repo.SaveOrganizations(orgs))

	_, err := os.Stat(te.cfgPath)
	assert.NoError(t, err)
}

func TestLoadOrganizations_CorruptedJSON_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	require.NoError(t, os.WriteFile(te.cfgPath, []byte(`{not valid json`), 0o600))

	_, err := te.repo.LoadOrganizations()

	require.Error(t, err)
	assert.ErrorContains(t, err, "unmarshal config")
}
