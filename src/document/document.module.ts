import { Module, forwardRef } from '@nestjs/common';
import { DocumentService } from './document.service';
import { TitleGenerationService } from './title-generation.service';
import { DocumentController } from './document.controller';
import { PrismaService } from 'src/prisma.service';
import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

@Module({
  imports: [GoogleDriveModule],
  controllers: [DocumentController],
  providers: [DocumentService, TitleGenerationService, PrismaService],
  exports: [TitleGenerationService],
})
export class DocumentModule {}
