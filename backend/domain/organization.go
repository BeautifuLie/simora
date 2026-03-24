package domain

type Organisation struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Projects []Project `json:"projects"`
}
