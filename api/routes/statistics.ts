import { Router, type Response } from 'express';
import { statisticsService } from '../services/statisticsService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { requireManager } from '../middleware/roleMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';

const router = Router();

router.use(authMiddleware);

router.get('/overview', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, roomId } = req.query;
    const result = statisticsService.getOverview({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      roomId: roomId as string | undefined,
    });
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/daily-report', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    const result = statisticsService.getDailyReport(date as string | undefined);
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/booking-trend', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const result = statisticsService.getBookingTrend({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/room-usage', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, roomId } = req.query;
    const result = statisticsService.getRoomUsage({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      roomId: roomId as string | undefined,
    });
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/work-order-stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const result = statisticsService.getWorkOrderStats({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/maintenance-stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const result = statisticsService.getMaintenanceStats({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/credit-stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const result = statisticsService.getCreditStats({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/device-faults', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, limit } = req.query;
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;
    const result = statisticsService.getDeviceFaultRanking({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
    });
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/time-slots', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const result = statisticsService.getTimeSlotDistribution({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/timeout-trend', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { days } = req.query;
    const parsedDays = days !== undefined ? Number(days) : undefined;
    const result = statisticsService.getTimeoutTrend(
      !Number.isNaN(parsedDays) ? parsedDays : undefined,
    );
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get(
  '/timeout-by-department',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = statisticsService.getTimeoutByDepartment();
      res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
    } catch (error) {
      res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
    }
  },
);

router.get('/top-timeout-rooms', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;
    const result = statisticsService.getTopTimeoutRooms(
      !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
    );
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
