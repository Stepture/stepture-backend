import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GoogleDriveService } from './google-drive.service';
import { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

@ApiTags('google-drive')
@Controller('google-drive')
export class GoogleDriveController {
  constructor(private readonly googleDriveService: GoogleDriveService) {}

  @Post('upload-image')
  @Auth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadImageToDrive(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.googleDriveService.uploadImageToDrive(file, req);
  }
}
