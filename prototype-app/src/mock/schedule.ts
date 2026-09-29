/**
 * 排班管理 Mock 数据
 * 对应 PRD-人员管理-排班管理 V1.0
 */
import { CAMP_NODES } from './organization'

export interface ScheduleRow {
  id: string
  scheduleDate: string // YYYY-MM-DD
  userId: string
  userName: string
  userStatus: '启用' | '锁定' | '注销'
  team: string // 班组
  phone: string // 联系方式
  campIds: string[] // 负责营地（多选）
  dutyResponsibility: string // 值班职责（文本域，可为空）
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

// 营地选项
export const CAMP_OPTIONS = CAMP_NODES
  .filter(c => c.status === '启用')
  .map(c => ({ label: c.name, value: c.id }))

// 生成模拟排班数据（未来30天 + 历史30天）
export const SCHEDULE_ROWS: ScheduleRow[] = []

const mockUsers = [
  { id: 'p001', name: '张三', team: 'A班', phone: '138xxxx1234', status: '启用' as const },
  { id: 'p002', name: '李四', team: 'B班', phone: '139xxxx5678', status: '启用' as const },
  { id: 'p003', name: '王五', team: 'A班', phone: '137xxxx9012', status: '启用' as const },
  { id: 'p004', name: '赵六', team: 'C班', phone: '136xxxx3456', status: '启用' as const },
  { id: 'p005', name: '孙七', team: 'B班', phone: '135xxxx7890', status: '启用' as const },
  { id: 'p006', name: '周八', team: 'A班', phone: '134xxxx2345', status: '注销' as const },
  { id: 'p007', name: '吴九', team: 'C班', phone: '133xxxx6789', status: '启用' as const },
  { id: 'p008', name: '郑十', team: 'B班', phone: '132xxxx0123', status: '启用' as const },
]

const dutyResponsibilities = [
  '负责营地安全巡查，监控门禁系统运行',
  '处理突发应急事件，协调各部门联动',
  '设备运行状态监控，及时处理故障报警',
  '通讯系统值守，保障内外联络畅通',
  '',
]

// 演示「+N 更多」：相对今天的日期偏移 → 固定值班人数（均超过 3 人）
// 取 mockUsers 前 N 人；6 人及以上会包含已注销的周八，用于演示弹层内的注销标记
const OVERFLOW_DAYS: Record<number, number> = {
  [-3]: 5,
  2: 4,
  5: 6,
  9: 8,
}

// 生成排班记录：从 60 天前到 60 天后
const today = new Date()
for (let i = -60; i <= 60; i++) {
  const date = new Date(today)
  date.setDate(date.getDate() + i)
  const dateStr = date.toISOString().split('T')[0]

  // 演示日固定人数；其余每天随机 1-3 人值班
  const overflowCount = OVERFLOW_DAYS[i]
  const selectedUsers = overflowCount
    ? mockUsers.slice(0, overflowCount)
    : [...mockUsers]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 1)

  selectedUsers.forEach((user) => {
    const dutyResponsibility = dutyResponsibilities[Math.floor(Math.random() * dutyResponsibilities.length)]
    // 随机分配1-3个营地
    const campCount = Math.floor(Math.random() * 3) + 1
    const campIds = CAMP_NODES
      .filter(c => c.status === '启用')
      .sort(() => Math.random() - 0.5)
      .slice(0, campCount)
      .map(c => c.id)

    SCHEDULE_ROWS.push({
      id: `${dateStr}-${user.id}`,
      scheduleDate: dateStr,
      userId: user.id,
      userName: user.name,
      userStatus: user.status,
      team: user.team,
      phone: user.phone,
      campIds,
      dutyResponsibility,
      createdAt: '2026-08-01 10:00:00',
      createdBy: 'admin',
      updatedAt: '2026-08-01 10:00:00',
      updatedBy: 'admin',
    })
  })
}

// 按日期降序排序
SCHEDULE_ROWS.sort((a, b) => b.scheduleDate.localeCompare(a.scheduleDate))
