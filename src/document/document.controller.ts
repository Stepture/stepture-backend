import {
  Controller,
  Request,
  Post,
  Body,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { TitleGenerationService } from './title-generation.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { OptionalAuth } from 'src/auth/decorators/optional-auth.decorator';
import CreateDocumentDto from './dto/create-document.dto';
import SaveOthersDocumentDto from './dto/save-others-document.dto';
import UpdateDocumentWithStepsDto from './dto/update-document-with-steps.dto';
import UpdateDocumentSharingDto from './dto/update-document-sharing.dto';
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
@Controller('documents')
@ApiExtraModels(
  CreateStepDto,
  CreateScreenshotDto,
  UpdateDocumentWithStepsDto,
  UpdateDocumentSharingDto,
  SaveOthersDocumentDto,
)
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly titleGenerationService: TitleGenerationService,
  ) {}

  @Auth()
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

  @Auth()
  @Get('')
  @ApiOkResponse({
    description: 'List of user documents',
    type: [CreateDocumentDto],
  })
  async getAllDocuments(@Request() req: any) {
    const userId = req.user.userId;
    return this.documentService.getUserDocuments(userId);
  }

  @Auth()
  @Put(':id')
  @ApiParam({ name: 'id', type: String, description: 'Document ID' })
  @ApiBody({ type: UpdateDocumentWithStepsDto })
  @ApiOkResponse({
    description:
      'Document updated successfully with all nested changes (steps and screenshots)',
    type: CreateDocumentDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateDocumentWithSteps(
    @Request() req: any,
    @Param('id') documentId: string,
    @Body() updateDocumentWithStepsDto: UpdateDocumentWithStepsDto,
  ) {
    const userId = req.user.userId;

    return this.documentService.updateDocumentWithSteps(
      documentId,
      userId,
      updateDocumentWithStepsDto,
    );
  }

  @Auth()
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

  @Auth()
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

  @Auth()
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

  @Auth()
  @Get('deleted/list')
  @ApiOkResponse({
    description: 'List of user deleted documents',
    type: [CreateDocumentDto],
  })
  async getDeletedDocuments(@Request() req: any) {
    const userId = req.user.userId;
    return this.documentService.getDeletedDocuments(userId);
  }

  @OptionalAuth()
  @Get(':id')
  @ApiParam({ name: 'id', type: String, description: 'Document ID' })
  @ApiOkResponse({ description: 'Document by ID', type: CreateDocumentDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentById(@Request() req: any, @Param('id') documentId: string) {
    const userId = req.user?.userId || undefined;
    return this.documentService.getDocumentById(documentId, userId);
  }

  // Save/Bookmark Routes
  @Auth()
  @Post(':id/save')
  @ApiParam({ name: 'id', type: String, description: 'Document ID to save' })
  @ApiOkResponse({
    description: 'Document saved successfully',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 409, description: 'Document is already saved' })
  async saveDocument(@Request() req: any, @Param('id') documentId: string) {
    const userId = req.user.userId;
    return this.documentService.saveDocument(userId, documentId);
  }

  @Auth()
  @Delete(':id/save')
  @ApiParam({ name: 'id', type: String, description: 'Document ID to unsave' })
  @ApiOkResponse({
    description: 'Document removed from saved list successfully',
  })
  @ApiResponse({ status: 404, description: 'Saved document not found' })
  async unsaveDocument(@Request() req: any, @Param('id') documentId: string) {
    const userId = req.user.userId;
    return this.documentService.unsaveDocument(userId, documentId);
  }

  @Auth()
  @Get('saved/list')
  @ApiOkResponse({
    description: 'List of user saved documents',
    type: [CreateDocumentDto],
  })
  async getSavedDocuments(@Request() req: any) {
    const userId = req.user.userId;
    return this.documentService.getSavedDocuments(userId);
  }

  @Auth()
  @Get(':id/save-status')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Document ID to check save status',
  })
  @ApiOkResponse({
    description: 'Document save status',
  })
  async checkSaveStatus(@Request() req: any, @Param('id') documentId: string) {
    const userId = req.user.userId;
    return this.documentService.checkIfDocumentIsSaved(userId, documentId);
  }

  @Auth()
  @Patch(':id/sharing')
  @ApiParam({ name: 'id', type: String, description: 'Document ID' })
  @ApiBody({ type: UpdateDocumentSharingDto })
  @ApiOkResponse({
    description: 'Document sharing settings updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateDocumentSharing(
    @Request() req: any,
    @Param('id') documentId: string,
    @Body() updateDocumentSharingDto: UpdateDocumentSharingDto,
  ) {
    const userId = req.user.userId;
    return this.documentService.updateDocumentSharing(
      documentId,
      userId,
      updateDocumentSharingDto,
    );
  }
}
