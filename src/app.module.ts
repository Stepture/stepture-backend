import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { StepModule } from './step/step.module';
import { DocumentModule } from './document/document.module';
import { ScreenshotModule } from './screenshot/screenshot.module';

@Module({
  imports: [AuthModule, UsersModule, GoogleDriveModule, StepModule, DocumentModule, ScreenshotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
