import { Inject, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import refreshJwtConfig from './config/refresh-jwt.config';
import { ConfigType } from '@nestjs/config';
import { AwthJwtPayload } from './types/auth.jwtPayload';
import * as argon2 from 'argon2';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    @Inject(refreshJwtConfig.KEY)
    private refreshTokenConfig: ConfigType<typeof refreshJwtConfig>,
  ) {}

  async login(userId: string) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return this.generateTokens(userId);
  }

  async validateGoogleUser(googleUser: CreateUserDto) {
    const user = await this.userService.findOrCreateGoogleUser(googleUser);
    if (!user) {
      throw new Error('Failed to create or update Google user');
    }
    return user;
  }

  async generateTokens(userId: string) {
    const payload: AwthJwtPayload = { sub: userId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, this.refreshTokenConfig),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }
}
