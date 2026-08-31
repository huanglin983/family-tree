/**
 * 鉴权中间件
 */
import type { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    adminId?: number;
    username?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.adminId) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  next();
}
