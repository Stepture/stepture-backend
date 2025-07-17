import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StepType } from '../../../generated/prisma/index';

export class UpdateScreenshotDto {
  @ApiProperty({
    description: 'Screenshot ID (for existing screenshots)',
    required: false,
    example: '0197c6c1-0666-7be1-bb32-464e9cd7789c',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: 'Google Drive Image ID',
    example: '1A2B3C4D5E6F7G8H9I0J',
  })
  @IsString()
  googleImageId: string;

  @ApiProperty({
    description: 'URL of the screenshot',
    example: 'https://example.com/screenshot.png',
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'X coordinate of the viewport',
    example: 1920,
    minimum: 1,
  })
  @IsNumber()
  viewportX: number;

  @ApiProperty({
    description: 'Y coordinate of the viewport',
    example: 1080,
    minimum: 1,
  })
  @IsNumber()
  viewportY: number;

  @ApiProperty({
    description: 'Width of the viewport',
    example: 1920,
    minimum: 0,
  })
  @IsNumber()
  viewportWidth: number;

  @ApiProperty({
    description: 'Height of the viewport',
    example: 1080,
    minimum: 0,
  })
  @IsNumber()
  viewportHeight: number;

  @ApiProperty({
    description: 'Device pixel ratio',
    example: 1.0,
    minimum: 0.1,
  })
  @IsNumber()
  devicePixelRatio: number;
}

export class UpdateStepDto {
  @ApiProperty({
    description: 'Step ID (for existing steps, omit for new steps)',
    required: false,
    example: '0197c6c1-0666-7be1-bb32-464e9cd7789c',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

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
  })
  @IsEnum(StepType)
  type: StepType;

  @ApiProperty({
    description: 'Screenshot associated with this step',
    type: UpdateScreenshotDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateScreenshotDto)
  screenshot?: UpdateScreenshotDto;

  @ApiProperty({
    description: 'Mark this step for deletion',
    required: false,
    default: false,
  })
  @IsOptional()
  delete?: boolean;
}

export class UpdateDocumentWithStepsDto {
  @ApiProperty({
    description: 'The title of the document',
    example: 'Updated: How to Login to Admin Dashboard',
    minLength: 1,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Optional detailed description of what this document covers',
    example: 'An updated comprehensive step-by-step guide for administrators',
    required: false,
    nullable: true,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of steps to update/add/delete',
    type: [UpdateStepDto],
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStepDto)
  steps?: UpdateStepDto[];

  @ApiProperty({
    description: 'Array of step IDs to delete',
    type: [String],
    isArray: true,
    required: false,
    example: ['0197c6c1-0666-7be1-bb32-464e9cd7789c'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteStepIds?: string[];
}

export default UpdateDocumentWithStepsDto;
