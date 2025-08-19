import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateDocumentSharingDto {
  @ApiProperty({
    description: 'Whether the document should be public or private',
    example: true,
  })
  @IsBoolean()
  isPublic: boolean;
}

export default UpdateDocumentSharingDto;
