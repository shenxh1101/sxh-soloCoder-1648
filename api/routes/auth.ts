import { Router, type Response } from 'express';
import { authService } from '../services/authService.js';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import type { ApiResponse } from '../../shared/index.js';

const router = Router();

router.post('/login', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        code: 400,
        message: '邮箱和密码不能为空',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    const result = authService.login({ email, password });
    if (!result) {
      res.status(401).json({
        code: 401,
        message: '邮箱或密码错误',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    res.json({
      code: 200,
      message: '登录成功',
      data: result,
    } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    } as ApiResponse<null>);
  }
});

router.post('/register', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password || !department) {
      res.status(400).json({
        code: 400,
        message: '请填写完整信息',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    const user = authService.register({ name, email, password, role, department });
    if (!user) {
      res.status(409).json({
        code: 409,
        message: '邮箱已存在',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: user,
    } as ApiResponse<typeof user>);
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    } as ApiResponse<null>);
  }
});

router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const token = req.token!;
    authService.logout(token);
    res.json({
      code: 200,
      message: '登出成功',
      data: null,
    } as ApiResponse<null>);
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    } as ApiResponse<null>);
  }
});

router.post('/refresh', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const token = req.token!;
    const result = authService.refreshToken(token);
    if (!result) {
      res.status(401).json({
        code: 401,
        message: '令牌无效或已过期',
        data: null,
      } as ApiResponse<null>);
      return;
    }

    res.json({
      code: 200,
      message: '刷新成功',
      data: result,
    } as ApiResponse<typeof result>);
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    } as ApiResponse<null>);
  }
});

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    res.json({
      code: 200,
      message: '获取成功',
      data: req.user,
    } as ApiResponse<typeof req.user>);
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    } as ApiResponse<null>);
  }
});

export default router;
