import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ScreenshotService } from './screenshot.service';

@ApiTags('screenshot')
@Controller('screenshot')
export class ScreenshotController {
  constructor(private readonly screenshotService: ScreenshotService) {}
}
