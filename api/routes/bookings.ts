import { Router, type Response } from 'express';
import { bookingService } from '../services/bookingService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';
import type { CreateBookingInput, BookingConflict, BookingStatus } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, roomId, startDate, endDate, page, pageSize } = req.query;
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status as BookingStatus;
    if (roomId) filters.roomId = roomId as string;
    if (startDate) filters.startDate = startDate as string;
    if (endDate) filters.endDate = endDate as string;

    const isMine = req.query.mine === 'true';
    if (isMine) filters.userId = req.user!.id;

    if (page || pageSize) {
      const result = bookingService.paginate(
        { page: Number(page), pageSize: Number(pageSize) },
        filters,
      );
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    } else {
      const result = bookingService.findAll(filters);
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = bookingService.findById(req.params.id);
    if (!result) {
      res.status(404).json({ code: 404, message: '预订不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input: CreateBookingInput = {
      ...req.body,
      userId: req.user!.id,
    };

    if (!input.roomId || !input.title || !input.startTime || !input.endTime) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    const result = bookingService.create(input);
    if ('error' in result) {
      res.status(403).json({
        code: 403,
        message: result.error,
        data: null,
      } as ApiResponse<null>);
      return;
    }
    if ('conflicts' in result) {
      res.status(409).json({
        code: 409,
        message: '存在冲突',
        data: { conflicts: result.conflicts as BookingConflict[] },
      } as ApiResponse<{ conflicts: BookingConflict[] }>);
      return;
    }

    res.status(201).json({
      code: 201,
      message: '预订成功',
      data: result,
    } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = bookingService.update(req.params.id, req.body);
    if (!result) {
      res.status(404).json({ code: 404, message: '预订不存在或有冲突', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '更新成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const success = bookingService.delete(req.params.id);
    if (!success) {
      res.status(404).json({ code: 404, message: '预订不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '删除成功', data: null } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/check-in', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = bookingService.checkIn(req.params.id, req.user!.id);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '签到失败：可能已超过签到时间或非预订人',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '签到成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { comment } = req.body;
    const result = bookingService.cancel(req.params.id, req.user!.id, comment);
    if (!result) {
      res.status(400).json({ code: 400, message: '取消失败', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '取消成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/release', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = bookingService.release(req.params.id);
    if (!result) {
      res.status(400).json({ code: 400, message: '释放失败', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '释放成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/conflicts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId, startTime, endTime, requiredDeviceIds } = req.body;
    const conflicts = bookingService.detectConflicts(roomId, startTime, endTime, undefined, requiredDeviceIds);
    res.json({
      code: 200,
      message: '检测完成',
      data: { conflicts, hasConflict: conflicts.length > 0 },
    } as ApiResponse<{ conflicts: BookingConflict[]; hasConflict: boolean }>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
