import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const createTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      department TEXT NOT NULL,
      creditScore INTEGER NOT NULL DEFAULT 100,
      avatar TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meeting_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      floor TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      equipmentIds TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      image TEXT,
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      roomId TEXT,
      status TEXT NOT NULL DEFAULT 'normal',
      lastMaintenanceDate TEXT,
      nextMaintenanceDate TEXT,
      faultCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (roomId) REFERENCES meeting_rooms(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      roomId TEXT NOT NULL,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      attendeeCount INTEGER NOT NULL,
      requiredDeviceIds TEXT,
      status TEXT NOT NULL DEFAULT 'locked',
      checkInTime TEXT,
      approvalManagerId TEXT,
      approvalTime TEXT,
      approvalComment TEXT,
      confirmationQr TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (roomId) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approvalManagerId) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS booking_devices (
      id TEXT PRIMARY KEY,
      bookingId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (deviceId) REFERENCES devices(id) ON DELETE CASCADE,
      UNIQUE(bookingId, deviceId)
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      reporterId TEXT NOT NULL,
      assigneeId TEXT,
      faultType TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      assignedAt TEXT,
      completedAt TEXT,
      confirmCode TEXT,
      rating INTEGER,
      FOREIGN KEY (deviceId) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigneeId) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      scheduledDate TEXT NOT NULL,
      completedDate TEXT,
      type TEXT NOT NULL DEFAULT 'preventive',
      operatorId TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (deviceId) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (operatorId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credit_records (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      change INTEGER NOT NULL,
      reason TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      balanceAfter INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      expiresAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_rooms_status ON meeting_rooms(status);
    CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
    CREATE INDEX IF NOT EXISTS idx_devices_room ON devices(roomId);
    CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
    CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(roomId);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(userId);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(startTime, endTime);
    CREATE INDEX IF NOT EXISTS idx_workorders_device ON work_orders(deviceId);
    CREATE INDEX IF NOT EXISTS idx_workorders_reporter ON work_orders(reporterId);
    CREATE INDEX IF NOT EXISTS idx_workorders_assignee ON work_orders(assigneeId);
    CREATE INDEX IF NOT EXISTS idx_workorders_status ON work_orders(status);
    CREATE INDEX IF NOT EXISTS idx_maintenance_device ON maintenance_records(deviceId);
    CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
    CREATE INDEX IF NOT EXISTS idx_credit_user ON credit_records(userId);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(isRead);
    CREATE INDEX IF NOT EXISTS idx_booking_devices_booking ON booking_devices(bookingId);
    CREATE INDEX IF NOT EXISTS idx_booking_devices_device ON booking_devices(deviceId);
  `);
};

createTables();

export default db;
