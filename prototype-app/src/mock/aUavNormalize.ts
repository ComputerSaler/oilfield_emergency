/**
 * A 类无人机数据转换层 —— 实现 PRD V3.0「Kafka 实时推送」
 *
 * V3.0 核心变更：统一数据源通过 Kafka 实时推送 4 条源记录，与 4 架实体飞机一一对应。
 * 不再有数据新鲜度判定、同步延迟/中断状态等逻辑。
 *
 * ⚠ 真实实现中这一层在服务端（非功能项 B-01），前端不做数据处理。
 * 原型把它放前端，只为让「演示控制台」能现场改源记录来制造异常。
 */
import {
  MANAGEMENT_STATUS_LABEL,
  CAMP_DICT,
  EXTENSIONS,
  FLIGHT_STATUS_DICT,
  SOURCE_RECORDS,
  type ManagementStatus,
  type OnlineSource,
  type OnlineStatus,
  type UavExtension,
  type UavSourceRecord,
} from './aUav'

export { MANAGEMENT_STATUS_LABEL }

/** 逻辑飞机（`a_uav_device`）—— 对外展示的单一记录 */
export interface LogicalUav {
  drone_id: string
  drone_sn: string
  /** 源记录（单一数据源，1:1 对应） */
  source_record: UavSourceRecord
  management_status: ManagementStatus
  disabled_reason: string | null
  disabled_by: string | null
  disabled_at: string | null
  archived_by: string | null
  archived_at: string | null
  /** 对外展示值（取自源记录） */
  aircraft_name: string | null
  flight_status_code: string | null
  online_status: OnlineStatus
  online_status_source: OnlineSource
  ground_station_name: string | null
  last_flight_at: string | null
  /** 累计飞行数据（单一口径，平台不二次汇总） */
  total_sorties: number | null
  total_flight_distance_m: number | null
  total_flight_duration_sec: number | null
  current_camp_code: string | null
  ext: UavExtension
}

/** 演示控制台可注入的覆盖项 */
export interface NormalizeOverrides {
  /** 列表加载结果（由调用方透传，转换层本身不消费） */
  listLoadState?: 'OK' | 'FAILED' | 'EMPTY_SOURCE'
  /** 按 SN 强制指定管理状态（模拟人工停用/归档等平台侧写入） */
  managementStatusBySn?: Record<string, ManagementStatus>
  /** 按 SN 覆盖在线状态（模拟 WS 推送） */
  onlineOverrideBySn?: Record<string, { status: OnlineStatus; source: OnlineSource }>
  /** 停用/归档台账 */
  disableInfoBySn?: Record<string, { reason: string; by: string; at: string }>
  archiveInfoBySn?: Record<string, { by: string; at: string }>
  /** 扩展信息覆盖（详情页保存后写在这里，演示「同步不覆盖扩展字段」A-09） */
  extOverrideBySn?: Record<string, Partial<UavExtension>>
}

/** 由当前地面站推导当前所在营地 */
function deriveCamp(groundStationName: string | null): string | null {
  if (!groundStationName) return null
  const hit = CAMP_DICT.find((c) => groundStationName.startsWith(c.name.replace(' 营地', '')))
  return hit?.code ?? null
}

/** 数据转换主入口：源记录 → 逻辑飞机列表（Kafka 实时推送模式） */
export function normalize(
  records: UavSourceRecord[] = SOURCE_RECORDS,
  ov: NormalizeOverrides = {},
): LogicalUav[] {
  const out: LogicalUav[] = []
  for (const record of records) {
    const sn = record.drone_sn
    // E-11：SN 为空或非法的源记录不入库
    if (!sn || sn.length > 64) continue

    const managementStatus = ov.managementStatusBySn?.[sn] ?? 'NORMAL'

    const onlineOv = ov.onlineOverrideBySn?.[sn]
    const baseExt = EXTENSIONS.find((e) => e.drone_sn === sn)
    const ext: UavExtension = {
      ...(baseExt ?? {
        drone_sn: sn,
        serviceable_camps: CAMP_DICT.map((c) => c.code), // 建档时默认为营地字典全集
        display_icon_id: null,
        responsible_org: '',
        responsible_person_id: null,
        show_on_bigscreen: true,
        ops_remark: '',
        updated_by: '',
        updated_at: '',
      }),
      ...(ov.extOverrideBySn?.[sn] ?? {}),
    }

    const groundStation = record.ground_station_name

    out.push({
      drone_id: `uav-${sn}`,
      drone_sn: sn,
      source_record: record,
      management_status: managementStatus,
      disabled_reason: ov.disableInfoBySn?.[sn]?.reason ?? null,
      disabled_by: ov.disableInfoBySn?.[sn]?.by ?? null,
      disabled_at: ov.disableInfoBySn?.[sn]?.at ?? null,
      archived_by: ov.archiveInfoBySn?.[sn]?.by ?? null,
      archived_at: ov.archiveInfoBySn?.[sn]?.at ?? null,
      aircraft_name: record.aircraft_name,
      flight_status_code: record.flight_status_code,
      online_status: onlineOv?.status ?? record.online_status,
      online_status_source: onlineOv?.source ?? record.online_status_source,
      ground_station_name: groundStation,
      last_flight_at: record.last_flight_at,
      total_sorties: record.total_sorties,
      total_flight_distance_m: record.total_flight_distance_m,
      total_flight_duration_sec: record.total_flight_duration_sec,
      current_camp_code: deriveCamp(groundStation),
      ext,
    })
  }

  // 默认按最后更新时间倒序（列表默认排序列）
  return out.sort((a, b) =>
    new Date(b.source_record.last_updated_at).getTime() - new Date(a.source_record.last_updated_at).getTime()
  )
}

/** 飞行状态源编码 → 字典项；未映射返回 null（E-18，禁止归入已知状态） */
export function flightStatusOf(code: string | null) {
  if (!code) return null
  return FLIGHT_STATUS_DICT.find((d) => d.code === code) ?? null
}

/** 营地编码 → 全称 */
export function campName(code: string): string {
  return CAMP_DICT.find((c) => c.code === code)?.name ?? code
}
