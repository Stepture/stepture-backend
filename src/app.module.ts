import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';

@Module({
  imports: [AuthModule, UsersModule, GoogleDriveModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
