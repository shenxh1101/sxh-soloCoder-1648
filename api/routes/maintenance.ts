import { Router, type Response } from 'express';
import { maintenanceRepository } from '../repository/maintenanceRepository.js';
import { deviceService } from '../services/deviceService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { requireManager, requireAdmin } from '../middleware/roleMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';
import type { CreateMaintenanceInput, MaintenanceStatus } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, deviceId, operatorId, startDate, endDate, page, pageSize } = req.query;
    const filters: Record<string, unknown> = {};
    let where = '';
    const params: unknown[] = [];

    if (status) {
      where = 'status = ?';
      params.push(status as MaintenanceStatus);
    }
    if (deviceId) {
      where = where ? `${where} AND deviceId = ?` : 'deviceId = ?';
      params.push(deviceId as string);
    }
    if (operatorId) {
      where = where ? `${where} AND operatorId = ?` : 'operatorId = ?';
      params.push(operatorId as string);
    }
    if (startDate) {
      where = where ? `${where} AND scheduledDate >= ?` : 'scheduledDate >= ?';
      params.push(startDate as string);
    }
    if (endDate) {
      where = where ? `${where} AND scheduledDate <= ?` : 'scheduledDate <= ?';
      params.push(endDate as string);
    }

    const mine = req.query.mine === 'true';
    if (mine) {
      where = where ? `${where} AND operatorId = ?` : 'operatorId = ?';
      params.push(req.user!.id);
    }

    if (page || pageSize) {
      const result = maintenanceRepository.paginate(
        { page: Number(page), pageSize: Number(pageSize) },
        {
          where: where || undefined,
          whereParams: params,
          orderBy: 'scheduledDate DESC',
        },
      );
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    } else {
      const result = maintenanceRepository.findAll({
        where: where || undefined,
        params,
        orderBy: 'scheduledDate DESC',
      });
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/upcoming', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { days } = req.query;
    const result = maintenanceRepository.findUpcoming(days ? Number(days) : 7);
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/overdue', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = maintenanceRepository.findOverdue();
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/stats', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const result = maintenanceRepository.getStatsByStatus(
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
    const result = maintenanceRepository.findById(req.params.id);
    if (!result) {
      res.status(404).json({ code: 404, message: '维护记录不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input: CreateMaintenanceInput = req.body;
    if (!input.deviceId || !input.scheduledDate || !input.type) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    const result = maintenanceRepository.create({
      ...input,
      operatorId: input.operatorId || req.user!.id,
    });

    res.status(201).json({ code: 201, message: '创建成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.put('/:id', requireManager, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = maintenanceRepository.update(req.params.id, req.body);
    if (!result) {
      res.status(404).json({ code: 404, message: '维护记录不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '更新成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/complete', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { notes } = req.body;
    const result = deviceService.completeMaintenance(req.params.id, notes);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '完成失败',
        data: null,
      } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '完成成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const success = maintenanceRepository.delete(req.params.id);
    if (!success) {
      res.status(404).json({ code: 404, message: '维护记录不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '删除成功', data: null } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
