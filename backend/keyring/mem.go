package keyring

import "sync"

// MemStore is an in-memory Store used in tests.
type MemStore struct {
	mu   sync.Mutex
	data map[string]string
}

// NewMemStore returns an empty MemStore.
func NewMemStore() *MemStore {
	return &MemStore{data: make(map[string]string)}
}

func (m *MemStore) Get(key string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	v, ok := m.data[key]
	if !ok {
		return "", ErrNotFound
	}

	return v, nil
}

func (m *MemStore) Set(key, value string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.data[key] = value

	return nil
}

func (m *MemStore) Delete(key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.data, key)

	return nil
}
