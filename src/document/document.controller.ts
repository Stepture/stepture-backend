import { Controller, Request, Post, Body, Get } from '@nestjs/common';
import { DocumentService } from './document.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import CreateDocumentDto from './dto/create-document.dto';
import {
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiResponse,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { CreateStepDto } from 'src/step/dto/create-step.dto';
import CreateScreenshotDto from 'src/screenshot/dto/create-screenshot.dto';

@ApiTags('document')
@Auth()
@Controller('document')
@ApiExtraModels(CreateStepDto, CreateScreenshotDto)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('create')
  @ApiBody({ type: CreateDocumentDto })
  @ApiOkResponse({
    description: 'Document created successfully',
    type: CreateDocumentDto,
  })
  async createDocument(
    @Request() req: any,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    const userId = req.user.userId;
    return this.documentService.createDocumentsWithSteps(
      userId,
      createDocumentDto,
    );
  }

  @Get('')
  @ApiOkResponse({
    description: 'List of user documents',
    type: [CreateDocumentDto],
  })
  async getAllDocuments(@Request() req: any) {
    const userId = req.user.userId;
    return this.documentService.getUserDocuments(userId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String, description: 'Document ID' })
  @ApiOkResponse({ description: 'Document by ID', type: CreateDocumentDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentById(@Request() req: any) {
    const userId = req.user.userId;
    const documentId = req.params.id;
    return this.documentService.getDocumentById(documentId, userId);
  }
}
