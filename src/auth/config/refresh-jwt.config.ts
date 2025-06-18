import { registerAs } from '@nestjs/config';

export default registerAs('refreshJwt', () => ({
  secret: process.env.JWT_REFRESH_SECRET,
  expiresIn: process.env.REFRESH_JWT_EXPIRATION_TIME || '7d',
}));
