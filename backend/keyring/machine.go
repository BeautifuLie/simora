package keyring

import (
	"fmt"
	"os"
	"runtime"
	"strings"
)

// machineSecret returns a stable, machine-specific string used to derive the
// fallback file-store encryption key. It is NOT a secret itself — security
// relies on the file being owner-readable only (0600).
func machineSecret() string {
	id := readMachineID()
	hostname, _ := os.Hostname()

	return fmt.Sprintf("%s:%s:%s", runtime.GOOS, hostname, id)
}

// readMachineID returns a stable machine identifier.
// On Linux it reads /etc/machine-id; on other platforms it falls back to hostname.
func readMachineID() string {
	if runtime.GOOS == "linux" {
		data, err := os.ReadFile("/etc/machine-id")
		if err == nil {
			return strings.TrimSpace(string(data))
		}
	}

	hostname, _ := os.Hostname()

	return hostname
}
