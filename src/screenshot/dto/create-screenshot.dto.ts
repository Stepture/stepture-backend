import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUrl } from '@nestjs/class-validator';

export class CreateScreenshotDto {
  @ApiProperty({
    description: 'Screenshot image URL',
    example: 'https://example.com/screenshots/login-page.png',
    format: 'url',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Viewport width in pixels',
    example: 1920,
    minimum: 1,
  })
  @IsNumber()
  viewportX: number;

  @ApiProperty({
    description: 'Viewport height in pixels',
    example: 1080,
    minimum: 1,
  })
  @IsNumber()
  viewportY: number;

  @ApiProperty({
    description: 'Page X coordinate where screenshot was taken',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  pageX: number;

  @ApiProperty({
    description: 'Page Y coordinate where screenshot was taken',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  pageY: number;

  @ApiProperty({
    description: 'Device pixel ratio used for the screenshot',
    example: 1.0,
    minimum: 0.1,
    maximum: 5.0,
  })
  @IsNumber()
  devicePixelRatio: number;
}

export default CreateScreenshotDto;
