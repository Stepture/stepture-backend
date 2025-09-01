import {
  BadRequestException,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import CreateDocumentDto from './dto/create-document.dto';
import UpdateDocumentWithStepsDto from './dto/update-document-with-steps.dto';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import UpdateDocumentSharingDto from './dto/update-document-sharing.dto';
import { CreateStepDto } from 'src/step/dto/create-step.dto';
import { TitleGenerationService } from './title-generation.service';

@Injectable()
export class DocumentService {
  private readonly STEP_TIME_SECONDS = {
    STEP: {
      withScreenshot: 30,
      withoutScreenshot: 10,
    },
    TIPS: 5,
    HEADER: 2,
    ALERT: 8,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly titleGenerationService: TitleGenerationService,
  ) {}

  private calculateEstimatedTimeInSeconds(steps: any[]): number {
    return steps.reduce((totalSeconds: number, step: any) => {
      if (step.type === 'STEP') {
        return (
          totalSeconds +
          (step.screenshot
            ? this.STEP_TIME_SECONDS.STEP.withScreenshot
            : this.STEP_TIME_SECONDS.STEP.withoutScreenshot)
        );
      }

      return totalSeconds + this.STEP_TIME_SECONDS[step.type];
    }, 0);
  }

  async createDocumentsWithSteps(
    userId: string,
    createDocumentDto: CreateDocumentDto,
  ) {
    const { title, description, isPublic, steps } = createDocumentDto;

    // Always generate title using Gemini for better quality
    const stepDescriptions = steps.map((step) => step.stepDescription);
    const titleGenerationResult =
      await this.titleGenerationService.generateTitle(stepDescriptions);
    const documentTitle = titleGenerationResult.title;
    console.log(`Generated document title: ${documentTitle}`);
    // Calculate estimated completion time in seconds
    const estimatedCompletionTime = this.calculateEstimatedTimeInSeconds(steps);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const document = await tx.documents.create({
            data: {
              title: documentTitle,
              description,
              isPublic: isPublic ?? false,
              estimatedCompletionTime,
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

  async getDocumentById(documentId: string, userId?: string) {
    const whereCondition = userId
      ? {
          // Authenticated user
          id: documentId,
          isDeleted: false,
          OR: [
            { userId }, // Only matches actual user ID
            { isPublic: true },
          ],
        }
      : {
          // Unauthenticated user
          id: documentId,
          isDeleted: false,
          isPublic: true, // ONLY public documents
        };

    const document = await this.prisma.documents.findFirst({
      where: whereCondition,
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
      throw new BadRequestException('Document not found or access denied');
    }
    return document;
  }

  async updateDocumentWithSteps(
    documentId: string,
    userId: string,
    updateDocumentWithStepsDto: UpdateDocumentWithStepsDto,
  ) {
    const { title, description, annotationColor, steps, deleteStepIds } =
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
          if (annotationColor !== undefined)
            documentUpdateData.annotationColor = annotationColor;

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

          // Recalculate estimated completion time if steps were modified
          if (steps || deleteStepIds) {
            // Get current steps after all updates
            const currentSteps = await tx.steps.findMany({
              where: { documentId },
              include: { screenshot: true },
            });

            const newEstimatedTime =
              this.calculateEstimatedTimeInSeconds(currentSteps);

            await tx.documents.update({
              where: { id: documentId },
              data: { estimatedCompletionTime: newEstimatedTime },
            });
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
        // Delete saved document records first
        await tx.savedDocuments.deleteMany({
          where: { documentId },
        });

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

  // Save/Bookmark documents (including own documents)
  async saveDocument(userId: string, documentId: string) {
    try {
      // Check if document exists and is not deleted
      const document = await this.prisma.documents.findFirst({
        where: {
          id: documentId,
          isDeleted: false,
        },
        include: {
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
        throw new NotFoundException('Document not found or has been deleted');
      }

      // Check if document is already saved by this user
      const existingSave = await this.prisma.savedDocuments.findUnique({
        where: {
          userId_documentId: {
            userId,
            documentId,
          },
        },
      });

      if (existingSave) {
        throw new ConflictException('Document is already saved');
      }

      // Save the document
      const savedDocument = await this.prisma.savedDocuments.create({
        data: {
          userId,
          documentId,
        },
        include: {
          document: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  steps: true,
                },
              },
            },
          },
        },
      });

      return {
        message: 'Document saved successfully',
        savedDocument: savedDocument.document,
        savedAt: savedDocument.savedAt,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to save document: ${error.message}`,
      );
    }
  }

  async unsaveDocument(userId: string, documentId: string) {
    try {
      const savedDocument = await this.prisma.savedDocuments.findUnique({
        where: {
          userId_documentId: {
            userId,
            documentId,
          },
        },
      });

      if (!savedDocument) {
        throw new NotFoundException('Saved document not found');
      }

      await this.prisma.savedDocuments.delete({
        where: {
          userId_documentId: {
            userId,
            documentId,
          },
        },
      });

      return {
        message: 'Document removed from saved list successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to unsave document: ${error.message}`,
      );
    }
  }

  async getSavedDocuments(userId: string) {
    try {
      const savedDocuments = await this.prisma.savedDocuments.findMany({
        where: {
          userId,
          document: {
            isDeleted: false,
          },
        },
        include: {
          document: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  steps: true,
                },
              },
            },
          },
        },
        orderBy: {
          savedAt: 'desc',
        },
      });

      return savedDocuments.map((saved) => ({
        ...saved.document,
        savedAt: saved.savedAt,
      }));
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve saved documents: ${error.message}`,
      );
    }
  }

  async checkIfDocumentIsSaved(userId: string, documentId: string) {
    try {
      const savedDocument = await this.prisma.savedDocuments.findUnique({
        where: {
          userId_documentId: {
            userId,
            documentId,
          },
        },
      });

      return {
        isSaved: !!savedDocument,
        savedAt: savedDocument?.savedAt || null,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to check save status: ${error.message}`,
      );
    }
  }

  async updateDocumentSharing(
    documentId: string,
    userId: string,
    updateDocumentSharingDto: UpdateDocumentSharingDto,
  ) {
    try {
      const document = await this.prisma.documents.findUnique({
        where: {
          id: documentId,
          userId,
        },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const updatedDocument = await this.prisma.documents.update({
        where: {
          id: documentId,
        },
        data: {
          isPublic: updateDocumentSharingDto.isPublic,
        },
      });

      return {
        message: 'Document sharing settings updated successfully',
        document: updatedDocument,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update document sharing settings: ${error.message}`,
      );
    }
  }
}
