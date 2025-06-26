import { Controller } from '@nestjs/common';
import { StepService } from './step.service';

@Controller('step')
export class StepController {
  constructor(private readonly stepService: StepService) {}
}
