import { Request, Response, NextFunction } from 'express';

export function devUserMiddleware(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers['x-dev-user-id'];
  const raw = Array.isArray(h) ? h[0] : h;

  if (raw && /^\d+$/.test(String(raw))) {
    (req as any).devUserId = Number(raw);
  }

  next();
}
