import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUrl } from 'class-validator';

export class CreateScreenshotDto {
  @ApiProperty({
    description: 'Google Drive image ID',
    example: '1A2B3C4D5E6F7G8H9I0J',
  })
  googleImageId: string;

  @ApiProperty({
    description: 'Screenshot image URL',
    example: 'https://lh3.googleusercontent.com/d/1A2B3C4D5E6F7G8H9I0J',
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
    description: 'viewportWidth coordinate where screenshot was taken',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  viewportWidth: number;

  @ApiProperty({
    description: 'viewportHeight coordinate where screenshot was taken',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  viewportHeight: number;

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
