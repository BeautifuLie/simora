package domain

type Collection struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Requests []Request `json:"requests"`
	Folders  []Folder  `json:"folders"`
}
