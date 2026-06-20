import { Router, type Response } from 'express';
import { bookingService } from '../services/bookingService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { requireManager } from '../middleware/roleMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';

const router = Router();

router.use(authMiddleware, requireManager);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { mine, page, pageSize } = req.query;
    const managerId = mine === 'true' ? req.user!.id : undefined;
    const p = page ? Number(page) : 1;
    const ps = pageSize ? Number(pageSize) : 20;
    const result = bookingService.findPendingApprovals(managerId, p, ps);
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/pending', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { mine, page, pageSize } = req.query;
    const managerId = mine === 'true' ? req.user!.id : undefined;
    const p = page ? Number(page) : 1;
    const ps = pageSize ? Number(pageSize) : 20;
    const result = bookingService.findPendingApprovals(managerId, p, ps);
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/history', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = req.query;
    const managerId = req.user!.id;
    const p = page ? Number(page) : 1;
    const ps = pageSize ? Number(pageSize) : 20;
    const result = bookingService.findApprovalHistory(managerId, p, ps);
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/approve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { comment } = req.body;
    const result = bookingService.approve(req.params.id, req.user!.id, comment);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '审批失败：预订不存在或状态错误',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '审批通过', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/reject', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { comment } = req.body;
    if (!comment) {
      res.status(400).json({
        code: 400,
        message: '请填写驳回原因',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    const result = bookingService.reject(req.params.id, req.user!.id, comment);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '审批失败：预订不存在或状态错误',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '已驳回', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
