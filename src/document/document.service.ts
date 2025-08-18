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
      return await this.prisma.$transaction(
        async (tx) => {
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
        },
        {
          timeout: 50000,
        },
      );
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

      // Collect images to delete
      const imagesToDelete: string[] = [];

      // Images from steps being deleted
      if (deleteStepIds && deleteStepIds.length > 0) {
        const stepsToDelete = existingDocument.steps.filter((step) =>
          deleteStepIds.includes(step.id),
        );

        stepsToDelete.forEach((step) => {
          if (step.screenshot) {
            imagesToDelete.push(step.screenshot.googleImageId);
          }
        });
      }

      // Images from steps being updated with new screenshots
      if (steps && steps.length > 0) {
        // Map (JS) Similar to Python's dict
        const existingStepsMap = new Map(
          existingDocument.steps.map((step) => [step.id, step]),
        );

        steps.forEach((step) => {
          // If step has an ID and a screenshot, check if it needs to be deleted
          if (step.id && step.screenshot) {
            const existingStep = existingStepsMap.get(step.id);
            // If existing step has a screenshot and it's different, mark for deletion
            if (
              existingStep?.screenshot &&
              existingStep.screenshot.googleImageId !==
                step.screenshot.googleImageId
            ) {
              imagesToDelete.push(existingStep.screenshot.googleImageId);
            }
          }
          // If step has an ID and no screenshot, check if it needs to be deleted
          else if (step.id && !step.screenshot) {
            // Step is removing its screenshot
            const existingStep = existingStepsMap.get(step.id);
            if (existingStep?.screenshot) {
              imagesToDelete.push(existingStep.screenshot.googleImageId);
            }
          }
        });
      }

      const updatedDocument = await this.prisma.$transaction(
        async (tx) => {
          // Update document metadata
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

          // Delete steps and their screenshots from database
          if (deleteStepIds && deleteStepIds.length > 0) {
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

          // Process step updates and creates
          if (steps && steps.length > 0) {
            for (const step of steps) {
              if (step.id) {
                // Update existing step
                await tx.steps.update({
                  where: { id: step.id },
                  data: {
                    stepDescription: step.stepDescription,
                    stepNumber: step.stepNumber,
                    type: step.type,
                  },
                });

                // Handle screenshot updates
                if (step.screenshot) {
                  const existingStep = existingDocument.steps.find(
                    (s) => s.id === step.id,
                  );

                  if (existingStep?.screenshot) {
                    // Update existing screenshot
                    await tx.screenshots.update({
                      where: { stepId: step.id },
                      data: {
                        googleImageId: step.screenshot.googleImageId,
                        url: step.screenshot.url,
                        viewportX: step.screenshot.viewportX || 0, // Have to discuss about this
                        viewportY: step.screenshot.viewportY || 0,
                        viewportWidth: step.screenshot.viewportWidth || 0,
                        viewportHeight: step.screenshot.viewportHeight || 0,
                        devicePixelRatio: step.screenshot.devicePixelRatio || 0,
                      },
                    });
                  } else {
                    // Create new screenshot
                    await tx.screenshots.create({
                      data: {
                        stepId: step.id,
                        googleImageId: step.screenshot.googleImageId,
                        url: step.screenshot.url,
                        viewportX: step.screenshot.viewportX || 0,
                        viewportY: step.screenshot.viewportY || 0,
                        viewportWidth: step.screenshot.viewportWidth || 0,
                        viewportHeight: step.screenshot.viewportHeight || 0,
                        devicePixelRatio: step.screenshot.devicePixelRatio || 0,
                      },
                    });
                  }
                } else {
                  // Remove screenshot if it exists
                  const existingStep = existingDocument.steps.find(
                    (s) => s.id === step.id,
                  );
                  if (existingStep?.screenshot) {
                    await tx.screenshots.delete({
                      where: { stepId: step.id },
                    });
                  }
                }
              } else {
                // Create new step
                const newStep = await tx.steps.create({
                  data: {
                    documentId,
                    stepDescription: step.stepDescription,
                    stepNumber: step.stepNumber,
                    type: step.type,
                  },
                });

                // Create screenshot for new step if provided
                if (step.screenshot) {
                  await tx.screenshots.create({
                    data: {
                      stepId: newStep.id,
                      googleImageId: step.screenshot.googleImageId,
                      url: step.screenshot.url,
                      viewportX: step.screenshot.viewportX || 0,
                      viewportY: step.screenshot.viewportY || 0,
                      viewportWidth: step.screenshot.viewportWidth || 0,
                      viewportHeight: step.screenshot.viewportHeight || 0,
                      devicePixelRatio: step.screenshot.devicePixelRatio || 0,
                    },
                  });
                }
              }
            }
          }

          // Return updated document
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
        },
        {
          timeout: 15000,
        },
      );

      // Delete images asynchronously AFTER transaction completes
      if (imagesToDelete.length > 0) {
        this.deleteImagesAsync(imagesToDelete, userId);
      }

      return updatedDocument;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update document with steps: ${error.message}`,
      );
    }
  }

  private async deleteImagesAsync(imageIds: string[], userId: string) {
    const deletePromises = imageIds.map(async (imageId) => {
      try {
        await this.googleDriveService.deleteImageFromDrive(imageId, userId);
        console.log(`Successfully deleted image: ${imageId}`);
      } catch (error) {
        console.error(`Failed to delete image ${imageId}:`, error);
      }
    });

    // Explicitly handle the promise to prevent unhandled rejections
    Promise.allSettled(deletePromises).catch((error) => {
      console.error('Unexpected error in image deletion batch:', error);
    });
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

      // Collect image IDs to delete
      const imagesToDelete = existingDocument.steps
        .filter((step) => step.screenshot)
        .map((step) => step.screenshot!.googleImageId);

      // Execute database deletion first
      const deletedDocument = await this.prisma.$transaction(async (tx) => {
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

      // Delete images asynchronously AFTER database deletion
      if (imagesToDelete.length > 0) {
        this.deleteImagesAsync(imagesToDelete, userId);
      }

      return deletedDocument;
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
