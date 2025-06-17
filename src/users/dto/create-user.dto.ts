import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: "URL to the user's profile image",
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  image?: string;

  @ApiProperty({
    description: 'Google OAuth ID',
    example: 'google-oauth2|1234567890',
  })
  googleId: string;

  @ApiProperty({
    description: 'Google OAuth Access Token',
    example: 'ya29.a0AfH6SMBx...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Google OAuth Refresh Token',
    example: '1//0g9a8hR...Rfa',
    required: false,
  })
  refreshToken?: string;

  @ApiProperty({
    description: 'Access token expiry date',
    example: '2025-06-11T12:34:56.789Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Google Drive Root Folder ID for the user',
    example: '0AJ9aBcD1EfGhUk9PVA',
    required: false,
  })
  googleDriveRootFolderId?: string;
}
