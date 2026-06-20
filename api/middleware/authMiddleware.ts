import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import type { User } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      code: 401,
      message: '未提供认证令牌',
      data: null,
    });
    return;
  }

  const parts = authHeader!.split(' ');
  const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;

  if (!token) {
    res.status(401).json({
      code: 401,
      message: '认证令牌格式无效',
      data: null,
    });
    return;
  }

  const user = authService.validateToken(token);

  if (!user) {
    res.status(401).json({
      code: 401,
      message: '认证令牌无效或已过期',
      data: null,
    });
    return;
  }

  req.user = user;
  req.token = token;
  next();
};

export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;

    if (token) {
      const user = authService.validateToken(token);
      if (user) {
        req.user = user;
        req.token = token;
      }
    }
  }

  next();
};

export default authMiddleware;
