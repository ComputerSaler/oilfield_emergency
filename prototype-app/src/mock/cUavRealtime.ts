/**
 * C类无人机实况 Mock 数据
 * C类无人机：消费级/小型无人机，具备 RID（远程识别）功能
 */

export type OnlineStatus = 'ONLINE' | 'OFFLINE'
export type RealtimeFlightStatus = '飞行中' | '未飞行'
export type RidStatus = '开启广播' | '未开启广播'

// 今日统计
export interface TodayStats {
  today_distance_m: number | null
  today_duration_sec: number | null
  today_sorties: number | null
}

// 实时遥测数据（仅飞行中时有值）
export interface RealtimeTelemetry {
  takeoff_time: string              // 起飞时间
  flight_duration_sec: number       // 飞行时长（秒）
  remaining_distance_m: number      // 剩余距离（米）
  longitude: number                 // 实时经度
  latitude: number                  // 实时纬度
  altitude_m: number                // 飞行高度（米）
  ground_speed_ms: number           // 地速（m/s）
  vertical_speed_ms: number         // 垂直速度（m/s）
  battery_percent: number           // 当前电量（百分比）
  updated_at: string                // 遥测更新时间
}

export interface CUavRealtimeData {
  drone_sn: string                          // 设备序列号（唯一键）
  aircraft_name: string | null              // 无人机名称
  nest_name: string | null                  // 对应机巢名称
  online_status: OnlineStatus               // 在线状态
  realtime_status: RealtimeFlightStatus     // 飞行状态
  rid_status: RidStatus                     // RID状态
  total_flight_distance_m: number | null    // 累计里程（米）
  total_flight_duration_sec: number | null  // 累计航时（秒）
  total_sorties: number | null              // 累计架次
  today_stats: TodayStats                   // 今日统计
  telemetry?: RealtimeTelemetry             // 遥测数据（飞行中时存在）
}

// RID 状态颜色映射
export const RID_STATUS_COLOR_MAP: Record<RidStatus, string> = {
  开启广播: '#52c41a',    // 绿色
  未开启广播: '#8c8c8c',  // 灰色
}

// 飞行状态颜色映射（与A类保持一致）
export const STATUS_COLOR_MAP: Record<RealtimeFlightStatus, string> = {
  飞行中: '#52c41a',
  未飞行: '#1481a6',
}

// 营地选项（与A类保持一致）
export const CAMP_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: 'Jaouro', value: 'Jaouro' },
  { label: 'Koulele', value: 'Koulele' },
  { label: 'Dibeilla', value: 'Dibeilla' },
]

// 飞行状态选项（与A类保持一致）
export const FLIGHT_STATUS_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '飞行中', value: '飞行中' },
  { label: '未飞行', value: '未飞行' },
]

// Mock 数据生成
const NEST_NAMES = [
  'Jaouro-Nest-01',
  'Jaouro-Nest-02',
  'Koulele-Nest-01',
  'Koulele-Nest-02',
  'Dibeilla-Nest-01',
  'Dibeilla-Nest-02',
]

// C 类无人机命名规则：营地_Nest_DroneX 或 营地_DroneX
const generateDroneName = (nestName: string, index: number): string => {
  const camp = nestName.split('-')[0] // 提取营地名
  const nestNumber = nestName.split('-')[2] // 提取机巢编号

  // 交替使用两种命名格式
  if (index % 2 === 0) {
    return `${camp}_Nest_Drone${index + 1}`
  } else {
    return `${camp}_Drone${index + 1}`
  }
}

function generateCUavData(): CUavRealtimeData[] {
  const data: CUavRealtimeData[] = []

  for (let i = 0; i < 15; i++) {
    const isOnline = Math.random() > 0.2  // 80% 在线
    const isFlying = isOnline && Math.random() > 0.6  // 在线中 40% 飞行
    const ridEnabled = isOnline && Math.random() > 0.3  // 在线中 70% 开启 RID

    const nestName = NEST_NAMES[i % NEST_NAMES.length]
    const droneName = generateDroneName(nestName, i)

    // 累计统计数据
    const totalDistance = Math.floor(Math.random() * 50000) + 10000  // 10-60 km
    const totalDuration = Math.floor(Math.random() * 36000) + 7200   // 2-12 小时
    const totalSorties = Math.floor(Math.random() * 30) + 5          // 5-35 次

    // 今日统计数据
    const todayDistance = Math.floor(Math.random() * 8000) + 1000    // 1-9 km
    const todayDuration = Math.floor(Math.random() * 5400) + 600     // 10-100 分钟
    const todaySorties = Math.floor(Math.random() * 5) + 1           // 1-6 次

    const droneData: CUavRealtimeData = {
      drone_sn: `C-UAV-${String(i + 1).padStart(4, '0')}`,
      aircraft_name: droneName,
      nest_name: nestName,
      online_status: isOnline ? 'ONLINE' : 'OFFLINE',
      realtime_status: isFlying ? '飞行中' : '未飞行',
      rid_status: ridEnabled ? '开启广播' : '未开启广播',
      total_flight_distance_m: totalDistance,
      total_flight_duration_sec: totalDuration,
      total_sorties: totalSorties,
      today_stats: {
        today_distance_m: todayDistance,
        today_duration_sec: todayDuration,
        today_sorties: todaySorties,
      },
    }

    // 飞行中的无人机生成遥测数据
    if (isFlying) {
      const takeoffTime = new Date(Date.now() - Math.random() * 3600000) // 过去1小时内起飞
      const flightDuration = Math.floor((Date.now() - takeoffTime.getTime()) / 1000)

      droneData.telemetry = {
        takeoff_time: takeoffTime.toISOString(),
        flight_duration_sec: flightDuration,
        remaining_distance_m: Math.floor(Math.random() * 3000) + 500,  // 0.5-3.5 km
        longitude: 13.5 + (Math.random() - 0.5) * 0.1,  // 尼日尔附近经度
        latitude: 2.1 + (Math.random() - 0.5) * 0.1,    // 尼日尔附近纬度
        altitude_m: Math.floor(Math.random() * 100) + 50,  // 50-150m
        ground_speed_ms: Math.random() * 15 + 5,        // 5-20 m/s
        vertical_speed_ms: (Math.random() - 0.5) * 2,   // -1 ~ 1 m/s
        battery_percent: Math.floor(Math.random() * 60) + 30,  // 30-90%
        updated_at: new Date().toISOString(),
      }
    }

    data.push(droneData)
  }

  return data
}

export const C_UAV_REALTIME_DATA: CUavRealtimeData[] = generateCUavData()
