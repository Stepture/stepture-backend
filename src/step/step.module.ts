import { Module } from '@nestjs/common';
import { StepService } from './step.service';
import { StepController } from './step.controller';
import { PrismaService } from 'src/prisma.service';
import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

@Module({
  imports: [GoogleDriveModule],
  controllers: [StepController],
  providers: [StepService, PrismaService],
})
export class StepModule {}
