package domain

// CollectionVariable is a key/value pair scoped to a single collection.
// It follows the same shape as environment variables but travels with the
// collection data rather than being stored separately.
type CollectionVariable struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

type Collection struct {
	ID        string               `json:"id"`
	Name      string               `json:"name"`
	Requests  []Request            `json:"requests"`
	Folders   []Folder             `json:"folders"`
	Variables []CollectionVariable `json:"variables,omitempty"`
}
