/**
 * 地图相关数据类型定义
 * 对应 PRD §4.2 地图图层规范
 */

import type { Coordinates } from './drone'

// 重新导出 Coordinates 以便其他模块使用
export type { Coordinates }

/**
 * 地图图层类型枚举
 */
export enum MapLayerType {
  /** 敏感区域 */
  SensitiveArea = 'sensitive_area',
  /** 无人机位置 */
  UavPosition = 'uav_position',
  /** 飞行轨迹 */
  Trajectory = 'trajectory',
  /** 预警事件 */
  AlertEvent = 'alert_event',
  /** 机巢位置 */
  Nest = 'nest',
  /** 营地边界 */
  CampBoundary = 'camp_boundary',
  /** 管道线路 */
  Pipeline = 'pipeline',
}

/**
 * 地图图层配置
 */
export interface MapLayer {
  /** 图层类型 */
  type: MapLayerType
  /** 图层名称 */
  name: string
  /** 是否可见 */
  visible: boolean
  /** 图层顺序（z-index） */
  zIndex: number
  /** 图层样式配置 */
  style?: Record<string, any>
}

/**
 * 地图标记类型
 */
export enum MarkerType {
  /** 无人机 */
  Drone = 'drone',
  /** 预警点 */
  Alert = 'alert',
  /** 事件点 */
  Event = 'event',
  /** 机巢 */
  Nest = 'nest',
  /** 营地 */
  Camp = 'camp',
}

/**
 * 地图标记接口
 */
export interface MapMarker {
  /** 标记唯一标识 */
  id: string
  /** 标记类型 */
  type: MarkerType
  /** 标记标题 */
  title: string
  /** 坐标位置 */
  position: Coordinates
  /** 图标URL或类型 */
  icon?: string
  /** 标记数据（关联的实体对象） */
  data?: any
  /** 是否高亮 */
  highlighted?: boolean
  /** 是否可点击 */
  clickable?: boolean
}

/**
 * 飞行轨迹点
 */
export interface TrajectoryPoint {
  /** 坐标 */
  position: Coordinates
  /** 时间戳 */
  timestamp: string
  /** 速度（m/s） */
  speed?: number
  /** 航向角（度） */
  heading?: number
}

/**
 * 飞行轨迹
 */
export interface Trajectory {
  /** 轨迹ID */
  id: string
  /** 无人机ID */
  droneId: string
  /** 轨迹点列表 */
  points: TrajectoryPoint[]
  /** 轨迹颜色 */
  color?: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime?: string
}

/**
 * 敏感区域类型
 */
export enum SensitiveAreaType {
  /** 禁飞区 */
  NoFlyZone = 'no_fly_zone',
  /** 限飞区 */
  RestrictedZone = 'restricted_zone',
  /** 重点防护区 */
  ProtectedZone = 'protected_zone',
}

/**
 * 敏感区域接口
 */
export interface SensitiveArea {
  /** 区域ID */
  id: string
  /** 区域名称 */
  name: string
  /** 区域类型 */
  type: SensitiveAreaType
  /** 区域边界坐标（多边形） */
  boundary: Coordinates[]
  /** 区域中心点 */
  center?: Coordinates
  /** 区域颜色 */
  color?: string
  /** 填充透明度 */
  fillOpacity?: number
  /** 描述 */
  description?: string
}

/**
 * 地图中心点与缩放级别
 */
export interface MapViewport {
  /** 中心点坐标 */
  center: Coordinates
  /** 缩放级别（1-20） */
  zoom: number
}

/**
 * 地图交互状态
 */
export interface MapInteractionState {
  /** 当前聚焦的无人机ID */
  focusedDroneId?: string
  /** 当前聚焦的预警/事件ID */
  focusedAlertId?: string
  /** 是否正在绘制区域 */
  isDrawing: boolean
  /** 是否正在测量距离 */
  isMeasuring: boolean
  /** 选中的标记ID列表 */
  selectedMarkers: string[]
}

/**
 * 地图配置选项
 */
export interface MapConfig {
  /** 初始中心点 */
  initialCenter: Coordinates
  /** 初始缩放级别 */
  initialZoom: number
  /** 最小缩放级别 */
  minZoom: number
  /** 最大缩放级别 */
  maxZoom: number
  /** 是否启用聚合 */
  clustering: boolean
  /** 是否启用热力图 */
  heatmap: boolean
  /** 地图主题 */
  theme?: 'dark' | 'light'
}

/**
 * 轨迹回放状态
 */
export interface PlaybackState {
  /** 是否正在播放 */
  isPlaying: boolean
  /** 当前播放进度（0-1） */
  progress: number
  /** 播放速度倍数 */
  speed: number
  /** 当前时间戳 */
  currentTime: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
}
