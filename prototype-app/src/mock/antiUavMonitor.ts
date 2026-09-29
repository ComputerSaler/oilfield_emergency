/**
 * 反无监控 Mock 数据
 * PRD: 实时监控中心（PC端）· 反无监控 V1.0
 *
 * 与「反无设备台账 WS（ACCESS）」独立的「反无监控 WS」：
 * 推送侦测区/反制区边界坐标 + 实时目标轨迹点。
 * 反无设备基础信息只读复用 AntiUavList.vue 的 MOCK_ANTI_UAV_DEVICES。
 */

// ========================= 目标数据结构 =========================

export interface UavTarget {
  targetId: string
  lat: number
  lng: number
  speed: number        // m/s
  direction: string    // 十六方位，如 NE / SW
  firstSeenAt: string  // HH:mm:ss
  /** 告警状态：进入任一侦测区/反制区 */
  alert: boolean
  /** 进入的是否反制区（告警升级，error 级别） */
  inSuppressZone: boolean
  /** 消失标记（保留 60s） */
  gone: boolean
}

// ========================= 地图坐标范围 =========================

// 围绕 Koulele / Dibeilla / Goumeri 三营地反无设备分布范围取坐标边界
export const ANTI_MAP_BOUNDS = {
  latMin: 12.90, latMax: 13.75,
  lngMin: 2.02,  lngMax: 2.72,
}

export function antiCoordToPercent(lat: number, lng: number): { x: number; y: number } {
  const x = (lng - ANTI_MAP_BOUNDS.lngMin) / (ANTI_MAP_BOUNDS.lngMax - ANTI_MAP_BOUNDS.lngMin) * 100
  const y = (1 - (lat - ANTI_MAP_BOUNDS.latMin) / (ANTI_MAP_BOUNDS.latMax - ANTI_MAP_BOUNDS.latMin)) * 100
  return { x, y }
}

// ========================= 初始目标（WS 首帧）=========================

export const INITIAL_TARGETS: UavTarget[] = [
  {
    targetId: 'T-01',
    lat: 13.318, lng: 2.648,
    speed: 15, direction: 'NE',
    firstSeenAt: '14:32:05',
    alert: false, inSuppressZone: false, gone: false,
  },
  {
    targetId: 'T-02',
    lat: 13.527, lng: 2.126,
    speed: 22, direction: 'SW',
    firstSeenAt: '14:35:18',
    alert: true, inSuppressZone: true, gone: false,
  },
]
