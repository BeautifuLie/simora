package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"golang.org/x/crypto/pbkdf2"
)

const (
	pbkdf2Iterations = 310_000 // OWASP 2024 recommendation for PBKDF2-SHA256
	pbkdf2KeyLen     = 32
	saltLen          = 32
)

// EncryptedField is the wire format used for password-protected credential fields
// in exported Simora collections.
type EncryptedField struct {
	Enc   string `json:"__enc__"`
	Nonce string `json:"nonce"`
	Salt  string `json:"salt"`
}

// IsEncryptedField reports whether raw JSON is an EncryptedField object.
func IsEncryptedField(raw json.RawMessage) bool {
	var probe map[string]json.RawMessage

	if err := json.Unmarshal(raw, &probe); err != nil {
		return false
	}

	_, ok := probe["__enc__"]

	return ok
}

// deriveKey derives a 32-byte AES key from password + salt via PBKDF2-SHA256.
func deriveKey(password, salt []byte) [32]byte {
	raw := pbkdf2.Key(password, salt, pbkdf2Iterations, pbkdf2KeyLen, sha256.New)

	var key [32]byte

	copy(key[:], raw)

	return key
}

// seal encrypts plaintext with AES-256-GCM using a random nonce.
func seal(plaintext []byte, key [32]byte) (ciphertext, nonce []byte, err error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, nil, fmt.Errorf("new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("new gcm: %w", err)
	}

	nonce = make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("generate nonce: %w", err)
	}

	return gcm.Seal(nil, nonce, plaintext, nil), nonce, nil
}

// open decrypts ciphertext with AES-256-GCM.
func open(ciphertext, nonce []byte, key [32]byte) ([]byte, error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("new gcm: %w", err)
	}

	plain, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, errors.New("wrong password or corrupted data")
	}

	return plain, nil
}

// EncryptField encrypts a string value with a user password.
// A fresh random salt is generated per call so each field has an independent key.
func EncryptField(plaintext, password string) (json.RawMessage, error) {
	salt := make([]byte, saltLen)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return nil, fmt.Errorf("generate salt: %w", err)
	}

	key := deriveKey([]byte(password), salt)

	ct, nonce, err := seal([]byte(plaintext), key)
	if err != nil {
		return nil, err
	}

	ef := EncryptedField{
		Enc:   base64.StdEncoding.EncodeToString(ct),
		Nonce: base64.StdEncoding.EncodeToString(nonce),
		Salt:  base64.StdEncoding.EncodeToString(salt),
	}

	raw, err := json.Marshal(ef)
	if err != nil {
		return nil, fmt.Errorf("marshal encrypted field: %w", err)
	}

	return raw, nil
}

// DecryptField decrypts an EncryptedField JSON blob using the given password.
// Returns ErrWrongPassword if authentication fails.
func DecryptField(raw json.RawMessage, password string) (string, error) {
	var ef EncryptedField
	if err := json.Unmarshal(raw, &ef); err != nil {
		return "", fmt.Errorf("unmarshal encrypted field: %w", err)
	}

	ct, err := base64.StdEncoding.DecodeString(ef.Enc)
	if err != nil {
		return "", fmt.Errorf("decode ciphertext: %w", err)
	}

	nonce, err := base64.StdEncoding.DecodeString(ef.Nonce)
	if err != nil {
		return "", fmt.Errorf("decode nonce: %w", err)
	}

	salt, err := base64.StdEncoding.DecodeString(ef.Salt)
	if err != nil {
		return "", fmt.Errorf("decode salt: %w", err)
	}

	key := deriveKey([]byte(password), salt)

	plain, err := open(ct, nonce, key)
	if err != nil {
		return "", err
	}

	return string(plain), nil
}

// MachineEncrypt encrypts data using a machine-derived key (for the file-based fallback keyring).
// The output format is [nonce][ciphertext].
func MachineEncrypt(plaintext []byte, machineKey [32]byte) ([]byte, error) {
	ct, nonce, err := seal(plaintext, machineKey)
	if err != nil {
		return nil, err
	}

	result := make([]byte, 0, len(nonce)+len(ct))
	result = append(result, nonce...)
	result = append(result, ct...)

	return result, nil
}

// MachineDecrypt decrypts data that was encrypted by MachineEncrypt.
func MachineDecrypt(data []byte, machineKey [32]byte) ([]byte, error) {
	block, err := aes.NewCipher(machineKey[:])
	if err != nil {
		return nil, fmt.Errorf("new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("new gcm: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, errors.New("data too short")
	}

	nonce, ct := data[:nonceSize], data[nonceSize:]

	plain, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return nil, errors.New("decrypt failed: corrupted data or wrong key")
	}

	return plain, nil
}

// MachineKey derives a [32]byte key from a machine-specific secret using SHA-256.
func MachineKey(secret string) [32]byte {
	return sha256.Sum256([]byte("simora-keyring-v1:" + secret))
}
