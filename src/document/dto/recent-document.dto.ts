import { ApiProperty } from '@nestjs/swagger';

export class RecentDocumentDto {
  @ApiProperty({
    example: 'uuid-here',
    description: 'Document unique identifier',
  })
  id: string;

  @ApiProperty({
    example: 'How to create a React app',
    description: 'Document title',
  })
  title: string;

  @ApiProperty({
    example: 'Step-by-step guide to create a React application',
    description: 'Document description',
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: 300,
    description: 'Estimated completion time in seconds',
    required: false,
  })
  estimatedCompletionTime?: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'When document was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'When document was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    example: '2024-01-15T14:30:00Z',
    description: 'When document was last accessed',
  })
  lastAccessedAt: Date;

  @ApiProperty({ example: false, description: 'Whether document is public' })
  isPublic: boolean;

  @ApiProperty({ example: 'BLUE', description: 'Annotation color' })
  annotationColor: string;

  @ApiProperty({
    description: 'Document author information',
    example: {
      id: 'user-uuid',
      name: 'John Doe',
      email: 'john@example.com',
    },
  })
  user: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Step count information',
    example: { steps: 5 },
  })
  _count: {
    steps: number;
  };
}

export class RecentDocumentsResponseDto {
  @ApiProperty({
    type: [RecentDocumentDto],
    description: 'Array of recently accessed documents',
  })
  data: RecentDocumentDto[];

  @ApiProperty({ example: 4, description: 'Number of documents returned' })
  count: number;

  @ApiProperty({ example: 'Recent documents retrieved successfully' })
  message: string;
}
