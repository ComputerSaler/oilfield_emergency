/**
 * 无人机数据类型定义
 * 对应 PRD §7.6 无人机设备字段定义
 */

/**
 * 无人机状态枚举
 */
export enum UavStatus {
  /** 在飞中 */
  Flying = 'flying',
  /** 可用（空闲） */
  Available = 'available',
  /** 充电中 */
  Charging = 'charging',
  /** 告警响应 */
  AlertResponse = 'alert_response',
  /** 伴飞中 */
  Escort = 'escort',
  /** 故障 */
  Fault = 'fault',
  /** 离线 */
  Offline = 'offline',
}

/**
 * 无人机类型枚举
 */
export enum UavClass {
  /** A类（长航时大载重） */
  ClassA = 'A',
  /** C类（近程机巢无人机） */
  ClassC = 'C',
}

/**
 * 任务类型枚举
 */
export enum TaskType {
  /** 巡逻任务 */
  Patrol = 'patrol',
  /** 告警响应 */
  AlertResponse = 'alert_response',
  /** 伴飞任务 */
  Escort = 'escort',
  /** 测绘任务 */
  Survey = 'survey',
  /** 应急任务 */
  Emergency = 'emergency',
}

/**
 * GPS坐标
 */
export interface Coordinates {
  /** 纬度 */
  lat: number
  /** 经度 */
  lng: number
  /** 海拔高度（米） */
  altitude?: number
}

/**
 * 无人机遥测数据
 */
export interface UavTelemetry {
  /** 电池电量（0-100） */
  battery: number
  /** 高度（米） - 相对起飞点高度 */
  altitude?: number
  /** 水平速度（m/s） */
  speed?: number
  /** 垂直速度（m/s） */
  verticalSpeed?: number
  /** 飞行时长（分钟） */
  flightTime?: number
  /** 剩余航程（公里） */
  remainingDistance?: number
  /** 当前位置 */
  position?: Coordinates
  /** 云台俯仰角（度，-90~90） */
  gimbalPitch?: number
  /** 云台横滚角（度，-180~180） */
  gimbalRoll?: number
  /** 云台航向角（度，0~360） */
  gimbalYaw?: number
  /** 最后更新时间 */
  updateTime: string
}

/**
 * 无人机设备接口
 */
export interface UavDevice {
  /** 设备唯一标识 */
  id: string
  /** 无人机名称 */
  name: string
  /** 设备序列号 */
  sn: string
  /** 无人机类型 */
  uavClass: UavClass
  /** 当前状态 */
  status: UavStatus
  /** 所属营地 */
  camp?: string
  /** 所属机巢（仅C类） */
  nest?: string
  /** 当前任务ID */
  task?: string
  /** 当前任务类型 */
  taskType?: TaskType
  /** 遥测数据 */
  telemetry: UavTelemetry
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/**
 * 无人机状态统计
 */
export interface UavStatusStats {
  /** 在飞中 */
  flying: number
  /** 可用 */
  available: number
  /** 充电中 */
  charging: number
  /** 告警响应 */
  alertResponse: number
  /** 伴飞中 */
  escort: number
  /** 故障 */
  fault: number
  /** 离线 */
  offline: number
  /** 总数 */
  total: number
}

/**
 * 无人机筛选条件
 */
export interface DroneFilterOptions {
  /** 营地筛选 */
  camps?: string[]
  /** 类型筛选 */
  uavClass?: UavClass | 'all'
  /** 状态筛选 */
  status?: UavStatus | 'all'
  /** 任务类型筛选 */
  taskType?: TaskType | 'all'
  /** 排序方式 */
  sort?: 'default' | 'battery' | 'distance'
}
