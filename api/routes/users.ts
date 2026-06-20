import { Router, type Response } from 'express';
import { userRepository } from '../repository/userRepository.js';
import { creditService } from '../services/creditService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import type { ApiResponse, UserRole } from '../../shared/index.js';
import type { CreateUserInput } from '../types/index.js';
import { authService } from '../services/authService.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, department, keyword } = req.query;
    const filters: Record<string, unknown> = {};
    let where = '';
    const params: unknown[] = [];

    if (role) {
      where = 'role = ?';
      params.push(role as UserRole);
    }
    if (department) {
      where = where ? `${where} AND department = ?` : 'department = ?';
      params.push(department);
    }
    if (keyword) {
      const like = `%${keyword}%`;
      where = where
        ? `${where} AND (name LIKE ? OR email LIKE ?)`
        : '(name LIKE ? OR email LIKE ?)';
      params.push(like, like);
    }

    const users = userRepository.findAll({
      where: where || undefined,
      params,
      orderBy: 'name',
    });

    const result = users.map((u) => userRepository.toUser(u));
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/managers', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = userRepository.findManagers();
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = userRepository.findById(req.params.id);
    if (!user) {
      res.status(404).json({ code: 404, message: '用户不存在', data: null } as ApiResponse<null>);
      return;
    }
    const result = userRepository.toUser(user);
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input: CreateUserInput = req.body;
    if (!input.name || !input.email || !input.password || !input.department) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    const user = authService.register({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      department: input.department,
    });

    if (!user) {
      res.status(409).json({
        code: 409,
        message: '邮箱已存在',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    res.status(201).json({ code: 201, message: '创建成功', data: user } as ApiResponse<typeof user>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, department, role, avatar } = req.body;
    const updated = userRepository.update(req.params.id, {
      name,
      department,
      role,
      avatar,
    });
    if (!updated) {
      res.status(404).json({ code: 404, message: '用户不存在', data: null } as ApiResponse<null>);
      return;
    }
    const result = userRepository.toUser(updated);
    res.json({ code: 200, message: '更新成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const success = userRepository.delete(req.params.id);
    if (!success) {
      res.status(404).json({ code: 404, message: '用户不存在', data: null } as ApiResponse<null>);
      return;
    }
    res.json({ code: 200, message: '删除成功', data: null } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.get('/:id/credits', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = userRepository.findById(req.params.id);
    if (!user) {
      res.status(404).json({ code: 404, message: '用户不存在', data: null } as ApiResponse<null>);
      return;
    }

    const { limit } = req.query;
    const records = creditService.findByUser(req.params.id, {
      limit: limit ? Number(limit) : undefined,
    });
    const balance = creditService.getUserBalance(req.params.id);

    const result = {
      balance,
      records,
    };
    res.json({ code: 200, message: '获取成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

router.post('/:id/credits/adjust', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { change, reason } = req.body;
    if (change === undefined || !reason) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    const result = creditService.addCredit(req.params.id, Number(change), reason);
    if (!result) {
      res.status(400).json({
        code: 400,
        message: '调整失败',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    res.json({ code: 200, message: '调整成功', data: result } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null } as ApiResponse<null>);
  }
});

export default router;
