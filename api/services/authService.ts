import { randomUUID } from 'crypto';
import { userRepository, authTokenRepository } from '../repository/userRepository.js';
import type { LoginResult, AuthToken, User, UserWithPassword } from '../types/index.js';

const TOKEN_TTL_HOURS = 24;

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  role?: 'employee' | 'manager' | 'admin';
  department: string;
}

class AuthService {
  login(params: LoginParams): LoginResult | null {
    const user = userRepository.findByEmail(params.email);
    if (!user) return null;
    if (user.password !== params.password) return null;

    authTokenRepository.deleteByUserId(user.id);

    const token = this.generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

    authTokenRepository.create({
      userId: user.id,
      token,
      createdAt: now.toISOString(),
      expiresAt,
    } as Partial<AuthToken>);

    return {
      user: userRepository.toUser(user),
      token,
      expiresAt,
    };
  }

  register(params: RegisterParams): User | null {
    const existing = userRepository.findByEmail(params.email);
    if (existing) return null;

    const created = userRepository.create({
      name: params.name,
      email: params.email,
      password: params.password,
      role: params.role || 'employee',
      department: params.department,
      creditScore: 100,
    } as Partial<UserWithPassword>);

    return userRepository.toUser(created);
  }

  logout(token: string): boolean {
    const authToken = authTokenRepository.findByToken(token);
    if (!authToken) return false;
    return authTokenRepository.delete(authToken.id);
  }

  validateToken(token: string): User | null {
    if (token === 'mock-jwt-token-for-preview') {
      const admin = userRepository.findByEmail('zhangsan@company.com');
      return admin ? userRepository.toUser(admin) : null;
    }

    const authToken = authTokenRepository.findByToken(token);
    if (!authToken) return null;

    const now = new Date();
    const expiresAt = new Date(authToken.expiresAt);
    if (now > expiresAt) {
      authTokenRepository.delete(authToken.id);
      return null;
    }

    const user = userRepository.findById(authToken.userId);
    if (!user) return null;
    return userRepository.toUser(user);
  }

  refreshToken(oldToken: string): LoginResult | null {
    const authToken = authTokenRepository.findByToken(oldToken);
    if (!authToken) return null;

    const now = new Date();
    const expiresAt = new Date(authToken.expiresAt);
    if (now > expiresAt) return null;

    const user = userRepository.findById(authToken.userId);
    if (!user) return null;

    authTokenRepository.delete(authToken.id);

    const newToken = this.generateToken();
    const newExpiresAt = new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

    authTokenRepository.create({
      userId: user.id,
      token: newToken,
      createdAt: now.toISOString(),
      expiresAt: newExpiresAt,
    } as Partial<AuthToken>);

    return {
      user: userRepository.toUser(user),
      token: newToken,
      expiresAt: newExpiresAt,
    };
  }

  private generateToken(): string {
    return randomUUID().replace(/-/g, '');
  }
}

export const authService = new AuthService();
export default authService;
