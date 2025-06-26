import { Controller, Request, Post, Body, Get } from '@nestjs/common';
import { DocumentService } from './document.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import CreateDocumentDto from './dto/create-document.dto';
@Controller('document')
@Auth()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('create')
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
  async getAllDocuments(@Request() req: any) {
    const userId = req.user.userId;
    return this.documentService.getUserDocuments(userId);
  }

  @Get(':id')
  async getDocumentById(@Request() req: any) {
    const userId = req.user.userId;
    const documentId = req.params.id;

    const document = await this.documentService.getDocumentById(
      userId,
      documentId,
    );

    return this.documentService.getDocumentById(documentId, userId);
  }
}
