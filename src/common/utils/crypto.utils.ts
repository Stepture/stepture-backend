import * as crypto from 'crypto';

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000';
const IV_LENGTH = 16;
export function encryptRefreshToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv,
  );
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptRefreshToken(encrypted: string): string {
  const [ivString, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivString, 'hex');
  const encryptedData = Buffer.from(encryptedText, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'utf8'),
    iv,
  );
  let decrypted = decipher.update(encryptedData, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
