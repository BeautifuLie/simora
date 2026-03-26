package crypto_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	simcrypto "simora/backend/crypto"
)

func TestEncryptField_DecryptField_RoundTrip(t *testing.T) {
	plaintext := "super-secret-password"
	password := "correct-horse-battery-staple"

	raw, err := simcrypto.EncryptField(plaintext, password)

	require.NoError(t, err)
	require.NotNil(t, raw)

	got, err := simcrypto.DecryptField(raw, password)

	require.NoError(t, err)
	assert.Equal(t, plaintext, got)
}

func TestEncryptField_ProducesDifferentCiphertextsForSameInput(t *testing.T) {
	plaintext := "same-plaintext"
	password := "same-password"

	raw1, err := simcrypto.EncryptField(plaintext, password)
	require.NoError(t, err)

	raw2, err := simcrypto.EncryptField(plaintext, password)
	require.NoError(t, err)

	assert.NotEqual(t, string(raw1), string(raw2))
}

func TestDecryptField_WrongPassword_ReturnsError(t *testing.T) {
	raw, err := simcrypto.EncryptField("secret", "correct-password")
	require.NoError(t, err)

	_, err = simcrypto.DecryptField(raw, "wrong-password")

	require.Error(t, err)
}

func TestDecryptField_MalformedJSON_ReturnsError(t *testing.T) {
	malformed := json.RawMessage(`not valid json at all`)

	_, err := simcrypto.DecryptField(malformed, "any-password")

	require.Error(t, err)
}

func TestMachineEncrypt_MachineDecrypt_RoundTrip(t *testing.T) {
	plaintext := []byte("machine-secret-data")
	key := simcrypto.MachineKey("test-machine-secret")

	encrypted, err := simcrypto.MachineEncrypt(plaintext, key)

	require.NoError(t, err)
	require.NotNil(t, encrypted)

	got, err := simcrypto.MachineDecrypt(encrypted, key)

	require.NoError(t, err)
	assert.Equal(t, plaintext, got)
}

func TestMachineDecrypt_TruncatedData_ReturnsError(t *testing.T) {
	key := simcrypto.MachineKey("test-machine-secret")
	truncated := []byte{0x01, 0x02}

	_, err := simcrypto.MachineDecrypt(truncated, key)

	require.Error(t, err)
}

func TestIsEncryptedField_EncryptedFieldOutput_ReturnsTrue(t *testing.T) {
	raw, err := simcrypto.EncryptField("value", "password")
	require.NoError(t, err)

	result := simcrypto.IsEncryptedField(raw)

	assert.True(t, result)
}

func TestIsEncryptedField_PlainStringJSON_ReturnsFalse(t *testing.T) {
	plain := json.RawMessage(`"just a plain string"`)

	result := simcrypto.IsEncryptedField(plain)

	assert.False(t, result)
}
