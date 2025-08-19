import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStepDto } from 'src/step/dto/create-step.dto';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'The title of the document',
    example: 'How to Login to Admin Dashboard',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Optional detailed description of what this document covers',
    example:
      'A comprehensive step-by-step guide for new administrators to access the dashboard',
    required: false,
    nullable: true,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the document should be public or private',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({
    description: 'Array of steps that make up this document',
    type: [CreateStepDto],
    isArray: true,
    minItems: 1,
    maxItems: 100,
    example: [
      {
        stepNumber: 1,
        stepDescription:
          'Navigate to the login page at https://admin.example.com',
        type: 'STEP',
        screenshot: {
          url: 'https://example.com/screenshots/login-page.png',
          viewportX: 1920,
          viewportY: 1080,
          viewportWidth: 0,
          viewportHeight: 0,
          devicePixelRatio: 1.0,
        },
      },
      {
        stepNumber: 2,
        stepDescription: 'Remember to use your corporate email address',
        type: 'TIPS',
      },
      {
        stepNumber: 3,
        stepDescription: 'Enter your email address in the username field',
        type: 'STEP',
        screenshot: {
          url: 'https://example.com/screenshots/username-field.png',
          viewportX: 1920,
          viewportY: 1080,
          viewportWidth: 0,
          viewportHeight: 100,
          devicePixelRatio: 1.0,
        },
      },
      {
        stepNumber: 4,
        stepDescription: 'Enter your password in the password field',
        type: 'STEP',
      },
      {
        stepNumber: 5,
        stepDescription:
          'Make sure your password meets the security requirements',
        type: 'ALERT',
      },
      {
        stepNumber: 6,
        stepDescription: 'Click the "Sign In" button to authenticate',
        type: 'STEP',
        screenshot: {
          url: 'https://example.com/screenshots/signin-button.png',
          viewportX: 1920,
          viewportY: 1080,
          viewportWidth: 0,
          viewportHeight: 200,
          devicePixelRatio: 1.0,
        },
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Document must have at least one step' })
  @ArrayMaxSize(100, { message: 'Document cannot have more than 100 steps' })
  @ValidateNested({ each: true })
  @Type(() => CreateStepDto)
  steps: CreateStepDto[];
}
export default CreateDocumentDto;
