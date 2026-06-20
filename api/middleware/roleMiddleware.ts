import type { Response, NextFunction } from 'express';
import type { UserRole } from '../../shared/index.js';
import type { AuthenticatedRequest } from './authMiddleware.js';

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        code: 401,
        message: '未认证',
        data: null,
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        code: 403,
        message: '权限不足，需要角色：' + roles.join(', '),
        data: null,
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireManager = requireRole('manager', 'admin');
export const requireEmployee = requireRole('employee', 'manager', 'admin');

export default requireRole;
