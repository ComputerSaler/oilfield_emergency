/**
 * 飞行记录 mock 数据
 */
import { A_UAV_REALTIME_DATA } from './aUavRealtime'

/** 飞行记录状态 */
export type FlightRecordStatus = '进行中' | '已完成'

/** 标记事件（扩展版，用于事件列表） */
export interface MarkedEventExtended extends MarkedEvent {
  /** 经度 */
  longitude: number
  /** 纬度 */
  latitude: number
  /** 创建人 */
  created_by: string
  /** 所属任务编号 */
  task_id: string
  /** 无人机名称 */
  drone_name: string
}

/** 标记事件 */
export interface MarkedEvent {
  /** 事件ID */
  id: string
  /** 事件名称 */
  event_name: string
  /** 目标类型 */
  target_type: '友好' | '敌意' | '未知'
  /** 事件描述 */
  event_description: string
  /** 上报时间 */
  reported_at: string
}

/** 飞行记录 */
export interface FlightRecord {
  /** 记录ID */
  id: string
  /** 无人机名称 */
  drone_name: string
  /** 无人机SN */
  drone_sn: string
  /** 记录状态 */
  status: FlightRecordStatus
  /** 开始时间 */
  start_time: string
  /** 结束时间（进行中时为null） */
  end_time: string | null
  /** 里程（米） */
  distance_m: number
  /** 航点总数 */
  waypoint_count: number
  /** 距离目的地剩余距离（米，已完成时为0） */
  remaining_distance_m: number
  /** 飞行总时长（秒） */
  total_duration_sec: number
  /** 标记事件列表 */
  marked_events: MarkedEvent[]
}

// ==================== 辅助函数 ====================

const T0 = Date.now()
const at = (offsetSec: number) => new Date(T0 + offsetSec * 1000).toISOString()

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ==================== 生成飞行记录 ====================

export const FLIGHT_RECORDS: FlightRecord[] = []

// 为每架飞行中的无人机生成1条进行中记录
const flyingDrones = A_UAV_REALTIME_DATA.filter((d) => d.realtime_status === '飞行中')
flyingDrones.forEach((drone, idx) => {
  const startOffset = -(3600 + idx * 600) // 1-2小时前起飞
  const duration = -startOffset
  const distance = Math.floor(duration * 15 * (0.8 + Math.random() * 0.4)) // 平均15m/s
  const remaining = randomInt(500, 5000)

  const targetTypes: Array<'友好' | '敌意' | '未知'> = ['友好', '敌意', '未知']
  FLIGHT_RECORDS.push({
    id: `record-ongoing-${idx}`,
    drone_name: drone.aircraft_name || drone.drone_sn,
    drone_sn: drone.drone_sn,
    status: '进行中',
    start_time: at(startOffset),
    end_time: null,
    distance_m: distance,
    waypoint_count: randomInt(5, 15),
    remaining_distance_m: remaining,
    total_duration_sec: duration,
    marked_events: [
      {
        id: `evt-${idx}-1`,
        event_name: '发现可疑目标',
        target_type: targetTypes[randomInt(0, 2)],
        event_description: '在坐标点附近发现不明车辆',
        reported_at: at(startOffset + 1200),
      },
    ],
  })
})

// 为所有无人机生成若干已完成记录
const allDrones = A_UAV_REALTIME_DATA.slice(0, 5) // 取前5架
allDrones.forEach((drone, droneIdx) => {
  const recordCount = randomInt(2, 4)
  for (let i = 0; i < recordCount; i++) {
    const daysAgo = droneIdx * 2 + i
    const startOffset = -(86400 * daysAgo + randomInt(0, 7200))
    const duration = randomInt(1800, 7200) // 30分钟到2小时
    const distance = Math.floor(duration * 15 * (0.8 + Math.random() * 0.4))

    const eventCount = randomInt(0, 2)
    const events: MarkedEvent[] = []
    for (let e = 0; e < eventCount; e++) {
      const targetTypes: Array<'友好' | '敌意' | '未知'> = ['友好', '敌意', '未知']
      events.push({
        id: `evt-${droneIdx}-${i}-${e}`,
        event_name: ['发现可疑目标', '边界入侵', '设备异常'][randomInt(0, 2)],
        target_type: targetTypes[randomInt(0, 2)],
        event_description: '自动识别上报的异常情况',
        reported_at: at(startOffset + randomInt(300, duration - 300)),
      })
    }

    FLIGHT_RECORDS.push({
      id: `record-completed-${droneIdx}-${i}`,
      drone_name: drone.aircraft_name || drone.drone_sn,
      drone_sn: drone.drone_sn,
      status: '已完成',
      start_time: at(startOffset),
      end_time: at(startOffset + duration),
      distance_m: distance,
      waypoint_count: randomInt(3, 12),
      remaining_distance_m: 0,
      total_duration_sec: duration,
      marked_events: events,
    })
  }
})

// 按开始时间倒序排列
FLIGHT_RECORDS.sort((a, b) =>
  new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
)

/** 记录状态颜色映射 */
export const RECORD_STATUS_COLOR_MAP: Record<FlightRecordStatus, string> = {
  进行中: '#52c41a', // --of-color-success（与飞行中一致）
  已完成: '#1481a6', // --of-color-primary（与未飞行一致）
}

/** 记录状态筛选选项 */
export const RECORD_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '进行中', label: '进行中' },
  { value: '已完成', label: '已完成' },
]

/** 时间范围筛选选项 */
export const TIME_RANGE_OPTIONS = [
  { value: 'today', label: '今日' },
  { value: 'last7days', label: '近7天' },
  { value: 'last30days', label: '近30天' },
  { value: 'custom', label: '自定义' },
]

/** 事件类型筛选选项 */
export const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '友好', label: '友好' },
  { value: '敌意', label: '敌意' },
  { value: '未知', label: '未知' },
]

/** 事件类型颜色映射 */
export const EVENT_TYPE_COLOR_MAP: Record<'友好' | '敌意' | '未知', string> = {
  友好: '#52c41a', // 绿色
  敌意: '#ff6666', // 红色
  未知: '#faad14', // 橙色
}

// ==================== 操作员名单 ====================

const OPERATORS = ['张伟', '李强', '王芳', '刘洋', '陈明', '赵磊', '孙静', '周涛']

// ==================== 生成扩展事件列表 ====================

export const ALL_EVENTS: MarkedEventExtended[] = []

FLIGHT_RECORDS.forEach((record) => {
  record.marked_events.forEach((event, idx) => {
    // 从营地名推导大致坐标
    const camp = record.ground_station_name || ''
    let baseLat = 13.5
    let baseLng = 2.1
    if (camp.includes('Jaouro')) {
      baseLat = 13.52
      baseLng = 2.11
    } else if (camp.includes('Koulele')) {
      baseLat = 13.48
      baseLng = 2.07
    } else if (camp.includes('Dibeilla')) {
      baseLat = 13.45
      baseLng = 2.13
    }

    // 随机偏移
    const lat = baseLat + (Math.random() - 0.5) * 0.05
    const lng = baseLng + (Math.random() - 0.5) * 0.05

    ALL_EVENTS.push({
      ...event,
      longitude: parseFloat(lng.toFixed(3)),
      latitude: parseFloat(lat.toFixed(3)),
      created_by: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
      task_id: `TASK-${record.id.split('-')[1] || '001'}-${String(idx + 1).padStart(3, '0')}`,
      drone_name: record.drone_name,
    })
  })
})

// 按上报时间倒序
ALL_EVENTS.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime())
