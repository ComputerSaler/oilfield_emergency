/**
 * 反无记录 Mock 数据
 * 探测记录、入侵记录、反制记录
 */

// ============================ 探测记录 ============================

export interface DetectionRecord {
  id: string // 记录ID
  uav_id: string // 序列号
  uav_name: string // 无人机名称
  longitude: number // 经度
  trace_id: string // 轨迹ID
  latitude: number // 纬度
  frequency: number // 频率
  connectTime: string // 侦测结束时间
  start_time: string // 侦测开始时间
  device_id: string // 侦测设备ID
  device_name: string // 侦测设备名称
  uav_model: string // 无人机型号
  isWhiteList: string // 是否白名单：'是' | '否'
  duration: number // 持续时间（秒）
  createTime: string // 创建时间
}

export const DETECTION_RECORDS: DetectionRecord[] = [
  {
    id: 'DET-20260914-001',
    uav_id: 'UAV-E-8A9F2B3C',
    uav_name: 'Phantom 4 Pro',
    longitude: 2.6358,
    trace_id: 'TRACE-001-20260914',
    latitude: 13.3144,
    frequency: 2.4,
    connectTime: '2026-09-14T10:25:18Z',
    start_time: '2026-09-14T10:23:05Z',
    device_id: 'cuas-001',
    device_name: '东南角侦测',
    uav_model: 'DJI Phantom 4 Pro',
    isWhiteList: '否',
    duration: 133,
    createTime: '2026-09-14T10:25:18Z',
  },
  {
    id: 'DET-20260914-002',
    uav_id: 'UAV-E-7C4D1E8F',
    uav_name: 'Mavic 2 Enterprise',
    longitude: 2.6361,
    trace_id: 'TRACE-002-20260914',
    latitude: 13.3156,
    frequency: 5.8,
    connectTime: '2026-09-14T11:12:45Z',
    start_time: '2026-09-14T11:10:22Z',
    device_id: 'cuas-003',
    device_name: '西北角侦测',
    uav_model: 'DJI Mavic 2 Enterprise',
    isWhiteList: '否',
    duration: 143,
    createTime: '2026-09-14T11:12:45Z',
  },
  {
    id: 'DET-20260914-003',
    uav_id: 'UAV-F-M300RTK-01',
    uav_name: '己方巡检01',
    longitude: 2.6340,
    trace_id: 'TRACE-003-20260914',
    latitude: 13.3160,
    frequency: 5.8,
    connectTime: '2026-09-14T09:45:30Z',
    start_time: '2026-09-14T09:15:10Z',
    device_id: 'cuas-001',
    device_name: '东南角侦测',
    uav_model: 'DJI M300 RTK',
    isWhiteList: '是',
    duration: 1820,
    createTime: '2026-09-14T09:45:30Z',
  },
  {
    id: 'DET-20260914-004',
    uav_id: 'UAV-E-5B8C9A2D',
    uav_name: 'Autel EVO II',
    longitude: 2.1126,
    trace_id: 'TRACE-004-20260914',
    latitude: 13.5127,
    frequency: 2.4,
    connectTime: '2026-09-14T14:18:55Z',
    start_time: '2026-09-14T14:16:40Z',
    device_id: 'cuas-005',
    device_name: '主入口侦测',
    uav_model: 'Autel EVO II',
    isWhiteList: '否',
    duration: 135,
    createTime: '2026-09-14T14:18:55Z',
  },
  {
    id: 'DET-20260914-005',
    uav_id: 'UAV-E-3F7A4B1C',
    uav_name: '未知型号',
    longitude: 2.3756,
    trace_id: 'TRACE-005-20260914',
    latitude: 13.6428,
    frequency: 2.4,
    connectTime: '2026-09-14T16:32:10Z',
    start_time: '2026-09-14T16:28:45Z',
    device_id: 'cuas-008',
    device_name: '东门侦测',
    uav_model: '未知型号',
    isWhiteList: '否',
    duration: 205,
    createTime: '2026-09-14T16:32:10Z',
  },
]

// ============================ 入侵记录 ============================

export interface IntrusionRecord {
  id: string // ID
  Uavid: string // 序列号
  uav_name: string // 无人机名称
  Traceid: string // 轨迹ID
  uav_model: string // 无人机型号
  height: number // 高度（米）
  velocity: number // 速度（m/s）
  azimuth: number // 方位角（度）
  distance: number // 距离（米）
  yaw: number // 水平角度（度）
  Frequency: string // 频率
  StartFrom: string // 发现开始日期
  StartTime: string // 发现开始时间
  connectTime: string // 发现结束时间
  isWhiteList: string // 是否白名单：'是' | '否'
  AlarmLevel: number // 入侵等级：1-3
  Duration: number // 持续时间（秒）
}

export const INTRUSION_RECORDS: IntrusionRecord[] = [
  {
    id: 'INT-20260914-001',
    Uavid: 'UAV-E-8A9F2B3C',
    uav_name: 'Phantom 4 Pro',
    Traceid: 'TRACE-001-20260914',
    uav_model: 'DJI Phantom 4 Pro',
    height: 85,
    velocity: 12.5,
    azimuth: 145,
    distance: 650,
    yaw: 78,
    Frequency: '2.4GHz',
    StartFrom: '2026-09-14',
    StartTime: '10:23:05',
    connectTime: '2026-09-14T10:25:18Z',
    isWhiteList: '否',
    AlarmLevel: 2,
    Duration: 133,
  },
  {
    id: 'INT-20260914-002',
    Uavid: 'UAV-E-7C4D1E8F',
    uav_name: 'Mavic 2 Enterprise',
    Traceid: 'TRACE-002-20260914',
    uav_model: 'DJI Mavic 2 Enterprise',
    height: 120,
    velocity: 15.8,
    azimuth: 230,
    distance: 850,
    yaw: 102,
    Frequency: '5.8GHz',
    StartFrom: '2026-09-14',
    StartTime: '11:10:22',
    connectTime: '2026-09-14T11:12:45Z',
    isWhiteList: '否',
    AlarmLevel: 3,
    Duration: 143,
  },
  {
    id: 'INT-20260914-003',
    Uavid: 'UAV-E-5B8C9A2D',
    uav_name: 'Autel EVO II',
    Traceid: 'TRACE-004-20260914',
    uav_model: 'Autel EVO II',
    height: 95,
    velocity: 10.2,
    azimuth: 68,
    distance: 580,
    yaw: 45,
    Frequency: '2.4GHz',
    StartFrom: '2026-09-14',
    StartTime: '14:16:40',
    connectTime: '2026-09-14T14:18:55Z',
    isWhiteList: '否',
    AlarmLevel: 2,
    Duration: 135,
  },
  {
    id: 'INT-20260914-004',
    Uavid: 'UAV-E-3F7A4B1C',
    uav_name: '未知型号',
    Traceid: 'TRACE-005-20260914',
    uav_model: '未知型号',
    height: 150,
    velocity: 18.5,
    azimuth: 315,
    distance: 1200,
    yaw: 178,
    Frequency: '2.4GHz',
    StartFrom: '2026-09-14',
    StartTime: '16:28:45',
    connectTime: '2026-09-14T16:32:10Z',
    isWhiteList: '否',
    AlarmLevel: 3,
    Duration: 205,
  },
  {
    id: 'INT-20260913-001',
    Uavid: 'UAV-E-9D2F3C4A',
    uav_name: 'Phantom 3',
    Traceid: 'TRACE-006-20260913',
    uav_model: 'DJI Phantom 3',
    height: 60,
    velocity: 8.5,
    azimuth: 92,
    distance: 420,
    yaw: 22,
    Frequency: '2.4GHz',
    StartFrom: '2026-09-13',
    StartTime: '15:42:10',
    connectTime: '2026-09-13T15:44:25Z',
    isWhiteList: '否',
    AlarmLevel: 1,
    Duration: 135,
  },
]

// ============================ 反制记录 ============================

export interface CountermeasureRecord {
  id: string // 记录编号
  name: string // 反制类型：'手动反制' | '自动反制'
  source: string // 来源
  device_id: string // 反制设备ID
  device_name: string // 反制设备名称
  jammer_type: string // 反制方式
  createTime: string // 创建时间
  operator: string // 操作人
  record: string // 记录附件
  issuingInstructionTime: string // 下发指令时间
  executionTime: string // 指令执行时间
  Duration: number // 持续时间（秒）
  status: string // 执行状态：'是' | '否'
  Frequency: string // 反制频段
  Direction: number // 打击扇区：1-7
}

const DIRECTION_MAP: Record<number, string> = {
  1: '右后',
  2: '左后',
  3: '右后、左后',
  4: '前',
  5: '右后、前',
  6: '左后、前',
  7: '右后、左后、前',
}

export function getDirectionLabel(direction: number): string {
  return DIRECTION_MAP[direction] || '-'
}

export const COUNTERMEASURE_RECORDS: CountermeasureRecord[] = [
  {
    id: 'CNT-20260914-001',
    name: '自动反制',
    source: '反无系统',
    device_id: 'cuas-002',
    device_name: '东北角反制',
    jammer_type: '频率干扰',
    createTime: '2026-09-14T10:23:20Z',
    operator: '系统',
    record: '',
    issuingInstructionTime: '2026-09-14T10:23:20Z',
    executionTime: '2026-09-14T10:23:22Z',
    Duration: 145,
    status: '是',
    Frequency: '2.4GHz',
    Direction: 3,
  },
  {
    id: 'CNT-20260914-002',
    name: '手动反制',
    source: '监控中心',
    device_id: 'cuas-004',
    device_name: '西南角反制',
    jammer_type: '定向干扰',
    createTime: '2026-09-14T11:10:35Z',
    operator: '张三',
    record: '',
    issuingInstructionTime: '2026-09-14T11:10:35Z',
    executionTime: '2026-09-14T11:10:38Z',
    Duration: 230,
    status: '是',
    Frequency: '5.8GHz',
    Direction: 7,
  },
  {
    id: 'CNT-20260914-003',
    name: '自动反制',
    source: '反无系统',
    device_id: 'cuas-002',
    device_name: '东北角反制',
    jammer_type: '频率干扰',
    createTime: '2026-09-14T14:17:10Z',
    operator: '系统',
    record: '',
    issuingInstructionTime: '2026-09-14T14:17:10Z',
    executionTime: '2026-09-14T14:17:12Z',
    Duration: 135,
    status: '是',
    Frequency: '2.4GHz',
    Direction: 1,
  },
  {
    id: 'CNT-20260914-004',
    name: '手动反制',
    source: '监控中心',
    device_id: 'cuas-009',
    device_name: '西门反制',
    jammer_type: 'GPS干扰',
    createTime: '2026-09-14T16:29:05Z',
    operator: '李四',
    record: '',
    issuingInstructionTime: '2026-09-14T16:29:05Z',
    executionTime: '2026-09-14T16:29:08Z',
    Duration: 187,
    status: '是',
    Frequency: '2.4GHz / 5.8GHz',
    Direction: 5,
  },
  {
    id: 'CNT-20260914-005',
    name: '手动反制',
    source: '监控中心',
    device_id: 'cuas-004',
    device_name: '西南角反制',
    jammer_type: '定向干扰',
    createTime: '2026-09-14T17:45:30Z',
    operator: '王五',
    record: '',
    issuingInstructionTime: '2026-09-14T17:45:30Z',
    executionTime: '2026-09-14T17:45:33Z',
    Duration: 0,
    status: '否',
    Frequency: '2.4GHz',
    Direction: 4,
  },
]

// ============================ 字典选项 ============================

export const WHITE_LIST_OPTIONS = [
  { label: '全部', value: '' },
  { label: '是', value: '是' },
  { label: '否', value: '否' },
]

export const ALARM_LEVEL_OPTIONS = [
  { label: '全部等级', value: 0 },
  { label: '1级', value: 1 },
  { label: '2级', value: 2 },
  { label: '3级', value: 3 },
]

export const COUNTERMEASURE_TYPE_OPTIONS = [
  { label: '全部类型', value: '' },
  { label: '手动反制', value: '手动反制' },
  { label: '自动反制', value: '自动反制' },
]

export const STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '成功', value: '是' },
  { label: '失败', value: '否' },
]

// ============================ 入侵等级颜色 ============================

export function getAlarmLevelColor(level: number): string {
  const colorMap: Record<number, string> = {
    1: '#52c41a', // 绿色
    2: '#faad14', // 黄色
    3: '#ff4d4f', // 红色
  }
  return colorMap[level] || '#8c8c8c'
}

export function getAlarmLevelLabel(level: number): string {
  return `${level}级`
}

// ============================ 执行状态颜色 ============================

export function getStatusColor(status: string): string {
  return status === '是' ? '#52c41a' : '#8c8c8c'
}

export function getStatusLabel(status: string): string {
  return status === '是' ? '成功' : '失败'
}
