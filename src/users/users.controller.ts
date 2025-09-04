import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StoreApiKeyDto } from './dto/store-api-key.dto';
import {
  EncryptedApiKeyResponse,
  ApiKeyStatusResponse,
} from './dto/api-key-responses.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // BYOK (Bring Your Own Key) endpoints

  @Post('api-key')
  @Auth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Store encrypted Gemini API key',
    description:
      "Store a user's encrypted Gemini API key with client-side encryption for BYOK functionality",
  })
  @ApiResponse({
    status: 201,
    description: 'API key stored successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid API key data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async storeApiKey(
    @Request() req: any,
    @Body() storeApiKeyDto: StoreApiKeyDto,
  ): Promise<{ message: string }> {
    await this.usersService.storeEncryptedApiKey(
      req.user.userId,
      storeApiKeyDto,
    );
    return { message: 'API key stored successfully' };
  }

  @Get('api-key')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get encrypted Gemini API key',
    description:
      "Retrieve the user's encrypted Gemini API key for client-side decryption",
  })
  @ApiResponse({
    status: 200,
    description: 'Encrypted API key retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No API key found for this user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getApiKey(@Request() req: any): Promise<EncryptedApiKeyResponse> {
    return this.usersService.getEncryptedApiKey(req.user.userId);
  }

  @Get('api-key/status')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check API key status',
    description: 'Check if the user has a stored Gemini API key',
  })
  @ApiResponse({
    status: 200,
    description: 'API key status retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getApiKeyStatus(@Request() req: any): Promise<ApiKeyStatusResponse> {
    return this.usersService.getApiKeyStatus(req.user.userId);
  }

  @Delete('api-key')
  @Auth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete stored API key',
    description: "Delete the user's stored encrypted Gemini API key",
  })
  @ApiResponse({
    status: 204,
    description: 'API key deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async deleteApiKey(@Request() req: any): Promise<void> {
    await this.usersService.deleteApiKey(req.user.userId);
  }
}
