export interface EncryptedApiKeyResponse {
  encryptedKey: string; // Base64 encoded encrypted API key
  salt: string; // Base64 encoded salt
  iv: string; // Base64 encoded initialization vector
  hash: string; // SHA-256 hash for integrity verification
}

export interface ApiKeyStatusResponse {
  hasCustomApiKey: boolean;
}
