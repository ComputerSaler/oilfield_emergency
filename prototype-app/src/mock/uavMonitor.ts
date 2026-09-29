/**
 * 无人机监控 Mock 数据
 * PRD: 实时监控中心（PC端）· 无人机监控 V1.0
 *
 * C类（AIRIOT 中台）5 架 + A类（航天中台）2 架
 * 原型阶段模拟 WS 增量推送：position/battery/speed/heading
 */

export type UavClass = 'C' | 'A'
export type UavFlightStatus = 'flying' | 'grounded' | 'offline'

export interface UavDevice {
  id: string
  name: string
  sn: string
  uavClass: UavClass
  campCode: string
  campName: string
  accessStatus: 'ONLINE' | 'OFFLINE'
  flightStatus: UavFlightStatus
  /** 经纬度（小数点后 6 位精度） */
  lat: number
  lng: number
  /** 航向角 0-360° */
  heading: number
  altitude: number    // m
  speed: number       // m/s
  battery: number     // 0-100%
  waypointIndex?: number
  totalWaypoints?: number
  lastFlightTime?: string
  /** HLS 视频流地址（TBD-03，原型占位） */
  streamUrl?: string
}

// Niger / Agadem 区块实际地理参考坐标（约 16-17°N, 13-14°E）
export const MOCK_UAV_DEVICES: UavDevice[] = [
  // ── C 类无人机（AIRIOT 中台）──
  {
    id: 'c-001', name: 'DJI M30T · J01', sn: 'DJI-J01-A1B2C3',
    uavClass: 'C', campCode: 'Jaouro', campName: 'Jaouro 营地',
    accessStatus: 'ONLINE', flightStatus: 'flying',
    lat: 17.21, lng: 13.62, heading: 45,
    altitude: 120, speed: 12, battery: 78,
    waypointIndex: 3, totalWaypoints: 8,
    streamUrl: 'http://placeholder/stream/c-001.m3u8',
  },
  {
    id: 'c-002', name: 'DJI M30T · J02', sn: 'DJI-J02-D4E5F6',
    uavClass: 'C', campCode: 'Jaouro', campName: 'Jaouro 营地',
    accessStatus: 'ONLINE', flightStatus: 'grounded',
    lat: 17.195, lng: 13.605, heading: 0,
    altitude: 0, speed: 0, battery: 92,
    lastFlightTime: '2026-08-15 14:32',
  },
  {
    id: 'c-003', name: 'DJI M30T · K01', sn: 'DJI-K01-G7H8I9',
    uavClass: 'C', campCode: 'Koulele', campName: 'Koulele 营地',
    accessStatus: 'ONLINE', flightStatus: 'flying',
    lat: 16.75, lng: 13.48, heading: 135,
    altitude: 95, speed: 8, battery: 55,
    streamUrl: 'http://placeholder/stream/c-003.m3u8',
  },
  {
    id: 'c-004', name: 'DJI M30 · K02', sn: 'DJI-K02-J1K2L3',
    uavClass: 'C', campCode: 'Koulele', campName: 'Koulele 营地',
    accessStatus: 'OFFLINE', flightStatus: 'offline',
    lat: 16.77, lng: 13.50, heading: 0,
    altitude: 0, speed: 0, battery: 18,
    lastFlightTime: '2026-08-14 09:15',
  },
  {
    id: 'c-005', name: 'DJI M30T · D01', sn: 'DJI-D01-M4N5O6',
    uavClass: 'C', campCode: 'Dibeilla', campName: 'Dibeilla 营地',
    accessStatus: 'ONLINE', flightStatus: 'grounded',
    lat: 16.85, lng: 13.68, heading: 270,
    altitude: 0, speed: 0, battery: 100,
    lastFlightTime: '2026-08-16 07:44',
  },
  // ── A 类无人机（航天中台）──
  {
    id: 'a-001', name: 'CHIHENG-ZL-01', sn: 'AUAV-2024-001',
    uavClass: 'A', campCode: 'Agadem', campName: 'Agadem 营地',
    accessStatus: 'ONLINE', flightStatus: 'flying',
    lat: 16.83, lng: 13.85, heading: 210,
    altitude: 200, speed: 25, battery: 62,
    waypointIndex: 6, totalWaypoints: 12,
    streamUrl: 'http://placeholder/stream/a-001.m3u8',
  },
  {
    id: 'a-002', name: 'CHIHENG-ZL-02', sn: 'AUAV-2024-002',
    uavClass: 'A', campCode: 'Sokor', campName: 'Sokor 营地',
    accessStatus: 'ONLINE', flightStatus: 'grounded',
    lat: 16.92, lng: 13.72, heading: 0,
    altitude: 0, speed: 0, battery: 88,
    lastFlightTime: '2026-08-15 16:20',
  },
]

/** 地图边界框 —— 尼亚美尔/Agadem 区块，留适当边距 */
export const MAP_BOUNDS = {
  latMin: 16.60, latMax: 17.40,
  lngMin: 13.32, lngMax: 14.10,
}

/** lat/lng → 地图容器内百分比坐标 (x%, y%) */
export function coordToPercent(lat: number, lng: number): { x: number; y: number } {
  const x = (lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin) * 100
  const y = (1 - (lat - MAP_BOUNDS.latMin) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * 100
  return { x, y }
}
