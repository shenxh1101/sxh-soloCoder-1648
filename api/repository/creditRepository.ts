import BaseRepository from './baseRepository.js';
import type { CreditRecord, CreateCreditInput } from '../types/index.js';
import { userRepository } from './userRepository.js';

class CreditRepository extends BaseRepository<CreditRecord> {
  constructor() {
    super('credit_records');
  }

  create(data: CreateCreditInput): CreditRecord | null {
    const user = userRepository.findById(data.userId);
    if (!user) return null;

    const newBalance = Math.max(0, Math.min(100, user.creditScore + data.change));
    const actualChange = newBalance - user.creditScore;

    const record = super.create({
      userId: data.userId,
      change: actualChange,
      reason: data.reason,
      balanceAfter: newBalance,
    } as Partial<CreditRecord>);

    userRepository.updateCreditScore(data.userId, actualChange);
    return record;
  }

  findByUser(userId: string, options: { limit?: number } = {}): CreditRecord[] {
    const { limit } = options;
    let sql = 'SELECT * FROM credit_records WHERE userId = ? ORDER BY createdAt DESC';
    const params: unknown[] = [userId];
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    return this.db.prepare(sql).all(...params) as CreditRecord[];
  }

  findBetweenDates(startDate: string, endDate: string): CreditRecord[] {
    const sql = 'SELECT * FROM credit_records WHERE createdAt >= ? AND createdAt <= ? ORDER BY createdAt DESC';
    return this.db.prepare(sql).all(startDate, endDate) as CreditRecord[];
  }

  getUserBalance(userId: string): number {
    const user = userRepository.findById(userId);
    return user?.creditScore ?? 0;
  }

  getTopDeductedUsers(startDate: string, endDate: string, limit: number = 10): Array<{ userId: string; userName: string; totalChange: number; count: number }> {
    const sql = `
      SELECT
        cr.userId,
        u.name as userName,
        SUM(cr.change) as totalChange,
        COUNT(*) as count
      FROM credit_records cr
      JOIN users u ON cr.userId = u.id
      WHERE cr.change < 0
        AND cr.createdAt >= ?
        AND cr.createdAt <= ?
      GROUP BY cr.userId, u.name
      ORDER BY totalChange ASC
      LIMIT ?
    `;
    return this.db.prepare(sql).all(startDate, endDate, limit) as Array<{
      userId: string;
      userName: string;
      totalChange: number;
      count: number;
    }>;
  }

  getCreditDistribution(): Array<{ range: string; count: number }> {
    const sql = `
      SELECT
        CASE
          WHEN creditScore >= 90 THEN '90-100'
          WHEN creditScore >= 80 THEN '80-89'
          WHEN creditScore >= 70 THEN '70-79'
          WHEN creditScore >= 60 THEN '60-69'
          ELSE '0-59'
        END as range,
        COUNT(*) as count
      FROM users
      GROUP BY range
      ORDER BY range
    `;
    return this.db.prepare(sql).all() as Array<{ range: string; count: number }>;
  }
}

export const creditRepository = new CreditRepository();
export default creditRepository;
