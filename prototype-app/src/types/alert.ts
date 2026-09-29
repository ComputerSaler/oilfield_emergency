/**
 * 预警与事件数据类型定义
 * 对应 PRD §7.1 预警字段定义 & §7.2 事件字段定义
 */

import type { Coordinates } from './drone'

// 重新导出 Coordinates 以便其他模块使用
export type { Coordinates }

/**
 * 预警等级枚举
 */
export enum AlertLevel {
  /** 高危 */
  High = 'high',
  /** 中危 */
  Medium = 'medium',
  /** 低危 */
  Low = 'low',
}

/**
 * 预警状态枚举
 */
export enum AlertStatus {
  /** 待处理 */
  Pending = 'pending',
  /** 核实中 */
  Verifying = 'verifying',
  /** 持续跟踪中 */
  Tracking = 'tracking',
  /** 已关闭 */
  Closed = 'closed',
  /** 已升级为事件 */
  Escalated = 'escalated',
}

/**
 * 事件等级枚举（对应应急响应分级）
 */
export enum EventLevel {
  /** Ⅰ级（特别重大） */
  Level1 = 'level_1',
  /** Ⅱ级（重大） */
  Level2 = 'level_2',
  /** Ⅲ级（较大） */
  Level3 = 'level_3',
  /** Ⅳ级（一般） */
  Level4 = 'level_4',
}

/**
 * 事件状态枚举
 */
export enum EventStatus {
  /** 待响应 */
  Pending = 'pending',
  /** 处置中 */
  Handling = 'handling',
  /** 已控制 */
  Controlled = 'controlled',
  /** 已结束 */
  Finished = 'finished',
}

/**
 * 预警来源类型
 */
export enum AlertSourceType {
  /** AI识别 */
  AI = 'ai',
  /** 雷达光电 */
  Radar = 'radar',
  /** 人工上报 */
  Manual = 'manual',
  /** 系统监测 */
  System = 'system',
}

/**
 * 预警接口
 */
export interface Alert {
  /** 预警唯一标识 */
  id: string
  /** 类型标识（用于UI区分） */
  type: 'alert'
  /** 预警等级 */
  level: AlertLevel
  /** 预警标题 */
  title: string
  /** 预警描述 */
  description?: string
  /** 发生时间 */
  time: string
  /** 当前状态 */
  status: AlertStatus
  /** 来源系统/设备 */
  source: string
  /** 来源类型 */
  sourceType?: AlertSourceType
  /** 发生位置（文本） */
  location: string
  /** GPS坐标 */
  coords?: Coordinates
  /** 关联图片URL */
  imageUrl?: string
  /** 关联视频URL */
  videoUrl?: string
  /** 推荐调度的无人机ID列表 */
  recommendedDrones?: string[]
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/**
 * 事件接口
 */
export interface Event {
  /** 事件唯一标识 */
  id: string
  /** 类型标识（用于UI区分） */
  type: 'event'
  /** 事件等级 */
  level: EventLevel
  /** 事件标题 */
  title: string
  /** 事件描述 */
  description?: string
  /** 发生时间 */
  time: string
  /** 当前状态 */
  status: EventStatus
  /** 来源（通常为"预警升级"） */
  source: string
  /** 升级来源的预警ID */
  sourceAlertId?: string
  /** 发生位置（文本） */
  location: string
  /** GPS坐标 */
  coords?: Coordinates
  /** 响应人员ID列表 */
  responders?: string[]
  /** 调度无人机ID列表 */
  dispatchedDrones?: string[]
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/**
 * 处置记录时间线项
 */
export interface TimelineItem {
  /** 记录ID */
  id: string
  /** 操作时间 */
  time: string
  /** 操作类型 */
  action: string
  /** 操作内容 */
  content: string
  /** 操作人 */
  operator?: string
}

/**
 * 预警统计
 */
export interface AlertStats {
  /** 今日预警总数 */
  todayTotal: number
  /** 今日高危预警 */
  todayHigh: number
  /** 今日中危预警 */
  todayMedium: number
  /** 今日低危预警 */
  todayLow: number
  /** 待处理预警 */
  pending: number
  /** 持续跟踪中预警 */
  tracking: number
}

/**
 * 事件统计
 */
export interface EventStats {
  /** 今日事件总数 */
  todayTotal: number
  /** 处置中事件 */
  handling: number
  /** Ⅰ级事件数 */
  level1: number
  /** Ⅱ级事件数 */
  level2: number
  /** Ⅲ级事件数 */
  level3: number
  /** Ⅳ级事件数 */
  level4: number
}

/**
 * 预警/事件筛选条件
 */
export interface AlertEventFilterOptions {
  /** 类型筛选 */
  type?: 'all' | 'alert' | 'event'
  /** 状态筛选（多选） */
  status?: string[]
  /** 时间范围 */
  timeRange?: 'today' | 'week' | 'month' | 'all'
  /** 等级筛选 */
  level?: AlertLevel | EventLevel | 'all'
}

/**
 * 推荐无人机信息
 */
export interface RecommendedDrone {
  /** 无人机ID */
  id: string
  /** 无人机名称 */
  name: string
  /** 距离预警点距离（km） */
  distance: number
  /** 预计到达时间（分钟） */
  eta: number
  /** 电量 */
  battery: number
  /** 推荐理由 */
  reason: string
}
