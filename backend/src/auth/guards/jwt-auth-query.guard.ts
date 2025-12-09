import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthQueryGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    if (!req.headers?.authorization && req.query?.token) {
      req.headers = req.headers || {};
      req.headers.authorization = `Bearer ${req.query.token}`;
    }

    return req;
  }
}

