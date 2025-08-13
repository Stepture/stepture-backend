import { drive } from '@googleapis/drive';
import { OAuth2Client } from 'google-auth-library';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Readable } from 'stream';
import { UsersService } from 'src/users/users.service';
import { AuthenticatedUser } from 'src/types/global';
@Injectable()
export class GoogleDriveService {
  constructor(private readonly userService: UsersService) {}

  async uploadImageToDrive(
    file: Express.Multer.File,
    req: Request,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;

    const { accessToken, googleDriveRootId, refreshToken } =
      await this.userService.getAccessTokenAndGoogleDriveRootId(user.userId);
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    const driveClient = drive({ version: 'v3', auth: oauth2Client });
    const { originalname, buffer, mimetype } = file;

    const folderId = googleDriveRootId || 'root';
    const uploadRes = await driveClient.files.create({
      requestBody: {
        name: originalname,
        mimeType: mimetype,
        parents: [folderId],
      },
      media: {
        mimeType: mimetype,
        body: Readable.from(buffer),
      },
      fields: 'id, name, webViewLink',
    });

    const fileId = uploadRes.data.id;
    if (!fileId) {
      throw new Error('Failed to retrieve file ID after upload');
    }

    await driveClient.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const fileRes = await driveClient.files.get({
      fileId,
      fields: 'id, name, webViewLink',
    });

    return {
      statusCode: 201,
      imgId: fileRes.data.id,
      publicUrl: fileRes.data.id
        ? `https://lh3.googleusercontent.com/d/${fileRes.data.id}`
        : null,
    };
  }

  async deleteImageFromDrive(
    googleImageId: string,
    userId: string,
  ): Promise<void> {
    try {
      const { accessToken, refreshToken } =
        await this.userService.getAccessTokenAndGoogleDriveRootId(userId);

      const oauth2Client = new OAuth2Client();
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const driveClient = drive({ version: 'v3', auth: oauth2Client });

      await driveClient.files.delete({
        fileId: googleImageId,
      });
    } catch (error) {
      console.error(
        `Failed to delete image ${googleImageId} from Google Drive:`,
        error,
      );
    }
  }
}
