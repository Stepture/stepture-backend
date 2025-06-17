import { registerAs } from '@nestjs/config';

export default registerAs('googleOauth', () => ({
  clientID: process.env.GOOGLE_CLIENT_ID || 'default-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'default-client-secret',
  callBackURL:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:3000/auth/google/callback',
}));
