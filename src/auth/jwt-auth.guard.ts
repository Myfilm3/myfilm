import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // ✅ DEV fallback: si NO hay auth real, usa:
    // 1) header x-dev-user-id (si lo mandas)
    // 2) ENV DEV_USER_ID
    // 3) Filmito (2) por defecto
    const headerId = (req as any).devUserId;
    const envId = process.env.DEV_USER_ID ? Number(process.env.DEV_USER_ID) : undefined;
    const devId = headerId ?? envId ?? 2;

    // Si no hay user (no JWT), asigna dev
    if (!req.user) {
      req.user = { id: devId };
    }

    // Si quieres que el header SIEMPRE sobreescriba incluso si hay req.user:
    if (headerId && req.user?.id !== headerId) {
      req.user.id = headerId;
    }

    return true;
  }
}
