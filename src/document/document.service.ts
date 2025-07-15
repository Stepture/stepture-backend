import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import CreateDocumentDto from './dto/create-document.dto';
import PartialUpdateDocumentDto from './dto/partial-update-document.dto';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  async createDocumentsWithSteps(
    userId: string,
    createDocumentDto: CreateDocumentDto,
  ) {
    const { title, description, steps } = createDocumentDto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const document = await tx.documents.create({
          data: {
            title,
            description,
            userId,
            steps: {
              create: steps.map((step, index) => ({
                stepDescription: step.stepDescription,
                stepNumber: Number(step.stepNumber),
                type: step.type,
                screenshot: step.screenshot
                  ? {
                      create: {
                        googleImageId: step.screenshot.googleImageId,
                        url: step.screenshot.url,
                        viewportX: step.screenshot.viewportX,
                        viewportY: step.screenshot.viewportY,
                        viewportWidth: step.screenshot.viewportWidth,
                        viewportHeight: step.screenshot.viewportHeight,
                        devicePixelRatio: step.screenshot.devicePixelRatio,
                      },
                    }
                  : undefined,
              })),
            },
          },
          include: {
            steps: {
              include: {
                screenshot: true,
              },
              orderBy: {
                stepNumber: 'asc',
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
        return document;
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to create document: ${error.message}`,
      );
    }
  }

  async getUserDocuments(userId: string) {
    return await this.prisma.documents.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            steps: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getDocumentById(documentId: string, userId: string) {
    const document = await this.prisma.documents.findFirst({
      where: {
        id: documentId,
        userId,
        isDeleted: false,
      },
      include: {
        steps: {
          include: {
            screenshot: true,
          },
          orderBy: {
            stepNumber: 'asc',
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }
    return document;
  }

  async updateDocument(
    documentId: string,
    userId: string,
    partialUpdateDocumentDto: PartialUpdateDocumentDto,
  ) {
    const { title, description } = partialUpdateDocumentDto;

    try {
      const existingDocument = await this.prisma.documents.findFirst({
        where: {
          id: documentId,
          userId,
          isDeleted: false,
        },
      });

      if (!existingDocument) {
        throw new BadRequestException('Document not found or access denied');
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No valid fields to update');
      }

      return await this.prisma.documents.update({
        where: { id: documentId },
        data: updateData,
        include: {
          steps: {
            include: {
              screenshot: true,
            },
            orderBy: {
              stepNumber: 'asc',
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update document: ${error.message}`,
      );
    }
  }

  async deleteDocument(documentId: string, userId: string) {
    try {
      const existingDocument = await this.prisma.documents.findFirst({
        where: {
          id: documentId,
          userId,
          isDeleted: false,
        },
      });

      if (!existingDocument) {
        throw new BadRequestException('Document not found or access denied');
      }

      return await this.prisma.documents.update({
        where: { id: documentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete document: ${error.message}`,
      );
    }
  }

  async permanentDeleteDocument(documentId: string, userId: string) {
    try {
      const existingDocument = await this.prisma.documents.findFirst({
        where: {
          id: documentId,
          userId,
        },
        include: {
          steps: {
            include: {
              screenshot: true,
            },
          },
        },
      });

      if (!existingDocument) {
        throw new BadRequestException('Document not found or access denied');
      }

      const screenshotsToDelete = existingDocument.steps
        .filter((step) => step.screenshot)
        .map((step) => step.screenshot!);

      console.log(
        `Found ${screenshotsToDelete.length} screenshots to delete from Google Drive`,
      );

      // Delete screenshots from Google Drive in parallel
      const deletePromises = screenshotsToDelete.map((screenshot) =>
        this.googleDriveService.deleteImageFromDrive(
          screenshot.googleImageId,
          userId,
        ),
      );

      try {
        await Promise.allSettled(deletePromises);
        console.log('Completed deleting screenshots from Google Drive');
      } catch (error) {
        console.error(
          'Some screenshots failed to delete from Google Drive:',
          error,
        );
        // Continue with database deletion even if Google Drive deletion fails
      }

      return await this.prisma.$transaction(async (tx) => {
        await tx.screenshots.deleteMany({
          where: {
            step: {
              documentId,
            },
          },
        });
        await tx.steps.deleteMany({
          where: { documentId },
        });
        return await tx.documents.delete({
          where: { id: documentId },
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to permanently delete document: ${error.message}`,
      );
    }
  }

  async restoreDocument(documentId: string, userId: string) {
    try {
      const existingDocument = await this.prisma.documents.findFirst({
        where: {
          id: documentId,
          userId,
          isDeleted: true,
        },
      });

      if (!existingDocument) {
        throw new BadRequestException(
          'Deleted document not found or access denied',
        );
      }

      return await this.prisma.documents.update({
        where: { id: documentId },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
        include: {
          steps: {
            include: {
              screenshot: true,
            },
            orderBy: {
              stepNumber: 'asc',
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to restore document: ${error.message}`,
      );
    }
  }

  async getDeletedDocuments(userId: string) {
    return await this.prisma.documents.findMany({
      where: {
        userId,
        isDeleted: true,
      },
      include: {
        _count: {
          select: {
            steps: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        deletedAt: 'desc',
      },
    });
  }
}
