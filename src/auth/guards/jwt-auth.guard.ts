import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      console.error('JWT Auth Guard Error:', err);
      console.error('User:', user);
      throw (
        err || new UnauthorizedException('Access token is missing or invalid')
      );
    }
    return user;
  }
}
