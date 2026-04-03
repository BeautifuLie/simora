package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	simcrypto "simora/backend/crypto"
	"simora/backend/domain"
	"simora/backend/keyring"
)

// ErrWrongPassword is returned when an export password is incorrect.
var ErrWrongPassword = errors.New("wrong password or corrupted data")

// ExportOptions controls how credentials are handled when exporting a collection.
type ExportOptions struct {
	IncludeSecrets bool   // include encrypted credentials in the export
	Password       string // AES encryption password (required when IncludeSecrets=true)
}

// exportedCollection is the top-level JSON structure for a Simora-format export.
type exportedCollection struct {
	domain.Collection
	SimoraExport    bool                       `json:"__simoraCollection"`
	ExportedSecrets map[string]json.RawMessage `json:"exportedSecrets,omitempty"`
}

// CollectionService handles Simora-native collection export and import.
type CollectionService struct {
	orgSvc *OrganizationService
	kr     keyring.Store
}

// NewCollectionService creates a CollectionService.
func NewCollectionService(orgSvc *OrganizationService, kr keyring.Store) *CollectionService {
	return &CollectionService{orgSvc: orgSvc, kr: kr}
}

// ExportCollection exports a single collection to a Simora JSON string.
// Credentials are always omitted from the JSON fields themselves; when
// opts.IncludeSecrets is true they are AES-256-GCM encrypted with opts.Password
// and stored in the "exportedSecrets" map.
func (s *CollectionService) ExportCollection(orgID, projID, collID string, opts ExportOptions) (string, error) {
	s.orgSvc.mu.Lock()

	orgs, err := s.orgSvc.load()
	s.orgSvc.mu.Unlock()

	if err != nil {
		return "", fmt.Errorf("load orgs: %w", err)
	}

	coll, err := findCollectionIn(orgs, orgID, projID, collID)
	if err != nil {
		return "", err
	}

	export := exportedCollection{
		Collection:   coll,
		SimoraExport: true,
	}

	if opts.IncludeSecrets && opts.Password != "" {
		secrets, encErr := buildExportedSecrets(coll, opts.Password)
		if encErr != nil {
			return "", fmt.Errorf("encrypt secrets: %w", encErr)
		}

		if len(secrets) > 0 {
			export.ExportedSecrets = secrets
		}
	}

	// Always strip credential fields from the collection body.
	stripCredentialsFromCollection(&export.Collection)

	out, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal export: %w", err)
	}

	return string(out), nil
}

// ImportCollection imports a Simora-format JSON string.
// If exportedSecrets is present in the JSON, password must be provided to decrypt them.
// New UUIDs are assigned to all requests and folders.
// Returns the imported collection (credentials are in the keyring, not in the struct).
func (s *CollectionService) ImportCollection(orgID, projID, jsonText, password string) (domain.Collection, error) {
	var raw exportedCollection
	if err := json.Unmarshal([]byte(jsonText), &raw); err != nil {
		return domain.Collection{}, fmt.Errorf("parse collection: %w", err)
	}

	if !raw.SimoraExport {
		return domain.Collection{}, errors.New("not a Simora collection export")
	}

	// Build old→new ID map and assign fresh UUIDs.
	idMap := make(map[string]string)

	newColl := reassignIDs(raw.Collection, idMap)
	newColl.ID = uuid.New().String()

	// Decrypt and store credentials if present.
	if len(raw.ExportedSecrets) > 0 {
		if strings.TrimSpace(password) == "" {
			return domain.Collection{}, errors.New("collection has encrypted credentials: password required")
		}

		if err := importSecrets(raw.ExportedSecrets, idMap, password, s.kr); err != nil {
			return domain.Collection{}, err
		}
	}

	// Persist the new collection via OrganizationService (credentials are already
	// in keyring, save() will find empty fields and call Delete — harmless).
	s.orgSvc.mu.Lock()
	defer s.orgSvc.mu.Unlock()

	if err := s.orgSvc.persistImportedCollection(orgID, projID, newColl); err != nil {
		return domain.Collection{}, fmt.Errorf("persist collection: %w", err)
	}

	return newColl, nil
}

// ── helpers ─────────────────────────────────────────────────────────────────

func findCollectionIn(orgs []domain.Organisation, orgID, projID, collID string) (domain.Collection, error) {
	orgIdx, ok := findOrg(orgs, orgID)
	if !ok {
		return domain.Collection{}, ErrOrgNotFound
	}

	projIdx, ok := findProject(orgs[orgIdx].Projects, projID)
	if !ok {
		return domain.Collection{}, ErrProjectNotFound
	}

	collIdx, ok := findCollection(orgs[orgIdx].Projects[projIdx].Collections, collID)
	if !ok {
		return domain.Collection{}, ErrCollNotFound
	}

	return orgs[orgIdx].Projects[projIdx].Collections[collIdx], nil
}

// buildExportedSecrets collects all non-empty credential fields from the
// collection, encrypts each with the given password, and returns the map.
func buildExportedSecrets(coll domain.Collection, password string) (map[string]json.RawMessage, error) {
	secrets := make(map[string]json.RawMessage)

	var walkErr error

	walkCollectionRequests(&coll, func(req *domain.Request) {
		if walkErr != nil {
			return
		}

		for _, sf := range sensitiveFields(req) {
			if sf.get() == "" {
				continue
			}

			enc, err := simcrypto.EncryptField(sf.get(), password)
			if err != nil {
				walkErr = err
				return
			}

			secrets[sf.key(req.ID)] = enc
		}
	})

	return secrets, walkErr
}

// stripCredentialsFromCollection zeroes all credential fields in every request.
func stripCredentialsFromCollection(coll *domain.Collection) {
	walkCollectionRequests(coll, func(req *domain.Request) {
		for _, sf := range sensitiveFields(req) {
			sf.set("")
		}
	})
}

// importSecrets decrypts the exported secrets map and stores them in the keyring
// under the new request IDs.
// idMap: oldReqID → newReqID.
func importSecrets(secrets map[string]json.RawMessage, idMap map[string]string, password string, kr keyring.Store) error {
	for oldKey, encRaw := range secrets {
		// oldKey format: "oldReqID/fieldName"
		slash := strings.Index(oldKey, "/")
		if slash < 0 {
			continue
		}

		oldReqID := oldKey[:slash]
		fieldName := oldKey[slash+1:]

		newReqID, ok := idMap[oldReqID]
		if !ok {
			continue // request not found in collection — skip
		}

		plain, err := simcrypto.DecryptField(encRaw, password)
		if err != nil {
			return ErrWrongPassword
		}

		if err := kr.Set(newReqID+"/"+fieldName, plain); err != nil {
			return fmt.Errorf("store credential: %w", err)
		}
	}

	return nil
}

// reassignIDs deep-copies the collection, assigning new UUIDs to all requests and
// folders. The idMap is populated with oldID → newID entries for request IDs only
// (folders don't carry credentials).
func reassignIDs(src domain.Collection, idMap map[string]string) domain.Collection {
	dst := src

	dst.Requests = make([]domain.Request, len(src.Requests))
	for i, r := range src.Requests {
		newID := uuid.New().String()
		idMap[r.ID] = newID
		r.ID = newID
		dst.Requests[i] = r
	}

	dst.Folders = reassignFolderIDs(src.Folders, idMap)

	return dst
}

func reassignFolderIDs(src []domain.Folder, idMap map[string]string) []domain.Folder {
	dst := make([]domain.Folder, len(src))

	for i, f := range src {
		f.ID = uuid.New().String()

		newReqs := make([]domain.Request, len(f.Requests))
		for j, r := range f.Requests {
			newID := uuid.New().String()
			idMap[r.ID] = newID
			r.ID = newID
			newReqs[j] = r
		}

		f.Requests = newReqs
		f.Folders = reassignFolderIDs(f.Folders, idMap)
		dst[i] = f
	}

	return dst
}

// persistImportedCollection creates the collection and all its contents in the
// OrganizationService. Must be called with orgSvc.mu held (write).
func (s *OrganizationService) persistImportedCollection(orgID, projID string, coll domain.Collection) error {
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

	orgs[orgIdx].Projects[projIdx].Collections = append(
		orgs[orgIdx].Projects[projIdx].Collections,
		coll,
	)

	return s.save(orgs)
}
