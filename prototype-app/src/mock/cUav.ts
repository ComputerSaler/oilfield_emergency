/**
 * C 类无人机管理 mock 数据 —— 依据《PRD-装备管理-C类无人机管理》V1.2
 *
 * C 类多旋翼，各营地自用，AIRIOT 中台为权威数据源，平台只读。
 * 66 个遥测数据点分 13 组，通过 WebSocket 实时推送。
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

/** 累计飞行时长 X 小时 X 分 X 秒 */
export function fmtTotalFlight(sec: number | null | undefined): string {
  if (sec == null) return DASH
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h} 小时 ${m} 分 ${s} 秒`
  if (m > 0) return `${m} 分 ${s} 秒`
  return `${s} 秒`
}

/** 剩余飞行时间 X 分 X 秒 */
export function fmtRemain(sec: number | null | undefined): string {
  if (sec == null) return DASH
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m} 分 ${s} 秒`
}

/** 存储容量 KB→GB/MB/KB */
export function fmtStorage(kb: number | null | undefined): string {
  if (kb == null) return DASH
  if (kb >= 1_048_576) return `${(kb / 1_048_576).toFixed(1)} GB`
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

/** 经纬度 DD.DDDDDD° 格式（中台原始值已为十进制度） */
export function fmtCoord(val: number | null | undefined): string {
  if (val == null) return DASH
  return `${val.toFixed(6)}°`
}

/** 数值保留 n 位小数 */
export function fmtNum(val: number | null | undefined, n = 2): string {
  if (val == null) return DASH
  return val.toFixed(n)
}

/** 缩放倍数 {值}x */
export function fmtZoom(val: number | null | undefined): string {
  if (val == null) return DASH
  return `${val.toFixed(1)}x`
}

// ========================= 字典 =========================

export interface CampDict { code: string; name: string; short: string }

export const CAMP_DICT: CampDict[] = [
  { code: 'Jaouro',   name: 'Jaouro 营地',   short: 'J' },
  { code: 'Koulele',  name: 'Koulele 营地',  short: 'K' },
  { code: 'Dibeilla', name: 'Dibeilla 营地', short: 'D' },
  { code: 'Agadem',   name: 'Agadem 营地',   short: 'A' },
  { code: 'Sokor',    name: 'Sokor 营地',    short: 'S' },
  { code: 'Goumeri',  name: 'Goumeri 营地',  short: 'G' },
]

export function campName(code: string): string {
  return CAMP_DICT.find(c => c.code === code)?.name ?? code
}

/** 机巢字典（AIRIOT 中台同步，平台只读） */
export interface NestDict { code: string; name: string }

export const NEST_DICT: NestDict[] = [
  { code: 'NEST-J-01', name: 'Jaouro 1 号机巢'   },
  { code: 'NEST-J-02', name: 'Jaouro 2 号机巢'   },
  { code: 'NEST-K-01', name: 'Koulele 1 号机巢'  },
  { code: 'NEST-D-01', name: 'Dibeilla 1 号机巢' },
  { code: 'NEST-A-01', name: 'Agadem 1 号机巢'   },
]

/** 机巢名称；未绑定机巢或字典未命中时返回「--」 */
export function nestName(code: string | null | undefined): string {
  if (!code) return DASH
  return NEST_DICT.find(n => n.code === code)?.name ?? code
}

/** 机型字典（含红外能力内置映射） */
export interface ModelDict { code: string; name: string; hasIr: boolean }

export const MODEL_DICT: ModelDict[] = [
  { code: 'M30T', name: 'DJI M30T', hasIr: true  },
  { code: 'M30',  name: 'DJI M30',  hasIr: false },
]

export function modelHasIr(modelCode: string): boolean {
  return MODEL_DICT.find(m => m.code === modelCode)?.hasIr ?? false
}

export function modelName(modelCode: string): string {
  return MODEL_DICT.find(m => m.code === modelCode)?.name ?? modelCode
}

// ========================= mode_code 枚举（39 种）=========================

export type FlightGroup = 'ground' | 'flying' | 'return' | 'special'

export interface ModeCodeItem {
  code: number
  label: string
  group: FlightGroup
}

export const MODE_CODE_DICT: ModeCodeItem[] = [
  // 地面待机
  { code: 0,  label: '待机',           group: 'ground'  },
  { code: 1,  label: '起飞准备',       group: 'ground'  },
  { code: 2,  label: '起飞准备完毕',   group: 'ground'  },
  { code: 14, label: '未连接',         group: 'ground'  },
  // 飞行中
  { code: 3,  label: '手动飞行',       group: 'flying'  },
  { code: 4,  label: '自动起飞',       group: 'flying'  },
  { code: 5,  label: '航线飞行',       group: 'flying'  },
  { code: 6,  label: '全景拍照',       group: 'flying'  },
  { code: 7,  label: '智能跟随',       group: 'flying'  },
  { code: 8,  label: 'ADS-B 躲避',    group: 'flying'  },
  { code: 15, label: 'APAS',          group: 'flying'  },
  { code: 16, label: '虚拟摇杆',       group: 'flying'  },
  { code: 17, label: '矩形',           group: 'flying'  },
  { code: 18, label: '多边形',         group: 'flying'  },
  { code: 19, label: '倾斜摄影',       group: 'flying'  },
  { code: 21, label: '精准复拍',       group: 'flying'  },
  { code: 22, label: '延时摄影',       group: 'flying'  },
  { code: 23, label: '环绕',           group: 'flying'  },
  { code: 25, label: '螺旋',           group: 'flying'  },
  { code: 26, label: '超清',           group: 'flying'  },
  { code: 27, label: '智能图传打点',   group: 'flying'  },
  { code: 28, label: '红外光跟踪',     group: 'flying'  },
  { code: 29, label: '智能任务航带',   group: 'flying'  },
  { code: 30, label: '智能任务仿地',   group: 'flying'  },
  { code: 31, label: '智能任务环绕',   group: 'flying'  },
  { code: 32, label: '全景智能检测',   group: 'flying'  },
  { code: 33, label: '安防智能检测',   group: 'flying'  },
  { code: 37, label: '快速任务',       group: 'flying'  },
  { code: 38, label: '建模环综',       group: 'flying'  },
  { code: 39, label: 'kml 航线',      group: 'flying'  },
  // 返航/降落
  { code: 9,  label: '自动返航',       group: 'return'  },
  { code: 10, label: '自动降落',       group: 'return'  },
  { code: 11, label: '强制降落',       group: 'return'  },
  { code: 12, label: '三桨叶降落',     group: 'return'  },
  // 特殊/异常
  { code: 13, label: '升级中',         group: 'special' },
  { code: 20, label: '保留字段',       group: 'special' },
  { code: 24, label: '24',            group: 'special' },
  { code: 34, label: 'gps 逃逸',      group: 'special' },
  { code: 35, label: '异常模式',       group: 'special' },
  { code: 36, label: '蜂群编队',       group: 'special' },
]

export function modeCodeLabel(code: number | null | undefined): string {
  if (code == null) return DASH
  const hit = MODE_CODE_DICT.find(m => m.code === code)
  return hit ? hit.label : `未知（${code}）`
}

export function modeCodeGroup(code: number | null | undefined): FlightGroup | null {
  if (code == null) return null
  return MODE_CODE_DICT.find(m => m.code === code)?.group ?? null
}

// ========================= 接入状态 =========================

export type AccessStatus = 'ONLINE' | 'OFFLINE'

export const ACCESS_STATUS_LABEL: Record<AccessStatus, string> = {
  ONLINE:  '在线',
  OFFLINE: '离线',
}

// ========================= 设备与遥测类型 =========================

/** 设备档案（6 个静态字段 + 元数据） */
export interface CDevice {
  device_id: string
  name: string
  serial_no: string
  camp_code: string
  nest_id?: string        // 所属机巢，中台同步；未绑定机巢时为空
  model_code: string
  firmware_version?: string // 固件版本，机巢驱动上报；未上报时为空
  access_status: AccessStatus
  last_sync_at: string    // 最后同步时间
}

/** 66 个遥测数据点（null = 未推送/超时） */
export interface CTelemetry {
  // G01
  mode_code: number | null
  alarm_status: number | null
  activation_time: string | null
  total_flight_time: number | null
  // G02
  elevation: number | null
  height: number | null
  hae: number | null
  horizontal_speed: number | null
  vertical_speed: number | null
  home_distance: number | null
  // G03
  battery_capacity_percent: number | null
  battery_remain_flight_time: number | null
  // G04
  latitude: number | null
  longitude: number | null
  // G05 RTK
  position_state_coordinate_sys: number | null
  position_state_calibration: number | null
  position_state_fix_sta: number | null
  position_state_gps_number: number | null
  position_state_quality: number | null
  position_state_rtk_number: number | null
  position_state_rtk_hgt: number | null
  position_state_rtk_lat: number | null
  position_state_rtk_lon: number | null
  position_state_rtk_inpos: number | null
  position_state_rtk_used: number | null
  position_state_is_fixed: number | null
  // G06
  attitude_head: number | null
  attitude_pitch: number | null
  attitude_roll: number | null
  gimbal_pitch: number | null
  gimbal_roll: number | null
  gimbal_yaw: number | null
  // G07
  height_limit: number | null
  distance_limit: number | null
  distance_limit_state: number | null
  is_near_distance_limit: number | null
  is_near_area_limit: number | null
  is_near_height_limit: number | null
  // G08
  storage_type: number | null
  storage_total: number | null
  storage_used: number | null
  // G09
  wireless_link_4g_uav_quality: number | null
  air_link_signal_strength: number | null
  night_lights_state: number | null
  rid_state: number | null
  remote_id_status: number | null
  // G10
  obstacle_avoidance_downside: number | null
  obstacle_avoidance_horizon: number | null
  obstacle_avoidance_upside: number | null
  // G11
  zoom_factor: number | null
  ai_enable_func: number | null
  // G12
  measure_target_error_state: number | null
  measure_target_distance: number | null
  measure_target_longitude: number | null
  measure_target_latitude: number | null
  measure_target_altitude: number | null
  // G13 红外（仅具备红外能力的机型）
  infrared_camera_average_temp: number | null
  infrared_camera_center_temp: number | null
  infrared_camera_cold_temp: number | null
  infrared_camera_hot_temp: number | null
  infrared_camera_touch_temp: number | null
  infrared_camera_cold_x: number | null
  infrared_camera_cold_y: number | null
  infrared_camera_hot_x: number | null
  infrared_camera_hot_y: number | null
  infrared_camera_zoom_factor: number | null
}

// ========================= Mock 遥测基线 =========================

function baseTelemetry(): CTelemetry {
  return {
    mode_code: 0, alarm_status: 0,
    activation_time: '2024-09-12T06:00:00Z', total_flight_time: 47520,
    elevation: 0, height: 312.5, hae: 308.2,
    horizontal_speed: 0, vertical_speed: 0, home_distance: 0,
    battery_capacity_percent: 92, battery_remain_flight_time: 2280,
    latitude: 14.847312, longitude: 13.124567,
    position_state_coordinate_sys: 0, position_state_calibration: 2,
    position_state_fix_sta: 1, position_state_gps_number: 18,
    position_state_quality: 5, position_state_rtk_number: 12,
    position_state_rtk_hgt: 308.24, position_state_rtk_lat: 14.847316,
    position_state_rtk_lon: 13.124571, position_state_rtk_inpos: 1,
    position_state_rtk_used: 1, position_state_is_fixed: 2,
    attitude_head: 38.5, attitude_pitch: -1.2, attitude_roll: 0.4,
    gimbal_pitch: -45.0, gimbal_roll: 0.0, gimbal_yaw: 0.0,
    height_limit: 120, distance_limit: 5000, distance_limit_state: 1,
    is_near_distance_limit: 0, is_near_area_limit: 0, is_near_height_limit: 0,
    storage_type: 1, storage_total: 131072, storage_used: 28672,
    wireless_link_4g_uav_quality: 4, air_link_signal_strength: 82,
    night_lights_state: 0, rid_state: 1, remote_id_status: 1,
    obstacle_avoidance_downside: 1, obstacle_avoidance_horizon: 1, obstacle_avoidance_upside: 1,
    zoom_factor: 1.0, ai_enable_func: 0,
    measure_target_error_state: 0,
    measure_target_distance: null, measure_target_longitude: null,
    measure_target_latitude: null, measure_target_altitude: null,
    infrared_camera_average_temp: 28.5, infrared_camera_center_temp: 29.1,
    infrared_camera_cold_temp: 22.3, infrared_camera_hot_temp: 45.7,
    infrared_camera_touch_temp: 31.2,
    infrared_camera_cold_x: 120, infrared_camera_cold_y: 85,
    infrared_camera_hot_x: 380, infrared_camera_hot_y: 210,
    infrared_camera_zoom_factor: 2.0,
  }
}

// ========================= Mock 设备清单 =========================

export const DEVICES: CDevice[] = [
  // ============================ 现场真实数据（优先展示）============================
  { device_id: 'REAL-K-C-001', name: 'Koulele_NestDrone（现场）', serial_no: '1748FEV3HMG925021496', camp_code: 'Koulele',  model_code: 'M30T', access_status: 'OFFLINE', last_sync_at: '2026-08-13T01:33:04Z', nest_id: 'NEST_KOULELE_REAL', firmware_version: '1.9.2.139' },
  { device_id: 'REAL-D-C-001', name: 'Dibeilla_Drone（现场）', serial_no: '1748FEV3HMF924521095', camp_code: 'Dibeilla', model_code: 'M30T', access_status: 'OFFLINE', last_sync_at: '2026-08-13T01:26:01Z', nest_id: 'NEST_DIBEILLA_REAL', firmware_version: '1.9.2.139' },
  { device_id: 'REAL-J-C-003', name: 'Jaouro_Nest_Drone3（现场）', serial_no: '1748FEV3HMF925081044', camp_code: 'Jaouro',   model_code: 'M30T', access_status: 'OFFLINE', last_sync_at: '2026-08-13T01:15:22Z', nest_id: 'NEST_JAOURO_REAL', firmware_version: '1.9.2.139' },
  { device_id: 'REAL-S-C-001', name: 'Sokor_Nest_Drone（现场）', serial_no: '1748FEV3HMG925021052', camp_code: 'Sokor',    model_code: 'M30T', access_status: 'OFFLINE', last_sync_at: '2026-08-13T01:40:18Z', nest_id: 'NEST_SOKOR_REAL', firmware_version: '1.9.2.139' },
  { device_id: 'REAL-G-C-001', name: 'Goumeri_Nest_Drone（现场）', serial_no: '1748FEV3HMF924521098', camp_code: 'Goumeri',  model_code: 'M30T', access_status: 'OFFLINE', last_sync_at: '2026-08-13T01:22:35Z', nest_id: 'NEST_GOUMERI_REAL', firmware_version: '1.9.2.139' },
  { device_id: 'J-C-001', name: 'Jaouro-C-01', serial_no: 'DJI202409J001', camp_code: 'Jaouro',   model_code: 'M30T', access_status: 'ONLINE',         last_sync_at: '2026-08-02T11:30:05Z', nest_id: 'NEST-J-01', firmware_version: 'v04.01.0203' },
  { device_id: 'J-C-002', name: 'Jaouro-C-02', serial_no: 'DJI202409J002', camp_code: 'Jaouro',   model_code: 'M30',  access_status: 'ONLINE',         last_sync_at: '2026-08-02T11:30:05Z', nest_id: 'NEST-J-02', firmware_version: 'v04.01.0203' },
  { device_id: 'K-C-001', name: 'Koulele-C-01', serial_no: 'DJI202410K001', camp_code: 'Koulele',  model_code: 'M30T', access_status: 'ONLINE',         last_sync_at: '2026-08-02T11:25:12Z', nest_id: 'NEST-K-01', firmware_version: 'v04.00.0192' },
  { device_id: 'K-C-002', name: 'Koulele-C-02', serial_no: 'DJI202410K002', camp_code: 'Koulele',  model_code: 'M30',  access_status: 'OFFLINE',        last_sync_at: '2026-08-02T09:10:00Z' },
  { device_id: 'D-C-001', name: 'Dibeilla-C-01', serial_no: 'DJI202411D001', camp_code: 'Dibeilla', model_code: 'M30T', access_status: 'OFFLINE',        last_sync_at: '2026-08-01T14:00:00Z' },
  { device_id: 'D-C-002', name: 'Dibeilla-C-02', serial_no: 'DJI202411D002', camp_code: 'Dibeilla', model_code: 'M30',  access_status: 'ONLINE',         last_sync_at: '2026-08-02T11:28:55Z', nest_id: 'NEST-D-01', firmware_version: 'v04.01.0203' },
  { device_id: 'A-C-001', name: 'Agadem-C-01',  serial_no: 'DJI202412A001', camp_code: 'Agadem',   model_code: 'M30T', access_status: 'ONLINE',         last_sync_at: '2026-08-02T11:29:40Z', nest_id: 'NEST-A-01', firmware_version: 'v04.01.0203' },
]

// ========================= Mock 遥测初始值（各设备差异化） =========================

export const INIT_TELEMETRY: Record<string, CTelemetry> = {
  'J-C-001': { ...baseTelemetry(), mode_code: 5, alarm_status: 0, elevation: 78.3, height: 390.8, horizontal_speed: 12.4, vertical_speed: 0.2, home_distance: 843, battery_capacity_percent: 71, battery_remain_flight_time: 1560, latitude: 14.851234, longitude: 13.128901, zoom_factor: 3.0, ai_enable_func: 1 },
  'J-C-002': { ...baseTelemetry(), mode_code: 3, alarm_status: 1, elevation: 52.1, height: 364.6, horizontal_speed: 8.7, vertical_speed: 0.0, home_distance: 321, battery_capacity_percent: 38, battery_remain_flight_time: 600, latitude: 14.849100, longitude: 13.126030 },
  'K-C-001': { ...baseTelemetry(), mode_code: 0, alarm_status: 0, elevation: 0, horizontal_speed: 0, vertical_speed: 0, home_distance: 0, battery_capacity_percent: 100, battery_remain_flight_time: 3000, latitude: 15.254788, longitude: 13.512345 },
  'K-C-002': { ...baseTelemetry(), mode_code: null, alarm_status: null, activation_time: null, total_flight_time: null, elevation: null, height: null, hae: null, horizontal_speed: null, vertical_speed: null, home_distance: null, battery_capacity_percent: null, battery_remain_flight_time: null, latitude: null, longitude: null, position_state_coordinate_sys: null, position_state_calibration: null, position_state_fix_sta: null, position_state_gps_number: null, position_state_quality: null, position_state_rtk_number: null, position_state_rtk_hgt: null, position_state_rtk_lat: null, position_state_rtk_lon: null, position_state_rtk_inpos: null, position_state_rtk_used: null, position_state_is_fixed: null, attitude_head: null, attitude_pitch: null, attitude_roll: null, gimbal_pitch: null, gimbal_roll: null, gimbal_yaw: null, height_limit: null, distance_limit: null, distance_limit_state: null, is_near_distance_limit: null, is_near_area_limit: null, is_near_height_limit: null, storage_type: null, storage_total: null, storage_used: null, wireless_link_4g_uav_quality: null, air_link_signal_strength: null, night_lights_state: null, rid_state: null, remote_id_status: null, obstacle_avoidance_downside: null, obstacle_avoidance_horizon: null, obstacle_avoidance_upside: null, zoom_factor: null, ai_enable_func: null, measure_target_error_state: null, measure_target_distance: null, measure_target_longitude: null, measure_target_latitude: null, measure_target_altitude: null, infrared_camera_average_temp: null, infrared_camera_center_temp: null, infrared_camera_cold_temp: null, infrared_camera_hot_temp: null, infrared_camera_touch_temp: null, infrared_camera_cold_x: null, infrared_camera_cold_y: null, infrared_camera_hot_x: null, infrared_camera_hot_y: null, infrared_camera_zoom_factor: null },
  'D-C-001': { ...baseTelemetry() }, // 未接入，遥测无意义但结构完整
  'D-C-002': { ...baseTelemetry(), mode_code: 9, alarm_status: 0, elevation: 31.5, height: 349.0, horizontal_speed: 6.2, vertical_speed: -1.5, home_distance: 210, battery_capacity_percent: 55, battery_remain_flight_time: 960, latitude: 13.689012, longitude: 14.023456 },
  'A-C-001': { ...baseTelemetry(), mode_code: 5, alarm_status: 0, elevation: 95.0, height: 420.3, horizontal_speed: 14.2, vertical_speed: 0.5, home_distance: 1240, battery_capacity_percent: 62, battery_remain_flight_time: 1200, latitude: 15.890123, longitude: 13.678901, measure_target_error_state: 1, measure_target_distance: 234.5, measure_target_longitude: 13.679012, measure_target_latitude: 15.891000, measure_target_altitude: 315.2 },
}
