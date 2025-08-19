import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to make authentication optional because sometimes users may be login and get id and somtimes it is public
  handleRequest(err: any, user: any, info: any) {
    if (user) {
      return user;
    }

    return undefined;
  }
}
