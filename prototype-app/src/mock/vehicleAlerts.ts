/**
 * 车辆预警 Mock 数据
 */

export type AlertType = 'SOS' | '超速'

export interface VehicleAlert {
  id: string
  vehicle_id: string
  plate_number: string
  camp: string
  alert_type: AlertType
  latitude: number
  longitude: number
  timestamp: string
  // 超速专有字段
  speed_kmh?: number
  speed_limit_kmh?: number
}

// 颜色映射
export const ALERT_TYPE_COLOR_MAP: Record<AlertType, string> = {
  SOS: '#ff6666',
  超速: '#faad14',
}

// 生成随机经纬度
function generateCoordinate(camp: string) {
  const baseCoords = {
    Jaouro: { lat: 13.5, lng: 2.1 },
    Koulele: { lat: 13.3, lng: 2.6 },
    Dibeilla: { lat: 13.7, lng: 2.8 },
  }
  const base = baseCoords[camp as keyof typeof baseCoords] || baseCoords.Jaouro
  return {
    latitude: base.lat + (Math.random() - 0.5) * 0.1,
    longitude: base.lng + (Math.random() - 0.5) * 0.1,
  }
}

// 生成预警记录
const alerts: VehicleAlert[] = []
let idCounter = 1

const CAMPS = ['Jaouro', 'Koulele', 'Dibeilla']
const SPEED_LIMIT = 80  // 统一限速 80 km/h

// 生成 30 条预警记录（过去 7 天内）
for (let i = 0; i < 30; i++) {
  const camp = CAMPS[Math.floor(Math.random() * CAMPS.length)]
  const alertType: AlertType = Math.random() > 0.6 ? 'SOS' : '超速'
  const coords = generateCoordinate(camp)
  const daysAgo = Math.floor(Math.random() * 7)
  const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000)

  const alert: VehicleAlert = {
    id: `ALT-${String(idCounter++).padStart(4, '0')}`,
    vehicle_id: `VEH-${Math.floor(Math.random() * 20) + 1}`,
    plate_number: `NE-${String(1000 + Math.floor(Math.random() * 20)).padStart(5, '0')}`,
    camp,
    alert_type: alertType,
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: timestamp.toISOString(),
  }

  // 超速类型添加速度信息
  if (alertType === '超速') {
    alert.speed_kmh = SPEED_LIMIT + Math.floor(Math.random() * 40) + 1  // 超速 1-40 km/h
    alert.speed_limit_kmh = SPEED_LIMIT
  }

  alerts.push(alert)
}

// 按时间倒序
alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

export const VEHICLE_ALERTS = alerts

export const ALERT_TYPE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: 'SOS', value: 'SOS' },
  { label: '超速', value: '超速' },
]

export const TIME_RANGE_OPTIONS = [
  { label: '今日', value: 'today' },
  { label: '近7天', value: 'week' },
  { label: '近30天', value: 'month' },
  { label: '自定义', value: 'custom' },
]
