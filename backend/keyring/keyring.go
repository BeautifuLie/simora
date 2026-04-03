// Package keyring provides a cross-platform abstraction for storing secrets.
// On macOS and Windows the OS credential store is used directly (no prompts).
// On Linux, an AES-256-GCM encrypted file in the app config directory is used
// to avoid interactive unlock dialogues from gnome-keyring / KWallet at startup.
package keyring

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"

	zkeyring "github.com/zalando/go-keyring"
	simcrypto "simora/backend/crypto"
)

// ErrNotFound is returned by Get when the requested key does not exist.
var ErrNotFound = errors.New("keyring: key not found")

const appService = "simora"

// Store is the interface satisfied by all keyring backends.
type Store interface {
	// Get retrieves the secret stored under key.
	// Returns ErrNotFound when the key does not exist.
	Get(key string) (string, error)
	// Set stores value under key, overwriting any previous entry.
	Set(key, value string) error
	// Delete removes the entry for key. Returns nil if the key was not present.
	Delete(key string) error
}

// ── OS keyring (macOS Keychain / Windows Credential Manager / Linux SecretService) ──

type osStore struct{}

func (osStore) Get(key string) (string, error) {
	val, err := zkeyring.Get(appService, key)
	if errors.Is(err, zkeyring.ErrNotFound) {
		return "", ErrNotFound
	}

	if err != nil {
		return "", fmt.Errorf("keyring get: %w", err)
	}

	return val, nil
}

func (osStore) Set(key, value string) error {
	if err := zkeyring.Set(appService, key, value); err != nil {
		return fmt.Errorf("keyring set: %w", err)
	}

	return nil
}

func (osStore) Delete(key string) error {
	err := zkeyring.Delete(appService, key)
	if errors.Is(err, zkeyring.ErrNotFound) {
		return nil
	}

	if err != nil {
		return fmt.Errorf("keyring delete: %w", err)
	}

	return nil
}

// ── Constructor ──────────────────────────────────────────────────────────────

var (
	once         sync.Once
	defaultStore Store
)

// New returns the platform-appropriate keyring Store.
// macOS and Windows use the OS credential store (always available without prompts).
// Linux always uses an AES-256-GCM encrypted file to avoid interactive unlock dialogues.
// configDir is the application data directory (e.g. ~/.config/simora).
func New(configDir string) Store {
	once.Do(func() {
		defaultStore = newStore(configDir)
	})

	return defaultStore
}

func newStore(configDir string) Store {
	// Linux Secret Service (gnome-keyring, KWallet) can show an interactive unlock
	// dialog at startup and for every operation while the keyring is locked.
	// Use the encrypted file fallback unconditionally on Linux to avoid this.
	if runtime.GOOS == "linux" {
		log.Printf("keyring: using encrypted file fallback on Linux")
		return newFileStoreForDir(configDir)
	}

	// Probe the OS keyring with a harmless write+read+delete cycle.
	const probeKey = "_simora_probe"

	if err := zkeyring.Set(appService, probeKey, "1"); err != nil {
		log.Printf("keyring: OS keyring unavailable (%v), using encrypted file fallback", err)
		return newFileStoreForDir(configDir)
	}

	_, _ = zkeyring.Get(appService, probeKey)
	_ = zkeyring.Delete(appService, probeKey)

	return osStore{}
}

func newFileStoreForDir(configDir string) Store {
	secret := machineSecret()
	key := simcrypto.MachineKey(secret)
	path := filepath.Join(configDir, "keyring.enc")

	if err := os.MkdirAll(configDir, 0o755); err != nil {
		log.Printf("keyring: cannot create config dir: %v", err)
	}

	return newFileStore(path, key)
}
