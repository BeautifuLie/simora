package keyring

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"

	simcrypto "simora/backend/crypto"
)

// fileStore is an AES-256-GCM encrypted JSON file used when the OS keyring is
// unavailable (e.g. Linux without a running SecretService daemon).
//
// File format: AES-256-GCM encrypted blob containing a JSON map[string]string
// with plaintext values. Permissions are 0600 (owner read/write only).
type fileStore struct {
	path string
	key  [32]byte
	mu   sync.Mutex
}

func newFileStore(path string, key [32]byte) *fileStore {
	return &fileStore{path: path, key: key}
}

// load reads and decrypts the file, returning the key-value map.
// Returns an empty map when the file does not exist yet.
func (f *fileStore) load() (map[string]string, error) {
	data, err := os.ReadFile(f.path)
	if os.IsNotExist(err) {
		return make(map[string]string), nil
	}

	if err != nil {
		return nil, fmt.Errorf("read keyring file: %w", err)
	}

	plain, err := simcrypto.MachineDecrypt(data, f.key)
	if err != nil {
		return nil, fmt.Errorf("decrypt keyring file: %w", err)
	}

	var m map[string]string
	if err := json.Unmarshal(plain, &m); err != nil {
		return nil, fmt.Errorf("unmarshal keyring: %w", err)
	}

	return m, nil
}

// persist encrypts and writes the map to disk.
func (f *fileStore) persist(m map[string]string) error {
	raw, err := json.Marshal(m)
	if err != nil {
		return fmt.Errorf("marshal keyring: %w", err)
	}

	enc, err := simcrypto.MachineEncrypt(raw, f.key)
	if err != nil {
		return fmt.Errorf("encrypt keyring: %w", err)
	}

	if err := os.WriteFile(f.path, enc, 0o600); err != nil {
		return fmt.Errorf("write keyring file: %w", err)
	}

	return nil
}

func (f *fileStore) Get(key string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	m, err := f.load()
	if err != nil {
		return "", err
	}

	val, ok := m[key]
	if !ok {
		return "", ErrNotFound
	}

	return val, nil
}

func (f *fileStore) Set(key, value string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	m, err := f.load()
	if err != nil {
		return err
	}

	m[key] = value

	return f.persist(m)
}

func (f *fileStore) Delete(key string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	m, err := f.load()
	if err != nil {
		return err
	}

	delete(m, key)

	return f.persist(m)
}
