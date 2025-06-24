import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GoogleApiModule } from './google-api/google-api.module';

@Module({
  imports: [AuthModule, UsersModule, GoogleApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
