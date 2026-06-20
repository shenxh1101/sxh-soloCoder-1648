import { randomUUID } from 'crypto';
import type { Database, Statement } from 'better-sqlite3';
import db from '../database/db.js';
import type { PaginationParams, PaginationResult } from '../types/index.js';

export class BaseRepository<T extends object> {
  protected db: Database = db;
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  protected generateId(): string {
    return randomUUID();
  }

  protected parseJsonField<K extends keyof T>(obj: T, field: K): T {
    if (obj && typeof obj[field] === 'string') {
      try {
        (obj[field] as unknown) = JSON.parse(obj[field] as string);
      } catch {
        // keep as is
      }
    }
    return obj;
  }

  protected parseJsonFields<K extends keyof T>(obj: T, fields: K[]): T {
    fields.forEach((f) => this.parseJsonField(obj, f));
    return obj;
  }

  findById(id: string, jsonFields: Array<keyof T> = []): T | null {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`);
    const row = stmt.get(id) as T | null;
    if (row) {
      return this.parseJsonFields(row, jsonFields);
    }
    return null;
  }

  findAll(options: { where?: string; params?: unknown[]; orderBy?: string; jsonFields?: Array<keyof T> } = {}): T[] {
    const { where, params = [], orderBy, jsonFields = [] } = options;
    let sql = `SELECT * FROM ${this.tableName}`;
    if (where) sql += ` WHERE ${where}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as T[];
    return rows.map((r) => this.parseJsonFields(r, jsonFields));
  }

  paginate(
    params: PaginationParams,
    options: { where?: string; whereParams?: unknown[]; orderBy?: string; jsonFields?: Array<keyof T> } = {},
  ): PaginationResult<T> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, params.pageSize || 10);
    const { where, whereParams = [], orderBy = 'createdAt DESC', jsonFields = [] } = options;

    let countSql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (where) countSql += ` WHERE ${where}`;
    const total = (this.db.prepare(countSql).get(...whereParams) as { count: number }).count;

    let sql = `SELECT * FROM ${this.tableName}`;
    if (where) sql += ` WHERE ${where}`;
    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...whereParams, pageSize, (page - 1) * pageSize) as T[];
    const items = rows.map((r) => this.parseJsonFields(r, jsonFields));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  create(data: Partial<T>, jsonFields: Array<keyof T> = []): T {
    const id = (data[this.primaryKey as keyof T] as string) || this.generateId();
    const insertData = { ...data, [this.primaryKey]: id } as Record<string, unknown>;

    jsonFields.forEach((f) => {
      if (insertData[f as string] !== undefined && typeof insertData[f as string] !== 'string') {
        insertData[f as string] = JSON.stringify(insertData[f as string]);
      }
    });

    const keys = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    const stmt = this.db.prepare(sql) as Statement;
    stmt.run(...values);

    const result = this.findById(id, jsonFields);
    return result as T;
  }

  update(id: string, data: Partial<T>, jsonFields: Array<keyof T> = []): T | null {
    const updateData = { ...data } as Record<string, unknown>;
    if (this.tableName !== 'auth_tokens') {
      updateData.updatedAt = new Date().toISOString();
    }

    jsonFields.forEach((f) => {
      if (updateData[f as string] !== undefined && typeof updateData[f as string] !== 'string') {
        updateData[f as string] = JSON.stringify(updateData[f as string]);
      }
    });

    const keys = Object.keys(updateData).filter((k) => k !== this.primaryKey);
    const values = keys.map((k) => updateData[k]);
    if (keys.length === 0) return this.findById(id, jsonFields);

    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`;
    const stmt = this.db.prepare(sql) as Statement;
    stmt.run(...values, id);

    return this.findById(id, jsonFields);
  }

  delete(id: string): boolean {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
    const stmt = this.db.prepare(sql) as Statement;
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteBy(where: string, params: unknown[] = []): boolean {
    const sql = `DELETE FROM ${this.tableName} WHERE ${where}`;
    const stmt = this.db.prepare(sql) as Statement;
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  count(where?: string, params: unknown[] = []): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (where) sql += ` WHERE ${where}`;
    return (this.db.prepare(sql).get(...params) as { count: number }).count;
  }

  rawQuery(sql: string, params: unknown[] = []): unknown[] {
    return this.db.prepare(sql).all(...params);
  }

  rawQueryOne(sql: string, params: unknown[] = []): unknown | null {
    return this.db.prepare(sql).get(...params) || null;
  }

  transaction<T>(fn: () => T): T {
    const tx = this.db.transaction(fn);
    return tx();
  }
}

export default BaseRepository;
