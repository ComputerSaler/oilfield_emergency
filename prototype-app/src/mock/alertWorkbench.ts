/**
 * 预警工作台 Mock 数据
 * 对应 PRD-预警管理-预警工作台 V1.0
 */

// ==================== 枚举 ====================

export type AlertStatus =
  | 'pending_verify'   // 待核实
  | 'pending_decision' // 待决策
  | 'tracking'         // 持续跟踪中
  | 'false_alarm'      // 误报关闭
  | 'merged'           // 已合并
  | 'resolved'         // 已解除
  | 'escalated'        // 已升级

export type AlertUrgency = 'urgent' | 'normal'

export type AlertSourceType =
  | 'anti_uav'   // 反无设备
  | 'high_cam'   // 高点摄像头
  | 'cctv'       // CCTV
  | 'c_uav'      // C类无人机
  | 'vehicle'    // 车辆/手持
  | 'app_report' // App上报
  | 'manual'     // 值班员代录

export type AlertCategory =
  | '入侵'
  | '无人机威胁'
  | '设备告警'
  | '人员求助'
  | '车辆异常'
  | '自然灾害'
  | '治安事件'

// ==================== 主数据结构 ====================

export interface AlertRecord {
  alert_id: string
  alert_no: string          // YJ-yyyyMMdd-NNNN
  alert_name: string
  alert_type_code: string
  alert_type_name: string
  alert_category: AlertCategory
  urgency: AlertUrgency
  status: AlertStatus
  source_type: AlertSourceType
  source_device_name: string
  camp_name: string
  camp_outside_meters: number | null  // null = 营地内
  location_lat: number | null
  location_lng: number | null
  created_at: string
  last_trigger_at: string
  trigger_count: number
  // 核实相关
  verification_result: 'real' | 'unconfirmed' | null
  verification_at: string | null
  verified_by: string | null
  // 决策相关
  decision_by: string | null
  decision_at: string | null
  resolution_reason: string | null
  false_alarm_reason: string | null
  // 升级/合并
  escalated_event_id: string | null
  merged_into_alert_id: string | null
  // 跟踪
  last_review_at: string | null
  // 周边资源快照（仅后台统计用，前端不展示）
  resource_snapshot: {
    cameras_online: number
    high_cam_aimed: boolean
    drones_available: number
  }
}

export interface TimelineItem {
  id: string
  time: string
  category: 'system' | 'verify' | 'decision' | 'external'
  action: string
  content: string
  operator?: string
}

// ==================== 周边资源数据结构 ====================

export interface CameraDevice {
  id: string
  name: string
  type: 'high_point' | 'cctv'
  lat: number
  lng: number
  online: boolean
  // 高点摄像头特有
  aimed?: boolean  // 是否已对准预警点
  azimuth?: number // 方位角（0-360度）
  channels?: ('visible' | 'thermal')[]  // 通道
  effectiveRange?: number  // 有效监视距离（米）
}

export interface DroneDevice {
  id: string
  name: string
  type: 'a_class' | 'c_class'
  lat: number | null  // null = 位置为驻地
  lng: number | null
  status: 'standby' | 'charging' | 'mission' | 'alert_response' | 'fault' | 'offline'
  battery: number  // 电量百分比
  camp: string
}

export interface NestDevice {
  id: string
  name: string
  lat: number
  lng: number
  online: boolean
  hatchOpen: boolean
  drones: string[]  // 停放的无人机名称列表
}

export interface AntiUavTarget {
  id: string
  lat: number
  lng: number
  type: 'unknown' | 'whitelist' | 'suspected_ours'
  // whitelist 专有
  authCode?: string
  authNote?: string
  // suspected_ours 专有
  nearbyDrone?: string
  distance?: number
  timeDiff?: number  // 秒
  // 通用
  altitude?: number
  speed?: number
}

export interface VehicleDevice {
  id: string
  plate: string
  lat: number
  lng: number
  online: boolean
  status: string
  heading: number  // 方向角 0-360
  speed: number
}

// ==================== Mock 数据 ====================

const now = new Date()
function minsAgo(m: number) {
  return new Date(now.getTime() - m * 60 * 1000).toISOString()
}
function hoursAgo(h: number) {
  return minsAgo(h * 60)
}

export const ALERT_RECORDS: AlertRecord[] = [
  // ── 待核实·紧急·超时 ──────────────────────────────────
  {
    alert_id: 'a001',
    alert_no: 'YJ-20260926-0001',
    alert_name: 'Jaouro营地·无人机入侵',
    alert_type_code: 'uav_intrusion',
    alert_type_name: '无人机入侵',
    alert_category: '无人机威胁',
    urgency: 'urgent',
    status: 'pending_verify',
    source_type: 'anti_uav',
    source_device_name: '反无-Jaouro-01',
    camp_name: 'Jaouro',
    camp_outside_meters: null,
    location_lat: 13.3148,
    location_lng: 2.6352,
    created_at: minsAgo(12),
    last_trigger_at: minsAgo(8),
    trigger_count: 3,
    verification_result: null,
    verification_at: null,
    verified_by: null,
    decision_by: null,
    decision_at: null,
    resolution_reason: null,
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 2, high_cam_aimed: true, drones_available: 1 },
  },
  // ── 待核实·紧急·剩余时间少 ──────────────────────────────
  {
    alert_id: 'a002',
    alert_no: 'YJ-20260926-0002',
    alert_name: 'Koulele营地·区域入侵',
    alert_type_code: 'area_intrusion',
    alert_type_name: '区域入侵',
    alert_category: '入侵',
    urgency: 'urgent',
    status: 'pending_verify',
    source_type: 'high_cam',
    source_device_name: '高点-Koulele-东南',
    camp_name: 'Koulele',
    camp_outside_meters: null,
    location_lat: 13.3152,
    location_lng: 2.6348,
    created_at: minsAgo(3),
    last_trigger_at: minsAgo(3),
    trigger_count: 1,
    verification_result: null,
    verification_at: null,
    verified_by: null,
    decision_by: null,
    decision_at: null,
    resolution_reason: null,
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 3, high_cam_aimed: false, drones_available: 2 },
  },
  // ── 待核实·一般 ──────────────────────────────────────────
  {
    alert_id: 'a003',
    alert_no: 'YJ-20260926-0003',
    alert_name: 'Dibeilla营地·设备离线告警',
    alert_type_code: 'device_offline',
    alert_type_name: '设备离线',
    alert_category: '设备告警',
    urgency: 'normal',
    status: 'pending_verify',
    source_type: 'cctv',
    source_device_name: 'CCTV-Dibeilla-北门',
    camp_name: 'Dibeilla',
    camp_outside_meters: null,
    location_lat: 13.5122,
    location_lng: 2.1124,
    created_at: minsAgo(18),
    last_trigger_at: minsAgo(18),
    trigger_count: 1,
    verification_result: null,
    verification_at: null,
    verified_by: null,
    decision_by: null,
    decision_at: null,
    resolution_reason: null,
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 0, high_cam_aimed: false, drones_available: 1 },
  },
  // ── 待核实·紧急 ─────────────────────────
  {
    alert_id: 'a004',
    alert_no: 'YJ-20260926-0004',
    alert_name: 'Jaouro营地·无人机侦察',
    alert_type_code: 'uav_recon',
    alert_type_name: '无人机侦察',
    alert_category: '无人机威胁',
    urgency: 'urgent',
    status: 'pending_verify',
    source_type: 'c_uav',
    source_device_name: 'C类-Jaouro-03',
    camp_name: 'Jaouro',
    camp_outside_meters: null,
    location_lat: 13.3150,
    location_lng: 2.6355,
    created_at: minsAgo(7),
    last_trigger_at: minsAgo(7),
    trigger_count: 1,
    verification_result: null,
    verification_at: null,
    verified_by: null,
    decision_by: null,
    decision_at: null,
    resolution_reason: null,
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 2, high_cam_aimed: true, drones_available: 1 },
  },
  // ── 待决策·紧急 ─────────────────────────────────────────
  {
    alert_id: 'a005',
    alert_no: 'YJ-20260926-0005',
    alert_name: 'Goumeri营地·越界侦测',
    alert_type_code: 'fence_breach',
    alert_type_name: '越界侦测',
    alert_category: '入侵',
    urgency: 'urgent',
    status: 'pending_decision',
    source_type: 'high_cam',
    source_device_name: '高点-Goumeri-西门',
    camp_name: 'Goumeri',
    camp_outside_meters: null,
    location_lat: 13.6426,
    location_lng: 2.3748,
    created_at: minsAgo(35),
    last_trigger_at: minsAgo(35),
    trigger_count: 2,
    verification_result: 'real',
    verification_at: minsAgo(25),
    verified_by: '王力',
    decision_by: null,
    decision_at: null,
    resolution_reason: null,
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 1, high_cam_aimed: false, drones_available: 2 },
  },
  // ── 待决策·一般 ─────────────────────────────────────────
  {
    alert_id: 'a006',
    alert_no: 'YJ-20260926-0006',
    alert_name: 'Sokor营地·周界徘徊',
    alert_type_code: 'perimeter_loiter',
    alert_type_name: '周界徘徊',
    alert_category: '入侵',
    urgency: 'normal',
    status: 'pending_decision',
    source_type: 'cctv',
    source_device_name: 'CCTV-Sokor-南门',
    camp_name: 'Sokor',
    camp_outside_meters: 80,
    location_lat: 13.7203,
    location_lng: 2.5012,
    created_at: minsAgo(52),
    last_trigger_at: minsAgo(52),
    trigger_count: 1,
    verification_result: 'unconfirmed',
    verification_at: minsAgo(40),
    verified_by: '李华',
    decision_by: null,
    decision_at: null,
    resolution_reason: null,
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 2, high_cam_aimed: false, drones_available: 0 },
  },
  // ── 持续跟踪中（复核到期） ───────────────────────────────
  {
    alert_id: 'a007',
    alert_no: 'YJ-20260925-0017',
    alert_name: 'Jaouro营地·可疑人员',
    alert_type_code: 'suspicious_person',
    alert_type_name: '可疑人员',
    alert_category: '治安事件',
    urgency: 'normal',
    status: 'tracking',
    source_type: 'app_report',
    source_device_name: 'App上报',
    camp_name: 'Jaouro',
    camp_outside_meters: 320,
    location_lat: 13.3165,
    location_lng: 2.6340,
    created_at: hoursAgo(26),
    last_trigger_at: hoursAgo(26),
    trigger_count: 1,
    verification_result: 'unconfirmed',
    verification_at: hoursAgo(25),
    verified_by: '王力',
    decision_by: '张志远',
    decision_at: hoursAgo(24),
    resolution_reason: null,
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: hoursAgo(24),
    resource_snapshot: { cameras_online: 1, high_cam_aimed: false, drones_available: 2 },
  },
  // ── 已结束·误报 ─────────────────────────────────────────
  {
    alert_id: 'a008',
    alert_no: 'YJ-20260926-0008',
    alert_name: 'Koulele营地·无人机入侵',
    alert_type_code: 'uav_intrusion',
    alert_type_name: '无人机入侵',
    alert_category: '无人机威胁',
    urgency: 'urgent',
    status: 'false_alarm',
    source_type: 'anti_uav',
    source_device_name: '反无-Koulele-02',
    camp_name: 'Koulele',
    camp_outside_meters: null,
    location_lat: 13.3155,
    location_lng: 2.6344,
    created_at: hoursAgo(3),
    last_trigger_at: hoursAgo(3),
    trigger_count: 1,
    verification_result: null,
    verification_at: hoursAgo(2.8),
    verified_by: '李华',
    decision_by: null,
    decision_at: null,
    resolution_reason: null,
    false_alarm_reason: '己方目标',
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 3, high_cam_aimed: true, drones_available: 2 },
  },
  // ── 已结束·已解除 ───────────────────────────────────────
  {
    alert_id: 'a009',
    alert_no: 'YJ-20260926-0009',
    alert_name: 'Goumeri营地·设备离线告警',
    alert_type_code: 'device_offline',
    alert_type_name: '设备离线',
    alert_category: '设备告警',
    urgency: 'normal',
    status: 'resolved',
    source_type: 'cctv',
    source_device_name: 'CCTV-Goumeri-东门',
    camp_name: 'Goumeri',
    camp_outside_meters: null,
    location_lat: 13.6430,
    location_lng: 2.3758,
    created_at: hoursAgo(5),
    last_trigger_at: hoursAgo(5),
    trigger_count: 1,
    verification_result: 'real',
    verification_at: hoursAgo(4.8),
    verified_by: '王力',
    decision_by: '张志远',
    decision_at: hoursAgo(4.5),
    resolution_reason: '风险已消除',
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 1, high_cam_aimed: false, drones_available: 1 },
  },
  // ── 待核实·一般·待定位（值班员代录，未填位置） ───────────
  {
    alert_id: 'a010',
    alert_no: 'YJ-20260926-0010',
    alert_name: 'Dibeilla营地·可疑人员',
    alert_type_code: 'suspicious_person',
    alert_type_name: '可疑人员',
    alert_category: '治安事件',
    urgency: 'normal',
    status: 'pending_verify',
    source_type: 'manual',
    source_device_name: '值班员代录',
    camp_name: 'Dibeilla',
    camp_outside_meters: null,
    location_lat: null,
    location_lng: null,
    created_at: minsAgo(18),
    last_trigger_at: minsAgo(18),
    trigger_count: 1,
    verification_result: null,
    verification_at: null,
    verified_by: null,
    decision_by: null,
    decision_at: null,
    resolution_reason: null,
    false_alarm_reason: null,
    escalated_event_id: null,
    merged_into_alert_id: null,
    last_review_at: null,
    resource_snapshot: { cameras_online: 0, high_cam_aimed: false, drones_available: 1 },
  },
]

// ==================== 时间线 Mock ====================

export const ALERT_TIMELINES: Record<string, TimelineItem[]> = {
  a001: [
    { id: 't1', time: minsAgo(12), category: 'system', action: '预警生成', content: '反无设备推送入侵告警，自动生成预警' },
    { id: 't2', time: minsAgo(9), category: 'system', action: '合并触发', content: '追加第 2 条反无告警，触发次数 +1' },
    { id: 't3', time: minsAgo(8), category: 'system', action: '合并触发', content: '追加第 3 条反无告警，触发次数 +1' },
  ],
  a005: [
    { id: 't1', time: minsAgo(35), category: 'system', action: '预警生成', content: '高点摄像头 AI 识别到越界目标，自动生成预警' },
    { id: 't5', time: minsAgo(25), category: 'verify', action: '提交核实结论', content: '王力 核实结论：真实。围界处发现1名男性，持棍徘徊', operator: '王力' },
    { id: 't6', time: minsAgo(24), category: 'system', action: '进入待决策', content: '核实完成，等待负责人决策' },
  ],
  a007: [
    { id: 't1', time: hoursAgo(26), category: 'system', action: '预警生成', content: '一线人员 App 上报可疑人员' },
    { id: 't2', time: hoursAgo(25), category: 'verify', action: '提交核实结论', content: '王力 核实结论：无法确认。目标已不在原位，无法确认威胁', operator: '王力' },
    { id: 't3', time: hoursAgo(24), category: 'decision', action: '持续跟踪', content: '张志远 决定持续跟踪。初始跟踪说明：围界外人员下午起多次出现，保持关注', operator: '张志远' },
    { id: 't4', time: hoursAgo(12), category: 'decision', action: '追加跟踪记录', content: '张志远 追加跟踪记录：巡逻车确认围界外约500m有2人，暂无入侵行为', operator: '张志远' },
  ],
}

// ==================== 辅助函数 ====================

/** 来源类型标签 */
export const SOURCE_LABEL: Record<AlertSourceType, string> = {
  anti_uav: '反无设备',
  high_cam: '高点摄像头',
  cctv: 'CCTV',
  c_uav: 'C类无人机',
  vehicle: '车辆/手持',
  app_report: 'App上报',
  manual: '值班员代录',
}

/** 状态标签 */
export const STATUS_LABEL: Record<AlertStatus, string> = {
  pending_verify: '待核实',
  pending_decision: '待决策',
  tracking: '持续跟踪中',
  false_alarm: '误报关闭',
  merged: '已合并',
  resolved: '已解除',
  escalated: '已升级',
}

// ==================== 周边资源 Mock 数据 ====================

/** 预警 a001 (Jaouro营地) 周边摄像头 */
export const NEARBY_CAMERAS: Record<string, CameraDevice[]> = {
  a001: [
    {
      id: 'cam-h1',
      name: '高点-Jaouro-东南',
      type: 'high_point',
      lat: 13.5142,
      lng: 2.1125,
      online: true,
      aimed: true,
      azimuth: 225,
      channels: ['visible', 'thermal'],
      effectiveRange: 500,
    },
    {
      id: 'cam-h2',
      name: '高点-Jaouro-西北',
      type: 'high_point',
      lat: 13.5158,
      lng: 2.1095,
      online: true,
      aimed: false,
      azimuth: 90,
      channels: ['visible', 'thermal'],
      effectiveRange: 500,
    },
    {
      id: 'cam-c1',
      name: 'CCTV-Jaouro-主门',
      type: 'cctv',
      lat: 13.5148,
      lng: 2.1102,
      online: true,
    },
    {
      id: 'cam-c2',
      name: 'CCTV-Jaouro-仓库',
      type: 'cctv',
      lat: 13.5138,
      lng: 2.1118,
      online: true,
    },
    {
      id: 'cam-h3',
      name: '高点-Jaouro-东北',
      type: 'high_point',
      lat: 13.5165,
      lng: 2.1135,
      online: false,
      aimed: false,
      azimuth: 0,
      channels: ['visible'],
      effectiveRange: 500,
    },
  ],
}

/** 周边无人机 */
export const NEARBY_DRONES: Record<string, DroneDevice[]> = {
  a001: [
    {
      id: 'drone-c1',
      name: 'C类-03',
      type: 'c_class',
      lat: 13.5145,
      lng: 2.1108,
      status: 'standby',
      battery: 85,
      camp: 'Jaouro',
    },
    {
      id: 'drone-c2',
      name: 'C类-05',
      type: 'c_class',
      lat: null,
      lng: null,
      status: 'charging',
      battery: 42,
      camp: 'Jaouro',
    },
    {
      id: 'drone-a1',
      name: 'A类-01',
      type: 'a_class',
      lat: 13.5152,
      lng: 2.1122,
      status: 'mission',
      battery: 68,
      camp: 'Jaouro',
    },
  ],
}

/** 周边机巢 */
export const NEARBY_NESTS: Record<string, NestDevice[]> = {
  a001: [
    {
      id: 'nest-1',
      name: '机巢-Jaouro-01',
      lat: 13.5145,
      lng: 2.1108,
      online: true,
      hatchOpen: false,
      drones: ['C类-03', 'C类-05'],
    },
  ],
}

/** 周边反无目标 */
export const NEARBY_ANTI_UAV: Record<string, AntiUavTarget[]> = {
  a001: [
    {
      id: 'target-1',
      lat: 13.5147,
      lng: 2.1113,
      type: 'unknown',
      altitude: 150,
      speed: 12,
    },
    {
      id: 'target-2',
      lat: 13.5155,
      lng: 2.1100,
      type: 'whitelist',
      authCode: 'WL-001',
      authNote: '测绘作业',
      altitude: 80,
      speed: 5,
    },
    {
      id: 'target-3',
      lat: 13.5150,
      lng: 2.1120,
      type: 'suspected_ours',
      nearbyDrone: 'C类-03',
      distance: 120,
      timeDiff: 3,
      altitude: 95,
      speed: 8,
    },
  ],
}

/** 周边车辆 */
export const NEARBY_VEHICLES: Record<string, VehicleDevice[]> = {
  a001: [
    {
      id: 'veh-1',
      plate: 'Niger-A-0123',
      lat: 13.5140,
      lng: 2.1105,
      online: true,
      status: '待命',
      heading: 45,
      speed: 0,
    },
    {
      id: 'veh-2',
      plate: 'Niger-B-0456',
      lat: 13.5162,
      lng: 2.1128,
      online: true,
      status: '巡逻中',
      heading: 180,
      speed: 15,
    },
  ],
}

/** 计算两点距离（简化版，单位：米） */
export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // 地球半径，米
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
