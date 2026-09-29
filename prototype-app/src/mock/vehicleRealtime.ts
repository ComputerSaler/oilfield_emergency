/**
 * 车辆实况 Mock 数据
 */

export type VehicleOnlineStatus = 'ONLINE' | 'OFFLINE'
export type VehicleType = '安保用车' | '生产用车' | '生活用车'

export interface VehicleRealtimeData {
  vehicle_id: string          // 车辆ID（唯一键）
  plate_number: string        // 车牌号
  vehicle_type: VehicleType   // 车辆类型
  camp: string                // 所属营地
  online_status: VehicleOnlineStatus
  current_speed_kmh: number | null  // 当前速度 km/h，离线时为 null
  telemetry?: {
    latitude: number
    longitude: number
    speed_kmh: number
    heading: number           // 行驶方向（度）
    last_update: string       // 最后更新时间
  }
}

const CAMPS = ['Jaouro', 'Koulele', 'Dibeilla']
const VEHICLE_TYPES: VehicleType[] = ['安保用车', '生产用车', '生活用车']

// 生成车牌号（尼日尔格式 NE-XXXXX）
function generatePlateNumber(index: number): string {
  return `NE-${String(index).padStart(5, '0')}`
}

// 生成随机经纬度（尼日尔油田区域）
function generateCoordinate(camp: string) {
  const baseCoords = {
    Jaouro: { lat: 13.5, lng: 2.1 },
    Koulele: { lat: 13.3, lng: 2.6 },
    Dibeilla: { lat: 13.7, lng: 2.8 },
  }
  const base = baseCoords[camp as keyof typeof baseCoords]
  return {
    latitude: base.lat + (Math.random() - 0.5) * 0.1,
    longitude: base.lng + (Math.random() - 0.5) * 0.1,
  }
}

// 生成 Mock 数据
const records: VehicleRealtimeData[] = []
let idCounter = 1

// 生成 20 辆车
for (let i = 0; i < 20; i++) {
  const camp = CAMPS[i % 3]
  const vehicleType = VEHICLE_TYPES[i % 3]
  const isOnline = Math.random() > 0.2  // 80% 在线
  const speed = isOnline ? Math.floor(Math.random() * 90) : null
  const coords = generateCoordinate(camp)

  const vehicle: VehicleRealtimeData = {
    vehicle_id: `VEH-${idCounter++}`,
    plate_number: generatePlateNumber(1000 + i),
    vehicle_type: vehicleType,
    camp,
    online_status: isOnline ? 'ONLINE' : 'OFFLINE',
    current_speed_kmh: speed,
  }

  if (isOnline && speed !== null) {
    vehicle.telemetry = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed_kmh: speed,
      heading: Math.floor(Math.random() * 360),
      last_update: new Date(Date.now() - Math.random() * 60000).toISOString(),
    }
  }

  records.push(vehicle)
}

export const VEHICLE_REALTIME_DATA = records

export const CAMP_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: 'Jaouro', value: 'Jaouro' },
  { label: 'Koulele', value: 'Koulele' },
  { label: 'Dibeilla', value: 'Dibeilla' },
]

export const VEHICLE_TYPE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '安保用车', value: '安保用车' },
  { label: '生产用车', value: '生产用车' },
  { label: '生活用车', value: '生活用车' },
]
