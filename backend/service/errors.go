package service

import "errors"

// Sentinel errors returned by OrganizationService.
// Callers can use errors.Is to distinguish these from I/O errors.
var (
	ErrNameEmpty       = errors.New("name cannot be empty")
	ErrOrgNotFound     = errors.New("organisation not found")
	ErrProjectNotFound = errors.New("project not found")
	ErrCollNotFound    = errors.New("collection not found")
	ErrRequestNotFound = errors.New("request not found")
	ErrFolderNotFound  = errors.New("folder not found")
	ErrParentNotFound  = errors.New("parent folder not found")
)
