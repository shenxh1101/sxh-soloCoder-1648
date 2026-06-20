import { Router, type Response } from 'express';
import { roomService } from '../services/roomService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';
import type { CreateRoomInput, RoomStatus } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, floor, keyword, page, pageSize } = req.query;
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status as RoomStatus;
    if (floor) filters.floor = floor as string;
    if (keyword) filters.keyword = keyword as string;

    if (page || pageSize) {
      const result = roomService.paginate(
        { page: Number(page), pageSize: Number(pageSize) },
        filters,
      );
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    } else {
      const result = roomService.findAll(filters);
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/available', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startTime, endTime, capacity } = req.query;
    if (!startTime || !endTime) {
      res.status(400).json({
        code: 400,
        message: '请提供 startTime 和 endTime',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    const result = roomService.findAvailableRooms(
      startTime as string,
      endTime as string,
      capacity ? Number(capacity) : undefined,
    );
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = roomService.findById(req.params.id);
    if (!result) {
      res.status(404).json({ code: 404, message: '会议室不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id/slots', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    const slots = roomService.getAvailableSlots(req.params.id, (date as string) || new Date().toISOString());
    res.json({ code: 200, message: '获取成功', data: slots } as ApiResponse<typeof slots>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 30);
    const stats = roomService.getRoomUsageStats(
      req.params.id,
      (startDate as string) || defaultStart.toISOString(),
      (endDate as string) || today.toISOString(),
    );
    res.json({ code: 200, message: '获取成功', data: stats } as ApiResponse<typeof stats>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input: CreateRoomInput = req.body;
    if (!input.name || !input.floor || !input.capacity) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    const result = roomService.create(input);
    res.status(201).json({ code: 201, message: '创建成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = roomService.update(req.params.id, req.body);
    if (!result) {
      res.status(404).json({ code: 404, message: '会议室不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '更新成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.patch('/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const result = roomService.updateStatus(req.params.id, status);
    if (!result) {
      res.status(404).json({ code: 404, message: '会议室不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '状态更新成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const success = roomService.delete(req.params.id);
    if (!success) {
      res.status(404).json({ code: 404, message: '会议室不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '删除成功', data: null } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
