package service

import (
	"errors"
	"log"

	"simora/backend/domain"
	"simora/backend/keyring"
)

// sensitiveFieldNames lists all credential attribute names persisted to the keyring.
// Key format used in the keyring: "<requestID>/<name>".
var sensitiveFieldNames = []string{
	"auth.token",
	"auth.username",
	"auth.password",
	"auth.headerValue",
	"auth.oauth2ClientSecret",
	"auth.oauth2AccessToken",
	"kafka.saslUsername",
	"kafka.saslPassword",
	"kafka.schemaRegistryUsername",
	"kafka.schemaRegistryPassword",
	"sqs.secretAccessKey",
	"sqs.sessionToken",
}

// sensitiveField describes a single credential field on a Request via typed accessors.
type sensitiveField struct {
	name   string
	getter func() string
	setter func(string)
}

func (sf sensitiveField) key(reqID string) string { return reqID + "/" + sf.name }
func (sf sensitiveField) get() string             { return sf.getter() }
func (sf sensitiveField) set(v string)            { sf.setter(v) }

// sensitiveFields returns the typed accessors for every credential field present
// in the given request. Nil protocol configs are skipped automatically.
func sensitiveFields(req *domain.Request) []sensitiveField {
	fields := make([]sensitiveField, 0, len(sensitiveFieldNames))

	if req.Auth != nil {
		a := req.Auth

		fields = append(fields,
			sensitiveField{"auth.token",
				func() string { return a.Token },
				func(v string) { a.Token = v }},
			sensitiveField{"auth.username",
				func() string { return a.Username },
				func(v string) { a.Username = v }},
			sensitiveField{"auth.password",
				func() string { return a.Password },
				func(v string) { a.Password = v }},
			sensitiveField{"auth.headerValue",
				func() string { return a.HeaderValue },
				func(v string) { a.HeaderValue = v }},
			sensitiveField{"auth.oauth2ClientSecret",
				func() string { return a.OAuth2ClientSecret },
				func(v string) { a.OAuth2ClientSecret = v }},
			sensitiveField{"auth.oauth2AccessToken",
				func() string { return a.OAuth2AccessToken },
				func(v string) { a.OAuth2AccessToken = v }},
		)
	}

	if req.Kafka != nil {
		k := req.Kafka

		fields = append(fields,
			sensitiveField{"kafka.saslUsername",
				func() string { return k.SaslUsername },
				func(v string) { k.SaslUsername = v }},
			sensitiveField{"kafka.saslPassword",
				func() string { return k.SaslPassword },
				func(v string) { k.SaslPassword = v }},
			sensitiveField{"kafka.schemaRegistryUsername",
				func() string { return k.SchemaRegistryUsername },
				func(v string) { k.SchemaRegistryUsername = v }},
			sensitiveField{"kafka.schemaRegistryPassword",
				func() string { return k.SchemaRegistryPassword },
				func(v string) { k.SchemaRegistryPassword = v }},
		)
	}

	if req.Sqs != nil {
		sq := req.Sqs

		fields = append(fields,
			sensitiveField{"sqs.secretAccessKey",
				func() string { return sq.SecretAccessKey },
				func(v string) { sq.SecretAccessKey = v }},
			sensitiveField{"sqs.sessionToken",
				func() string { return sq.SessionToken },
				func(v string) { sq.SessionToken = v }},
		)
	}

	return fields
}

// walkRequests calls fn for every request in orgs (including folder-nested ones).
func walkRequests(orgs []domain.Organisation, fn func(*domain.Request)) {
	for i := range orgs {
		for j := range orgs[i].Projects {
			for k := range orgs[i].Projects[j].Collections {
				walkCollectionRequests(&orgs[i].Projects[j].Collections[k], fn)
			}
		}
	}
}

func walkCollectionRequests(coll *domain.Collection, fn func(*domain.Request)) {
	for i := range coll.Requests {
		fn(&coll.Requests[i])
	}

	walkFolderRequests(coll.Folders, fn)
}

func walkFolderRequests(folders []domain.Folder, fn func(*domain.Request)) {
	for i := range folders {
		for j := range folders[i].Requests {
			fn(&folders[i].Requests[j])
		}

		walkFolderRequests(folders[i].Folders, fn)
	}
}

// collectRequestIDs returns all request IDs from a collection tree.
func collectRequestIDs(coll domain.Collection) []string {
	ids := make([]string, 0, len(coll.Requests))

	for _, r := range coll.Requests {
		ids = append(ids, r.ID)
	}

	collectFolderRequestIDs(coll.Folders, &ids)

	return ids
}

func collectFolderRequestIDs(folders []domain.Folder, ids *[]string) {
	for _, f := range folders {
		for _, r := range f.Requests {
			*ids = append(*ids, r.ID)
		}

		collectFolderRequestIDs(f.Folders, ids)
	}
}

// deleteRequestCredentials removes all keyring entries for a single request.
func deleteRequestCredentials(kr keyring.Store, reqID string) {
	for _, name := range sensitiveFieldNames {
		_ = kr.Delete(reqID + "/" + name)
	}
}

// hydrateCredentials populates sensitive fields from the keyring.
// If a field has a non-empty value in the struct but no keyring entry, it is
// migrated to the keyring (legacy plaintext migration path).
// Returns true when at least one migration occurred (caller should persist the zeroed version).
func hydrateCredentials(orgs []domain.Organisation, kr keyring.Store) bool {
	migrated := false

	walkRequests(orgs, func(req *domain.Request) {
		for _, sf := range sensitiveFields(req) {
			val, err := kr.Get(sf.key(req.ID))

			switch {
			case err == nil:
				// Keyring has the value — restore it.
				sf.set(val)

			case isNotFound(err) && sf.get() != "":
				// Non-empty plaintext value in JSON but no keyring entry — migrate.
				if setErr := kr.Set(sf.key(req.ID), sf.get()); setErr != nil {
					log.Printf("keyring: migration failed for %s: %v", sf.key(req.ID), setErr)
				} else {
					migrated = true
				}

			default:
				// Key not found and field is empty, or unexpected error — leave as-is.
			}
		}
	})

	return migrated
}

// extractCredentials stores non-empty sensitive fields to the keyring, then zeroes
// them in the struct so they are never written to disk as plaintext.
// Empty fields cause their keyring entry to be deleted (explicit clear).
func extractCredentials(orgs []domain.Organisation, kr keyring.Store) {
	walkRequests(orgs, func(req *domain.Request) {
		for _, sf := range sensitiveFields(req) {
			if sf.get() != "" {
				_ = kr.Set(sf.key(req.ID), sf.get())
				sf.set("")
			} else {
				_ = kr.Delete(sf.key(req.ID))
			}
		}
	})
}

// isNotFound reports whether err is the canonical ErrNotFound from the keyring package.
func isNotFound(err error) bool {
	return errors.Is(err, keyring.ErrNotFound)
}
