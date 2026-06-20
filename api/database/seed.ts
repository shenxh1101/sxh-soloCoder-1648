import { randomUUID } from 'crypto';
import db from './db.js';

const generateId = () => randomUUID();

const seed = () => {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  const tx = db.transaction(() => {
    const users = [
      {
        id: generateId(),
        name: '张三',
        email: 'zhangsan@company.com',
        password: '123456',
        role: 'admin',
        department: '行政部',
        creditScore: 100,
      },
      {
        id: generateId(),
        name: '李四',
        email: 'lisi@company.com',
        password: '123456',
        role: 'manager',
        department: '技术部',
        creditScore: 95,
      },
      {
        id: generateId(),
        name: '王五',
        email: 'wangwu@company.com',
        password: '123456',
        role: 'employee',
        department: '技术部',
        creditScore: 88,
      },
      {
        id: generateId(),
        name: '赵六',
        email: 'zhaoliu@company.com',
        password: '123456',
        role: 'employee',
        department: '市场部',
        creditScore: 92,
      },
      {
        id: generateId(),
        name: '钱七',
        email: 'qianqi@company.com',
        password: '123456',
        role: 'employee',
        department: '财务部',
        creditScore: 100,
      },
    ];

    const insertUser = db.prepare(
      'INSERT INTO users (id, name, email, password, role, department, creditScore) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    users.forEach((u) => insertUser.run(u.id, u.name, u.email, u.password, u.role, u.department, u.creditScore));

    const rooms = [
      {
        id: generateId(),
        name: '星辰会议室',
        floor: '3F',
        capacity: 8,
        equipmentIds: [] as string[],
        status: 'active',
        description: '配备高清投影仪和视频会议系统的中型会议室',
      },
      {
        id: generateId(),
        name: '云端会议室',
        floor: '5F',
        capacity: 20,
        equipmentIds: [] as string[],
        status: 'active',
        description: '大型会议室，适合部门会议和培训',
      },
      {
        id: generateId(),
        name: '晨曦洽谈室',
        floor: '2F',
        capacity: 4,
        equipmentIds: [] as string[],
        status: 'active',
        description: '小型洽谈室，适合小组讨论',
      },
      {
        id: generateId(),
        name: '虹光培训室',
        floor: '4F',
        capacity: 50,
        equipmentIds: [] as string[],
        status: 'maintenance',
        description: '大型培训室，当前正在维修音响系统',
      },
      {
        id: generateId(),
        name: '海风多功能厅',
        floor: '1F',
        capacity: 30,
        equipmentIds: [] as string[],
        status: 'active',
        description: '多功能厅，可分隔为两个独立区域',
      },
    ];

    const insertRoom = db.prepare(
      'INSERT INTO meeting_rooms (id, name, floor, capacity, equipmentIds, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    rooms.forEach((r) =>
      insertRoom.run(
        r.id,
        r.name,
        r.floor,
        r.capacity,
        JSON.stringify(r.equipmentIds),
        r.status,
        r.description,
      ),
    );

    const deviceTypes = ['projector', 'whiteboard', 'video-conference', 'microphone', 'other'];
    const deviceStatuses = ['normal', 'faulty', 'maintenance'];
    const deviceNames: Record<string, string[]> = {
      projector: ['爱普生投影仪', '明基激光投影仪', '索尼4K投影仪', '松下商务投影仪'],
      whiteboard: ['智能白板 A1', '智能白板 A2', '普通白板', '电子白板 Pro'],
      'video-conference': ['华为视频会议终端', '思科会议系统', 'Polycom会议设备'],
      microphone: ['无线麦克风套装', '会议麦克风阵列', '手持麦克风 x2', '鹅颈麦克风'],
      other: ['电视显示屏', '音响系统', '录播设备', '升降桌控制器'],
    };

    const devices: Array<{
      id: string;
      name: string;
      type: string;
      roomId: string | null;
      status: string;
      lastMaintenanceDate: string | null;
      nextMaintenanceDate: string | null;
      faultCount: number;
    }> = [];

    const roomIds = rooms.map((r) => r.id);
    const assignRooms = [0, 0, 0, 1, 1, 1, 2, 2, 3, 4, 4, 4, -1, -1, -1, -1, 0, 1, 2, 4, 0, 1];

    for (let i = 0; i < 22; i++) {
      const type = deviceTypes[i % deviceTypes.length];
      const names = deviceNames[type];
      const name = names[i % names.length];
      const status =
        i % 11 === 0 ? 'faulty' : i % 7 === 0 ? 'maintenance' : 'normal';
      const roomIdx = assignRooms[i % assignRooms.length];
      const lastMaint = new Date(Date.now() - (i + 1) * 86400000 * 5).toISOString();
      const nextMaint = new Date(Date.now() + (i + 1) * 86400000 * 10).toISOString();

      devices.push({
        id: generateId(),
        name,
        type,
        roomId: roomIdx >= 0 ? roomIds[roomIdx % roomIds.length] : null,
        status,
        lastMaintenanceDate: status !== 'normal' ? lastMaint : null,
        nextMaintenanceDate: nextMaint,
        faultCount: status === 'faulty' ? 2 + (i % 3) : i % 4,
      });
    }

    const insertDevice = db.prepare(
      'INSERT INTO devices (id, name, type, roomId, status, lastMaintenanceDate, nextMaintenanceDate, faultCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    devices.forEach((d) =>
      insertDevice.run(
        d.id,
        d.name,
        d.type,
        d.roomId,
        d.status,
        d.lastMaintenanceDate,
        d.nextMaintenanceDate,
        d.faultCount,
      ),
    );

    for (const r of rooms) {
      const roomDevices = devices.filter((d) => d.roomId === r.id).map((d) => d.id);
      db.prepare('UPDATE meeting_rooms SET equipmentIds = ? WHERE id = ?').run(
        JSON.stringify(roomDevices),
        r.id,
      );
    }

    const insertBooking = db.prepare(
      `INSERT INTO bookings (
        id, roomId, userId, title, startTime, endTime,
        attendeeCount, requiredDeviceIds, status, checkInTime,
        approvalManagerId, approvalTime, approvalComment, confirmationQr
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const bookingTitles = [
      '产品需求评审会',
      '周例会',
      '技术方案讨论',
      '客户演示',
      '新员工培训',
      '季度总结会',
      '项目启动会',
      '数据分析会议',
      'UI评审会',
      'Bug修复讨论',
      '管理层会议',
      '绩效面谈',
      '营销策划会',
      '财务预算审核',
      '合作洽谈',
      '架构设计评审',
      '质量保证会议',
      '运营复盘会',
      '头脑风暴',
      '团队建设活动',
      '安全规范培训',
      '跨部门协调会',
    ];

    const bookingStatuses: Array<'pending_approval' | 'locked' | 'completed' | 'released' | 'cancelled' | 'rejected'> = [
      'locked', 'completed', 'completed', 'released', 'locked', 'completed',
      'pending_approval', 'cancelled', 'locked', 'completed', 'rejected', 'completed',
    ];

    const now = new Date();
    const bookings: Array<{ id: string; deviceIds: string[] }> = [];

    for (let i = 0; i < 24; i++) {
      const isPast = i < 14;
      const baseDate = new Date(now);
      if (isPast) {
        baseDate.setDate(baseDate.getDate() - (14 - i));
      } else {
        baseDate.setDate(baseDate.getDate() + (i - 13));
      }
      baseDate.setHours(9 + (i % 6), 0, 0, 0);
      const startTime = baseDate.toISOString();
      baseDate.setHours(baseDate.getHours() + 1 + (i % 3));
      const endTime = baseDate.toISOString();

      const status = isPast
        ? bookingStatuses[i % bookingStatuses.length]
        : i === 15 ? 'pending_approval' : i === 18 ? 'cancelled' : 'locked';

      const checkInTime =
        status === 'completed'
          ? new Date(new Date(startTime).getTime() - 300000).toISOString()
          : status === 'released'
          ? new Date(new Date(startTime).getTime() + 900000).toISOString()
          : null;

      const needsApproval = status === 'pending_approval' || status === 'rejected' || (i % 4 === 0 && status !== 'cancelled');
      const approvalManagerId = needsApproval ? users[1].id : null;
      const approvalTime =
        (status === 'locked' || status === 'completed' || status === 'released' || status === 'rejected') &&
        approvalManagerId
          ? new Date(new Date(startTime).getTime() - 3600000).toISOString()
          : null;
      const approvalComment =
        status === 'rejected'
          ? '时间冲突，建议调整到下午'
          : status !== 'pending_approval' && approvalManagerId
          ? '批准'
          : null;

      const roomIdx = i % rooms.length;
      const room = rooms[roomIdx];
      const roomDeviceIds = devices.filter((d) => d.roomId === room.id).map((d) => d.id);
      const selectedDevices = roomDeviceIds.slice(0, (i % 3) + 1);

      const bookingId = generateId();
      bookings.push({ id: bookingId, deviceIds: selectedDevices });

      insertBooking.run(
        bookingId,
        room.id,
        users[2 + (i % 3)].id,
        bookingTitles[i % bookingTitles.length],
        startTime,
        endTime,
        3 + (i % 8),
        JSON.stringify(selectedDevices),
        status,
        checkInTime,
        approvalManagerId,
        approvalTime,
        approvalComment,
        status !== 'cancelled' && status !== 'rejected' ? `QR-${bookingId.substring(0, 8)}` : null,
      );
    }

    const insertBookingDevice = db.prepare(
      'INSERT OR IGNORE INTO booking_devices (id, bookingId, deviceId) VALUES (?, ?, ?)',
    );
    bookings.forEach((b) => {
      b.deviceIds.forEach((d) => {
        insertBookingDevice.run(generateId(), b.id, d);
      });
    });

    const workOrderStatuses: Array<'pending' | 'assigned' | 'processing' | 'completed' | 'cancelled'> = [
      'pending', 'assigned', 'processing', 'completed', 'completed', 'cancelled',
      'pending', 'processing', 'completed', 'assigned',
    ];
    const faultTypes = ['投影异常', '音响故障', '画面模糊', '麦克风无声', '连接失败', '系统崩溃', '设备损坏', '无法开机'];

    const insertWorkOrder = db.prepare(
      `INSERT INTO work_orders (
        id, deviceId, reporterId, assigneeId, faultType, description,
        status, createdAt, assignedAt, completedAt, confirmCode, rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const faultyDevices = devices.filter((d) => d.status === 'faulty' || d.faultCount > 0);
    for (let i = 0; i < 10; i++) {
      const device = faultyDevices[i % faultyDevices.length] || devices[i];
      const status = workOrderStatuses[i % workOrderStatuses.length];
      const createdAt = new Date(now.getTime() - (10 - i) * 86400000).toISOString();
      const assignedAt =
        status !== 'pending' && status !== 'cancelled'
          ? new Date(new Date(createdAt).getTime() + 3600000).toISOString()
          : null;
      const completedAt =
        status === 'completed' ? new Date(new Date(createdAt).getTime() + 86400000 * 2).toISOString() : null;
      const confirmCode = status === 'completed' ? `CNF-${(1000 + i).toString()}` : null;
      const rating = status === 'completed' ? 4 + (i % 2) : null;

      insertWorkOrder.run(
        generateId(),
        device.id,
        users[2 + (i % 3)].id,
        status === 'pending' || status === 'cancelled' ? null : users[0].id,
        faultTypes[i % faultTypes.length],
        `${faultTypes[i % faultTypes.length]}，影响正常使用，请尽快处理。`,
        status,
        createdAt,
        assignedAt,
        completedAt,
        confirmCode,
        rating,
      );
    }

    const insertMaintenance = db.prepare(
      `INSERT INTO maintenance_records (
        id, deviceId, scheduledDate, completedDate, type, operatorId, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (let i = 0; i < 12; i++) {
      const device = devices[i % devices.length];
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + (i - 6));
      const scheduled = scheduledDate.toISOString();
      const isPast = scheduledDate < now;
      const type = i % 3 === 0 ? 'corrective' : 'preventive';
      const status = isPast
        ? i % 5 === 0 ? 'overdue' : 'completed'
        : 'scheduled';
      const completed = status === 'completed' ? new Date(scheduledDate.getTime() + 7200000).toISOString() : null;

      insertMaintenance.run(
        generateId(),
        device.id,
        scheduled,
        completed,
        type,
        users[0].id,
        type === 'corrective' ? '故障修复和零部件更换' : `定期保养，${device.name}状态良好`,
        status,
      );
    }

    const creditChanges = [
      { userId: 2, change: -5, reason: '未签到导致会议室释放' },
      { userId: 2, change: 2, reason: '连续5次准时签到奖励' },
      { userId: 3, change: -3, reason: '提前取消不足1小时' },
      { userId: 3, change: 5, reason: '提交设备故障工单' },
      { userId: 4, change: -2, reason: '会议室设备损坏未上报' },
      { userId: 2, change: 3, reason: '月度优秀使用奖励' },
      { userId: 1, change: 5, reason: '主动共享会议室使用攻略' },
    ];

    const insertCredit = db.prepare(
      'INSERT INTO credit_records (id, userId, change, reason, balanceAfter) VALUES (?, ?, ?, ?, ?)',
    );

    creditChanges.forEach((c, idx) => {
      const user = users[c.userId];
      const createdAt = new Date(now.getTime() - (7 - idx) * 86400000).toISOString();
      const balance = user.creditScore + c.change * ((idx % 2 === 0 ? 1 : -1));
      insertCredit.run(generateId(), user.id, c.change, c.reason, Math.max(0, balance));
    });

    const notifTypes = ['booking', 'work_order', 'approval', 'credit', 'system'];
    const notifTitles = [
      '会议室预订成功',
      '新工单待处理',
      '审批请求待处理',
      '信用分变动通知',
      '系统维护通知',
      '预订即将开始',
      '工单已完成',
      '审批结果通知',
    ];
    const notifContents = [
      '您的会议室预订已确认，请准时签到使用。',
      '有新的设备故障工单需要您处理，请及时响应。',
      '有一条会议室预订审批等待您的处理。',
      '您的信用分发生了变动，请检查使用记录。',
      '系统将于今晚进行例行维护，预计影响5分钟。',
      '您的会议室预订将在30分钟后开始，请提前准备。',
      '您提交的工单已处理完成，欢迎进行服务评价。',
      '您的会议室预订申请已通过审批。',
    ];

    const insertNotif = db.prepare(
      'INSERT INTO notifications (id, userId, type, title, content, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );

    for (let i = 0; i < 20; i++) {
      const user = users[i % users.length];
      const type = notifTypes[i % notifTypes.length];
      const createdAt = new Date(now.getTime() - (20 - i) * 3600000).toISOString();
      insertNotif.run(
        generateId(),
        user.id,
        type,
        notifTitles[i % notifTitles.length],
        notifContents[i % notifContents.length],
        i < 12 ? 1 : 0,
        createdAt,
      );
    }
  });

  tx();
  console.log('Database seeded successfully!');
  console.log('Created: 5 users, 5 rooms, 22 devices, 24 bookings, 10 work orders, 12 maintenance records, 7 credit records, 20 notifications');
};

seed();

export const seedDatabase = seed;
export default seed;
