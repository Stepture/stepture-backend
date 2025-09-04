import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class StoreApiKeyDto {
  @IsString()
  @IsNotEmpty()
  encryptedKey: string; // Base64 encoded encrypted API key

  @IsString()
  @IsNotEmpty()
  salt: string; // Base64 encoded salt

  @IsString()
  @IsNotEmpty()
  iv: string; // Base64 encoded initialization vector

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'Hash must be a 64-character hexadecimal string (SHA-256)',
  })
  hash: string; // SHA-256 hash for integrity verification
}
