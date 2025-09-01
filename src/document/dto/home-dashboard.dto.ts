import { ApiProperty } from '@nestjs/swagger';

export class DocumentSummaryDto {
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

export class RecentDocumentSummaryDto extends DocumentSummaryDto {
  @ApiProperty({
    example: '2024-01-15T14:30:00Z',
    description: 'When document was last accessed',
  })
  lastAccessedAt: Date;
}

export class HomeDashboardResponseDto {
  @ApiProperty({
    example: 25,
    description: 'Total number of documents created by user',
  })
  totalCreated: number;

  @ApiProperty({
    type: [DocumentSummaryDto],
    description: 'Up to 3 most recent shared (public) documents',
    maxItems: 3,
  })
  shared: DocumentSummaryDto[];

  @ApiProperty({
    type: [DocumentSummaryDto],
    description: 'Up to 3 most recent private documents',
    maxItems: 3,
  })
  private: DocumentSummaryDto[];

  @ApiProperty({
    type: [RecentDocumentSummaryDto],
    description: 'Up to 6 most recently accessed documents',
    maxItems: 6,
  })
  recentlyAccessed: RecentDocumentSummaryDto[];

  @ApiProperty({ example: 'Home dashboard data retrieved successfully' })
  message: string;
}
