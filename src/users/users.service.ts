import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma.service';
import { encryptRefreshToken } from '../common/utils/crypto.utils';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateGoogleUser({
    email,
    googleId,
    name,
    image,
    accessToken,
    refreshToken,
    expiresAt,
  }: CreateUserDto) {
    const expiredAt = new Date(Date.now() + 3600 * 1000);

    let encryptedRefreshToken: string = '';
    if (refreshToken) {
      encryptedRefreshToken = encryptRefreshToken(refreshToken);
    }

    let user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email,
          googleId,
          name,
          accessToken,
          refreshToken: encryptedRefreshToken,
          image,
          expiresAt: expiresAt || expiredAt,
          password: '',
        },
      });
    } else {
      user = await this.prisma.users.update({
        where: { email },
        data: {
          googleId,
          name,
          accessToken,
          ...(encryptedRefreshToken && {
            googleRefreshToken: encryptedRefreshToken,
          }),
          expiresAt: expiresAt || expiredAt,
        },
      });
    }
    return user;
  }

  async findOne(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }
}
