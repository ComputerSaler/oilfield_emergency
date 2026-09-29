/**
 * 无人机监控中心 - 组件类型定义
 */

// 预警/事件状态
export type AlertStatus = 'tracking' | 'closed' | 'pending'
export type EventStatus = 'processing' | 'resolved'

// 预警等级
export type AlertLevel = 'critical' | 'warning' | 'info'

// 事件等级
export type EventLevel = 'level_1' | 'level_2' | 'level_3' | 'level_4'

// 预警数据结构
export interface Alert {
  id: string
  type: 'alert'
  title: string
  level: AlertLevel
  status: AlertStatus
  time: string
  location: string
  description: string
  source?: string
  position?: { x: number; y: number }
}

// 事件数据结构
export interface Event {
  id: string
  type: 'event'
  title: string
  level: EventLevel
  status: EventStatus
  time: string
  location: string
  description: string
  source?: string
  position?: { x: number; y: number }
}

// 调度卡片数据
export interface DispatchCardData {
  alertId: string
  alertTitle: string
  pilot: string
  droneId: string
  taskType: string
  priority: string
  instructions: string
}

// 信息卡片数据
export interface InfoCard {
  visible: boolean
  type: 'drone' | 'alert'
  data: any
  position: { x: number; y: number }
}
