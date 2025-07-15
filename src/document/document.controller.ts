import {
  Controller,
  Request,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import CreateDocumentDto from './dto/create-document.dto';
import PartialUpdateDocumentDto from './dto/partial-update-document.dto';
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
@Controller('documents')
@ApiExtraModels(CreateStepDto, CreateScreenshotDto, PartialUpdateDocumentDto)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('')
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

  @Put(':id')
  @ApiParam({ name: 'id', type: String, description: 'Document ID' })
  @ApiBody({ type: PartialUpdateDocumentDto })
  @ApiOkResponse({
    description: 'Document updated successfully (title and description only)',
    type: CreateDocumentDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateDocument(
    @Request() req: any,
    @Param('id') documentId: string,
    @Body() updateDocumentDto: PartialUpdateDocumentDto,
  ) {
    const userId = req.user.userId;

    return this.documentService.updateDocument(
      documentId,
      userId,
      updateDocumentDto,
    );
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String, description: 'Document ID' })
  @ApiOkResponse({
    description: 'Document deleted successfully (soft delete)',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(@Request() req: any, @Param('id') documentId: string) {
    const userId = req.user.userId;

    return this.documentService.deleteDocument(documentId, userId);
  }

  @Delete(':id/permanent')
  @ApiParam({ name: 'id', type: String, description: 'Document ID' })
  @ApiOkResponse({
    description: 'Document permanently deleted',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async permanentDeleteDocument(
    @Request() req: any,
    @Param('id') documentId: string,
  ) {
    const userId = req.user.userId;

    return this.documentService.permanentDeleteDocument(documentId, userId);
  }

  @Put(':id/restore')
  @ApiParam({ name: 'id', type: String, description: 'Document ID' })
  @ApiOkResponse({
    description: 'Document restored successfully',
    type: CreateDocumentDto,
  })
  @ApiResponse({ status: 404, description: 'Deleted document not found' })
  async restoreDocument(@Request() req: any, @Param('id') documentId: string) {
    const userId = req.user.userId;

    return this.documentService.restoreDocument(documentId, userId);
  }

  @Get('deleted/list')
  @ApiOkResponse({
    description: 'List of user deleted documents',
    type: [CreateDocumentDto],
  })
  async getDeletedDocuments(@Request() req: any) {
    const userId = req.user.userId;
    return this.documentService.getDeletedDocuments(userId);
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
