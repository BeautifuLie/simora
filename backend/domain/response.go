package domain

type Response struct {
	StatusCode       int                 `json:"statusCode"`
	Status           string              `json:"status"`
	TimeMilliseconds int64               `json:"time"`
	SizeBytes        int64               `json:"size"`
	Body             string              `json:"body"`
	Headers          map[string][]string `json:"headers"`
	IsBinary         bool                `json:"isBinary"`
	ContentType      string              `json:"contentType"`
}
