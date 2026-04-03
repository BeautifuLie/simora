package service

import (
	"fmt"
	"strings"
	"sync"

	"github.com/google/uuid"
	"simora/backend/domain"
	"simora/backend/keyring"
)

const maxFolderDepth = 100

//go:generate mockgen -destination=../test/mock/repository/organization.go -package=mock . OrganizationRepository
type OrganizationRepository interface {
	LoadOrganizations() ([]domain.Organisation, error)
	SaveOrganizations(organisations []domain.Organisation) error
}

type OrganizationService struct {
	repo OrganizationRepository
	kr   keyring.Store
	mu   sync.RWMutex
}

func NewOrganizationService(repo OrganizationRepository, kr keyring.Store) *OrganizationService {
	return &OrganizationService{
		repo: repo,
		kr:   kr,
	}
}

// load loads organisations from disk and hydrates credentials from the keyring.
// If any plaintext credentials are found in the JSON (legacy migration), they are
// migrated to the keyring and the file is immediately re-saved without them.
func (s *OrganizationService) load() ([]domain.Organisation, error) {
	orgs, err := s.repo.LoadOrganizations()
	if err != nil {
		return nil, fmt.Errorf("load organisations: %w", err)
	}

	if migrated := hydrateCredentials(orgs, s.kr); migrated {
		// Write a clean version of the file (credentials zeroed) right away.
		if saveErr := s.saveRaw(orgs); saveErr != nil {
			// Non-fatal: credentials are in keyring, migration just didn't flush.
			_ = saveErr
		}
	}

	return orgs, nil
}

// save extracts credentials to the keyring, then persists the zeroed struct.
func (s *OrganizationService) save(orgs []domain.Organisation) error {
	extractCredentials(orgs, s.kr)

	return s.saveRaw(orgs)
}

// saveRaw writes orgs as-is (without credential extraction).
func (s *OrganizationService) saveRaw(orgs []domain.Organisation) error {
	if err := s.repo.SaveOrganizations(orgs); err != nil {
		return fmt.Errorf("save organisations: %w", err)
	}

	return nil
}

func findOrg(orgs []domain.Organisation, id string) (int, bool) {
	for i := range orgs {
		if orgs[i].ID == id {
			return i, true
		}
	}

	return -1, false
}

func findProject(projects []domain.Project, id string) (int, bool) {
	for i := range projects {
		if projects[i].ID == id {
			return i, true
		}
	}

	return -1, false
}

func findCollection(collections []domain.Collection, id string) (int, bool) {
	for i := range collections {
		if collections[i].ID == id {
			return i, true
		}
	}

	return -1, false
}

func addFolderToFolders(folders []domain.Folder, parentID string, newFolder domain.Folder, depth int) ([]domain.Folder, bool) {
	if depth > maxFolderDepth {
		return folders, false
	}

	for i := range folders {
		if folders[i].ID == parentID {
			folders[i].Folders = append(folders[i].Folders, newFolder)

			return folders, true
		}

		if updated, found := addFolderToFolders(folders[i].Folders, parentID, newFolder, depth+1); found {
			folders[i].Folders = updated

			return folders, true
		}
	}

	return folders, false
}

func addRequestToFolders(folders []domain.Folder, parentID string, req domain.Request, depth int) ([]domain.Folder, bool) {
	if depth > maxFolderDepth {
		return folders, false
	}

	for i := range folders {
		if folders[i].ID == parentID {
			folders[i].Requests = append(folders[i].Requests, req)

			return folders, true
		}

		if updated, found := addRequestToFolders(folders[i].Folders, parentID, req, depth+1); found {
			folders[i].Folders = updated

			return folders, true
		}
	}

	return folders, false
}

func deleteRequestFromFolders(folders []domain.Folder, id string, depth int) ([]domain.Folder, bool) {
	if depth > maxFolderDepth {
		return folders, false
	}

	for i := range folders {
		for j, req := range folders[i].Requests {
			if req.ID == id {
				folders[i].Requests = append(folders[i].Requests[:j], folders[i].Requests[j+1:]...)

				return folders, true
			}
		}

		if updated, found := deleteRequestFromFolders(folders[i].Folders, id, depth+1); found {
			folders[i].Folders = updated

			return folders, true
		}
	}

	return folders, false
}

func deleteFolderFromFolders(folders []domain.Folder, id string, depth int) ([]domain.Folder, bool) {
	if depth > maxFolderDepth {
		return folders, false
	}

	for i := range folders {
		for j, sub := range folders[i].Folders {
			if sub.ID == id {
				folders[i].Folders = append(folders[i].Folders[:j], folders[i].Folders[j+1:]...)

				return folders, true
			}
		}

		if updated, found := deleteFolderFromFolders(folders[i].Folders, id, depth+1); found {
			folders[i].Folders = updated

			return folders, true
		}
	}

	return folders, false
}

func renameFolderInFolders(folders []domain.Folder, id, newName string, depth int) bool {
	if depth > maxFolderDepth {
		return false
	}

	for i := range folders {
		if folders[i].ID == id {
			folders[i].Name = newName

			return true
		}

		if renameFolderInFolders(folders[i].Folders, id, newName, depth+1) {
			return true
		}
	}

	return false
}

func renameRequestInFolders(folders []domain.Folder, id, newName string, depth int) bool {
	if depth > maxFolderDepth {
		return false
	}

	for i := range folders {
		for j := range folders[i].Requests {
			if folders[i].Requests[j].ID == id {
				folders[i].Requests[j].Name = newName

				return true
			}
		}

		if renameRequestInFolders(folders[i].Folders, id, newName, depth+1) {
			return true
		}
	}

	return false
}

func updateRequestInFolders(folders []domain.Folder, req domain.Request, depth int) bool {
	if depth > maxFolderDepth {
		return false
	}

	for i := range folders {
		for j := range folders[i].Requests {
			if folders[i].Requests[j].ID == req.ID {
				folders[i].Requests[j] = req

				return true
			}
		}

		if updateRequestInFolders(folders[i].Folders, req, depth+1) {
			return true
		}
	}

	return false
}

func (s *OrganizationService) updateCollection(orgID, projID, collID string, updateFn func(*domain.Collection) error) error {
	orgs, err := s.load()
	if err != nil {
		return err
	}

	orgIdx, ok := findOrg(orgs, orgID)
	if !ok {
		return ErrOrgNotFound
	}

	projIdx, ok := findProject(orgs[orgIdx].Projects, projID)
	if !ok {
		return ErrProjectNotFound
	}

	collIdx, ok := findCollection(orgs[orgIdx].Projects[projIdx].Collections, collID)
	if !ok {
		return ErrCollNotFound
	}

	if err := updateFn(&orgs[orgIdx].Projects[projIdx].Collections[collIdx]); err != nil {
		return err
	}

	return s.save(orgs)
}

func (s *OrganizationService) LoadOrganizations() ([]domain.Organisation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.load()
}

func (s *OrganizationService) CreateOrganization(id, name string) error {
	if strings.TrimSpace(name) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	orgs, err := s.load()
	if err != nil {
		return err
	}

	if id == "" {
		id = uuid.New().String()
	}

	newOrg := domain.Organisation{
		ID:       id,
		Name:     strings.TrimSpace(name),
		Projects: []domain.Project{},
	}
	orgs = append(orgs, newOrg)

	return s.save(orgs)
}

func (s *OrganizationService) CreateProject(orgID, id, name string) error {
	if strings.TrimSpace(name) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	orgs, err := s.load()
	if err != nil {
		return err
	}

	if id == "" {
		id = uuid.New().String()
	}

	orgIdx, ok := findOrg(orgs, orgID)
	if !ok {
		return ErrOrgNotFound
	}

	newProj := domain.Project{
		ID:          id,
		Name:        strings.TrimSpace(name),
		Collections: []domain.Collection{},
	}
	orgs[orgIdx].Projects = append(orgs[orgIdx].Projects, newProj)

	return s.save(orgs)
}

func (s *OrganizationService) CreateCollection(orgID, projID, id, name string) error {
	if strings.TrimSpace(name) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	orgs, err := s.load()
	if err != nil {
		return err
	}

	if id == "" {
		id = uuid.New().String()
	}

	orgIdx, ok := findOrg(orgs, orgID)
	if !ok {
		return ErrOrgNotFound
	}

	projIdx, ok := findProject(orgs[orgIdx].Projects, projID)
	if !ok {
		return ErrProjectNotFound
	}

	newColl := domain.Collection{
		ID:       id,
		Name:     strings.TrimSpace(name),
		Requests: []domain.Request{},
		Folders:  []domain.Folder{},
	}
	orgs[orgIdx].Projects[projIdx].Collections = append(orgs[orgIdx].Projects[projIdx].Collections, newColl)

	return s.save(orgs)
}

func (s *OrganizationService) CreateFolder(orgID, projID, collID, parentFolderID, id, name string) error {
	if strings.TrimSpace(name) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	return s.updateCollection(orgID, projID, collID, func(coll *domain.Collection) error {
		if id == "" {
			id = uuid.New().String()
		}

		newFolder := domain.Folder{
			ID:       id,
			Name:     name,
			Requests: []domain.Request{},
			Folders:  []domain.Folder{},
		}

		if parentFolderID == "" {
			coll.Folders = append(coll.Folders, newFolder)

			return nil
		}

		if updated, found := addFolderToFolders(coll.Folders, parentFolderID, newFolder, 0); found {
			coll.Folders = updated

			return nil
		}

		return ErrParentNotFound
	})
}

func (s *OrganizationService) CreateRequest(orgID, projID, collID, parentFolderID string, req domain.Request) error {
	if strings.TrimSpace(req.Name) == "" {
		return ErrNameEmpty
	}

	if req.ID == "" {
		req.ID = uuid.New().String()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	return s.updateCollection(orgID, projID, collID, func(coll *domain.Collection) error {
		if parentFolderID == "" {
			coll.Requests = append(coll.Requests, req)

			return nil
		}

		if updated, found := addRequestToFolders(coll.Folders, parentFolderID, req, 0); found {
			coll.Folders = updated

			return nil
		}

		return ErrParentNotFound
	})
}

func (s *OrganizationService) DeleteOrganization(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	orgs, err := s.load()
	if err != nil {
		return err
	}

	orgIdx, ok := findOrg(orgs, id)
	if !ok {
		return ErrOrgNotFound
	}

	// Clean up keyring entries for every request in the org.
	for _, proj := range orgs[orgIdx].Projects {
		for _, coll := range proj.Collections {
			for _, reqID := range collectRequestIDs(coll) {
				deleteRequestCredentials(s.kr, reqID)
			}
		}
	}

	orgs = append(orgs[:orgIdx], orgs[orgIdx+1:]...)

	return s.save(orgs)
}

func (s *OrganizationService) DeleteProject(orgID, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	orgs, err := s.load()
	if err != nil {
		return err
	}

	orgIdx, ok := findOrg(orgs, orgID)
	if !ok {
		return ErrOrgNotFound
	}

	projIdx, ok := findProject(orgs[orgIdx].Projects, id)
	if !ok {
		return ErrProjectNotFound
	}

	// Clean up keyring entries for all requests in the project.
	for _, coll := range orgs[orgIdx].Projects[projIdx].Collections {
		for _, reqID := range collectRequestIDs(coll) {
			deleteRequestCredentials(s.kr, reqID)
		}
	}

	orgs[orgIdx].Projects = append(orgs[orgIdx].Projects[:projIdx], orgs[orgIdx].Projects[projIdx+1:]...)

	return s.save(orgs)
}

func (s *OrganizationService) DeleteCollection(orgID, projID, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	orgs, err := s.load()
	if err != nil {
		return err
	}

	orgIdx, ok := findOrg(orgs, orgID)
	if !ok {
		return ErrOrgNotFound
	}

	projIdx, ok := findProject(orgs[orgIdx].Projects, projID)
	if !ok {
		return ErrProjectNotFound
	}

	collIdx, ok := findCollection(orgs[orgIdx].Projects[projIdx].Collections, id)
	if !ok {
		return ErrCollNotFound
	}

	// Clean up keyring entries for all requests in the collection.
	coll := orgs[orgIdx].Projects[projIdx].Collections[collIdx]
	for _, reqID := range collectRequestIDs(coll) {
		deleteRequestCredentials(s.kr, reqID)
	}

	colls := &orgs[orgIdx].Projects[projIdx].Collections
	*colls = append((*colls)[:collIdx], (*colls)[collIdx+1:]...)

	return s.save(orgs)
}

func (s *OrganizationService) DeleteRequest(orgID, projID, collID, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	deleteRequestCredentials(s.kr, id)

	return s.updateCollection(orgID, projID, collID, func(coll *domain.Collection) error {
		for i, req := range coll.Requests {
			if req.ID == id {
				coll.Requests = append(coll.Requests[:i], coll.Requests[i+1:]...)

				return nil
			}
		}

		if updated, found := deleteRequestFromFolders(coll.Folders, id, 0); found {
			coll.Folders = updated

			return nil
		}

		return ErrRequestNotFound
	})
}

func (s *OrganizationService) DeleteFolder(orgID, projID, collID, folderID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.updateCollection(orgID, projID, collID, func(coll *domain.Collection) error {
		for i, folder := range coll.Folders {
			if folder.ID == folderID {
				coll.Folders = append(coll.Folders[:i], coll.Folders[i+1:]...)

				return nil
			}
		}

		if updated, found := deleteFolderFromFolders(coll.Folders, folderID, 0); found {
			coll.Folders = updated

			return nil
		}

		return ErrFolderNotFound
	})
}

func (s *OrganizationService) RenameOrganization(id, newName string) error {
	if strings.TrimSpace(newName) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	orgs, err := s.load()
	if err != nil {
		return err
	}

	orgIdx, ok := findOrg(orgs, id)
	if !ok {
		return ErrOrgNotFound
	}

	orgs[orgIdx].Name = newName

	return s.save(orgs)
}

func (s *OrganizationService) RenameProject(orgID, id, newName string) error {
	if strings.TrimSpace(newName) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	orgs, err := s.load()
	if err != nil {
		return err
	}

	orgIdx, ok := findOrg(orgs, orgID)
	if !ok {
		return ErrOrgNotFound
	}

	projIdx, ok := findProject(orgs[orgIdx].Projects, id)
	if !ok {
		return ErrProjectNotFound
	}

	orgs[orgIdx].Projects[projIdx].Name = newName

	return s.save(orgs)
}

func (s *OrganizationService) RenameCollection(orgID, projID, id, newName string) error {
	if strings.TrimSpace(newName) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	return s.updateCollection(orgID, projID, id, func(coll *domain.Collection) error {
		coll.Name = newName

		return nil
	})
}

// UpdateCollectionVariables replaces the variable list for a collection.
func (s *OrganizationService) UpdateCollectionVariables(orgID, projID, collID string, vars []domain.CollectionVariable) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.updateCollection(orgID, projID, collID, func(coll *domain.Collection) error {
		coll.Variables = vars

		return nil
	})
}

func (s *OrganizationService) RenameFolder(orgID, projID, collID, folderID, newName string) error {
	if strings.TrimSpace(newName) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	return s.updateCollection(orgID, projID, collID, func(coll *domain.Collection) error {
		for i := range coll.Folders {
			if coll.Folders[i].ID == folderID {
				coll.Folders[i].Name = newName

				return nil
			}
		}

		if renameFolderInFolders(coll.Folders, folderID, newName, 0) {
			return nil
		}

		return ErrFolderNotFound
	})
}

func (s *OrganizationService) RenameRequest(orgID, projID, collID, reqID, newName string) error {
	if strings.TrimSpace(newName) == "" {
		return ErrNameEmpty
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	return s.updateCollection(orgID, projID, collID, func(coll *domain.Collection) error {
		for i := range coll.Requests {
			if coll.Requests[i].ID == reqID {
				coll.Requests[i].Name = newName

				return nil
			}
		}

		if renameRequestInFolders(coll.Folders, reqID, newName, 0) {
			return nil
		}

		return ErrRequestNotFound
	})
}

func (s *OrganizationService) UpdateRequest(orgID, projID, collID string, req domain.Request) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.updateCollection(orgID, projID, collID, func(coll *domain.Collection) error {
		for i := range coll.Requests {
			if coll.Requests[i].ID == req.ID {
				coll.Requests[i] = req

				return nil
			}
		}

		if updateRequestInFolders(coll.Folders, req, 0) {
			return nil
		}

		return ErrRequestNotFound
	})
}
