import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SaveOthersDocumentDto {
  @ApiProperty({
    description: 'The ID of the document to save',
    example: '0197c6c1-0666-7be1-bb32-464e9cd7789c',
  })
  @IsUUID()
  documentId: string;
}

export default SaveOthersDocumentDto;
