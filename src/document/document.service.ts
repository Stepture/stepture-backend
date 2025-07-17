import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import CreateDocumentDto from './dto/create-document.dto';

import UpdateDocumentWithStepsDto from './dto/update-document-with-steps.dto';
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

  async updateDocumentWithSteps(
    documentId: string,
    userId: string,
    updateDocumentWithStepsDto: UpdateDocumentWithStepsDto,
  ) {
    const { title, description, steps, deleteStepIds } =
      updateDocumentWithStepsDto;

    try {
      const existingDocument = await this.prisma.documents.findFirst({
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
          },
        },
      });

      if (!existingDocument) {
        throw new BadRequestException('Document not found or access denied');
      }

      return await this.prisma.$transaction(async (tx) => {
        const documentUpdateData: any = {};
        if (title !== undefined) documentUpdateData.title = title;
        if (description !== undefined)
          documentUpdateData.description = description;

        if (Object.keys(documentUpdateData).length > 0) {
          await tx.documents.update({
            where: { id: documentId },
            data: documentUpdateData,
          });
        }

        if (deleteStepIds && deleteStepIds.length > 0) {
          const stepsToDelete = await tx.steps.findMany({
            where: {
              id: { in: deleteStepIds },
              documentId,
            },
            include: {
              screenshot: true,
            },
          });

          const deletePromises = stepsToDelete.map(async (step) => {
            if (step.screenshot) {
              try {
                await this.googleDriveService.deleteImageFromDrive(
                  step.screenshot.googleImageId,
                  userId,
                );
              } catch (error) {
                console.error(
                  `Failed to delete screenshot from Google Drive: ${error}`,
                );
              }
            }
            return Promise.resolve();
          });

          await Promise.all(deletePromises);

          await tx.screenshots.deleteMany({
            where: {
              step: {
                id: { in: deleteStepIds },
                documentId,
              },
            },
          });

          await tx.steps.deleteMany({
            where: {
              id: { in: deleteStepIds },
              documentId,
            },
          });
        }

        if (steps && steps.length > 0) {
          for (const step of steps) {
            if (step.id) {
              const existingStep = await tx.steps.findFirst({
                where: {
                  id: step.id,
                  documentId,
                },
                include: {
                  screenshot: true,
                },
              });

              if (!existingStep) {
                throw new BadRequestException(
                  `Step with ID ${step.id} not found`,
                );
              }

              await tx.steps.update({
                where: { id: step.id },
                data: {
                  stepDescription: step.stepDescription,
                  stepNumber: step.stepNumber,
                  type: step.type,
                },
              });

              if (step.screenshot) {
                if (existingStep.screenshot) {
                  if (
                    existingStep.screenshot.googleImageId !==
                    step.screenshot.googleImageId
                  ) {
                    try {
                      await this.googleDriveService.deleteImageFromDrive(
                        existingStep.screenshot.googleImageId,
                        userId,
                      );
                    } catch (error) {
                      console.error(
                        `Failed to delete old screenshot from Google Drive: ${error}`,
                      );
                    }
                  }

                  await tx.screenshots.update({
                    where: { stepId: step.id },
                    data: {
                      googleImageId: step.screenshot.googleImageId,
                      url: step.screenshot.url,
                      viewportX: step.screenshot.viewportX,
                      viewportY: step.screenshot.viewportY,
                      viewportWidth: step.screenshot.viewportWidth,
                      viewportHeight: step.screenshot.viewportHeight,
                      devicePixelRatio: step.screenshot.devicePixelRatio,
                    },
                  });
                } else {
                  await tx.screenshots.create({
                    data: {
                      stepId: step.id,
                      googleImageId: step.screenshot.googleImageId,
                      url: step.screenshot.url,
                      viewportX: step.screenshot.viewportX,
                      viewportY: step.screenshot.viewportY,
                      viewportWidth: step.screenshot.viewportWidth,
                      viewportHeight: step.screenshot.viewportHeight,
                      devicePixelRatio: step.screenshot.devicePixelRatio,
                    },
                  });
                }
              } else if (existingStep.screenshot) {
                try {
                  await this.googleDriveService.deleteImageFromDrive(
                    existingStep.screenshot.googleImageId,
                    userId,
                  );
                } catch (error) {
                  console.error(
                    `Failed to delete screenshot from Google Drive: ${error}`,
                  );
                }

                await tx.screenshots.delete({
                  where: { stepId: step.id },
                });
              }
            } else {
              const newStep = await tx.steps.create({
                data: {
                  documentId,
                  stepDescription: step.stepDescription,
                  stepNumber: step.stepNumber,
                  type: step.type,
                },
              });

              // Add screenshot if provided
              if (step.screenshot) {
                await tx.screenshots.create({
                  data: {
                    stepId: newStep.id,
                    googleImageId: step.screenshot.googleImageId,
                    url: step.screenshot.url,
                    viewportX: step.screenshot.viewportX,
                    viewportY: step.screenshot.viewportY,
                    viewportWidth: step.screenshot.viewportWidth,
                    viewportHeight: step.screenshot.viewportHeight,
                    devicePixelRatio: step.screenshot.devicePixelRatio,
                  },
                });
              }
            }
          }
        }

        return await tx.documents.findFirst({
          where: { id: documentId },
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
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update document with steps: ${error.message}`,
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

      // Delete screenshots from Google Drive in parallel
      const deletePromises = screenshotsToDelete.map((screenshot) =>
        this.googleDriveService.deleteImageFromDrive(
          screenshot.googleImageId,
          userId,
        ),
      );

      try {
        await Promise.allSettled(deletePromises);
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
