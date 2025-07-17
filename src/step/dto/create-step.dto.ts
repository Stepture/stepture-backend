import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StepType } from '../../../generated/prisma/index';
import CreateScreenshotDto from 'src/screenshot/dto/create-screenshot.dto';

export class CreateStepDto {
  @ApiProperty({
    description: 'Detailed description of what this step involves',
    example: 'Click on the "Sign In" button located in the top right corner',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  stepDescription: string;

  @ApiProperty({
    description: 'The number/order of this step in the document',
    example: 1,
    minimum: 1,
    type: Number,
  })
  @IsNumber()
  stepNumber: number;

  @ApiProperty({
    description: 'Type of step in the documentation',
    enum: StepType,
    enumName: 'StepType',
    example: StepType.STEP,
    examples: {
      'Regular Step': {
        value: StepType.STEP,
        description: 'A regular action step',
      },
      Tip: { value: StepType.TIPS, description: 'A helpful tip or note' },
      Header: { value: StepType.HEADER, description: 'A section header' },
      Alert: {
        value: StepType.ALERT,
        description: 'Important warning or alert',
      },
    },
  })
  @IsEnum(StepType)
  type: StepType;

  @ApiProperty({
    description: 'Optional screenshot that demonstrates this step',
    type: CreateScreenshotDto,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateScreenshotDto)
  screenshot?: CreateScreenshotDto;
}
