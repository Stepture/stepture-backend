import { applyDecorators, UseGuards } from '@nestjs/common';
import { RefreshJwtAuthGuard } from '../guards/refresh-jwt-auth.guard';

export function RefreshAuth() {
  return applyDecorators(UseGuards(RefreshJwtAuthGuard));
}
