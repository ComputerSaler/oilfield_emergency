/**
 * 反无系统实况 Mock 数据
 */

export interface CounterUasDevice {
  id: string
  name: string
  device_type: 'detect' | 'counteract' // 当前工作模式：侦测 | 反制
  status: 'detecting' | 'striking' | 'offline' // 设备状态：探测中 | 打击中 | 离线
  current_targets: number // 当前探测到的目标数量
  camp: string
  model: string
  latitude: number
  longitude: number
  frequency: string // 工作频率
  gps_satellites: number
  temperature: number
  calibration_angle: number
  // 今日统计
  today_detection_count: number // 当日探测次数
  today_warning_count: number // 当日预警次数
  today_intrusion_count: number // 当日入侵次数
  // 反制方式（仅反制设备有）
  counteract_mode?: 'auto' | 'manual'
  // 反制设备专属字段
  strike_mode?: ('expel' | 'force_land')[] // 打击模式：['expel', 'force_land'] 可多选
  strike_duration?: number // 持续时间（秒）
  strike_power?: number // 反制功率（百分比 0-100）
  // 最后通信时间
  last_communication_time: string // ISO时间格式
}

export const COUNTER_UAS_REALTIME_DATA: CounterUasDevice[] = [
  {
    id: 'cuas-001',
    name: '东南角侦测',
    device_type: 'detect',
    status: 'detecting',
    current_targets: 2,
    camp: 'Koulele',
    model: 'DJI Aeroscope G-16',
    latitude: 13.3144,
    longitude: 2.6358,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 12,
    temperature: 42,
    calibration_angle: 0,
    today_detection_count: 28,
    today_warning_count: 12,
    today_intrusion_count: 3,
    last_communication_time: '2026-09-10T08:45:23Z',
  },
  {
    id: 'cuas-002',
    name: '东北角反制',
    device_type: 'counteract',
    status: 'striking',
    current_targets: 1,
    camp: 'Koulele',
    model: 'DJI Aeroscope G-16',
    latitude: 13.3156,
    longitude: 2.6361,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 11,
    temperature: 45,
    calibration_angle: 15,
    today_detection_count: 15,
    today_warning_count: 8,
    today_intrusion_count: 5,
    counteract_mode: 'auto',
    strike_mode: ['expel', 'force_land'],
    strike_duration: 145,
    strike_power: 85,
    last_communication_time: '2026-09-10T08:45:18Z',
  },
  {
    id: 'cuas-003',
    name: '西北角侦测',
    device_type: 'detect',
    status: 'detecting',
    current_targets: 3,
    camp: 'Koulele',
    model: 'DJI Aeroscope G-16',
    latitude: 13.3160,
    longitude: 2.6340,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 13,
    temperature: 40,
    calibration_angle: 0,
    today_detection_count: 42,
    today_warning_count: 18,
    today_intrusion_count: 7,
    last_communication_time: '2026-09-10T08:45:20Z',
  },
  {
    id: 'cuas-004',
    name: '西南角反制',
    device_type: 'counteract',
    status: 'striking',
    current_targets: 2,
    camp: 'Koulele',
    model: 'Nemesis Portable',
    latitude: 13.3142,
    longitude: 2.6342,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 10,
    temperature: 38,
    calibration_angle: 0,
    today_detection_count: 31,
    today_warning_count: 14,
    today_intrusion_count: 4,
    counteract_mode: 'manual',
    strike_mode: ['force_land'],
    strike_duration: 230,
    strike_power: 92,
    last_communication_time: '2026-09-10T08:45:15Z',
  },
  {
    id: 'cuas-005',
    name: '主入口侦测',
    device_type: 'detect',
    status: 'detecting',
    current_targets: 4,
    camp: 'Dibeilla',
    model: 'DJI Aeroscope G-16',
    latitude: 13.5127,
    longitude: 2.1126,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 14,
    temperature: 41,
    calibration_angle: 0,
    today_detection_count: 56,
    today_warning_count: 22,
    today_intrusion_count: 9,
    last_communication_time: '2026-09-10T08:45:22Z',
  },
  {
    id: 'cuas-006',
    name: '北侧围栏反制',
    device_type: 'counteract',
    status: 'detecting',
    current_targets: 0,
    camp: 'Dibeilla',
    model: 'Nemesis Portable',
    latitude: 13.5145,
    longitude: 2.1128,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 12,
    temperature: 43,
    calibration_angle: 0,
    today_detection_count: 8,
    today_warning_count: 2,
    today_intrusion_count: 0,
    counteract_mode: 'auto',
    strike_mode: ['expel'],
    strike_duration: 0,
    strike_power: 0,
    last_communication_time: '2026-09-10T08:45:19Z',
  },
  {
    id: 'cuas-007',
    name: '南侧围栏侦测',
    device_type: 'detect',
    status: 'offline',
    current_targets: 0,
    camp: 'Dibeilla',
    model: 'DJI Aeroscope G-16',
    latitude: 13.5110,
    longitude: 2.1130,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 0,
    temperature: 0,
    calibration_angle: 0,
    today_detection_count: 0,
    today_warning_count: 0,
    today_intrusion_count: 0,
    last_communication_time: '2026-09-10T07:32:45Z',
  },
  {
    id: 'cuas-008',
    name: '东门侦测',
    device_type: 'detect',
    status: 'detecting',
    current_targets: 5,
    camp: 'Goumeri',
    model: 'DJI Aeroscope G-16',
    latitude: 13.6428,
    longitude: 2.3756,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 11,
    temperature: 39,
    calibration_angle: 0,
    today_detection_count: 67,
    today_warning_count: 28,
    today_intrusion_count: 11,
    last_communication_time: '2026-09-10T08:45:21Z',
  },
  {
    id: 'cuas-009',
    name: '西门反制',
    device_type: 'counteract',
    status: 'striking',
    current_targets: 2,
    camp: 'Goumeri',
    model: 'Nemesis Portable',
    latitude: 13.6425,
    longitude: 2.3740,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 13,
    temperature: 37,
    calibration_angle: 0,
    today_detection_count: 38,
    today_warning_count: 16,
    today_intrusion_count: 6,
    counteract_mode: 'manual',
    strike_mode: ['force_land'],
    strike_duration: 187,
    strike_power: 78,
    last_communication_time: '2026-09-10T08:45:17Z',
  },
  {
    id: 'cuas-010',
    name: '中心侦测',
    device_type: 'detect',
    status: 'detecting',
    current_targets: 3,
    camp: 'Jaouro',
    model: 'DJI Aeroscope G-16',
    latitude: 13.4500,
    longitude: 2.5000,
    frequency: '2.4GHz / 5.8GHz',
    gps_satellites: 15,
    temperature: 44,
    calibration_angle: 0,
    today_detection_count: 45,
    today_warning_count: 19,
    today_intrusion_count: 8,
    last_communication_time: '2026-09-10T08:45:24Z',
  },
]

export const CAMP_OPTIONS = [
  { label: '全部区域', value: 'all' },
  { label: 'Koulele', value: 'Koulele' },
  { label: 'Dibeilla', value: 'Dibeilla' },
  { label: 'Goumeri', value: 'Goumeri' },
  { label: 'Jaouro', value: 'Jaouro' },
]

export const DEVICE_TYPE_OPTIONS = [
  { label: '全部模式', value: 'all' },
  { label: '侦测', value: 'detect' },
  { label: '反制', value: 'counteract' },
]

export const STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '探测中', value: 'detecting' },
  { label: '打击中', value: 'striking' },
  { label: '离线', value: 'offline' },
]

export const STATUS_COLOR_MAP: Record<string, string> = {
  detecting: '#52c41a', // 绿色 - 探测中
  striking: '#ff4d4f', // 红色 - 打击中
  offline: '#8c8c8c', // 灰色 - 离线
}

export const STATUS_TEXT_MAP: Record<string, string> = {
  detecting: '探测中',
  striking: '打击中',
  offline: '离线',
}
