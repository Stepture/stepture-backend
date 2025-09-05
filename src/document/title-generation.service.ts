import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class TitleGenerationService {
  private readonly logger = new Logger(TitleGenerationService.name);
  private readonly geminiApiKey = process.env.GEMINI_API_KEY;
  private readonly geminiModel =
    process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  private readonly genAI: GoogleGenerativeAI;
  private readonly model;

  constructor() {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.geminiModel,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 100, // Keep it short for titles
      },
    });
  }

  async generateTitle(steps: string[]): Promise<{
    title: string;
    confidence: number;
    tokensUsed: number;
    processingTime: string;
  }> {
    const startTime = Date.now();

    try {
      const prompt = this.formatStepsPrompt(steps);

      this.logger.debug(`Generating title for ${steps.length} steps`);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const processingTime = `${Date.now() - startTime}ms`;

      // Extract title from response and clean it
      const cleanTitle = this.extractAndCleanTitle(text);

      // Calculate confidence based on response quality (simplified)
      const confidence = this.calculateConfidence(cleanTitle, steps);

      // Estimate tokens used (approximate)
      const tokensUsed = this.estimateTokensUsed(prompt, cleanTitle);

      this.logger.log(
        `Title generated successfully in ${processingTime}: "${cleanTitle}"`,
      );

      return {
        title: cleanTitle,
        confidence,
        tokensUsed,
        processingTime,
      };
    } catch (error) {
      const processingTime = `${Date.now() - startTime}ms`;

      this.logger.error(
        `Failed to generate title after ${processingTime}:`,
        error.message,
      );

      // Fallback to simple concatenation
      const fallbackTitle = this.generateFallbackTitle(steps);

      this.logger.warn(`Using fallback title: "${fallbackTitle}"`);

      return {
        title: fallbackTitle,
        confidence: 0.5, // Lower confidence for fallback
        tokensUsed: 0,
        processingTime,
      };
    }
  }

  private formatStepsPrompt(steps: string[]): string {
    const stepsText = steps
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n');

    return `You are an expert at creating concise, descriptive titles for step-by-step tutorials and workflows.

Based on the following steps, generate a clear, actionable title that describes what the user will accomplish by following this tutorial.

Requirements:
- Maximum 8 words
- Start with "How to" when appropriate
- Be specific and descriptive
- Focus on the main goal/outcome
- Use proper title case
- No quotes or special formatting

Steps:
${stepsText}

Generate only the title, nothing else:`;
  }

  private extractAndCleanTitle(response: string): string {
    // Remove common prefixes and clean the response
    let title = response.trim();

    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '');

    // Remove "Title:" prefix if present
    title = title.replace(/^(Title:|Generated Title:)\s*/i, '');

    // Take only the first line if multiple lines
    title = title.split('\n')[0].trim();

    // Ensure reasonable length
    if (title.length > 100) {
      title = title.substring(0, 100).trim();
      // Try to end at a word boundary
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 50) {
        title = title.substring(0, lastSpace);
      }
    }

    // Ensure minimum length
    if (title.length < 5) {
      throw new Error('Generated title too short');
    }

    return title;
  }

  private calculateConfidence(title: string, steps: string[]): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence if title is too generic
    const genericWords = ['tutorial', 'guide', 'instructions', 'steps'];
    const hasGenericWords = genericWords.some((word) =>
      title.toLowerCase().includes(word),
    );

    if (hasGenericWords) {
      confidence -= 0.1;
    }

    // Increase confidence if title includes specific terms from steps
    const stepWords = steps.join(' ').toLowerCase().split(/\s+/);
    const titleWords = title.toLowerCase().split(/\s+/);
    const matchCount = titleWords.filter(
      (word) => stepWords.includes(word) && word.length > 3,
    ).length;

    confidence += Math.min(matchCount * 0.05, 0.15);

    // Ensure confidence is between 0.1 and 1.0
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private estimateTokensUsed(prompt: string, response: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil((prompt.length + response.length) / 4);
  }

  private generateFallbackTitle(steps: string[]): string {
    // Extract key actions and objects from steps
    const actionWords = [
      'login',
      'sign in',
      'create',
      'setup',
      'configure',
      'install',
      'download',
      'upload',
      'delete',
      'edit',
      'update',
      'manage',
    ];
    const foundActions: string[] = [];
    const foundObjects: string[] = [];

    steps.forEach((step) => {
      const stepLower = step.toLowerCase();

      // Find actions
      actionWords.forEach((action) => {
        if (stepLower.includes(action) && !foundActions.includes(action)) {
          foundActions.push(action);
        }
      });

      // Find potential objects (simple heuristic)
      const words = step.split(/\s+/);
      words.forEach((word) => {
        if (
          word.length > 4 &&
          !actionWords.includes(word.toLowerCase()) &&
          !['button', 'field', 'page', 'click', 'enter', 'navigate'].includes(
            word.toLowerCase(),
          ) &&
          foundObjects.length < 2
        ) {
          foundObjects.push(word);
        }
      });
    });

    // Construct fallback title
    let title = 'How to';

    if (foundActions.length > 0) {
      title += ` ${foundActions[0]}`;
    } else {
      title += ' complete';
    }

    if (foundObjects.length > 0) {
      title += ` ${foundObjects[0]}`;
    } else {
      title += ' task';
    }

    // Capitalize properly
    return title
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
