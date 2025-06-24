import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma.service';
import { encryptRefreshToken } from '../common/utils/crypto.utils';
import { google } from 'googleapis';
import { access } from 'fs';

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
    let encryptedRefreshToken = '';

    if (refreshToken) {
      encryptedRefreshToken = encryptRefreshToken(refreshToken);
    }

    let user = await this.prisma.users.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email,
          googleId,
          name,
          image,
          accessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: expiresAt || expiredAt,
          password: '',
        },
      });

      try {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
          expiry_date: expiresAt?.getTime() || expiredAt.getTime(),
        });

        const drive = google.drive({
          version: 'v3',
          auth: oauth2Client,
        });

        const folderName = `Stepture - ${user.name}`;
        const res = await drive.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
          fields: 'files(id, name)',
        });

        let folderId: string | null = null;

        if (!res.data.files || res.data.files.length === 0) {
          const folder = await drive.files.create({
            requestBody: {
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
          });
          folderId = folder.data.id ?? null;
        } else {
          folderId = res.data.files[0].id ?? null;
        }
        if (folderId) {
          user = await this.prisma.users.update({
            where: { email },
            data: {
              googleDriveRootId: folderId,
            },
          });
        }
      } catch (error) {
        // console.error('Error creating Google Drive folder:', error);
        throw new Error('Failed to create Google Drive folder');
      }
    } else {
      user = await this.prisma.users.update({
        where: { email },
        data: {
          googleId,
          name,
          image,
          accessToken,
          expiresAt: expiresAt || expiredAt,
          ...(encryptedRefreshToken && {
            refreshToken: encryptedRefreshToken,
          }),
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
