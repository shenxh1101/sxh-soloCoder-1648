import BaseRepository from './baseRepository.js';
import type { User, UserRole } from '../types/index.js';
import type { UserWithPassword, AuthToken, CreateUserInput } from '../types/index.js';

class UserRepository extends BaseRepository<UserWithPassword> {
  constructor() {
    super('users');
  }

  findByEmail(email: string): UserWithPassword | null {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const row = this.db.prepare(sql).get(email) as UserWithPassword | null;
    return row || null;
  }

  findByRole(role: UserRole): User[] {
    return this.findAll({ where: 'role = ?', params: [role] });
  }

  findManagers(): User[] {
    const sql = "SELECT * FROM users WHERE role IN ('manager', 'admin') ORDER BY name";
    return this.db.prepare(sql).all() as User[];
  }

  toUser(user: UserWithPassword): User {
    const { password, ...rest } = user;
    return rest as User;
  }

  updateCreditScore(userId: string, change: number): UserWithPassword | null {
    const sql = 'UPDATE users SET creditScore = creditScore + ?, updatedAt = ? WHERE id = ?';
    this.db.prepare(sql).run(change, new Date().toISOString(), userId);
    return this.findById(userId);
  }
}

class AuthTokenRepository extends BaseRepository<AuthToken> {
  constructor() {
    super('auth_tokens');
  }

  findByToken(token: string): AuthToken | null {
    const sql = 'SELECT * FROM auth_tokens WHERE token = ?';
    return this.db.prepare(sql).get(token) as AuthToken | null || null;
  }

  deleteByUserId(userId: string): boolean {
    return this.deleteBy('userId = ?', [userId]);
  }

  deleteExpired(): number {
    const sql = "DELETE FROM auth_tokens WHERE expiresAt < datetime('now')";
    const result = this.db.prepare(sql).run();
    return result.changes;
  }
}

export const userRepository = new UserRepository();
export const authTokenRepository = new AuthTokenRepository();
export type { CreateUserInput };
export default userRepository;
