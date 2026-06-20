import { Router, type Response } from 'express';
import { notificationService } from '../services/notificationService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { isRead, type, page, pageSize } = req.query;
    const filters: Record<string, unknown> = { userId: req.user!.id };
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (type) filters.type = type as string;

    if (page || pageSize) {
      const result = notificationService.paginate(
        { page: Number(page), pageSize: Number(pageSize) },
        filters,
      );
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    } else {
      const result = notificationService.findByUser(req.user!.id, {
        isRead: isRead !== undefined ? isRead === 'true' : undefined,
      });
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/unread-count', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = notificationService.getUnreadCount(req.user!.id);
    res.json({ code: 200, message: '获取成功', data: { count } } as ApiResponse<{ count: number }>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = notificationService.findById(req.params.id);
    if (!result) {
      res.status(404).json({ code: 404, message: '通知不存在', data: null } as ApiResponse<null>);
      return;
    }
    if (result.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ code: 403, message: '无权限访问', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const notif = notificationService.findById(req.params.id);
    if (!notif) {
      res.status(404).json({ code: 404, message: '通知不存在', data: null } as ApiResponse<null>);
      return;
    }
    if (notif.userId !== req.user!.id) {
      res.status(403).json({ code: 403, message: '无权限操作', data: null } as ApiResponse<null>);
      return;
    }

    const result = notificationService.markAsRead(req.params.id);
    res.json({ code: 200, message: '标记成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/read-all', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = notificationService.markAllAsRead(req.user!.id);
    res.json({
      code: 200,
      message: '全部标记为已读',
      data: { markedCount: count },
    } as ApiResponse<{ markedCount: number }>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const notif = notificationService.findById(req.params.id);
    if (!notif) {
      res.status(404).json({ code: 404, message: '通知不存在', data: null } as ApiResponse<null>);
      return;
    }
    if (notif.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ code: 403, message: '无权限操作', data: null } as ApiResponse<null>);
      return;
    }

    const success = notificationService.delete(req.params.id);
    res.json({ code: 200, message: '删除成功', data: null } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.delete('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { readOnly } = req.query;
    if (readOnly === 'true') {
      notificationService.deleteReadByUser(req.user!.id);
    } else {
      notificationService.deleteByUser(req.user!.id);
    }
    res.json({ code: 200, message: '删除成功', data: null } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
