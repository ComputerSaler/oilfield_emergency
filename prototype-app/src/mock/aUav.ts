/**
 * A 类无人机 mock 数据 —— 依据《PRD-装备管理-A类无人机管理》V3.0
 *
 * 核心事实：全项目 4 架实体飞机，由一个统一数据源集中管理并对平台开放，
 * 源侧 4 条记录与 4 架实体飞机一一对应（验收项 A-01），不存在跨系统重复注册。
 *
 * 注：真实实现中数据落库在服务端完成（非功能项 B-01），前端不做数据加工。
 * 此处为纯前端原型，把转换放在前端仅为让「演示控制台」能现场改源记录、
 * 现场制造接入异常，从而演示 E-31/E-32。
 */

// ============================ 枚举与字典 ============================

/** 统一数据源编码（接入配置中的 source_system_code） */
export const SOURCE_SYSTEM_CODE = 'AEROSPACE_MIDDLEWARE'

/** 统一数据源展示名 —— 已确认为航天中台 */
export const SOURCE_SYSTEM_NAME = '航天中台'

/**
 * 飞行状态字典（系统管理→数据字典）
 * 已确认仅两种：飞行中（创建任务时变更）/ 未飞行（任务完结时变更）
 */
export interface FlightStatusDict {
  code: string
  label: string
  /** 语义色：用于文字+颜色双编码（非功能项 B-08） */
  tone: 'flying' | 'not_flying'
}

export const FLIGHT_STATUS_DICT: FlightStatusDict[] = [
  { code: 'FLYING', label: '飞行中', tone: 'flying' },
  { code: 'NOT_FLYING', label: '未飞行', tone: 'not_flying' },
]

/** 营地字典。AGADEM 不在本期 A 类覆盖范围，用于演示 E-20 */
export interface CampDict {
  code: string
  name: string
  short: string
}

export const CAMP_DICT: CampDict[] = [
  { code: 'Jaouro', name: 'Jaouro 营地', short: 'J' },
  { code: 'Koulele', name: 'Koulele 营地', short: 'K' },
  { code: 'Dibeilla', name: 'Dibeilla 营地', short: 'D' },
  { code: 'Agadem', name: 'Agadem 营地', short: 'A' },
  { code: 'Sokor', name: 'Sokor 营地', short: 'S' },
  { code: 'Goumeri', name: 'Goumeri 营地', short: 'G' },
]

/** 在线状态 */
export type OnlineStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN'

/** 在线状态判定来源 —— 由航天中台判断 */
export type OnlineSource = 'SOURCE_PUSH'

/** 管理状态（平台管理的设备生命周期状态） */
export type ManagementStatus = 'NORMAL' | 'DISABLED' | 'ARCHIVED'

export const MANAGEMENT_STATUS_LABEL: Record<ManagementStatus, string> = {
  NORMAL: '正常',
  DISABLED: '已停用',
  ARCHIVED: '已归档',
}

// ============================ 待确认项登记表 ============================

/**
 * PRD 8.1/8.2 待确认问题在页面上的落点。
 * 页面凡使用假定值处，一律挂 PendingBadge 引用此表，评审时一眼看出哪些要业主拍板。
 *
 * 已解决（2026-07-29）：Q-02, Q-03, Q-04, Q-07, Q-08, Q-09
 */
export const PENDING_QUESTIONS: Record<string, { title: string; assume: string }> = {
  'Q-01': { title: '任务与飞行数据是否与主数据同源', assume: '按单一数据源设计，累计数据 3 项 KPI，任务不带来源列' },
  'Q-05': { title: '通信周期秒数', assume: '假定 30s，心跳超时 = 3 × 30s = 90s' },
  'Q-06': { title: '接口是否提供型号字段', assume: '按提供设计，保留型号列' },
  'Q-16': { title: '数据新鲜度阈值', assume: '假定 300s' },
  'Q-17': { title: '统一展示时区', assume: '假定尼日尔当地时间 UTC+1' },
}

/** 系统配置项（真实实现由系统管理下发，前端不得硬编码） */
export const SYS_CONFIG = {
  /** 统一展示时区 —— Q-17 待确认 */
  timezone: 'UTC+1（尼日尔当地时间）',
  /** 视频自动重连上限（E-48） */
  videoRetryLimit: 3,
  /** 通信周期秒数 —— Q-05 待确认，假定 30s */
  commCycleSec: 30,
  /** 心跳超时倍数 —— Q-05 待确认，假定 3 倍 */
  timeoutMultiple: 3,
}

// ============================ 源记录 ============================

/** 源记录（统一数据源设备表的一行，只读）—— 与一架实体飞机 1:1 */
export interface UavSourceRecord {
  source_record_pk: string
  source_system_code: string
  source_record_id: string
  drone_sn: string
  aircraft_name: string | null
  model: string | null
  /** 源编码，原样保留不改写 */
  flight_status_code: string | null
  online_status: OnlineStatus
  online_status_source: OnlineSource
  parked_at: string | null
  last_flight_at: string | null
  /** null = 源未提供；负数 = 数据异常（E-13） */
  total_sorties: number | null
  total_flight_distance_m: number | null
  total_flight_duration_sec: number | null
  ground_station_id: string | null
  ground_station_name: string | null
  /** 平台最后一次收到该设备 Kafka 消息的时间 */
  last_updated_at: string
  /** true = 该记录在源系统已不存在（接口可达前提下才成立，E-21） */
  record_missing?: boolean
}

/** 相对当前时刻的时间戳工厂：负数表示过去多少秒 */
const T0 = Date.now()
const at = (offsetSec: number) => new Date(T0 + offsetSec * 1000).toISOString()

/**
 * 源侧设备清单：4 条在编记录与 4 架实体飞机一一对应，另加 3 条演示接入状态机末端。
 * - A-001：完全正常（客户要求至少 1-2 条无任何异常标识的数据）
 * - A-002：完全正常
 * - A-004：飞行中 → 实时视频可播（IS-07，验收 A-15）
 * - A-000：源记录已消失 → 源端已删除，进待归档清单（E-12）
 * - A-005：源数据正常但平台侧人工停用（F-24、E-23）
 * - A-009：源数据正常但平台侧已归档（E-25）
 */
export const SOURCE_RECORDS: UavSourceRecord[] = [
  // ============================ 现场真实数据（优先展示）============================
  {
    // 现场数据1：Jaouro营地，未飞行状态
    source_record_pk: 'src-real-001',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-REAL-001',
    drone_sn: 'YDUA25V0250105YCACAM',
    aircraft_name: 'UAV Jaouro（现场）',
    model: 'ZT-25V',
    flight_status_code: 'NOT_FLYING',
    online_status: 'ONLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: at(-86400 * 2),
    last_flight_at: at(-86400),
    total_sorties: 283,
    total_flight_distance_m: 60772,
    total_flight_duration_sec: 1575140,
    ground_station_id: 'GS-Jaouro',
    ground_station_name: 'Jaouro',
    last_updated_at: at(-180),
  },
  {
    // 现场数据2：Dibeilla营地，飞行中
    source_record_pk: 'src-real-002',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-REAL-002',
    drone_sn: 'YDUA25V0250102YCATEY',
    aircraft_name: 'UAV1 Dibeilla（现场）',
    model: 'ZT-25V',
    flight_status_code: 'FLYING',
    online_status: 'ONLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: null,
    last_flight_at: at(-120),
    total_sorties: 469,
    total_flight_distance_m: 87319,
    total_flight_duration_sec: 2020157,
    ground_station_id: 'GS-Dibeilla',
    ground_station_name: 'Dibeilla',
    last_updated_at: at(-90),
  },
  {
    // 现场数据3：Koulele营地，飞行中
    source_record_pk: 'src-real-003',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-REAL-003',
    drone_sn: 'YDUA25V0250202YCAYTV',
    aircraft_name: 'UAV2 Koulele（现场）',
    model: 'ZT-25V',
    flight_status_code: 'FLYING',
    online_status: 'ONLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: null,
    last_flight_at: at(-60),
    total_sorties: 645,
    total_flight_distance_m: 123993,
    total_flight_duration_sec: 2942889,
    ground_station_id: 'GS-Koulele',
    ground_station_name: 'Koulele',
    last_updated_at: at(-45),
  },
  {
    // 现场数据4：Jaouro营地，飞行中，离线状态演示
    source_record_pk: 'src-real-004',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-REAL-004',
    drone_sn: 'YDUA25V0250302YCADZB',
    aircraft_name: 'UAV3 Jaouro（现场）',
    model: 'ZT-25V',
    flight_status_code: 'FLYING',
    online_status: 'OFFLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: null,
    last_flight_at: at(-3600),
    total_sorties: 498,
    total_flight_distance_m: 101981,
    total_flight_duration_sec: 2576695,
    ground_station_id: 'GS-Jaouro',
    ground_station_name: 'Jaouro',
    last_updated_at: at(-3600),
  },
  {
    source_record_pk: 'src-001',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-0001',
    drone_sn: 'A-001',
    aircraft_name: 'UAV-01',
    model: 'XX-1',
    flight_status_code: 'NOT_FLYING',
    online_status: 'ONLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: at(-86400 * 3),
    last_flight_at: at(-7200),
    total_sorties: 67,
    total_flight_distance_m: 205900,
    total_flight_duration_sec: 70500,
    ground_station_id: 'GS-J-01',
    ground_station_name: 'Jaouro-GS-01',
    last_updated_at: at(-120),
  },
  {
    source_record_pk: 'src-002',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-0002',
    drone_sn: 'A-002',
    aircraft_name: 'UAV-02',
    model: 'XX-1',
    flight_status_code: 'NOT_FLYING',
    online_status: 'ONLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: at(-86400 * 4),
    last_flight_at: at(-12600),
    total_sorties: 70,
    total_flight_distance_m: 211000,
    total_flight_duration_sec: 75000,
    ground_station_id: 'GS-K-01',
    ground_station_name: 'Koulele-GS-1',
    last_updated_at: at(-200),
  },
  {
    source_record_pk: 'src-003',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-0003',
    drone_sn: 'A-003',
    aircraft_name: 'UAV-03',
    model: 'XX-2',
    flight_status_code: 'NOT_FLYING',
    online_status: 'OFFLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: at(-86400 * 7),
    last_flight_at: at(-28800),
    total_sorties: 40,
    total_flight_distance_m: 84000,
    total_flight_duration_sec: 30600,
    ground_station_id: 'GS-J-01',
    ground_station_name: 'Jaouro-GS-01',
    last_updated_at: at(-3900),
  },
  {
    // 飞行中 → 详情页视频区可播放（飞行状态枚举待确认 Q-03）
    source_record_pk: 'src-004',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-0004',
    drone_sn: 'A-004',
    aircraft_name: 'UAV-04',
    model: 'XX-2',
    flight_status_code: 'FLYING',
    online_status: 'ONLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: null,
    last_flight_at: at(-60),
    total_sorties: 28,
    total_flight_distance_m: 84000,
    total_flight_duration_sec: 30000,
    ground_station_id: 'GS-D-01',
    ground_station_name: 'Dibeilla-GS-1',
    last_updated_at: at(-60),
  },
  {
    // 接口可达且源记录已消失 → 源端已删除，进待归档清单（E-12）
    source_record_pk: 'src-000',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-0000',
    drone_sn: 'A-000',
    aircraft_name: 'UAV-00（退役）',
    model: 'XX-0',
    flight_status_code: 'NOT_FLYING',
    online_status: 'UNKNOWN',
    online_status_source: 'SOURCE_PUSH',
    parked_at: at(-86400 * 30),
    last_flight_at: at(-86400 * 20),
    total_sorties: 260,
    total_flight_distance_m: 780000,
    total_flight_duration_sec: 312000,
    ground_station_id: null,
    ground_station_name: null,
    last_updated_at: at(-86400 * 15),
    record_missing: true,
  },
  {
    // 源数据正常，平台侧人工停用 → 默认列表不可见，勾「显示已停用」才出现（F-03）
    source_record_pk: 'src-005',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-0005',
    drone_sn: 'A-005',
    aircraft_name: 'UAV-05',
    model: 'XX-1',
    flight_status_code: 'NOT_FLYING',
    online_status: 'ONLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: at(-86400 * 2),
    last_flight_at: at(-86400),
    total_sorties: 26,
    total_flight_distance_m: 78000,
    total_flight_duration_sec: 28800,
    ground_station_id: 'GS-J-01',
    ground_station_name: 'Jaouro-GS-01',
    last_updated_at: at(-240),
  },
  {
    // 平台侧已归档 → 仅归档库可见（E-25）
    source_record_pk: 'src-009',
    source_system_code: SOURCE_SYSTEM_CODE,
    source_record_id: 'UAV-0009',
    drone_sn: 'A-009',
    aircraft_name: 'UAV-09（已归档）',
    model: 'XX-0',
    flight_status_code: 'NOT_FLYING',
    online_status: 'ONLINE',
    online_status_source: 'SOURCE_PUSH',
    parked_at: at(-86400 * 3),
    last_flight_at: at(-86400 * 2),
    total_sorties: 210,
    total_flight_distance_m: 630000,
    total_flight_duration_sec: 252000,
    ground_station_id: 'GS-K-01',
    ground_station_name: 'Koulele-GS-1',
    last_updated_at: at(-270),
  },
]


// ============================ 平台扩展信息 ============================

/** 平台扩展信息（`a_uav_extension`，全量可写，同步时不被源数据覆盖） */
export interface UavExtension {
  drone_sn: string
  /** 建档时默认为营地字典全集，之后纯人工维护，同步不覆盖 */
  serviceable_camps: string[]
  display_icon_id: string | null
  responsible_org: string
  responsible_person_id: string | null
  show_on_bigscreen: boolean
  ops_remark: string
  updated_by: string
  updated_at: string
}

/** 动态图标设置中已上传的图标（系统管理→动态图标设置） */
export const ICON_OPTIONS = [
  { id: 'ICON_A_UAV_DEFAULT', label: 'A 类无人机（默认）', iconPath: '/src/assets/icons/a-uav-default.png' },
  { id: 'ICON_A_UAV_BLUE', label: 'A 类无人机（蓝）', iconPath: '/src/assets/icons/a-uav-default.png' },
  { id: 'ICON_A_UAV_ALERT', label: 'A 类无人机（告警）', iconPath: '/src/assets/icons/a-uav-default.png' },
  // 已在动态图标设置中被删除，用于演示 E-29
  { id: 'ICON_A_UAV_REMOVED', label: '（已删除的图标）', iconPath: '/src/assets/icons/a-uav-default.png', removed: true },
]

/** 人员台账（人员管理→人员台账） */
export const PERSON_OPTIONS = [
  { id: 'P-001', name: '张建国', org: '安保部', disabled: false },
  { id: 'P-002', name: 'Ibrahim Moussa', org: '安保部', disabled: false },
  { id: 'P-003', name: '李伟', org: '设备运维部', disabled: false },
  // 已在人员台账停用，用于演示 E-28：保留原值展示但编辑时不可选
  { id: 'P-004', name: '王强（已停用）', org: '设备运维部', disabled: true },
]

export const EXTENSIONS: UavExtension[] = [
  {
    drone_sn: 'A-001',
    serviceable_camps: ['Jaouro', 'Koulele', 'Dibeilla'],
    display_icon_id: 'ICON_A_UAV_DEFAULT',
    responsible_org: '安保部无人机班',
    responsible_person_id: 'P-001',
    show_on_bigscreen: true,
    ops_remark: '主力机，优先派发 Koulele 区域巡检任务。',
    updated_by: '张建国',
    updated_at: at(-86400 * 2),
  },
  {
    drone_sn: 'A-002',
    // 人工维护过：只服务 2 个营地
    serviceable_camps: ['Jaouro', 'Koulele'],
    display_icon_id: 'ICON_A_UAV_BLUE',
    responsible_org: '安保部无人机班',
    responsible_person_id: 'P-002',
    show_on_bigscreen: true,
    ops_remark: '',
    updated_by: 'Ibrahim Moussa',
    updated_at: at(-86400),
  },
  {
    drone_sn: 'A-003',
    serviceable_camps: ['Jaouro', 'Koulele', 'Dibeilla'],
    // 引用了已被删除的图标 → 页面回退默认并提示（E-29）
    display_icon_id: 'ICON_A_UAV_REMOVED',
    responsible_org: '设备运维部',
    // 引用了已停用人员 → 保留原值 + 黄色提示，不自动清空（E-28）
    responsible_person_id: 'P-004',
    show_on_bigscreen: false,
    ops_remark: '疑似姿态传感器异常，等待金信现场排查。',
    updated_by: '李伟',
    updated_at: at(-86400 * 5),
  },
  {
    drone_sn: 'A-004',
    // 服务 4 营地示例（含 Agadem）
    serviceable_camps: ['Jaouro', 'Koulele', 'Dibeilla', 'Agadem'],
    display_icon_id: 'ICON_A_UAV_ALERT',
    responsible_org: '安保部无人机班',
    responsible_person_id: 'P-003',
    show_on_bigscreen: true,
    ops_remark: '',
    updated_by: '李伟',
    updated_at: at(-3600),
  },
]

// 其余飞机给默认扩展信息
for (const sn of ['A-000', 'A-005', 'A-009']) {
  EXTENSIONS.push({
    drone_sn: sn,
    serviceable_camps: ['Jaouro', 'Koulele', 'Dibeilla'],
    display_icon_id: 'ICON_A_UAV_DEFAULT',
    responsible_org: '安保部无人机班',
    responsible_person_id: 'P-001',
    show_on_bigscreen: false,
    ops_remark: '',
    updated_by: '张建国',
    updated_at: at(-86400 * 10),
  })
}

// ============================ 位置 ============================

export type PositionType = 'REALTIME_AIRCRAFT' | 'LAST_AIRCRAFT' | 'GROUND_STATION'

export const POSITION_TYPE_LABEL: Record<PositionType, string> = {
  REALTIME_AIRCRAFT: '无人机实时位置',
  LAST_AIRCRAFT: '无人机最后位置',
  GROUND_STATION: '当前地面站位置',
}

/** 位置（`a_uav_position`，只读） */
export interface UavPosition {
  drone_sn: string
  position_type: PositionType | null
  longitude: number | null
  latitude: number | null
  altitude_m: number | null
  coordinate_system: string | null
  position_updated_at: string | null
}

/** 营地示意坐标（Agadem 区块一带），用于位置预览示意底图落点 */
export const CAMP_ANCHOR: Record<string, { lng: number; lat: number }> = {
  Jaouro: { lng: 13.204, lat: 15.312 },
  Koulele: { lng: 13.418, lat: 15.187 },
  Dibeilla: { lng: 13.096, lat: 15.061 },
}

export const POSITIONS: UavPosition[] = [
  {
    drone_sn: 'A-001',
    position_type: 'GROUND_STATION',
    longitude: 13.4185,
    latitude: 15.1873,
    altitude_m: 0,
    coordinate_system: 'WGS84',
    position_updated_at: at(-120),
  },
  {
    // 无坐标 → 位置预览退化为文本卡片，不渲染空白地图（E-15、验收 A-17）
    drone_sn: 'A-002',
    position_type: 'GROUND_STATION',
    longitude: null,
    latitude: null,
    altitude_m: null,
    coordinate_system: null,
    position_updated_at: null,
  },
  {
    // 坐标系未知 → 不与底图叠加，仅显示坐标文本（E-16）
    drone_sn: 'A-003',
    position_type: 'GROUND_STATION',
    longitude: 13.2041,
    latitude: 15.3118,
    altitude_m: 0,
    coordinate_system: null,
    position_updated_at: at(-3600),
  },
  {
    // 飞行中 → 实时机位
    drone_sn: 'A-004',
    position_type: 'REALTIME_AIRCRAFT',
    longitude: 13.3372,
    latitude: 15.2408,
    altitude_m: 320,
    coordinate_system: 'WGS84',
    position_updated_at: at(-30),
  },
]

// ============================ 巡检任务 ============================

/** 任务状态典 */
export const TASK_STATUS_DICT = [
  { code: 'EXECUTING', label: '执行中' },
  { code: 'COMPLETED', label: '已完成' },
  { code: 'CANCELED', label: '已取消' },
  { code: 'FAILED', label: '执行失败' },
]

/** 巡检任务（`a_uav_task`，只读）—— 是否与主数据同源待确认（Q-01） */
export interface UavTask {
  task_pk: string
  source_system_code: string
  source_task_id: string
  drone_sn: string
  task_status_code: string
  started_at: string | null
  ended_at: string | null
  flown_duration_sec: number | null
}

/** 按 SN 造任务：A-001 造 12 条（含 1 条时间倒挂异常 E-14），其余少量 */
function makeTasks(sn: string, count: number, startIdx = 1): UavTask[] {
  const out: UavTask[] = []
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i
    const startOff = -(i + 1) * 7200
    const isRunning = i === 0
    out.push({
      task_pk: `t-${sn}-${idx}`,
      source_system_code: SOURCE_SYSTEM_CODE,
      source_task_id: `T-2026-${sn.replace('A-', '')}-${String(idx).padStart(3, '0')}`,
      drone_sn: sn,
      task_status_code: isRunning ? 'EXECUTING' : i % 5 === 3 ? 'CANCELED' : 'COMPLETED',
      started_at: at(startOff),
      ended_at: isRunning ? null : at(startOff + 3300),
      flown_duration_sec: isRunning ? 1380 : 3300,
    })
  }
  return out
}

export const TASKS: UavTask[] = [
  ...makeTasks('A-001', 12),
  ...makeTasks('A-002', 6),
  ...makeTasks('A-004', 4),
]

// A-001 追加一条时间倒挂的异常任务（E-14：原样展示不自动修正）
TASKS.push({
  task_pk: 't-A-001-bad',
  source_system_code: SOURCE_SYSTEM_CODE,
  source_task_id: 'T-2026-001-099',
  drone_sn: 'A-001',
  task_status_code: 'COMPLETED',
  started_at: at(-3600),
  ended_at: at(-5400),
  flown_duration_sec: null,
})

// A-003 一条未映射状态的任务（D-06：不强行归类）
TASKS.push({
  task_pk: 't-A-003-1',
  source_system_code: SOURCE_SYSTEM_CODE,
  source_task_id: 'T-2026-003-001',
  drone_sn: 'A-003',
  task_status_code: 'SUSPEND_BY_OP',
  started_at: at(-86400),
  ended_at: at(-82800),
  flown_duration_sec: 3600,
})

