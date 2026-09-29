/**
 * 视频监控 Mock 数据
 * PRD: 实时监控中心（PC端）· 视频监控 V1.0
 *
 * 聚合 5 类设备，为设备树提供统一数据结构。
 * 原型阶段不接入真实视频流，Slot 内容用占位渲染。
 */

// ===================== 设备类型枚举 =====================

export type DeviceType = 'camera' | 'cctv' | 'nest' | 'cuav' | 'auav'

export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  camera: '高点摄像头',
  cctv: 'CCTV',
  nest: 'C类机巢',
  cuav: 'C类无人机',
  auav: 'A类无人机',
}

// ===================== 设备节点在线状态 =====================

/** 设备在线状态（统一枚举，屏蔽各类设备的差异字段名） */
export type DeviceOnlineStatus = 'online' | 'offline' | 'flying' | 'grounded'

/** 状态指示器颜色 */
export const STATUS_COLOR: Record<DeviceOnlineStatus, string> = {
  online:   '#52c41a',   // 绿
  offline:  '#ff4d4f',   // 红
  flying:   '#1677ff',   // 蓝
  grounded: '#8c8c8c',   // 灰
}

/** 状态文字标签 */
export const STATUS_LABEL: Record<DeviceOnlineStatus, string> = {
  online:   '在线',
  offline:  '离线',
  flying:   '飞行中',
  grounded: '地面待机',
}

// ===================== 统一设备节点 =====================

export interface VideoDevice {
  deviceId: string
  deviceName: string
  campId: string
  campName: string
  deviceType: DeviceType
  /** CCTV 专属：站点名称（第三层分组键） */
  siteName?: string
  status: DeviceOnlineStatus
  /** 无人机专属：上次飞行时间（ISO 8601） */
  lastFlightTime?: string
  /** 无人机专属：当前电量 % */
  batteryPercent?: number
}

// ===================== Mock 设备数据 =====================

export const MOCK_VIDEO_DEVICES: VideoDevice[] = [

  // ===== Koulele 营地 =====

  // 高点摄像头
  { deviceId: 'cam-k-01', deviceName: 'Koulele 东南高点', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'camera', status: 'online' },
  { deviceId: 'cam-k-02', deviceName: 'Koulele 西北高点', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'camera', status: 'offline' },

  // CCTV
  { deviceId: 'cctv-k-01', deviceName: 'Koulele 营地大门', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'cctv', siteName: '营地大门', status: 'online' },
  { deviceId: 'cctv-k-02', deviceName: 'Koulele 物资仓库', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'cctv', siteName: '物资仓库', status: 'online' },
  { deviceId: 'cctv-k-03', deviceName: 'Koulele 宿舍区A', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'cctv', siteName: '宿舍区', status: 'offline' },
  { deviceId: 'cctv-k-04', deviceName: 'Koulele 宿舍区B', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'cctv', siteName: '宿舍区', status: 'online' },

  // C类机巢
  { deviceId: 'nest-k-01', deviceName: 'Koulele_Nest（现场）', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'nest', status: 'online' },

  // C类无人机
  { deviceId: 'cuav-k-01', deviceName: 'M30T-Koulele-01', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'cuav', status: 'flying', batteryPercent: 78 },
  { deviceId: 'cuav-k-02', deviceName: 'M30T-Koulele-02', campId: 'Koulele', campName: 'Koulele 营地', deviceType: 'cuav', status: 'grounded', batteryPercent: 92, lastFlightTime: '2026-08-15T08:30:00Z' },

  // ===== Jaouro 营地 =====

  { deviceId: 'cam-j-01', deviceName: 'Jaouro 北侧高点', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'camera', status: 'online' },

  { deviceId: 'cctv-j-01', deviceName: 'Jaouro 营地大门', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'cctv', siteName: '营地大门', status: 'online' },
  { deviceId: 'cctv-j-02', deviceName: 'Jaouro 井场A东侧', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'cctv', siteName: '井场A', status: 'online' },
  { deviceId: 'cctv-j-03', deviceName: 'Jaouro 井场A西侧', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'cctv', siteName: '井场A', status: 'offline' },

  { deviceId: 'nest-j-01', deviceName: 'Jaouro 1号机巢', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'nest', status: 'online' },
  { deviceId: 'nest-j-02', deviceName: 'Jaouro 2号机巢', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'nest', status: 'offline' },

  { deviceId: 'cuav-j-01', deviceName: 'M30T-Jaouro-01', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'cuav', status: 'grounded', batteryPercent: 55, lastFlightTime: '2026-08-14T16:20:00Z' },

  // A类无人机（跨营地统一管理，归属 Jaouro）
  { deviceId: 'auav-01', deviceName: 'A-UAV-001（UAV-SN-001）', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'auav', status: 'flying', batteryPercent: 62 },
  { deviceId: 'auav-02', deviceName: 'A-UAV-002（UAV-SN-002）', campId: 'Jaouro', campName: 'Jaouro 营地', deviceType: 'auav', status: 'grounded', batteryPercent: 85, lastFlightTime: '2026-08-15T06:10:00Z' },

  // ===== Dibeilla 营地 =====

  { deviceId: 'cam-d-01', deviceName: 'Dibeilla 南侧高点', campId: 'Dibeilla', campName: 'Dibeilla 营地', deviceType: 'camera', status: 'online' },

  { deviceId: 'cctv-d-01', deviceName: 'Dibeilla 周界监控', campId: 'Dibeilla', campName: 'Dibeilla 营地', deviceType: 'cctv', siteName: '周界巡逻', status: 'online' },
  { deviceId: 'cctv-d-02', deviceName: 'Dibeilla 物资存放点', campId: 'Dibeilla', campName: 'Dibeilla 营地', deviceType: 'cctv', siteName: '物资仓库', status: 'online' },

  { deviceId: 'nest-d-01', deviceName: 'Dibeilla 1号机巢', campId: 'Dibeilla', campName: 'Dibeilla 营地', deviceType: 'nest', status: 'online' },

  { deviceId: 'cuav-d-01', deviceName: 'M30T-Dibeilla-01', campId: 'Dibeilla', campName: 'Dibeilla 营地', deviceType: 'cuav', status: 'grounded', batteryPercent: 100, lastFlightTime: '2026-08-13T12:00:00Z' },
]
