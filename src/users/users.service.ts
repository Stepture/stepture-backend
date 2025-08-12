import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma.service';
import {
  decryptRefreshToken,
  encryptRefreshToken,
} from '../common/utils/crypto.utils';
import { drive } from '@googleapis/drive';
import { OAuth2Client } from 'google-auth-library';
import { access } from 'fs';
import { GoogleDriveService } from '../google-drive/google-drive.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to obtain new access token');
    }

    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default to 1 hour

    return {
      accessToken: credentials.access_token,
      expiresAt,
    };
  }

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
        const oauth2Client = new OAuth2Client();
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
          expiry_date: expiresAt?.getTime() || expiredAt.getTime(),
        });

        const driveClient = drive({
          version: 'v3',
          auth: oauth2Client,
        });

        const folderName = `Stepture - ${user.name}`;
        const res = await driveClient.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
          fields: 'files(id, name)',
        });

        let folderId: string | null = null;

        if (!res.data.files || res.data.files.length === 0) {
          const folder = await driveClient.files.create({
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

  async getAccessTokenAndGoogleDriveRootId(id: string) {
    let user = await this.prisma.users.findUnique({
      where: { id },
      select: {
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
        googleDriveRootId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if token is expired or will expire soon (within 5 minutes) and refresh if needed
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (user.expiresAt && user.expiresAt < fiveMinutesFromNow) {
      console.log(
        `Access token expired or expiring soon for user ${id}, attempting to refresh...`,
      );

      const decryptedRefreshToken = user.refreshToken
        ? decryptRefreshToken(user.refreshToken)
        : null;

      if (!decryptedRefreshToken) {
        throw new Error(
          'Access token has expired and no refresh token available',
        );
      }

      try {
        // Refresh the access token
        const { accessToken, expiresAt } = await this.refreshAccessToken(
          decryptedRefreshToken,
        );

        // Update user with new access token
        user = await this.prisma.users.update({
          where: { id },
          data: {
            accessToken,
            expiresAt,
          },
          select: {
            accessToken: true,
            refreshToken: true,
            expiresAt: true,
            googleDriveRootId: true,
          },
        });

        console.log(`Successfully refreshed access token for user ${id}`);
      } catch (error) {
        console.error('Failed to refresh access token:', error);
        throw new Error(
          'Failed to refresh access token. Please re-authenticate.',
        );
      }
    }

    const decryptedRefreshToken = user.refreshToken
      ? decryptRefreshToken(user.refreshToken)
      : null;

    return {
      accessToken: user.accessToken,
      refreshToken: decryptedRefreshToken,
      googleDriveRootId: user.googleDriveRootId,
    };
  }
}
