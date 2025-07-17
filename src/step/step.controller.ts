import { Controller, Delete, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StepService } from './step.service';
import { Auth } from 'src/auth/decorators/auth.decorator';

@ApiTags('step')
@Auth()
@Controller('step')
export class StepController {
  constructor(private readonly stepService: StepService) {}

  @Delete(':id')
  @ApiParam({ name: 'id', type: String, description: 'Step ID' })
  @ApiOkResponse({
    description:
      'Step deleted successfully. Associated screenshot will also be removed if it exists.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Step deleted successfully' },
        deletedStep: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'step-123' },
            stepDescription: {
              type: 'string',
              example: 'Click the login button',
            },
            stepNumber: { type: 'number', example: 1.5 },
            type: { type: 'string', example: 'STEP' },
            documentId: { type: 'string', example: 'doc-456' },
            hadScreenshot: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Step not found or access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Step not found',
  })
  async deleteStep(@Request() req: any, @Param('id') stepId: string) {
    const userId = req.user.userId;
    return this.stepService.deleteStep(userId, stepId);
  }
}
