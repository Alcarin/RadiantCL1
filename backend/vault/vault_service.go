package vault

import (
	"encoding/json"
	"fmt"
	"github.com/zalando/go-keyring"
)

const serviceName = "RadiantCL1"

type VaultService struct {
}

func NewVaultService() *VaultService {
	return &VaultService{}
}

type keyringSecret struct {
	Username string `json:"u"`
	Password string `json:"p"`
}

// StorePassword memorizza username e password nel portachiavi di sistema
func (s *VaultService) StorePassword(credentialID int64, username, password string) error {
	secret := keyringSecret{Username: username, Password: password}
	data, err := json.Marshal(secret)
	if err != nil {
		return err
	}
	
	key := fmt.Sprintf("RadiantCL1:Credential:%d", credentialID)
	return keyring.Set(serviceName, key, string(data))
}

// GetPassword recupera username e password dal portachiavi di sistema
func (s *VaultService) GetPassword(credentialID int64) (string, string, error) {
	key := fmt.Sprintf("RadiantCL1:Credential:%d", credentialID)
	data, err := keyring.Get(serviceName, key)
	if err != nil {
		return "", "", err
	}

	var secret keyringSecret
	if err := json.Unmarshal([]byte(data), &secret); err != nil {
		return "", "", err
	}
	
	return secret.Username, secret.Password, nil
}

// DeletePassword rimuove le credenziali dal portachiavi
func (s *VaultService) DeletePassword(credentialID int64) error {
	key := fmt.Sprintf("RadiantCL1:Credential:%d", credentialID)
	return keyring.Delete(serviceName, key)
}
