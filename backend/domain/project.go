package domain

type Project struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Collections []Collection `json:"collections"`
}
