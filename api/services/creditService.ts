import { creditRepository } from '../repository/creditRepository.js';
import type { CreditRecord, CreateCreditInput, PaginationParams, PaginationResult } from '../types/index.js';

class CreditService {
  findById(id: string): CreditRecord | null {
    return creditRepository.findById(id);
  }

  findByUser(userId: string, options: { limit?: number } = {}): CreditRecord[] {
    return creditRepository.findByUser(userId, options);
  }

  findAll(filters?: { startDate?: string; endDate?: string }): CreditRecord[] {
    if (filters?.startDate && filters?.endDate) {
      return creditRepository.findBetweenDates(filters.startDate, filters.endDate);
    }
    return creditRepository.findAll({ orderBy: 'createdAt DESC' });
  }

  paginate(
    params: PaginationParams, filters?: { userId?: string; startDate?: string; endDate?: string }): PaginationResult<CreditRecord> {
    let where = '';
    const whereParams: unknown[] = [];

    if (filters?.userId) {
      where = 'userId = ?';
      whereParams.push(filters.userId);
    }
    if (filters?.startDate) {
      where = where ? `${where} AND createdAt >= ?` : 'createdAt >= ?';
      whereParams.push(filters.startDate);
    }
    if (filters?.endDate) {
      where = where ? `${where} AND createdAt <= ?` : 'createdAt <= ?';
      whereParams.push(filters.endDate);
    }

    return creditRepository.paginate(params, {
      where: where || undefined,
      whereParams,
      orderBy: 'createdAt DESC',
    });
  }

  addCredit(userId: string, change: number, reason: string): CreditRecord | null {
    if (change === 0) return null;
    return creditRepository.create({ userId, change, reason });
  }

  deductCredit(userId: string, amount: number, reason: string): CreditRecord | null {
    if (amount <= 0) return null;
    return creditRepository.create({ userId, change: -Math.abs(amount), reason });
  }

  getUserBalance(userId: string): number {
    return creditRepository.getUserBalance(userId);
  }

  getTopDeductedUsers(startDate: string, endDate: string, limit?: number) {
    return creditRepository.getTopDeductedUsers(startDate, endDate, limit);
  }

  getCreditDistribution() {
    return creditRepository.getCreditDistribution();
  }

  getSummary(startDate: string, endDate: string) {
    const records = creditRepository.findBetweenDates(startDate, endDate);
    const totalDeductions = records
      .filter((r) => r.change < 0)
      .reduce((sum, r) => sum + Math.abs(r.change), 0);
    const totalRewards = records
      .filter((r) => r.change > 0)
      .reduce((sum, r) => sum + r.change, 0);

    return {
      totalRecords: records.length,
      totalDeductions,
      totalRewards,
      netChange: totalRewards - totalDeductions,
      distribution: this.getCreditDistribution(),
    };
  }
}

export const creditService = new CreditService();
export default creditService;
