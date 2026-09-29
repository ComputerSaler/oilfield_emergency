/**
 * A 类无人机页面通用展示与校验规则 —— PRD 6.7
 *
 * D-02 空值统一 `--`，禁止用 0 替代未知累计值
 * D-03 数据异常（负数/非数字/时间倒挂）与 `--` 视觉区分，不参与排序与合计
 * D-04 源时间保留原时区，前台按统一业务时区展示（Q-17 待确认）
 * D-05 里程统一 km 2 位小数；航时统一 `Xh Xm`，不足 1 分钟显示 `<1 分钟`
 */
import { SYS_CONFIG } from '@/mock/aUav'

/** 空值占位 */
export const DASH = '--'
/** 数据异常占位（与空值视觉区分，D-03） */
export const ABNORMAL = '数据异常'

/** 项目统一业务时区偏移（小时）—— Q-17 假定尼日尔当地时间 UTC+1 */
const TZ_OFFSET_H = 1

function shift(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getTime() + TZ_OFFSET_H * 3600 * 1000)
}

const p2 = (n: number) => String(n).padStart(2, '0')

/** `YYYY-MM-DD HH:mm:ss`，按统一业务时区 */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return DASH
  const d = shift(iso)
  if (Number.isNaN(d.getTime())) return ABNORMAL
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(
    d.getUTCHours(),
  )}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`
}

/** 列表更新时间列：当日 `HH:mm:ss`，非当日 `MM-DD HH:mm` */
export function fmtListTime(iso: string | null | undefined): string {
  if (!iso) return DASH
  const d = shift(iso)
  if (Number.isNaN(d.getTime())) return ABNORMAL
  const today = shift(new Date().toISOString())
  const sameDay =
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate()
  return sameDay
    ? `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`
    : `${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
}

/** 仅 `HH:mm` */
export function fmtHm(iso: string | null | undefined): string {
  if (!iso) return DASH
  const d = shift(iso)
  if (Number.isNaN(d.getTime())) return ABNORMAL
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
}

/** 完整时间 + 原始时区，用于悬浮显示（D-04） */
export function fmtWithTz(iso: string | null | undefined): string {
  if (!iso) return DASH
  return `${fmtDateTime(iso)}（${SYS_CONFIG.timezone}）\n源时间原值：${iso}`
}

/** 里程：米 → km 保留 2 位（D-05）。负数/非数字 → 数据异常 */
export function fmtKm(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return DASH
  if (!Number.isFinite(meters) || meters < 0) return ABNORMAL
  return (meters / 1000).toFixed(2)
}

/** 航时：秒 → `Xh Xm`，不足 1 分钟 `<1 分钟`（D-05） */
export function fmtDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return DASH
  if (!Number.isFinite(sec) || sec < 0) return ABNORMAL
  if (sec < 60) return '<1 分钟'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** 架次：整数 ≥0，否则数据异常（E-12） */
export function fmtSorties(n: number | null | undefined): string {
  if (n === null || n === undefined) return DASH
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return ABNORMAL
  return String(n)
}

/** 相对时长描述，如「4 分钟前」 */
export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return DASH
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ABNORMAL
  const s = Math.max(0, Math.floor(diff / 1000))
  if (s < 60) return `${s} 秒前`
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}

/** 文本截断 + 是否需要悬浮显示完整值（E-43） */
export function truncate(text: string | null, max: number): { text: string; full: boolean } {
  const v = text ?? ''
  if (!v) return { text: DASH, full: false }
  return v.length > max ? { text: `${v.slice(0, max)}…`, full: true } : { text: v, full: false }
}

/** 任务时间倒挂判定（E-13） */
export function isTimeInverted(startedAt: string | null, endedAt: string | null): boolean {
  if (!startedAt || !endedAt) return false
  return new Date(endedAt).getTime() < new Date(startedAt).getTime()
}

/** 经纬度合法性（E-14）：须成对出现且在合法范围内 */
export function isCoordValid(lng: number | null, lat: number | null): boolean {
  if (lng === null || lat === null) return false
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}

/** 心跳超时秒数 = 通信周期 × 超时倍数 */
export const heartbeatTimeoutSec = SYS_CONFIG.commCycleSec * SYS_CONFIG.timeoutMultiple
