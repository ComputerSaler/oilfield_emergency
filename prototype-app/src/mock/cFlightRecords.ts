/**
 * C类无人机飞行记录与侦查事件 Mock 数据
 */

export type FlightRecordStatus = '执行中' | '执行完成'
export type FlightType = '任务飞行' | '飞向目标' | '一键起飞'
export type TargetType = '骑行者' | '车' | '人' | '无人机' | '烟雾' | '火'

// 侦查事件（飞行记录详情中的子表）
export interface ScoutEvent {
  id: string
  event_name: string           // 事件名称
  target_type: TargetType      // 目标类型
  captured_at: string          // 拍摄时间（ISO 8601）
}

// 飞行记录
export interface CFlightRecord {
  id: string
  drone_name: string           // 无人机名称
  drone_sn: string             // 无人机序列号
  takeoff_nest: string         // 起飞机巢
  flight_type: FlightType      // 飞行类型
  status: FlightRecordStatus   // 状态
  start_time: string           // 开始时间（ISO 8601）
  end_time: string | null      // 结束时间（执行中时为 null）
  actual_distance_m: number    // 实际里程（米）
  actual_duration_sec: number  // 实际时长（秒）
  max_altitude_m: number       // 最大高度（米）
  scout_events: ScoutEvent[]   // 侦查事件
}

// 事件列表（独立的事件记录，扁平化展示）
export interface CMarkedEvent {
  id: string
  event_name: string
  target_type: TargetType
  longitude: number            // 经度
  latitude: number             // 纬度
  created_by: string           // 创建人
  task_id: string              // 任务编号
  drone_name: string           // 无人机名称
  reported_at: string          // 上报时间（ISO 8601）
}

// 飞行类型颜色映射（统一样式，与飞行状态一致）
export const FLIGHT_TYPE_COLOR = '#1481a6'  // 蓝色

// 状态颜色映射
export const C_RECORD_STATUS_COLOR_MAP: Record<FlightRecordStatus, string> = {
  执行中: '#52c41a',      // 绿色
  执行完成: '#1481a6',    // 蓝色
}

// 目标类型颜色映射（统一样式）
export const TARGET_TYPE_COLOR = '#1481a6'  // 蓝色

// 操作员名单
const OPERATORS = [
  '张建国',
  'John Smith',
  '李明华',
  'Ahmed Hassan',
  '王志强',
  'David Brown',
  '陈晓峰',
  'Mohammed Ali',
]

// 事件名称模板
const EVENT_NAME_TEMPLATES = {
  骑行者: ['发现可疑骑行者', '边界附近骑行活动', '夜间骑行者出没'],
  车: ['发现可疑车辆', '车辆聚集', '高速行驶车辆'],
  人: ['发现可疑人员', '人员聚集', '边界附近人员活动'],
  无人机: ['发现未知无人机', '无人机入侵', '低空飞行器'],
  烟雾: ['检测到烟雾', '疑似火情烟雾', '异常烟雾信号'],
  火: ['发现火情', '明火警报', '火焰检测'],
}

// 生成侦查事件
function generateScoutEvents(recordId: string, count: number): ScoutEvent[] {
  const events: ScoutEvent[] = []
  const targetTypes: TargetType[] = ['骑行者', '车', '人', '无人机', '烟雾', '火']

  for (let i = 0; i < count; i++) {
    const targetType = targetTypes[Math.floor(Math.random() * targetTypes.length)]
    const nameTemplates = EVENT_NAME_TEMPLATES[targetType]
    const eventName = nameTemplates[Math.floor(Math.random() * nameTemplates.length)]

    events.push({
      id: `${recordId}-event-${i + 1}`,
      event_name: eventName,
      target_type: targetType,
      captured_at: new Date(Date.now() - Math.random() * 7200000).toISOString(), // 过去2小时内
    })
  }

  return events
}

// 生成飞行记录
function generateCFlightRecords(): CFlightRecord[] {
  const records: CFlightRecord[] = []

  // 从 C 类无人机数据中提取信息
  const droneInfo = [
    { sn: 'C-UAV-0001', name: 'Jaouro_Nest_Drone1', nest: 'Jaouro-Nest-01' },
    { sn: 'C-UAV-0002', name: 'Jaouro_Drone2', nest: 'Jaouro-Nest-02' },
    { sn: 'C-UAV-0003', name: 'Koulele_Nest_Drone3', nest: 'Koulele-Nest-01' },
    { sn: 'C-UAV-0004', name: 'Koulele_Drone4', nest: 'Koulele-Nest-02' },
    { sn: 'C-UAV-0005', name: 'Dibeilla_Nest_Drone5', nest: 'Dibeilla-Nest-01' },
    { sn: 'C-UAV-0006', name: 'Dibeilla_Drone6', nest: 'Dibeilla-Nest-02' },
    { sn: 'C-UAV-0007', name: 'Jaouro_Nest_Drone7', nest: 'Jaouro-Nest-01' },
    { sn: 'C-UAV-0008', name: 'Jaouro_Drone8', nest: 'Jaouro-Nest-02' },
  ]

  const flightTypes: FlightType[] = ['任务飞行', '飞向目标', '一键起飞']
  let recordCounter = 1

  // 为每架无人机生成 1-2 条记录
  droneInfo.forEach((drone, index) => {
    const recordCount = Math.random() > 0.5 ? 2 : 1

    for (let i = 0; i < recordCount; i++) {
      const isOngoing = i === 0 && Math.random() > 0.7 // 第一条记录有 30% 概率执行中
      const startTime = new Date(Date.now() - Math.random() * 86400000 * 3) // 过去3天内
      const duration = isOngoing
        ? Math.floor((Date.now() - startTime.getTime()) / 1000)
        : Math.floor(Math.random() * 3600) + 600 // 10-70 分钟
      const endTime = isOngoing ? null : new Date(startTime.getTime() + duration * 1000)

      const recordId = `C-FLIGHT-${String(recordCounter++).padStart(4, '0')}`

      records.push({
        id: recordId,
        drone_name: drone.name,
        drone_sn: drone.sn,
        takeoff_nest: drone.nest,
        flight_type: flightTypes[Math.floor(Math.random() * flightTypes.length)],
        status: isOngoing ? '执行中' : '执行完成',
        start_time: startTime.toISOString(),
        end_time: endTime ? endTime.toISOString() : null,
        actual_distance_m: Math.floor(Math.random() * 5000) + 1000, // 1-6 km
        actual_duration_sec: duration,
        max_altitude_m: Math.floor(Math.random() * 80) + 40, // 40-120m
        scout_events: generateScoutEvents(recordId, Math.floor(Math.random() * 4)), // 0-3 个事件
      })
    }
  })

  // 按开始时间倒序排列
  return records.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
}

// 生成事件列表（扁平化的侦查事件）
function generateCMarkedEvents(): CMarkedEvent[] {
  const events: CMarkedEvent[] = []
  const targetTypes: TargetType[] = ['骑行者', '车', '人', '无人机', '烟雾', '火']

  // 确保每种类型至少有 2 条
  targetTypes.forEach((targetType, typeIndex) => {
    for (let i = 0; i < 2; i++) {
      const nameTemplates = EVENT_NAME_TEMPLATES[targetType]
      const eventName = nameTemplates[Math.floor(Math.random() * nameTemplates.length)]
      const droneIndex = Math.floor(Math.random() * 8) + 1

      events.push({
        id: `C-EVENT-${String(typeIndex * 2 + i + 1).padStart(4, '0')}`,
        event_name: eventName,
        target_type: targetType,
        longitude: 13.5 + (Math.random() - 0.5) * 0.1,
        latitude: 2.1 + (Math.random() - 0.5) * 0.1,
        created_by: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
        task_id: `TASK-C-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
        drone_name: `${['Jaouro', 'Koulele', 'Dibeilla'][Math.floor(Math.random() * 3)]}_Drone${droneIndex}`,
        reported_at: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(), // 过去2天内
      })
    }
  })

  // 额外随机生成 0-3 条
  const extraCount = Math.floor(Math.random() * 4)
  for (let i = 0; i < extraCount; i++) {
    const targetType = targetTypes[Math.floor(Math.random() * targetTypes.length)]
    const nameTemplates = EVENT_NAME_TEMPLATES[targetType]
    const eventName = nameTemplates[Math.floor(Math.random() * nameTemplates.length)]
    const droneIndex = Math.floor(Math.random() * 8) + 1

    events.push({
      id: `C-EVENT-${String(events.length + 1).padStart(4, '0')}`,
      event_name: eventName,
      target_type: targetType,
      longitude: 13.5 + (Math.random() - 0.5) * 0.1,
      latitude: 2.1 + (Math.random() - 0.5) * 0.1,
      created_by: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
      task_id: `TASK-C-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
      drone_name: `${['Jaouro', 'Koulele', 'Dibeilla'][Math.floor(Math.random() * 3)]}_Drone${droneIndex}`,
      reported_at: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
    })
  }

  // 按上报时间倒序排列
  return events.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime())
}

export const C_FLIGHT_RECORDS: CFlightRecord[] = generateCFlightRecords()
export const C_MARKED_EVENTS: CMarkedEvent[] = generateCMarkedEvents()
