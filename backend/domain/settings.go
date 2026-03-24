package domain

// Settings holds user preferences persisted across sessions.
type Settings struct {
	Timeout         int    `json:"timeout"`
	FollowRedirects bool   `json:"followRedirects"`
	ValidateSSL     bool   `json:"validateSsl"`
	MaxRedirects    int    `json:"maxRedirects"`
	SendOnEnter     bool   `json:"sendOnEnter"`
	FontSize        string `json:"fontSize"`
	Theme           string `json:"theme"`
	AccentColor     string `json:"accentColor,omitempty"`
}

func DefaultSettings() Settings {
	return Settings{
		Timeout:         30000,
		FollowRedirects: true,
		ValidateSSL:     true,
		MaxRedirects:    10,
		SendOnEnter:     false,
		FontSize:        "md",
		Theme:           "dark",
	}
}
