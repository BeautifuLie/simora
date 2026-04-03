package service_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"simora/backend/domain"
	"simora/backend/keyring"
	"simora/backend/service"
	mock "simora/backend/test/mock/repository"
)

type testEnv struct {
	mockRepo *mock.MockOrganizationRepository
	svc      *service.OrganizationService
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()

	ctrl := gomock.NewController(t)

	te := &testEnv{
		mockRepo: mock.NewMockOrganizationRepository(ctrl),
	}
	te.svc = service.NewOrganizationService(te.mockRepo, keyring.NewMemStore())

	return te
}

func makeOrg(id, name string, projects ...domain.Project) domain.Organisation {
	if projects == nil {
		projects = []domain.Project{}
	}

	return domain.Organisation{
		ID:       id,
		Name:     name,
		Projects: projects,
	}
}

func makeProject(id, name string, collections ...domain.Collection) domain.Project {
	if collections == nil {
		collections = []domain.Collection{}
	}

	return domain.Project{
		ID:          id,
		Name:        name,
		Collections: collections,
	}
}

func makeCollection(id, name string, requests ...domain.Request) domain.Collection {
	if requests == nil {
		requests = []domain.Request{}
	}

	return domain.Collection{
		ID:       id,
		Name:     name,
		Requests: requests,
		Folders:  []domain.Folder{},
	}
}

func makeRequest(id, name string) domain.Request {
	return domain.Request{
		ID:   id,
		Name: name,
	}
}

func makeFolder(id, name string) domain.Folder {
	return domain.Folder{
		ID:       id,
		Name:     name,
		Requests: []domain.Request{},
		Folders:  []domain.Folder{},
	}
}

func TestCreateOrganization_Success(t *testing.T) {
	te := newTestEnv(t)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.CreateOrganization("org-1", "My Org")

	require.NoError(t, err)
}

func TestCreateOrganization_SaveFails_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(errors.New("disk full"))

	err := te.svc.CreateOrganization("org-1", "My Org")

	require.Error(t, err)
	assert.ErrorContains(t, err, "disk full")
}

func TestCreateOrganization_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	err := te.svc.CreateOrganization("org-1", "   ")

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestCreateOrganization_LoadFails_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	te.mockRepo.EXPECT().LoadOrganizations().Return(nil, errors.New("io error"))

	err := te.svc.CreateOrganization("org-1", "My Org")

	require.Error(t, err)
	assert.ErrorContains(t, err, "io error")
}

func TestRenameOrganization_Success(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "Old Name")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.RenameOrganization("org-1", "New Name")

	require.NoError(t, err)
}

func TestRenameOrganization_OrgNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{}, nil)

	err := te.svc.RenameOrganization("missing-org", "New Name")

	require.Error(t, err)
	assert.ErrorContains(t, err, "organisation not found")
}

func TestRenameOrganization_SaveFails_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "Old Name")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(errors.New("write error"))

	err := te.svc.RenameOrganization("org-1", "New Name")

	require.Error(t, err)
	assert.ErrorContains(t, err, "write error")
}

func TestRenameOrganization_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	err := te.svc.RenameOrganization("org-1", "")

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestDeleteOrganization_Success(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "My Org")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.DeleteOrganization("org-1")

	require.NoError(t, err)
}

func TestDeleteOrganization_OrgNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{}, nil)

	err := te.svc.DeleteOrganization("missing-org")

	require.Error(t, err)
	assert.ErrorContains(t, err, "organisation not found")
}

func TestCreateProject_Success(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "My Org")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.CreateProject("org-1", "proj-1", "My Project")

	require.NoError(t, err)
}

func TestCreateProject_OrgNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{}, nil)

	err := te.svc.CreateProject("missing-org", "proj-1", "My Project")

	require.Error(t, err)
	assert.ErrorContains(t, err, "organisation not found")
}

func TestCreateProject_SaveFails_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "My Org")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(errors.New("write error"))

	err := te.svc.CreateProject("org-1", "proj-1", "My Project")

	require.Error(t, err)
	assert.ErrorContains(t, err, "write error")
}

func TestCreateProject_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	err := te.svc.CreateProject("org-1", "proj-1", "  ")

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestRenameProject_Success(t *testing.T) {
	te := newTestEnv(t)

	proj := makeProject("proj-1", "Old Project")
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.RenameProject("org-1", "proj-1", "New Project")

	require.NoError(t, err)
}

func TestRenameProject_ProjectNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "My Org")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	err := te.svc.RenameProject("org-1", "missing-proj", "New Name")

	require.Error(t, err)
	assert.ErrorContains(t, err, "project not found")
}

func TestRenameProject_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	err := te.svc.RenameProject("org-1", "proj-1", "")

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestDeleteProject_Success(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.DeleteProject("org-1", "proj-1")

	require.NoError(t, err)
}

func TestDeleteProject_ProjectNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "My Org")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	err := te.svc.DeleteProject("org-1", "missing-proj")

	require.Error(t, err)
	assert.ErrorContains(t, err, "project not found")
}

func TestDeleteProject_OrgNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{}, nil)

	err := te.svc.DeleteProject("missing-org", "proj-1")

	require.Error(t, err)
	assert.ErrorContains(t, err, "organisation not found")
}

func TestCreateCollection_Success(t *testing.T) {
	te := newTestEnv(t)

	proj := makeProject("proj-1", "My Project")
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.CreateCollection("org-1", "proj-1", "coll-1", "My Collection")

	require.NoError(t, err)
}

func TestCreateCollection_UnknownProject_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "My Org")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	err := te.svc.CreateCollection("org-1", "missing-proj", "coll-1", "My Collection")

	require.Error(t, err)
	assert.ErrorContains(t, err, "project not found")
}

func TestCreateCollection_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	err := te.svc.CreateCollection("org-1", "proj-1", "coll-1", "")

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestCreateRequest_InCollectionRoot_Success(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	req := makeRequest("req-1", "My Request")
	err := te.svc.CreateRequest("org-1", "proj-1", "coll-1", "", req)

	require.NoError(t, err)
}

func TestCreateRequest_InsideFolder_Success(t *testing.T) {
	te := newTestEnv(t)

	folder := makeFolder("folder-1", "My Folder")
	coll := makeCollection("coll-1", "My Collection")
	coll.Folders = []domain.Folder{folder}
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	req := makeRequest("req-1", "My Request")
	err := te.svc.CreateRequest("org-1", "proj-1", "coll-1", "folder-1", req)

	require.NoError(t, err)
}

func TestCreateRequest_CollectionNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	proj := makeProject("proj-1", "My Project")
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	req := makeRequest("req-1", "My Request")
	err := te.svc.CreateRequest("org-1", "proj-1", "missing-coll", "", req)

	require.Error(t, err)
	assert.ErrorContains(t, err, "collection not found")
}

func TestCreateRequest_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	req := domain.Request{ID: "req-1", Name: ""}
	err := te.svc.CreateRequest("org-1", "proj-1", "coll-1", "", req)

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestUpdateRequest_UpdatesExistingRequest_Success(t *testing.T) {
	te := newTestEnv(t)

	existing := makeRequest("req-1", "Old Name")
	coll := makeCollection("coll-1", "My Collection", existing)
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	updated := domain.Request{ID: "req-1", Name: "New Name", Method: "POST", URL: "http://example.com"}
	err := te.svc.UpdateRequest("org-1", "proj-1", "coll-1", updated)

	require.NoError(t, err)
}

func TestUpdateRequest_RequestNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	updated := domain.Request{ID: "missing-req", Name: "Name"}
	err := te.svc.UpdateRequest("org-1", "proj-1", "coll-1", updated)

	require.Error(t, err)
	assert.ErrorContains(t, err, "request not found")
}

func TestDeleteRequest_FromCollectionRoot_Success(t *testing.T) {
	te := newTestEnv(t)

	req := makeRequest("req-1", "My Request")
	coll := makeCollection("coll-1", "My Collection", req)
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.DeleteRequest("org-1", "proj-1", "coll-1", "req-1")

	require.NoError(t, err)
}

func TestDeleteRequest_FromFolder_Success(t *testing.T) {
	te := newTestEnv(t)

	req := makeRequest("req-1", "My Request")
	folder := domain.Folder{
		ID:       "folder-1",
		Name:     "My Folder",
		Requests: []domain.Request{req},
		Folders:  []domain.Folder{},
	}
	coll := makeCollection("coll-1", "My Collection")
	coll.Folders = []domain.Folder{folder}
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.DeleteRequest("org-1", "proj-1", "coll-1", "req-1")

	require.NoError(t, err)
}

func TestDeleteRequest_RequestNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	err := te.svc.DeleteRequest("org-1", "proj-1", "coll-1", "missing-req")

	require.Error(t, err)
	assert.ErrorContains(t, err, "request not found")
}

func TestLoadOrganizations_Success(t *testing.T) {
	te := newTestEnv(t)

	org := makeOrg("org-1", "My Org")

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	orgs, err := te.svc.LoadOrganizations()

	require.NoError(t, err)
	assert.Len(t, orgs, 1)
	assert.Equal(t, "org-1", orgs[0].ID)
	assert.Equal(t, "My Org", orgs[0].Name)
}

func TestLoadOrganizations_LoadFails_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	te.mockRepo.EXPECT().LoadOrganizations().Return(nil, errors.New("io error"))

	orgs, err := te.svc.LoadOrganizations()

	require.Error(t, err)
	assert.Nil(t, orgs)
	assert.ErrorContains(t, err, "io error")
}

func TestDeleteCollection_Success(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.DeleteCollection("org-1", "proj-1", "coll-1")

	require.NoError(t, err)
}

func TestDeleteCollection_CollectionNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	proj := makeProject("proj-1", "My Project")
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	err := te.svc.DeleteCollection("org-1", "proj-1", "missing-coll")

	require.Error(t, err)
	assert.ErrorContains(t, err, "collection not found")
}

func TestRenameCollection_Success(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "Old Name")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.RenameCollection("org-1", "proj-1", "coll-1", "New Name")

	require.NoError(t, err)
}

func TestRenameCollection_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	err := te.svc.RenameCollection("org-1", "proj-1", "coll-1", "")

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestCreateFolder_InCollectionRoot_Success(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.CreateFolder("org-1", "proj-1", "coll-1", "", "folder-1", "My Folder")

	require.NoError(t, err)
}

func TestCreateFolder_InsideParentFolder_Success(t *testing.T) {
	te := newTestEnv(t)

	parent := makeFolder("parent-1", "Parent Folder")
	coll := makeCollection("coll-1", "My Collection")
	coll.Folders = []domain.Folder{parent}
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.CreateFolder("org-1", "proj-1", "coll-1", "parent-1", "child-1", "Child Folder")

	require.NoError(t, err)
}

func TestCreateFolder_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	err := te.svc.CreateFolder("org-1", "proj-1", "coll-1", "", "folder-1", "  ")

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestRenameRequest_Success(t *testing.T) {
	te := newTestEnv(t)

	req := makeRequest("req-1", "Old Name")
	coll := makeCollection("coll-1", "My Collection", req)
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.RenameRequest("org-1", "proj-1", "coll-1", "req-1", "New Name")

	require.NoError(t, err)
}

func TestRenameRequest_RequestNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	err := te.svc.RenameRequest("org-1", "proj-1", "coll-1", "missing-req", "New Name")

	require.Error(t, err)
	assert.ErrorContains(t, err, "request not found")
}

func TestRenameRequest_EmptyName_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	err := te.svc.RenameRequest("org-1", "proj-1", "coll-1", "req-1", "")

	require.Error(t, err)
	assert.ErrorContains(t, err, "name cannot be empty")
}

func TestRenameFolder_Success(t *testing.T) {
	te := newTestEnv(t)

	folder := makeFolder("folder-1", "Old Name")
	coll := makeCollection("coll-1", "My Collection")
	coll.Folders = []domain.Folder{folder}
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.RenameFolder("org-1", "proj-1", "coll-1", "folder-1", "New Name")

	require.NoError(t, err)
}

func TestRenameFolder_FolderNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	err := te.svc.RenameFolder("org-1", "proj-1", "coll-1", "missing-folder", "New Name")

	require.Error(t, err)
	assert.ErrorContains(t, err, "folder not found")
}

func TestDeleteFolder_Success(t *testing.T) {
	te := newTestEnv(t)

	folder := makeFolder("folder-1", "My Folder")
	coll := makeCollection("coll-1", "My Collection")
	coll.Folders = []domain.Folder{folder}
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)
	te.mockRepo.EXPECT().SaveOrganizations(gomock.Any()).Return(nil)

	err := te.svc.DeleteFolder("org-1", "proj-1", "coll-1", "folder-1")

	require.NoError(t, err)
}

func TestDeleteFolder_FolderNotFound_ReturnsError(t *testing.T) {
	te := newTestEnv(t)

	coll := makeCollection("coll-1", "My Collection")
	proj := makeProject("proj-1", "My Project", coll)
	org := makeOrg("org-1", "My Org", proj)

	te.mockRepo.EXPECT().LoadOrganizations().Return([]domain.Organisation{org}, nil)

	err := te.svc.DeleteFolder("org-1", "proj-1", "coll-1", "missing-folder")

	require.Error(t, err)
	assert.ErrorContains(t, err, "folder not found")
}
