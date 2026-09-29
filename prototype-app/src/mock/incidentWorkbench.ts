/**
 * 事件工作台 Mock 数据
 * 对应 PRD-事件管理-工作台 V1.0
 */

import { reactive } from 'vue'
// ==================== 枚举 ====================

export type IncidentStatus =
  | 'pending_level'    // 待评级
  | 'active'           // 事件生效（未创建处置任务）
  | 'in_progress'      // 处置中（已创建至少一条处置任务）
  | 'closed'           // 已关闭
  | 'transferred'      // 已转应急
  | 'cancelled'        // 已撤销

export type IncidentLevel = 'I' | 'II' | 'III' | 'IV' | null

export type IncidentUrgency = 'urgent' | 'normal'

export type IncidentSource = 'alert_escalation' | 'manual'

/** 处置任务状态：待处置 / 待验收 / 已通过 / 随事件关闭（PRD 附录 A.2） */
export type TaskStatus = 'pending' | 'submitted' | 'approved' | 'auto_closed'

export type IncidentTypeCode =
  | 'uav_threat'
  | 'personnel_intrusion'
  | 'facility_security'
  | 'vehicle_abnormal'
  | 'other'

// ==================== 主数据结构 ====================

export interface ActionTask {
  task_id: string
  incident_id: string
  title: string
  acceptance_criteria: string
  assignee_user_id: string | null
  assignee_name: string
  assignee_external_name: string | null
  assignee_external_contact: string | null
  deadline_at: string
  status: TaskStatus
  action_description: string | null
  rejection_reason: string | null
  created_by: string
  created_at: string
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
}

export interface IncidentRecord {
  incident_id: string
  incident_no: string           // SJ-yyyyMMdd-NNNN
  title: string
  incident_type_code: IncidentTypeCode
  incident_type_name: string
  level: IncidentLevel
  urgency: IncidentUrgency
  status: IncidentStatus
  source: IncidentSource
  // 来源预警（预警升级时携带）
  source_alert_ids: string[]
  source_alert_nos: string[]
  // 位置
  camp_name: string
  location_lat: number | null
  location_lng: number | null
  description: string
  // 人员
  created_by: string
  created_at: string
  updated_at: string
  // 等级确认
  level_confirmed_at: string | null
  level_confirmed_by: string | null
  level_note: string | null
  // 上报
  report_responsible_user: string | null
  report_deadline_at: string | null
  report_completed_at: string | null
  // 应急
  emergency_proposal_id: string | null
  transferred_to_emergency_at: string | null
  // 关闭
  close_reason: string | null
  cancel_reason: string | null
  // 评级时限（分钟，从 created_at 起）
  level_deadline_min: number
}

export interface IncidentTimeline {
  id: string
  time: string
  category: 'system' | 'level' | 'task' | 'emergency' | 'report' | 'manual'
  action: string
  content: string
  operator?: string
}

export interface EmergencyProposal {
  proposal_id: string
  incident_id: string
  summary: string
  suggested_actions: string
  level: IncidentLevel
  submitted_by: string
  submitted_at: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

// ==================== 辅助函数 ====================

const now = new Date()
function minsAgo(m: number) {
  return new Date(now.getTime() - m * 60 * 1000).toISOString()
}
function hoursAgo(h: number) {
  return minsAgo(h * 60)
}
function minsLater(m: number) {
  return new Date(now.getTime() + m * 60 * 1000).toISOString()
}
function hoursLater(h: number) {
  return minsLater(h * 60)
}

// ==================== Mock 数据：事件 ====================

export const INCIDENT_RECORDS = reactive<IncidentRecord[]>([
  // ── 待评级·紧急·超时 ──────────────────────────────────────
  {
    incident_id: 'i001',
    incident_no: 'SJ-20260927-0001',
    title: 'Jaouro营地·无人机入侵威胁',
    incident_type_code: 'uav_threat',
    incident_type_name: '无人机威胁',
    level: null,
    urgency: 'urgent',
    status: 'pending_level',
    source: 'alert_escalation',
    source_alert_ids: ['a001', 'a004'],
    source_alert_nos: ['YJ-20260926-0001', 'YJ-20260926-0004'],
    camp_name: 'Jaouro',
    location_lat: 13.3148,
    location_lng: 2.6352,
    description: '反无设备连续触发入侵告警，C类无人机跟踪确认存在不明无人机在营地上空盘旋，已超过评级时限。',
    created_by: '张志远',
    created_at: minsAgo(45),
    updated_at: minsAgo(45),
    level_confirmed_at: null,
    level_confirmed_by: null,
    level_note: null,
    report_responsible_user: '张志远',
    report_deadline_at: null,
    report_completed_at: null,
    emergency_proposal_id: null,
    transferred_to_emergency_at: null,
    close_reason: null,
    cancel_reason: null,
    level_deadline_min: 30,
  },
  // ── 待评级·一般 ───────────────────────────────────────────
  {
    incident_id: 'i002',
    incident_no: 'SJ-20260927-0002',
    title: 'Goumeri营地·越界侦测事件',
    incident_type_code: 'personnel_intrusion',
    incident_type_name: '人员入侵',
    level: null,
    urgency: 'normal',
    status: 'pending_level',
    source: 'alert_escalation',
    source_alert_ids: ['a005'],
    source_alert_nos: ['YJ-20260926-0005'],
    camp_name: 'Goumeri',
    location_lat: 13.6426,
    location_lng: 2.3748,
    description: '高点摄像头确认越界目标，核实为真实人员入侵，围界处发现1名男性持棍徘徊。',
    created_by: '王力',
    created_at: minsAgo(8),
    updated_at: minsAgo(8),
    level_confirmed_at: null,
    level_confirmed_by: null,
    level_note: null,
    report_responsible_user: '王力',
    report_deadline_at: null,
    report_completed_at: null,
    emergency_proposal_id: null,
    transferred_to_emergency_at: null,
    close_reason: null,
    cancel_reason: null,
    level_deadline_min: 30,
  },
  // ── 事件生效·II级·紧急·有应急建议待审批 ─────────────────
  {
    incident_id: 'i003',
    incident_no: 'SJ-20260927-0003',
    title: 'Koulele营地·武装人员入侵',
    incident_type_code: 'personnel_intrusion',
    incident_type_name: '人员入侵',
    level: 'II',
    urgency: 'urgent',
    status: 'active',
    source: 'manual',
    source_alert_ids: [],
    source_alert_nos: [],
    camp_name: 'Koulele',
    location_lat: 13.3152,
    location_lng: 2.6348,
    description: '值班员直接录入：围界西侧发现2名武装男性，疑似试图强行进入营地，已通知安保队伍就位。',
    created_by: '李华',
    created_at: minsAgo(25),
    updated_at: minsAgo(18),
    level_confirmed_at: minsAgo(20),
    level_confirmed_by: '张志远',
    level_note: null,
    report_responsible_user: '张志远',
    report_deadline_at: minsLater(5),
    report_completed_at: null,
    emergency_proposal_id: 'ep001',
    transferred_to_emergency_at: null,
    close_reason: null,
    cancel_reason: null,
    level_deadline_min: 30,
  },
  // ── 处置中·III级·2条任务待处置 ─────────────────────────────────────────────────────
  {
    incident_id: 'i004',
    incident_no: 'SJ-20260927-0004',
    title: 'Sokor营地·设施损毁事件',
    incident_type_code: 'facility_security',
    incident_type_name: '设施安全',
    level: 'III',
    urgency: 'normal',
    status: 'in_progress',
    source: 'alert_escalation',
    source_alert_ids: ['a006'],
    source_alert_nos: ['YJ-20260926-0006'],
    camp_name: 'Sokor',
    location_lat: null,
    location_lng: null,
    description: '北侧围界监控设备异常断线，现场巡检发现围界损毁约3米，疑似人为破坏。',
    created_by: '王力',
    created_at: hoursAgo(2),
    updated_at: hoursAgo(1),
    level_confirmed_at: hoursAgo(1.8),
    level_confirmed_by: '张志远',
    level_note: null,
    report_responsible_user: '王力',
    report_deadline_at: hoursLater(22),
    report_completed_at: null,
    emergency_proposal_id: null,
    transferred_to_emergency_at: null,
    close_reason: null,
    cancel_reason: null,
    level_deadline_min: 30,
  },
  // ── 处置中·IV级·1条任务待验收 ───────────────────────────────────────────────────────
  {
    incident_id: 'i005',
    incident_no: 'SJ-20260927-0005',
    title: 'Dibeilla营地·车辆异常停留',
    incident_type_code: 'vehicle_abnormal',
    incident_type_name: '车辆异常',
    level: 'IV',
    urgency: 'normal',
    status: 'in_progress',
    source: 'manual',
    source_alert_ids: [],
    source_alert_nos: [],
    camp_name: 'Dibeilla',
    location_lat: 13.5122,
    location_lng: 2.1124,
    description: '营地外围500m处，一辆无牌照皮卡持续停留超过2小时，驾驶员身份不明，已通知安保关注。',
    created_by: '李华',
    created_at: hoursAgo(3),
    updated_at: hoursAgo(0.5),
    level_confirmed_at: hoursAgo(2.8),
    level_confirmed_by: '李华',
    level_note: null,
    report_responsible_user: '李华',
    report_deadline_at: hoursLater(21),
    report_completed_at: null,
    emergency_proposal_id: null,
    transferred_to_emergency_at: null,
    close_reason: null,
    cancel_reason: null,
    level_deadline_min: 30,
  },
  // ── 已关闭·今日 ──────────────────────────────────────────
  {
    incident_id: 'i006',
    incident_no: 'SJ-20260927-0006',
    title: 'Jaouro营地·可疑人员徘徊',
    incident_type_code: 'personnel_intrusion',
    incident_type_name: '人员入侵',
    level: 'IV',
    urgency: 'normal',
    status: 'closed',
    source: 'alert_escalation',
    source_alert_ids: ['a007'],
    source_alert_nos: ['YJ-20260925-0017'],
    camp_name: 'Jaouro',
    location_lat: 13.3165,
    location_lng: 2.6340,
    description: '围界外可疑人员经巡逻队确认为附近村民，无威胁意图，现场劝离后离开。',
    created_by: '张志远',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(1),
    level_confirmed_at: hoursAgo(5.5),
    level_confirmed_by: '张志远',
    level_note: null,
    report_responsible_user: '张志远',
    report_deadline_at: hoursAgo(0),
    report_completed_at: hoursAgo(1.5),
    emergency_proposal_id: null,
    transferred_to_emergency_at: null,
    close_reason: '威胁已消除，可疑人员已离开，无需进一步处置。',
    cancel_reason: null,
    level_deadline_min: 30,
  },
  // ── 已转应急（今日） ─────────────────────────────────────
  {
    incident_id: 'i007',
    incident_no: 'SJ-20260927-0007',
    title: 'Koulele营地·武装冲突威胁',
    incident_type_code: 'personnel_intrusion',
    incident_type_name: '人员入侵',
    level: 'I',
    urgency: 'urgent',
    status: 'transferred',
    source: 'manual',
    source_alert_ids: [],
    source_alert_nos: [],
    camp_name: 'Koulele',
    location_lat: 13.3152,
    location_lng: 2.6348,
    description: '围界多点同时出现武装人员，威胁升至I级，应急响应已启动。',
    created_by: '张志远',
    created_at: hoursAgo(8),
    updated_at: hoursAgo(4),
    level_confirmed_at: hoursAgo(7.5),
    level_confirmed_by: '张志远',
    level_note: null,
    report_responsible_user: '张志远',
    report_deadline_at: hoursAgo(7),
    report_completed_at: hoursAgo(7.2),
    emergency_proposal_id: 'ep002',
    transferred_to_emergency_at: hoursAgo(4),
    close_reason: null,
    cancel_reason: null,
    level_deadline_min: 30,
  },
  // ── 处置中·III级·任务全部已通过（可演示「关闭事件」） ──────
  {
    incident_id: 'i008',
    incident_no: 'SJ-20260927-0008',
    title: 'Goumeri营地·围界监控断线',
    incident_type_code: 'facility_security',
    incident_type_name: '设施安全',
    level: 'III',
    urgency: 'normal',
    status: 'in_progress',
    source: 'manual',
    source_alert_ids: [],
    source_alert_nos: [],
    camp_name: 'Goumeri',
    location_lat: 13.6430,
    location_lng: 2.3758,
    description: '东门围界两路监控信号中断，经排查为线缆老化，已安排更换。',
    created_by: '王力',
    created_at: hoursAgo(4),
    updated_at: hoursAgo(0.3),
    level_confirmed_at: hoursAgo(3.8),
    level_confirmed_by: '张志远',
    level_note: '单点设备故障，有冗余覆盖',
    report_responsible_user: '王力',
    report_deadline_at: hoursLater(20),
    report_completed_at: hoursAgo(2),
    emergency_proposal_id: null,
    transferred_to_emergency_at: null,
    close_reason: null,
    cancel_reason: null,
    level_deadline_min: 30,
  },
])

// ==================== Mock 数据：处置任务 ====================

export const ACTION_TASKS = reactive<ActionTask[]>([
  // i003 无任务（事件生效阶段）
  // i004 两条进行中任务
  {
    task_id: 't001',
    incident_id: 'i004',
    title: '现场勘察围界损毁情况',
    acceptance_criteria: '提交包含损毁位置、面积和照片的勘察报告',
    assignee_user_id: 'u_wangli',
    assignee_name: '王力',
    assignee_external_name: null,
    assignee_external_contact: null,
    deadline_at: hoursLater(2),
    status: 'pending',
    action_description: null,
    rejection_reason: null,
    created_by: '张志远',
    created_at: hoursAgo(1),
    submitted_at: null,
    approved_at: null,
    approved_by: null,
  },
  {
    task_id: 't002',
    incident_id: 'i004',
    title: '联系维修团队安排围界修复',
    acceptance_criteria: '维修工单已创建，维修队伍已到位开始施工',
    assignee_user_id: null,
    assignee_name: '穆萨（外部）',
    assignee_external_name: '穆萨',
    assignee_external_contact: '+227 96 88 xxxx',
    deadline_at: hoursLater(6),
    status: 'pending',
    action_description: null,
    rejection_reason: null,
    created_by: '张志远',
    created_at: hoursAgo(1),
    submitted_at: null,
    approved_at: null,
    approved_by: null,
  },
  // i005 一条待验收任务
  {
    task_id: 't003',
    incident_id: 'i005',
    title: '安排巡逻车前往核查可疑车辆',
    acceptance_criteria: '确认车辆及人员身份，提交核查报告',
    assignee_user_id: 'u_lihua',
    assignee_name: '李华',
    assignee_external_name: null,
    assignee_external_contact: null,
    deadline_at: minsAgo(30),
    status: 'submitted',
    action_description: '已安排3号巡逻车前往，驾驶员确认为附近村民运输物资，无可疑行为。车牌经查询为本地注册车辆。已拍照存档，车辆自行驶离。',
    rejection_reason: null,
    created_by: '李华',
    created_at: hoursAgo(2.5),
    submitted_at: hoursAgo(0.5),
    approved_at: null,
    approved_by: null,
  },
  // i006 已通过任务
  {
    task_id: 't004',
    incident_id: 'i006',
    title: '派遣安保人员巡逻围界外围',
    acceptance_criteria: '完成围界外围全面巡逻，确认无可疑人员',
    assignee_user_id: 'u_lihua',
    assignee_name: '李华',
    assignee_external_name: null,
    assignee_external_contact: null,
    deadline_at: hoursAgo(3),
    status: 'approved',
    action_description: '巡逻队已完成全程巡视，发现为附近村民，已劝离并确认离开。',
    rejection_reason: null,
    created_by: '张志远',
    created_at: hoursAgo(5.5),
    submitted_at: hoursAgo(2),
    approved_at: hoursAgo(1),
    approved_by: '张志远',
  },
  // i008 两条已通过任务
  {
    task_id: 't005',
    incident_id: 'i008',
    title: '更换东门围界监控线缆',
    acceptance_criteria: '两路监控画面恢复，连续在线 30 分钟',
    assignee_user_id: 'u_wangli',
    assignee_name: '王力',
    assignee_external_name: null,
    assignee_external_contact: null,
    deadline_at: hoursAgo(1),
    status: 'approved',
    action_description: '已更换 2 段线缆共 40m，两路画面恢复正常。',
    rejection_reason: null,
    created_by: '张志远',
    created_at: hoursAgo(3.5),
    submitted_at: hoursAgo(1.5),
    approved_at: hoursAgo(1),
    approved_by: '张志远',
  },
  {
    task_id: 't006',
    incident_id: 'i008',
    title: '断线期间安排人工巡逻',
    acceptance_criteria: '断线期间每 30 分钟巡逻一次并记录',
    assignee_user_id: 'u_lihua',
    assignee_name: '李华',
    assignee_external_name: null,
    assignee_external_contact: null,
    deadline_at: hoursAgo(0.5),
    status: 'approved',
    action_description: '共巡逻 6 次，未发现异常。',
    rejection_reason: null,
    created_by: '张志远',
    created_at: hoursAgo(3.5),
    submitted_at: hoursAgo(0.6),
    approved_at: hoursAgo(0.3),
    approved_by: '张志远',
  },
])

// ==================== Mock 数据：时间线 ====================

export const INCIDENT_TIMELINES = reactive<Record<string, IncidentTimeline[]>>({
  i001: [
    { id: 'tl01', time: minsAgo(45), category: 'system', action: '事件创建', content: '预警 YJ-20260926-0001、YJ-20260926-0004 升级为事件，由 张志远 创建' },
    { id: 'tl02', time: minsAgo(44), category: 'system', action: '通知发送', content: 'N1 通知已发送：值班负责人 张志远' },
    { id: 'tl03', time: minsAgo(15), category: 'system', action: '评级超时', content: '已超过评级时限 30 分钟，催办通知已发送' },
  ],
  i003: [
    { id: 'tl01', time: minsAgo(25), category: 'system', action: '事件创建', content: '值班员 李华 手工录入事件' },
    { id: 'tl02', time: minsAgo(24), category: 'system', action: '通知发送', content: 'N1 通知已发送：值班负责人 张志远' },
    { id: 'tl03', time: minsAgo(20), category: 'level', action: '确认等级', content: '张志远 确认事件等级为 II 级', operator: '张志远' },
    { id: 'tl04', time: minsAgo(20), category: 'system', action: '事件生效', content: '事件等级已确认，进入事件生效阶段，触发上报提醒' },
    { id: 'tl05', time: minsAgo(18), category: 'emergency', action: '提交应急建议', content: '张志远 提交应急启动建议，建议立即启动安保响应预案', operator: '张志远' },
    { id: 'tl06', time: minsAgo(18), category: 'system', action: '通知发送', content: 'N8-A 通知已发送：应急领导小组组长' },
  ],
  i004: [
    { id: 'tl01', time: hoursAgo(2), category: 'system', action: '事件创建', content: '预警 YJ-20260926-0006 升级为事件，由 王力 创建' },
    { id: 'tl02', time: hoursAgo(1.8), category: 'level', action: '确认等级', content: '张志远 确认事件等级为 III 级', operator: '张志远' },
    { id: 'tl03', time: hoursAgo(1.8), category: 'system', action: '事件生效', content: '事件等级已确认，进入事件生效阶段' },
    { id: 'tl04', time: hoursAgo(1), category: 'task', action: '创建处置任务', content: '张志远 创建处置任务「现场勘察围界损毁情况」，责任人：王力', operator: '张志远' },
    { id: 'tl05', time: hoursAgo(1), category: 'task', action: '创建处置任务', content: '张志远 创建处置任务「联系维修团队安排围界修复」，责任人：穆萨（外部）', operator: '张志远' },
  ],
  i005: [
    { id: 'tl01', time: hoursAgo(3), category: 'system', action: '事件创建', content: '值班员 李华 手工录入事件' },
    { id: 'tl02', time: hoursAgo(2.8), category: 'level', action: '确认等级', content: '李华 确认事件等级为 IV 级', operator: '李华' },
    { id: 'tl03', time: hoursAgo(2.5), category: 'task', action: '创建处置任务', content: '李华 创建处置任务「安排巡逻车前往核查可疑车辆」', operator: '李华' },
    { id: 'tl04', time: hoursAgo(0.5), category: 'task', action: '提交验收', content: '李华 提交处置任务「安排巡逻车前往核查可疑车辆」验收', operator: '李华' },
  ],
  i007: [
    { id: 'tl01', time: hoursAgo(8), category: 'system', action: '事件创建', content: '值班员 张志远 手工录入事件' },
    { id: 'tl02', time: hoursAgo(7.5), category: 'level', action: '确认等级', content: '张志远 确认事件等级为 II 级', operator: '张志远' },
    { id: 'tl03', time: hoursAgo(6), category: 'level', action: '升级等级', content: '张志远 将等级由 II 级升至 I 级，理由：威胁升级，多点同时出现武装人员，范围扩大', operator: '张志远' },
    { id: 'tl04', time: hoursAgo(5), category: 'emergency', action: '提交应急建议', content: '张志远 提交应急启动建议', operator: '张志远' },
    { id: 'tl05', time: hoursAgo(4), category: 'emergency', action: '签发启动令', content: '陈国华 签发应急启动令，事件移交应急指挥', operator: '陈国华' },
  ],
  i008: [
    { id: 'tl01', time: hoursAgo(4), category: 'system', action: '事件创建', content: '值班员 王力 手工录入事件' },
    { id: 'tl02', time: hoursAgo(3.8), category: 'level', action: '确认等级', content: '张志远 确认事件等级为 III 级，定级说明：单点设备故障，有冗余覆盖', operator: '张志远' },
    { id: 'tl03', time: hoursAgo(3.5), category: 'task', action: '创建处置任务', content: '张志远 创建处置任务「更换东门围界监控线缆」「断线期间安排人工巡逻」', operator: '张志远' },
    { id: 'tl04', time: hoursAgo(1), category: 'task', action: '验收通过', content: '张志远 验收通过「更换东门围界监控线缆」', operator: '张志远' },
    { id: 'tl05', time: hoursAgo(0.3), category: 'task', action: '验收通过', content: '张志远 验收通过「断线期间安排人工巡逻」', operator: '张志远' },
  ],
})

// ==================== Mock 数据：应急建议 ====================

export const EMERGENCY_PROPOSALS = reactive<Record<string, EmergencyProposal>>({
  ep001: {
    proposal_id: 'ep001',
    incident_id: 'i003',
    summary: 'Koulele营地发现武装人员入侵，威胁等级II级，建议立即启动安保响应预案，疏散非必要人员。',
    suggested_actions: '1. 启动营地安保预案 B 级\n2. 通知全体人员转移至安全区\n3. 联系尼日尔当地警方支援\n4. 无人机升空持续监控',
    level: 'II',
    submitted_by: '张志远',
    submitted_at: minsAgo(18),
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
  },
  ep002: {
    proposal_id: 'ep002',
    incident_id: 'i007',
    summary: 'Koulele营地武装冲突威胁，等级升至I级，应急响应启动。',
    suggested_actions: '1. 启动营地最高安保预案\n2. 全员紧急疏散至避难区\n3. 请求武装安保支援',
    level: 'I',
    submitted_by: '张志远',
    submitted_at: hoursAgo(5),
    status: 'approved',
    reviewed_by: '陈国华',
    reviewed_at: hoursAgo(4),
    rejection_reason: null,
  },
})

// ==================== 辅助函数 ====================

/** 获取事件评级时限状态 */
export function getLevelDeadlineInfo(record: IncidentRecord): {
  overdue: boolean
  minutesLeft: number
  label: string
} {
  if (record.status !== 'pending_level') {
    return { overdue: false, minutesLeft: 0, label: '—' }
  }
  const start = new Date(record.created_at).getTime()
  const elapsed = (Date.now() - start) / 60000
  const left = record.level_deadline_min - elapsed
  return {
    overdue: left < 0,
    minutesLeft: Math.abs(Math.round(left)),
    label: left < 0 ? `超时 ${Math.abs(Math.round(left))} 分` : `剩 ${Math.round(left)} 分`,
  }
}

/** 获取事件的处置任务列表 */
export function getTasksForIncident(incidentId: string): ActionTask[] {
  return ACTION_TASKS.filter(t => t.incident_id === incidentId)
}

/** 处置任务汇总进度：已通过 N / 共 M（PRD §3.2、§5.3） */
export function getTaskProgress(incidentId: string): { approved: number; total: number; unapproved: number } {
  const tasks = getTasksForIncident(incidentId)
  const approved = tasks.filter(t => t.status === 'approved').length
  return { approved, total: tasks.length, unapproved: tasks.length - approved }
}

/** 处置任务摘要文字，如「任务 1/2 已通过」 */
export function getTaskSummary(incidentId: string): string {
  const { approved, total } = getTaskProgress(incidentId)
  return total === 0 ? '' : `任务 ${approved}/${total} 已通过`
}

/** 事件是否存在待审批的应急启动建议（PRD §3.2 应急建议唯一性） */
export function getPendingProposal(record: IncidentRecord): EmergencyProposal | null {
  if (!record.emergency_proposal_id) return null
  const p = EMERGENCY_PROPOSALS[record.emergency_proposal_id]
  return p && p.status === 'pending' ? p : null
}

/** 进行中 = 事件生效 + 处置中 */
export const ONGOING_STATUSES: IncidentStatus[] = ['active', 'in_progress']
/** 终态 */
export const TERMINAL_STATUSES: IncidentStatus[] = ['closed', 'transferred', 'cancelled']

/** 处置任务状态标签 / 颜色 */
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待处置',
  submitted: '待验收',
  approved: '已通过',
  auto_closed: '随事件关闭',
}
export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  pending: '#faad14',
  submitted: '#9b7cff',
  approved: 'var(--of-color-success)',
  auto_closed: 'var(--of-text-tertiary)',
}

/** 状态标签 */
export const STATUS_LABEL: Record<IncidentStatus, string> = {
  pending_level: '待评级',
  active: '事件生效',
  in_progress: '处置中',
  closed: '已关闭',
  transferred: '已转应急',
  cancelled: '已撤销',
}

/** 等级标签 */
export const LEVEL_LABEL: Record<string, string> = {
  I: 'Ⅰ级',
  II: 'Ⅱ级',
  III: 'Ⅲ级',
  IV: 'Ⅳ级',
}

/** 事件类型列表（用于筛选） */
export const INCIDENT_TYPE_OPTIONS: { value: IncidentTypeCode; label: string }[] = [
  { value: 'uav_threat', label: '无人机威胁' },
  { value: 'personnel_intrusion', label: '人员入侵' },
  { value: 'facility_security', label: '设施安全' },
  { value: 'vehicle_abnormal', label: '车辆异常' },
  { value: 'other', label: '其他' },
]

/** 营地列表 */
export const CAMP_OPTIONS = ['Jaouro', 'Koulele', 'Dibeilla', 'Goumeri', 'Sokor']

/** 等级颜色（用于色块和文字着色） */
export const LEVEL_COLOR: Record<string, string> = {
  I: '#ff4d4f',
  II: '#fa8c16',
  III: '#fadb14',
  IV: '#1890ff',
  null: 'var(--of-text-tertiary)',
}

/** 状态颜色 */
export const STATUS_COLOR: Record<IncidentStatus, string> = {
  pending_level: '#faad14',
  active: 'var(--of-color-primary)',
  in_progress: '#fa8c16',
  closed: 'var(--of-text-tertiary)',
  transferred: '#ff4d4f',
  cancelled: 'var(--of-text-quaternary)',
}
