package domain

type Folder struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Requests []Request `json:"requests"`
	Folders  []Folder  `json:"folders"`
}
