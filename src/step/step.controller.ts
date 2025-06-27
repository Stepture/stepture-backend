import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StepService } from './step.service';

@ApiTags('step')
@Controller('step')
export class StepController {
  constructor(private readonly stepService: StepService) {}
}
