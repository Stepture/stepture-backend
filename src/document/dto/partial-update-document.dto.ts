import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from '@nestjs/class-validator';

export class PartialUpdateDocumentDto {
  @ApiProperty({
    description: 'The title of the document',
    example: 'Updated Document Title',
    minLength: 1,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Optional detailed description of what this document covers',
    example: 'Updated description of the document',
    required: false,
    nullable: true,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export default PartialUpdateDocumentDto;
