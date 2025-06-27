import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import CreateDocumentDto from './dto/create-document.dto';

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

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
                        url: step.screenshot.url,
                        viewportX: step.screenshot.viewportX,
                        viewportY: step.screenshot.viewportY,
                        pageX: step.screenshot.pageX,
                        pageY: step.screenshot.pageY,
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
}
