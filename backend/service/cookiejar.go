package service

import (
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"sync"
)

// CookieEntry is a single cookie exposed to the frontend.
type CookieEntry struct {
	Domain string `json:"domain"`
	Name   string `json:"name"`
	Value  string `json:"value"`
	Path   string `json:"path"`
	Secure bool   `json:"secure"`
}

// trackedJar wraps the standard cookiejar and maintains a listable snapshot
// of all cookies that have been stored via SetCookies.
type trackedJar struct {
	mu       sync.Mutex
	inner    http.CookieJar
	snapshot map[string]map[string]*http.Cookie // domain -> name -> cookie
}

func newTrackedJar() (*trackedJar, error) {
	inner, err := cookiejar.New(nil)
	if err != nil {
		return nil, fmt.Errorf("create inner jar: %w", err)
	}

	return &trackedJar{
		inner:    inner,
		snapshot: make(map[string]map[string]*http.Cookie),
	}, nil
}

func (j *trackedJar) SetCookies(u *url.URL, cookies []*http.Cookie) {
	j.inner.SetCookies(u, cookies)

	domain := u.Hostname()

	j.mu.Lock()
	defer j.mu.Unlock()

	if j.snapshot[domain] == nil {
		j.snapshot[domain] = make(map[string]*http.Cookie)
	}

	for _, c := range cookies {
		j.snapshot[domain][c.Name] = c
	}
}

func (j *trackedJar) Cookies(u *url.URL) []*http.Cookie {
	return j.inner.Cookies(u)
}

// All returns a flat list of all tracked cookies.
func (j *trackedJar) All() []CookieEntry {
	j.mu.Lock()
	defer j.mu.Unlock()

	var out []CookieEntry

	for domain, cookies := range j.snapshot {
		for _, c := range cookies {
			out = append(out, CookieEntry{
				Domain: domain,
				Name:   c.Name,
				Value:  c.Value,
				Path:   c.Path,
				Secure: c.Secure,
			})
		}
	}

	return out
}

// Delete removes a single cookie from the snapshot.
// The standard jar has no delete; the cookie will still be sent until it expires.
func (j *trackedJar) Delete(domain, name string) {
	j.mu.Lock()
	defer j.mu.Unlock()

	m := j.snapshot[domain]
	if m == nil {
		return
	}

	delete(m, name)

	if len(m) == 0 {
		delete(j.snapshot, domain)
	}
}
