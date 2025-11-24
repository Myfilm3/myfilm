// src/auth/jwt-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // Mock temporal mientras no hay auth real
    if (!req.user) {
      req.user = { id: 1 };
    }

    return true;
  }
}
