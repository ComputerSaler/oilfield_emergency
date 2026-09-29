/**
 * C 类机巢管理 mock 数据 —— 依据《PRD-装备管理-C类机巢管理》V1.0
 *
 * C 类机巢为 DJI 自动机场（Dock），AIRIOT 中台为权威数据源，平台只读。
 * 29 个遥测数据点分 6 组，通过 WebSocket 实时推送。
 */

// ========================= 常量 =========================

export const DASH = '--'

/** 项目统一业务时区 UTC+1 */
const TZ_H = 1

// ========================= 格式函数 =========================

function p2(n: number) { return String(n).padStart(2, '0') }

function toLocal(iso: string): Date {
  return new Date(new Date(iso).getTime() + TZ_H * 3_600_000)
}

export function fmtDt(iso: string | null | undefined): string {
  if (!iso) return DASH
  const d = toLocal(iso)
  if (isNaN(d.getTime())) return DASH
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`
}

export function fmtHms(iso: string | null | undefined): string {
  if (!iso) return DASH
  const d = toLocal(iso)
  if (isNaN(d.getTime())) return DASH
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`
}

/** 经纬度 DD.DDDDDD° 格式 */
export function fmtCoord(val: number | null | undefined): string {
  if (val == null) return DASH
  return `${val.toFixed(6)}°`
}

/** 数值保留 n 位小数 */
export function fmtNum(val: number | null | undefined, n = 2): string {
  if (val == null) return DASH
  return val.toFixed(n)
}

/** 存储容量 KB→GB */
export function fmtStorage(kb: number | null | undefined): string {
  if (kb == null) return DASH
  return `${(kb / 1024 / 1024).toFixed(2)} GB`
}

/** 缩放倍数 {值}x */
export function fmtZoom(val: number | null | undefined): string {
  if (val == null) return DASH
  return `${val.toFixed(1)}x`
}

// ========================= 字典 =========================

export interface CampDict { code: string; name: string }

export const CAMP_DICT: CampDict[] = [
  { code: 'Jaouro',   name: 'Jaouro 营地' },
  { code: 'Koulele',  name: 'Koulele 营地' },
  { code: 'Dibeilla', name: 'Dibeilla 营地' },
  { code: 'Agadem',   name: 'Agadem 营地' },
  { code: 'Sokor',    name: 'Sokor 营地' },
  { code: 'Goumeri',  name: 'Goumeri 营地' },
]

export function campName(code: string): string {
  return CAMP_DICT.find(c => c.code === code)?.name ?? code
}

// ========================= 接入状态 =========================

export type AccessStatus = 'ONLINE' | 'OFFLINE'

export const ACCESS_STATUS_LABEL: Record<AccessStatus, string> = {
  ONLINE: '在线',
  OFFLINE: '离线',
}

// ========================= 设备静态字段 =========================

export interface CNestDevice {
  nest_id: string              // 机巢 ID
  name: string                 // 名称
  serial_number: string        // 序列号
  camp: string                 // 所属营地代码
  longitude: number            // 经度
  latitude: number             // 纬度
  firmware_version: string     // 固件版本
  access_status: AccessStatus  // 接入状态（平台计算）
  last_sync_at: string         // 最后同步时间
}

// ========================= 遥测数据点（29个） =========================

export interface CNestTelemetry {
  // G01 机巢状态（4个）
  cover_state: number | null                 // 舱盖状态：0=关闭, 1=打开, 2=半开, 3=异常
  putter_state: number | null                // 归中杆：0=已回收, 1=已推开, 2=半开, 3=异常
  drone_in_dock: number | null               // 无人机是否在舱：0=舱外, 1=舱内
  drone_charge_state: number | null          // 充电状态：0=未充电, 1=充电中

  // G02 环境监测（6个）
  environment_temperature: number | null     // 环境温度（℃）
  environment_humidity: number | null        // 环境湿度（%RH）
  temperature: number | null                 // 舱内温度（℃）
  humidity: number | null                    // 舱内湿度（%RH）
  wind_speed: number | null                  // 风速（m/s）
  rainfall: number | null                    // 降雨量：0=无雨, 1=小雨, 2=中雨, 3=大雨

  // G03 电池信息（5个）
  drone_capacity_percent: number | null      // 无人机电池剩余电量（%）
  backup_battery_remain_cap: number | null   // 备用电池剩余电量（%）
  backup_battery_temperature: number | null  // 备用电池温度（℃）
  backup_battery_voltage: number | null      // 备用电池电压（v）
  backup_battery_switch: number | null       // 备用电池开关状态：0=关闭, 1=打开

  // G04 备降点配置（4个）
  alternate_land_point_configured: boolean   // 配置状态
  alternate_land_point_longitude: number | null  // 备降点经度
  alternate_land_point_latitude: number | null   // 备降点纬度
  alternate_land_point_safe_land_height: number | null  // 安全降落高度（m）

  // G05 存储信息（2个）
  storage_total: number | null               // 存储总容量（kb）
  storage_used: number | null                // 存储已使用容量（kb）

  // G06 摄像头功能（3个）
  ai_enable_func: number | null              // AI识别启用状态：0=关闭, 1=开启
  zoom_factor: number | null                 // 变焦倍数
  infrared_camera_zoom_factor: number | null // 红外相机变焦倍数

  // 基本信息区（3个）
  alarm_state: string | null                 // 报警状态
  drone_online_state: number | null          // 无人机在线状态：0=离线, 1=在线
}

// ========================= Mock 设备数据 =========================

export const NEST_DEVICES: CNestDevice[] = [
  // ============================ 现场真实数据（优先展示）============================
  {
    nest_id: 'NEST_KOULELE_REAL',
    name: 'Koulele_Nest（现场）',
    serial_number: 'NM1925081001',
    camp: 'Koulele',
    longitude: 13.314151,
    latitude: 15.691731,
    firmware_version: '1.6.0.143',
    access_status: 'ONLINE',
    last_sync_at: '2026-08-13T02:55:32Z',
  },
  {
    nest_id: 'NEST_DIBEILLA_REAL',
    name: 'Debillia_Nest（现场）',
    serial_number: 'NM1925031007',
    camp: 'Dibeilla',
    longitude: 13.01792,
    latitude: 16.268188,
    firmware_version: '1.6.0.143',
    access_status: 'ONLINE',
    last_sync_at: '2026-08-13T04:19:46Z',
  },
  {
    nest_id: 'NEST_JAOURO_REAL',
    name: 'Jaouro_Nest（现场）',
    serial_number: 'NM1925041004',
    camp: 'Jaouro',
    longitude: 13.314151,
    latitude: 15.691731,
    firmware_version: '1.6.0.143',
    access_status: 'ONLINE',
    last_sync_at: '2026-08-13T03:20:15Z',
  },
  {
    nest_id: 'NEST_SOKOR_REAL',
    name: 'Sokor_Nest（现场）',
    serial_number: 'NM1925031009',
    camp: 'Sokor',
    longitude: 13.314151,
    latitude: 15.691731,
    firmware_version: '1.6.0.143',
    access_status: 'ONLINE',
    last_sync_at: '2026-08-13T03:45:22Z',
  },
  {
    nest_id: 'NEST_GOUMERI_REAL',
    name: 'Goumeri_Nest（现场）',
    serial_number: 'NM1925081002',
    camp: 'Goumeri',
    longitude: 13.314151,
    latitude: 15.691731,
    firmware_version: '1.6.0.143',
    access_status: 'ONLINE',
    last_sync_at: '2026-08-13T04:10:18Z',
  },
  {
    nest_id: 'NEST_KOULELE_01',
    name: 'Koulele-Nest-01',
    serial_number: 'SN-DOCK-001',
    camp: 'Koulele',
    longitude: 13.314400,
    latitude: 2.635800,
    firmware_version: 'v1.2.3',
    access_status: 'ONLINE',
    last_sync_at: '2026-08-13T10:30:00Z',
  },
  {
    nest_id: 'NEST_DIBEILLA_02',
    name: 'Dibeilla-Nest-02',
    serial_number: 'SN-DOCK-002',
    camp: 'Dibeilla',
    longitude: 13.215600,
    latitude: 2.548900,
    firmware_version: 'v1.2.1',
    access_status: 'OFFLINE',
    last_sync_at: '2026-08-13T09:15:00Z',
  },
  {
    nest_id: 'NEST_JAOURO_03',
    name: 'Jaouro-Nest-03',
    serial_number: 'SN-DOCK-003',
    camp: 'Jaouro',
    longitude: 13.456700,
    latitude: 2.723400,
    firmware_version: 'v1.2.3',
    access_status: 'ONLINE',
    last_sync_at: '2026-08-13T10:28:00Z',
  },
  {
    nest_id: 'NEST_AGADEM_04',
    name: 'Agadem-Nest-04',
    serial_number: 'SN-DOCK-004',
    camp: 'Agadem',
    longitude: 13.102300,
    latitude: 2.412800,
    firmware_version: 'v1.2.2',
    access_status: 'ONLINE',
    last_sync_at: '2026-08-13T10:25:00Z',
  },
]

// ========================= 初始遥测数据 =========================

export const INIT_TELEMETRY: Record<string, CNestTelemetry> = {
  NEST_KOULELE_01: {
    cover_state: 0,
    putter_state: 0,
    drone_in_dock: 1,
    drone_charge_state: 1,
    environment_temperature: 32,
    environment_humidity: 45,
    temperature: 28,
    humidity: 40,
    wind_speed: 3.2,
    rainfall: 0,
    drone_capacity_percent: 85,
    backup_battery_remain_cap: 90,
    backup_battery_temperature: 25,
    backup_battery_voltage: 12.5,
    backup_battery_switch: 1,
    alternate_land_point_configured: true,
    alternate_land_point_longitude: 13.314500,
    alternate_land_point_latitude: 2.635900,
    alternate_land_point_safe_land_height: 50,
    storage_total: 524288000,
    storage_used: 131072000,
    ai_enable_func: 1,
    zoom_factor: 2.5,
    infrared_camera_zoom_factor: 1.0,
    alarm_state: '正常',
    drone_online_state: 1,
  },
  NEST_DIBEILLA_02: {
    cover_state: null,
    putter_state: null,
    drone_in_dock: null,
    drone_charge_state: null,
    environment_temperature: null,
    environment_humidity: null,
    temperature: null,
    humidity: null,
    wind_speed: null,
    rainfall: null,
    drone_capacity_percent: null,
    backup_battery_remain_cap: null,
    backup_battery_temperature: null,
    backup_battery_voltage: null,
    backup_battery_switch: null,
    alternate_land_point_configured: false,
    alternate_land_point_longitude: null,
    alternate_land_point_latitude: null,
    alternate_land_point_safe_land_height: null,
    storage_total: null,
    storage_used: null,
    ai_enable_func: null,
    zoom_factor: null,
    infrared_camera_zoom_factor: null,
    alarm_state: null,
    drone_online_state: null,
  },
  NEST_JAOURO_03: {
    cover_state: 1,
    putter_state: 1,
    drone_in_dock: 0,
    drone_charge_state: 0,
    environment_temperature: 35,
    environment_humidity: 38,
    temperature: 30,
    humidity: 35,
    wind_speed: 5.8,
    rainfall: 1,
    drone_capacity_percent: 45,
    backup_battery_remain_cap: 75,
    backup_battery_temperature: 28,
    backup_battery_voltage: 12.2,
    backup_battery_switch: 1,
    alternate_land_point_configured: true,
    alternate_land_point_longitude: 13.456800,
    alternate_land_point_latitude: 2.723500,
    alternate_land_point_safe_land_height: 45,
    storage_total: 524288000,
    storage_used: 262144000,
    ai_enable_func: 0,
    zoom_factor: 1.0,
    infrared_camera_zoom_factor: 1.2,
    alarm_state: '正常',
    drone_online_state: 0,
  },
  NEST_AGADEM_04: {
    cover_state: 0,
    putter_state: 0,
    drone_in_dock: 1,
    drone_charge_state: 1,
    environment_temperature: 29,
    environment_humidity: 52,
    temperature: 26,
    humidity: 48,
    wind_speed: 2.1,
    rainfall: 0,
    drone_capacity_percent: 92,
    backup_battery_remain_cap: 88,
    backup_battery_temperature: 24,
    backup_battery_voltage: 12.6,
    backup_battery_switch: 1,
    alternate_land_point_configured: true,
    alternate_land_point_longitude: 13.102400,
    alternate_land_point_latitude: 2.412900,
    alternate_land_point_safe_land_height: 55,
    storage_total: 524288000,
    storage_used: 104857600,
    ai_enable_func: 1,
    zoom_factor: 3.0,
    infrared_camera_zoom_factor: 1.5,
    alarm_state: '正常',
    drone_online_state: 1,
  },
}

// ========================= 枚举映射 =========================

export const COVER_STATE_MAP: Record<number, string> = {
  0: '关闭',
  1: '打开',
  2: '半开',
  3: '异常',
}

export const PUTTER_STATE_MAP: Record<number, string> = {
  0: '已回收',
  1: '已推开',
  2: '半开',
  3: '异常',
}

export const DRONE_IN_DOCK_MAP: Record<number, string> = {
  0: '舱外',
  1: '舱内',
}

export const CHARGE_STATE_MAP: Record<number, string> = {
  0: '未充电',
  1: '充电中',
}

export const RAINFALL_MAP: Record<number, string> = {
  0: '无雨',
  1: '小雨',
  2: '中雨',
  3: '大雨',
}

export const SWITCH_MAP: Record<number, string> = {
  0: '关闭',
  1: '打开',
}

export const AI_MAP: Record<number, string> = {
  0: '关闭',
  1: '开启',
}

export const DRONE_ONLINE_MAP: Record<number, string> = {
  0: '离线',
  1: '在线',
}

/** 枚举通用映射辅助 */
export function enumLabel(val: number | null | undefined, map: Record<number, string>): string {
  if (val == null) return DASH
  return map[val] ?? `未知（${val}）`
}
