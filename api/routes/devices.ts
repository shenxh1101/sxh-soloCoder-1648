import { Router, type Response } from 'express';
import { deviceService } from '../services/deviceService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { requireAdmin, requireManager } from '../middleware/roleMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';
import type { CreateDeviceInput, DeviceStatus, DeviceType } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, type, roomId, keyword, unassigned, page, pageSize } = req.query;
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status as DeviceStatus;
    if (type) filters.type = type as DeviceType;
    if (roomId) filters.roomId = roomId as string;
    if (keyword) filters.keyword = keyword as string;
    if (unassigned === 'true') filters.unassigned = true;

    if (page || pageSize) {
      const result = deviceService.paginate(
        { page: Number(page), pageSize: Number(pageSize) },
        filters,
      );
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    } else {
      const result = deviceService.findAll(filters);
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = {
      status: deviceService.getStatusSummary(),
      type: deviceService.getTypeSummary(),
    };
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/needs-maintenance', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = deviceService.findDevicesNeedingMaintenance();
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = deviceService.findById(req.params.id);
    if (!result) {
      res.status(404).json({ code: 404, message: '设备不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input: CreateDeviceInput = req.body;
    if (!input.name || !input.type) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    const result = deviceService.create(input);
    res.status(201).json({ code: 201, message: '创建成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = deviceService.update(req.params.id, req.body);
    if (!result) {
      res.status(404).json({ code: 404, message: '设备不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '更新成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.patch('/:id/status', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const result = deviceService.updateStatus(req.params.id, status);
    if (!result) {
      res.status(404).json({ code: 404, message: '设备不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '状态更新成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/assign', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.body;
    const result = deviceService.assignToRoom(req.params.id, roomId);
    if (!result) {
      res.status(404).json({ code: 404, message: '设备不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '分配成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/unassign', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = deviceService.unassignFromRoom(req.params.id);
    if (!result) {
      res.status(404).json({ code: 404, message: '设备不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '取消分配成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/report-fault', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = deviceService.reportFault(req.params.id);
    if (!result) {
      res.status(404).json({ code: 404, message: '设备不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '上报成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/schedule-maintenance', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { notes } = req.body;
    const result = deviceService.scheduleMaintenance(req.params.id, req.user!.id, notes);
    if (!result) {
      res.status(404).json({ code: 404, message: '设备不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.status(201).json({ code: 201, message: '维护计划创建成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const success = deviceService.delete(req.params.id);
    if (!success) {
      res.status(404).json({ code: 404, message: '设备不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '删除成功', data: null } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
