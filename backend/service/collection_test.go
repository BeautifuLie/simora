package service_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"simora/backend/domain"
	"simora/backend/keyring"
	"simora/backend/service"
	mock "simora/backend/test/mock/repository"
)

type collectionTestEnv struct {
	mockRepo *mock.MockOrganizationRepository
	orgSvc   *service.OrganizationService
	collSvc  *service.CollectionService
	kr       *keyring.MemStore
}

func newCollectionTestEnv(t *testing.T) *collectionTestEnv {
	t.Helper()

	ctrl := gomock.NewController(t)

	kr := keyring.NewMemStore()
	mockRepo := mock.NewMockOrganizationRepository(ctrl)
	orgSvc := service.NewOrganizationService(mockRepo, kr)
	collSvc := service.NewCollectionService(orgSvc, kr)

	return &collectionTestEnv{
		mockRepo: mockRepo,
		orgSvc:   orgSvc,
		collSvc:  collSvc,
		kr:       kr,
	}
}

func makeRequestWithAuth(id, name, token string) domain.Request {
	return domain.Request{
		ID:   id,
		Name: name,
		Auth: &domain.AuthConfig{
			Type:  "bearer",
			Token: token,
		},
	}
}

func TestExportCollection_WithoutSecrets_HasSimoraMarkerAndEmptyCredentials(t *testing.T) {
	te := newCollectionTestEnv(t)

	req := makeRequestWithAuth("req-1", "My Request", "secret-token")
	coll := makeCollection("coll-1", "My Collection", req)
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	result, err := te.collSvc.ExportCollection("org-1", "proj-1", "coll-1", service.ExportOptions{
		IncludeSecrets: false,
	})

	require.NoError(t, err)

	var parsed map[string]json.RawMessage
	require.NoError(t, json.Unmarshal([]byte(result), &parsed))

	assert.Equal(t, "true", string(parsed["__simoraCollection"]))

	var requests []map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(parsed["requests"], &requests))
	require.Len(t, requests, 1)

	var auth map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(requests[0]["auth"], &auth))
	assert.Equal(t, `""`, string(auth["token"]))
}

func TestExportCollection_WithSecrets_HasExportedSecretsMapAndEmptyCredentialFields(t *testing.T) {
	te := newCollectionTestEnv(t)

	req := makeRequestWithAuth("req-1", "My Request", "secret-token")
	coll := makeCollection("coll-1", "My Collection", req)
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	result, err := te.collSvc.ExportCollection("org-1", "proj-1", "coll-1", service.ExportOptions{
		IncludeSecrets: true,
		Password:       "export-password",
	})

	require.NoError(t, err)

	var parsed map[string]json.RawMessage
	require.NoError(t, json.Unmarshal([]byte(result), &parsed))

	assert.Equal(t, "true", string(parsed["__simoraCollection"]))
	assert.Contains(t, parsed, "exportedSecrets")

	var secrets map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(parsed["exportedSecrets"], &secrets))
	assert.NotEmpty(t, secrets)

	var requests []map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(parsed["requests"], &requests))
	require.Len(t, requests, 1)

	var auth map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(requests[0]["auth"], &auth))
	assert.Equal(t, `""`, string(auth["token"]))
}

func TestImportCollection_WithoutSecrets_AddsCollectionWithFreshIDs(t *testing.T) {
	te := newCollectionTestEnv(t)

	req := makeRequest("req-1", "My Request")
	coll := makeCollection("coll-1", "My Collection", req)
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	exported, err := te.collSvc.ExportCollection("org-1", "proj-1", "coll-1", service.ExportOptions{
		IncludeSecrets: false,
	})
	require.NoError(t, err)

	proj2 := makeProject("proj-2", "Target Project")
	org2 := makeOrg("org-2", "Target Org", proj2)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org2}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	imported, err := te.collSvc.ImportCollection("org-2", "proj-2", exported, "")

	require.NoError(t, err)
	assert.NotEmpty(t, imported.ID)
	assert.NotEqual(t, "coll-1", imported.ID)
	require.Len(t, imported.Requests, 1)
	assert.NotEqual(t, "req-1", imported.Requests[0].ID)
}

func TestImportCollection_WithSecretsAndCorrectPassword_ImportSucceeds(t *testing.T) {
	te := newCollectionTestEnv(t)

	req := makeRequestWithAuth("req-1", "My Request", "my-bearer-token")
	coll := makeCollection("coll-1", "My Collection", req)
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	exported, err := te.collSvc.ExportCollection("org-1", "proj-1", "coll-1", service.ExportOptions{
		IncludeSecrets: true,
		Password:       "export-password",
	})
	require.NoError(t, err)

	proj2 := makeProject("proj-2", "Target Project")
	org2 := makeOrg("org-2", "Target Org", proj2)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org2}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	imported, err := te.collSvc.ImportCollection("org-2", "proj-2", exported, "export-password")

	require.NoError(t, err)
	assert.NotEmpty(t, imported.ID)
	assert.NotEqual(t, "coll-1", imported.ID)
	require.Len(t, imported.Requests, 1)
	assert.NotEqual(t, "req-1", imported.Requests[0].ID)
}

func TestImportCollection_WithSecretsAndWrongPassword_ReturnsErrWrongPassword(t *testing.T) {
	te := newCollectionTestEnv(t)

	req := makeRequestWithAuth("req-1", "My Request", "my-bearer-token")
	coll := makeCollection("coll-1", "My Collection", req)
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	exported, err := te.collSvc.ExportCollection("org-1", "proj-1", "coll-1", service.ExportOptions{
		IncludeSecrets: true,
		Password:       "correct-password",
	})
	require.NoError(t, err)

	_, err = te.collSvc.ImportCollection("org-2", "proj-2", exported, "wrong-password")

	require.Error(t, err)
	assert.ErrorIs(t, err, service.ErrWrongPassword)
}

func TestImportCollection_NonSimoraJSON_ReturnsError(t *testing.T) {
	te := newCollectionTestEnv(t)

	nonSimora := `{"name": "some collection", "requests": []}`

	_, err := te.collSvc.ImportCollection("org-1", "proj-1", nonSimora, "")

	require.Error(t, err)
	assert.ErrorContains(t, err, "not a Simora collection export")
}
