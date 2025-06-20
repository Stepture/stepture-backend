import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

interface RefreshJwtPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

interface Cookies {
  refresh_token?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    const refreshJwtSecret = configService.get<string>('refreshJwt.secret');
    if (!refreshJwtSecret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          const cookies = request?.cookies as Cookies | undefined;
          if (!cookies || typeof cookies !== 'object') {
            return null;
          }
          return cookies.refresh_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: refreshJwtSecret,
    });
  }

  validate(payload: RefreshJwtPayload) {
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Validate required fields
    if (!payload.sub || !payload.name) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    return {
      userId: payload.sub,
      name: payload.name,
    };
  }
}
