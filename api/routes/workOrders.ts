import { Router, type Response } from 'express';
import { workOrderService } from '../services/workOrderService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { requireManager } from '../middleware/roleMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';
import type { CreateWorkOrderInput, WorkOrderStatus } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, reporterId, assigneeId, deviceId, unassigned, startDate, endDate, page, pageSize } = req.query;
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status as WorkOrderStatus;
    if (reporterId) filters.reporterId = reporterId as string;
    if (assigneeId) filters.assigneeId = assigneeId as string;
    if (deviceId) filters.deviceId = deviceId as string;
    if (unassigned === 'true') filters.unassigned = true;
    if (startDate) filters.startDate = startDate as string;
    if (endDate) filters.endDate = endDate as string;

    const mine = req.query.mine === 'true';
    if (mine) {
      if (req.user!.role === 'admin') {
        filters.assigneeId = req.user!.id;
      } else {
        filters.reporterId = req.user!.id;
      }
    }

    if (page || pageSize) {
      const result = workOrderService.paginate(
        { page: Number(page), pageSize: Number(pageSize) },
        filters,
      );
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    } else {
      const result = workOrderService.findAll(filters);
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/stats', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const result = workOrderService.getStats(
      startDate as string | undefined,
      endDate as string | undefined,
    );
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = workOrderService.findById(req.params.id);
    if (!result) {
      res.status(404).json({ code: 404, message: '工单不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input: CreateWorkOrderInput = {
      ...req.body,
      reporterId: req.user!.id,
    };
    if (!input.deviceId || !input.faultType || !input.description) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    const result = workOrderService.create(input);
    res.status(201).json({ code: 201, message: '创建成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.put('/:id', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = workOrderService.update(req.params.id, req.body);
    if (!result) {
      res.status(404).json({ code: 404, message: '工单不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '更新成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/assign', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { assigneeId } = req.body;
    if (!assigneeId) {
      res.status(400).json({
        code: 400,
        message: '请指定处理人',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    const result = workOrderService.assign(req.params.id, assigneeId);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '分配失败：工单不存在或处理人无效',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '分配成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/auto-assign', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = workOrderService.autoAssignAllPending();
    res.json({
      code: 200,
      message: '自动分配完成',
      data: { assignedCount: count },
    } as ApiResponse<{ assignedCount: number }>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = workOrderService.startProcessing(req.params.id, req.user!.id);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '开始处理失败：工单不存在或非指派人员',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '已开始处理', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/complete', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { confirmCode, rating } = req.body;
    if (!confirmCode) {
      res.status(400).json({
        code: 400,
        message: '请提供确认码',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    const result = workOrderService.complete(req.params.id, req.user!.id, confirmCode, rating);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '完成失败：工单不存在或非指派人员',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '处理完成', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = workOrderService.cancel(req.params.id, req.user!.id);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '取消失败：工单不存在或非报告人',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '已取消', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/rate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rating } = req.body;
    const result = workOrderService.rate(req.params.id, req.user!.id, Number(rating));
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '评价失败：工单不存在或非报告人',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '评价成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.delete('/:id', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const success = workOrderService.delete(req.params.id);
    if (!success) {
      res.status(404).json({ code: 404, message: '工单不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '删除成功', data: null } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
