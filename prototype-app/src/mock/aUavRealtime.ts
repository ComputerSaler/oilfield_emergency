/**
 * A 类无人机实况 mock 数据
 * 扩展 aUav.ts 的基础数据，添加实时飞行状态和遥测信息
 */
import { SOURCE_RECORDS, CAMP_DICT, type UavSourceRecord } from './aUav'

/** 实时飞行状态（2种，使用中文） */
export type RealtimeFlightStatus = '飞行中' | '未飞行'

/** 实时遥测数据 */
export interface RealtimeTelemetry {
  /** 起飞时间（ISO 8601，飞行中时有值） */
  takeoff_time?: string
  /** 飞行时长（秒，飞行中时有值） */
  flight_duration_sec?: number
  /** 距离目的地剩余距离（米，飞行中时有值） */
  remaining_distance_m?: number
  /** 实时经度 */
  longitude?: number
  /** 实时纬度 */
  latitude?: number
  /** 飞行高度（米） */
  altitude_m?: number
  /** 地速（m/s） */
  ground_speed_ms?: number
  /** 垂直速度（m/s） */
  vertical_speed_ms?: number
  /** 当前电量（百分比 0-100） */
  battery_percent?: number
  /** 遥测数据更新时间 */
  telemetry_updated_at?: string
}

/** 今日统计数据 */
export interface TodayStats {
  /** 今日里程（米） */
  today_distance_m: number
  /** 今日航时（秒） */
  today_duration_sec: number
  /** 今日架次 */
  today_sorties: number
}

/** A类无人机实况数据 */
export interface AUavRealtimeData extends UavSourceRecord {
  /** 实时飞行状态（7种枚举） */
  realtime_status: RealtimeFlightStatus
  /** 今日统计 */
  today_stats: TodayStats
  /** 实时遥测（飞行中时有完整数据） */
  telemetry?: RealtimeTelemetry
}

// ==================== 辅助函数 ====================

/** 生成相对当前时刻的时间戳 */
const T0 = Date.now()
const at = (offsetSec: number) => new Date(T0 + offsetSec * 1000).toISOString()

/** 根据源记录的flight_status_code映射实时状态（简化为2种） */
function mapRealtimeStatus(
  flightStatus: string | null,
  onlineStatus: string,
): RealtimeFlightStatus {
  // 离线状态下不可能飞行中
  if (onlineStatus === 'OFFLINE') {
    return '未飞行'
  }
  // 在线状态下根据 flight_status_code 判断
  if (flightStatus === 'FLYING') {
    return '飞行中'
  }
  return '未飞行'
}

/** 生成今日统计（合理范围：今日最多24小时，架次1-5次，里程按实际飞行能力） */
function generateTodayStats(
  totalDistance: number | null,
  totalDuration: number | null,
  totalSorties: number | null,
): TodayStats {
  // 今日航时：0-8小时（28800秒）
  const maxTodayDuration = 8 * 3600
  const todayDuration = Math.floor(Math.random() * maxTodayDuration)

  // 今日架次：0-5次
  const todaySorties = Math.floor(Math.random() * 6)

  // 今日里程：按实际飞行能力，假设平均速度15m/s，根据今日航时计算
  // 加入一些随机性（80%-120%）
  const avgSpeed = 15 // m/s
  const todayDistance = todaySorties > 0
    ? Math.floor(todayDuration * avgSpeed * (0.8 + Math.random() * 0.4))
    : 0

  return {
    today_distance_m: todayDistance,
    today_duration_sec: todayDuration,
    today_sorties: todaySorties,
  }
}

/** 生成实时遥测数据（仅飞行中状态） */
function generateTelemetry(
  status: RealtimeFlightStatus,
  campCode: string,
): RealtimeTelemetry | undefined {
  if (status !== '飞行中') {
    return undefined
  }

  // 根据营地生成大致的经纬度范围
  const campCoords: Record<string, { lat: number; lng: number }> = {
    Jaouro: { lat: 13.315, lng: 2.635 },
    Koulele: { lat: 13.32, lng: 2.64 },
    Dibeilla: { lat: 13.52, lng: 2.12 },
  }
  const base = campCoords[campCode] || { lat: 13.3, lng: 2.6 }

  // 起飞时间：最近1-3小时内
  const takeoffOffset = -(3600 + Math.random() * 7200)
  const flightDuration = -takeoffOffset

  return {
    takeoff_time: at(takeoffOffset),
    flight_duration_sec: Math.floor(flightDuration),
    remaining_distance_m: Math.floor(500 + Math.random() * 5000), // 0.5-5.5 km
    longitude: base.lng + (Math.random() - 0.5) * 0.02,
    latitude: base.lat + (Math.random() - 0.5) * 0.02,
    altitude_m: Math.floor(100 + Math.random() * 400), // 100-500m
    ground_speed_ms: Math.round((10 + Math.random() * 15) * 10) / 10, // 10-25 m/s
    vertical_speed_ms: Math.round((Math.random() - 0.5) * 4 * 10) / 10, // -2 ~ +2 m/s
    battery_percent: Math.floor(40 + Math.random() * 55), // 40%-95%
    telemetry_updated_at: at(-30 - Math.random() * 60), // 最近30-90秒
  }
}

/** 推断营地（从ground_station_name或默认Jaouro） */
function inferCamp(groundStationName: string | null): string {
  if (!groundStationName) return 'Jaouro'
  const lower = groundStationName.toLowerCase()
  if (lower.includes('jaouro')) return 'Jaouro'
  if (lower.includes('koulele')) return 'Koulele'
  if (lower.includes('dibeilla')) return 'Dibeilla'
  return 'Jaouro'
}

// ==================== 实况数据生成 ====================

export const A_UAV_REALTIME_DATA: AUavRealtimeData[] = SOURCE_RECORDS
  // 过滤掉已删除、已归档的记录
  .filter((r) => !r.record_missing)
  .map((source) => {
    const camp = inferCamp(source.ground_station_name)
    const realtimeStatus = mapRealtimeStatus(
      source.flight_status_code,
      source.online_status,
    )
    const todayStats = generateTodayStats(
      source.total_flight_distance_m,
      source.total_flight_duration_sec,
      source.total_sorties,
    )
    const telemetry = generateTelemetry(realtimeStatus, camp)

    return {
      ...source,
      realtime_status: realtimeStatus,
      today_stats: todayStats,
      telemetry,
    }
  })

/** 营地选项（用于筛选器） */
export const CAMP_OPTIONS = [
  { value: 'all', label: '全部' },
  ...CAMP_DICT
    .filter((c) => ['Jaouro', 'Koulele', 'Dibeilla'].includes(c.code))
    .map((c) => ({ value: c.code, label: c.name })),
]

/** 飞行状态选项（用于筛选器） */
export const FLIGHT_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '飞行中', label: '飞行中' },
  { value: '未飞行', label: '未飞行' },
]

/**
 * 实时状态颜色映射 —— 取自 tokens.scss
 */
export const STATUS_COLOR_MAP: Record<RealtimeFlightStatus, string> = {
  飞行中: '#52c41a', // --of-color-success
  未飞行: '#1481a6', // --of-color-primary
}
