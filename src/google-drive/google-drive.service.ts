import { google } from 'googleapis';
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
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const { originalname, buffer, mimetype } = file;

    const folderId = googleDriveRootId || 'root';
    const uploadRes = await drive.files.create({
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

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const fileRes = await drive.files.get({
      fileId,
      fields: 'id, name, webViewLink',
    });

    return {
      statusCode: 201,
      publicUrl: fileRes.data.id
        ? `https://drive.google.com/uc?id=${fileRes.data.id}`
        : null,
    };
  }
}
