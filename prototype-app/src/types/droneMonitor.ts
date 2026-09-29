/**
 * 无人机监控中心类型定义（重新导出）
 * 为了向后兼容，从 drone.ts 和 alert.ts 重新导出类型
 */

export type { UavDevice as Drone, UavTelemetry, Coordinates } from './drone'
export type { Alert, Event, TimelineItem } from './alert'
export { UavStatus, UavClass, TaskType } from './drone'
export { AlertStatus, AlertLevel, EventStatus, EventLevel, AlertSourceType } from './alert'
