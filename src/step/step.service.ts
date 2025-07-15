import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';

@Injectable()
export class StepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  async deleteStep(userId: string, stepId: string) {
    try {
      // First verify the step exists and the user owns the document
      const step = await this.prisma.steps.findFirst({
        where: {
          id: stepId,
        },
        include: {
          document: true,
          screenshot: true,
        },
      });

      if (!step) {
        throw new BadRequestException('Step not found');
      }

      if (step.document.userId !== userId) {
        throw new BadRequestException(
          'Access denied - You do not own this document',
        );
      }

      if (step.document.isDeleted) {
        throw new BadRequestException(
          'Cannot delete step from a deleted document',
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        // Delete screenshot from Google Drive first if it exists
        if (step.screenshot) {
          console.log(
            `Deleting screenshot ${step.screenshot.googleImageId} from Google Drive`,
          );
          try {
            await this.googleDriveService.deleteImageFromDrive(
              step.screenshot.googleImageId,
              userId,
            );
            console.log('Screenshot deleted from Google Drive successfully');
          } catch (error) {
            console.error(
              'Failed to delete screenshot from Google Drive:',
              error,
            );
            // Continue with database deletion even if Google Drive deletion fails
          }

          // Delete screenshot from database
          await tx.screenshots.delete({
            where: { stepId: stepId },
          });
        }

        // Delete the step
        const deletedStep = await tx.steps.delete({
          where: { id: stepId },
          include: {
            document: {
              select: {
                id: true,
                title: true,
                userId: true,
              },
            },
          },
        });

        return {
          message: 'Step deleted successfully',
          deletedStep: {
            id: deletedStep.id,
            stepDescription: deletedStep.stepDescription,
            stepNumber: deletedStep.stepNumber,
            type: deletedStep.type,
            documentId: deletedStep.documentId,
            hadScreenshot: !!step.screenshot,
          },
        };
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete step: ${error.message}`);
    }
  }
}
