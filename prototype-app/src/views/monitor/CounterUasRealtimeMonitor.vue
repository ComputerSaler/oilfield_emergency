<script setup lang="ts">
/**
 * 反无系统实况 —— 实时监控中心
 * 左侧反无系统卡片列表（按营地聚合）+ 右侧GIS地图
 */
import { computed, ref } from 'vue'
import { RightOutlined, LeftOutlined, AimOutlined, RadarChartOutlined, CloseOutlined, AppstoreOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import MapSimulator from './components/MapSimulator.vue'
import DetectedDronesPanel from './components/DetectedDronesPanel.vue'
import {
  COUNTER_UAS_REALTIME_DATA,
  CAMP_OPTIONS,
  STATUS_COLOR_MAP,
  STATUS_TEXT_MAP,
  type CounterUasDevice,
} from '@/mock/counterUasRealtime'

// ============================ 反无系统数据类型 ============================

interface CounterUasSystem {
  camp: string // 营地名称
  status: 'detecting' | 'striking' | 'offline' // 系统状态
  current_targets: number // 当前探测目标总数
  devices: CounterUasDevice[] // 该营地下的所有设备
  latitude: number // 用于定位的经纬度（暂时使用第一个设备）
  longitude: number
  // 今日统计
  today_detection_count: number // 当日探测次数
  today_warning_count: number // 当日预警次数
  today_intrusion_count: number // 当日入侵次数
  // 反制设备信息
  striking_devices: string // 打击中的反制设备（格式：设备名（方式）、设备名（方式））
}

// ============================ MapSimulator ref ============================

const mapSimulatorRef = ref<any>(null)
const detectedDronesPanelRef = ref<any>(null)

// ============================ 面板收起/展开 ============================

const leftPanelCollapsed = ref(false)
const rightPanelCollapsed = ref(false)

function toggleLeftPanel() {
  leftPanelCollapsed.value = !leftPanelCollapsed.value
}

// ============================ 按营地聚合反无系统 ============================

const counterUasSystems = computed<CounterUasSystem[]>(() => {
  // 按营地分组
  const campMap = new Map<string, CounterUasDevice[]>()

  COUNTER_UAS_REALTIME_DATA.forEach((device) => {
    if (!campMap.has(device.camp)) {
      campMap.set(device.camp, [])
    }
    campMap.get(device.camp)!.push(device)
  })

  // 为每个营地生成系统数据
  const systems: CounterUasSystem[] = []

  campMap.forEach((devices, camp) => {
    // 计算系统状态：打击中 > 探测中 > 离线
    let systemStatus: 'detecting' | 'striking' | 'offline' = 'offline'

    const hasStriking = devices.some((d) => d.status === 'striking')
    const hasDetecting = devices.some((d) => d.status === 'detecting')

    if (hasStriking) {
      systemStatus = 'striking'
    } else if (hasDetecting) {
      systemStatus = 'detecting'
    }

    // 计算探测目标总数
    const totalTargets = devices.reduce((sum, d) => sum + d.current_targets, 0)

    // 汇总今日统计
    const todayDetectionCount = devices.reduce((sum, d) => sum + d.today_detection_count, 0)
    const todayWarningCount = devices.reduce((sum, d) => sum + d.today_warning_count, 0)
    const todayIntrusionCount = devices.reduce((sum, d) => sum + d.today_intrusion_count, 0)

    // 获取打击中的反制设备
    const strikingDevices = devices.filter(
      (d) => d.device_type === 'counteract' && d.status === 'striking'
    )

    const strikingDevicesText = strikingDevices.length > 0
      ? strikingDevices
          .map((d) => {
            const mode = d.counteract_mode === 'auto' ? '自动' : '手动'
            return `${d.name}（${mode}）`
          })
          .join('、')
      : '-'

    // 使用第一个设备的经纬度（定位功能待确认后优化）
    const firstDevice = devices[0]

    systems.push({
      camp,
      status: systemStatus,
      current_targets: totalTargets,
      devices,
      latitude: firstDevice.latitude,
      longitude: firstDevice.longitude,
      today_detection_count: todayDetectionCount,
      today_warning_count: todayWarningCount,
      today_intrusion_count: todayIntrusionCount,
      striking_devices: strikingDevicesText,
    })
  })

  return systems
})

// ============================ 筛选 ============================

const selectedCamp = ref<string>('all')
const selectedStatus = ref<string>('all')

const filteredSystems = computed(() => {
  return counterUasSystems.value.filter((sys) => {
    // 营地筛选
    if (selectedCamp.value !== 'all' && sys.camp !== selectedCamp.value) {
      return false
    }
    // 状态筛选
    if (selectedStatus.value !== 'all' && sys.status !== selectedStatus.value) {
      return false
    }
    return true
  })
})

// ============================ KPI 统计 ============================

const kpiStats = computed(() => {
  const systems = filteredSystems.value
  const total = systems.length

  // 探测中：状态为 detecting 的系统
  const detecting = systems.filter((s) => s.status === 'detecting').length

  // 打击中：状态为 striking 的系统（打击中也在探测，所以计入探测中）
  const striking = systems.filter((s) => s.status === 'striking').length

  // 离线：状态为 offline 的系统
  const offline = systems.filter((s) => s.status === 'offline').length

  // 探测中总数 = 纯探测中 + 打击中（打击中也在探测）
  const detectingTotal = detecting + striking

  return { total, detecting: detectingTotal, striking, offline }
})

// ============================ MapSimulator 数据转换 ============================

const devicesForMap = computed(() => {
  return COUNTER_UAS_REALTIME_DATA.map((d) => ({
    id: d.id,
    name: d.name,
    type: '反无设备' as const,
    status: d.status === 'offline' ? 'offline' : 'online',
    battery: 0,
    position: { lat: d.latitude, lng: d.longitude },
  }))
})

// 图层控制
const layers = ref({
  uavPosition: false,
  alertEvent: false,
})

// ============================ 设备详情弹窗 ============================

const deviceDetailVisible = ref(false)
const selectedDevice = ref<CounterUasDevice | null>(null)

function showDeviceDetail(device: CounterUasDevice) {
  selectedDevice.value = device
  deviceDetailVisible.value = true
}

function closeDeviceDetail() {
  deviceDetailVisible.value = false
  selectedDevice.value = null
}

// 将经纬度转换为度分秒格式
function formatCoordinates(lat: number, lng: number): string {
  const formatDMS = (value: number, isLat: boolean) => {
    const absolute = Math.abs(value)
    const degrees = Math.floor(absolute)
    const minutesDecimal = (absolute - degrees) * 60
    const minutes = Math.floor(minutesDecimal)
    const seconds = Math.floor((minutesDecimal - minutes) * 60)

    const direction = isLat
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W')

    return `${degrees}°${minutes}'${seconds}"${direction}`
  }

  return `${formatDMS(lat, true)}, ${formatDMS(lng, false)}`
}

// 格式化通信时间
function formatCommunicationTime(isoTime: string): string {
  const d = new Date(isoTime)
  return d.toLocaleString('zh-CN', { hour12: false })
}

// ============================ 定位操作 ============================

const locatedSystem = ref<CounterUasSystem | null>(null)

// 无人机数据类型（敌方 + 己方）
interface DetectedDrone {
  id: string
  lat: number
  lng: number
  heading: number // 旋转角度 0-360
  type: 'enemy' | 'friendly' // 敌方 | 己方
  // 探测目标卡片字段
  sn: string // 序列号
  model: string // 型号
  speed: number // 速度 m/s
  altitude: number // 高度 m
  frequency: string // 频率
  azimuth: number // 方位角
  distance: number // 距离 m
  detection_start_time: string // 探测开始时间
}

// 当前定位系统的无人机列表
const detectedDrones = ref<DetectedDrone[]>([])

// 当前选中的无人机（用于 Popover）
const selectedDrone = ref<DetectedDrone | null>(null)
const dronePopoverVisible = ref(false)

// 当前时间（用于计算持续时长）
const currentTime = ref(Date.now())
let durationTimer: ReturnType<typeof setInterval> | null = null

function onSystemLocation(system: CounterUasSystem) {
  // 如果点击的是当前已定位的系统，关闭定位
  if (locatedSystem.value?.camp === system.camp) {
    locatedSystem.value = null
    detectedDrones.value = []
    return
  }

  // 显示新系统的定位
  locatedSystem.value = system

  // 生成探测到的无人机（数量 = current_targets）
  if (system.current_targets > 0) {
    detectedDrones.value = generateDetectedDrones(system.current_targets, system.latitude, system.longitude)
  } else {
    detectedDrones.value = []
  }

  // 联动右侧面板：设置筛选器为当前系统
  if (detectedDronesPanelRef.value) {
    detectedDronesPanelRef.value.setReportingSystem(system.camp)
  }

  if (mapSimulatorRef.value) {
    const systemData = {
      id: system.camp,
      name: system.camp,
      uavClass: 'CUAS',
      latitude: system.latitude,
      longitude: system.longitude,
      status: system.status,
    }
    mapSimulatorRef.value.openMapMode(systemData)
  }
}

// 生成探测到的无人机位置（敌方 + 己方混合，在中心点附近随机分布）
function generateDetectedDrones(count: number, centerLat: number, centerLng: number): DetectedDrone[] {
  const drones: DetectedDrone[] = []
  const radius = 0.015 // 经纬度偏移半径（约 1.5km）

  // 决定己方无人机数量（约 1/3 到 1/2）
  const friendlyCount = Math.max(1, Math.floor(count * (0.3 + Math.random() * 0.2)))

  // 无人机型号池
  const enemyModels = ['DJI Phantom 4', 'DJI Mavic 2', 'Autel EVO II', '未知型号']
  const friendlyModels = ['DJI M300 RTK', 'DJI M30T', 'Autel EVO Max 4T']
  const frequencies = ['2.4GHz', '5.8GHz', '900MHz']

  // 基准时间（几分钟前开始探测）
  const baseTime = Date.now() - Math.random() * 300000 // 0-5分钟前

  for (let i = 0; i < count; i++) {
    // 随机角度和距离
    const angle = Math.random() * 2 * Math.PI
    const distance = radius * (0.3 + Math.random() * 0.7) // 30%-100% 的半径范围

    const lat = centerLat + distance * Math.cos(angle)
    const lng = centerLng + distance * Math.sin(angle)
    const heading = Math.floor(Math.random() * 360) // 随机朝向

    // 前 friendlyCount 个是己方，其余是敌方
    const type = i < friendlyCount ? 'friendly' : 'enemy'

    // 计算方位角（相对于中心点）
    const azimuth = Math.floor((angle * 180 / Math.PI) % 360)

    // 计算距离（米）
    const distanceMeters = Math.floor(distance * 111000 * (0.8 + Math.random() * 0.4)) // 经纬度转米，加随机扰动

    // 随机探测开始时间（在基准时间附近）
    const detectionStartTime = new Date(baseTime + Math.random() * 60000).toISOString()

    drones.push({
      id: `drone-${type}-${i}`,
      lat,
      lng,
      heading,
      type,
      sn: type === 'friendly'
        ? `F-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        : `E-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      model: type === 'friendly'
        ? friendlyModels[Math.floor(Math.random() * friendlyModels.length)]
        : enemyModels[Math.floor(Math.random() * enemyModels.length)],
      speed: Math.floor(Math.random() * 20 + 5), // 5-25 m/s
      altitude: Math.floor(Math.random() * 200 + 50), // 50-250 m
      frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
      azimuth,
      distance: distanceMeters,
      detection_start_time: detectionStartTime,
    })
  }

  // 打乱顺序，避免己方总是排在前面
  return drones.sort(() => Math.random() - 0.5)
}

// ============================ 测距圈功能 ============================

interface RangeCircle {
  id: string
  x: number // 屏幕坐标百分比 (0-100)
  y: number // 屏幕坐标百分比 (0-100)
  rings: number[] // 距离圈半径（km）
}

const rangeCircles = ref<RangeCircle[]>([])
const rangingMode = ref(false)
let rangeCircleSeq = 0

// 5km 间隔，显示 5 个圈
const RANGE_RINGS_KM = [5, 10, 15, 20, 25]

function toggleRangingMode() {
  rangingMode.value = !rangingMode.value
  if (rangingMode.value) {
    message.info('测距模式已开启，点击地图任意位置放置测距圈', 3)
  } else {
    message.info('测距模式已关闭', 2)
  }
}

function clearAllRangeCircles() {
  rangeCircles.value = []
  message.success('已清除所有测距圈', 2)
}

function removeRangeCircle(id: string) {
  const idx = rangeCircles.value.findIndex(c => c.id === id)
  if (idx >= 0) rangeCircles.value.splice(idx, 1)
}

// 点击地图空白处关闭定位标记
function onMapClick(event: MouseEvent) {
  // 测距模式：添加测距圈
  if (rangingMode.value) {
    const mapEl = event.currentTarget as HTMLElement
    const rect = mapEl.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    rangeCircleSeq++
    rangeCircles.value.push({
      id: `range-${rangeCircleSeq}`,
      x,
      y,
      rings: RANGE_RINGS_KM,
    })
    console.log('Added range circle at:', x, y, rangeCircles.value)
    return
  }

  // 原有逻辑：关闭定位标记
  locatedSystem.value = null
  detectedDrones.value = []
  dronePopoverVisible.value = false
  selectedDrone.value = null

  // 重置右侧面板筛选器为"全部系统"
  if (detectedDronesPanelRef.value) {
    detectedDronesPanelRef.value.setReportingSystem('all')
  }
}

// 点击定位标记本身关闭
function onMarkerClick() {
  locatedSystem.value = null
  detectedDrones.value = []
  dronePopoverVisible.value = false
  selectedDrone.value = null

  // 重置右侧面板筛选器为"全部系统"
  if (detectedDronesPanelRef.value) {
    detectedDronesPanelRef.value.setReportingSystem('all')
  }
}

// ============================ 无人机点击事件 ============================

function onDroneClick(drone: DetectedDrone, event: MouseEvent) {
  event.stopPropagation()
  selectedDrone.value = drone
  dronePopoverVisible.value = true

  // 启动时间更新定时器
  if (!durationTimer) {
    durationTimer = setInterval(() => {
      currentTime.value = Date.now()
    }, 1000)
  }
}

function closeDronePopover() {
  dronePopoverVisible.value = false
  selectedDrone.value = null

  // 停止时间更新定时器
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
}

// 格式化持续时长
function formatDuration(startTime: string): string {
  const start = new Date(startTime).getTime()
  const diff = currentTime.value - start

  if (diff < 0) return '0秒'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分${seconds % 60}秒`
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`
  } else {
    return `${seconds}秒`
  }
}

// 格式化时间
function formatTime(isoTime: string): string {
  const d = new Date(isoTime)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

// 格式化距离
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`
  }
  return `${Math.round(meters)}m`
}

// 格式化方位角与距离
function formatAzimuthDistance(azimuth: number, distance: number): string {
  return `${azimuth}°-${formatDistance(distance)}`
}

// ============================ 详情弹窗 ============================

const detailVisible = ref(false)
const selectedSystem = ref<CounterUasSystem | null>(null)

function showDetail(system: CounterUasSystem) {
  selectedSystem.value = system
  detailVisible.value = true
}

function closeDetail() {
  detailVisible.value = false
  selectedSystem.value = null
}

// ============================ 格式化工具 ============================

function formatCoordinate(lng: number, lat: number): string {
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
}

// ============================ 设备图标位置计算 ============================

function getDeviceIconPosition(index: number, total: number) {
  // 在中心点附近圆形均匀分布
  const radius = 100 // 分布半径 100px
  const angle = (index / total) * 2 * Math.PI // 均匀分布角度

  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius

  return {
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
  }
}

// ============================ 探测到的无人机位置计算 ============================

function getDronePosition(drone: DetectedDrone) {
  // 将经纬度转换为屏幕百分比坐标
  if (!locatedSystem.value) return { left: '50%', top: '50%' }

  const centerLat = locatedSystem.value.latitude
  const centerLng = locatedSystem.value.longitude

  // 经纬度差值
  const dLat = drone.lat - centerLat
  const dLng = drone.lng - centerLng

  // 转换为像素偏移（粗略转换，1度 ≈ 111km ≈ 200px on screen）
  const scale = 6000 // 调整系数
  const offsetX = dLng * scale
  const offsetY = -dLat * scale // Y轴反向

  return {
    left: `calc(50% + ${offsetX}px)`,
    top: `calc(50% + ${offsetY}px)`,
  }
}

// ============================ 设备列表表格列定义 ============================

const deviceColumns = [
  {
    title: '设备名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '类型',
    key: 'device_type',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '当前探测',
    key: 'current_targets',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '型号',
    dataIndex: 'model',
    key: 'model',
    width: 160,
  },
  {
    title: '打击模式',
    key: 'strike_mode',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '持续时间（s）',
    key: 'strike_duration',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '反制功率（%）',
    key: 'strike_power',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '经纬度',
    key: 'coordinate',
    width: 180,
  },
]
</script>

<template>
  <PageContainer title="反无系统实况">
    <div class="realtime-container">
      <!-- GIS地图背景 -->
      <div class="map-background" @click="onMapClick">

        <!-- 测距工具按钮 -->
        <div class="ranging-toolbar">
          <button
            class="ranging-btn"
            :class="{ active: rangingMode }"
            @click.stop="toggleRangingMode"
            title="测距工具"
          >
            <AimOutlined />
          </button>
          <button
            v-if="rangeCircles.length > 0"
            class="ranging-btn ranging-btn--clear"
            @click.stop="clearAllRangeCircles"
            title="清除所有测距圈"
          >
            ×
          </button>
        </div>

        <MapSimulator
          ref="mapSimulatorRef"
          :drones="devicesForMap"
          :alerts="[]"
          :events="[]"
          :layers="layers"
          :show-entity-markers="false"
          :show-legend="false"
        />

        <!-- 定位标记：测距网格 + 预警区 + 反制区 + 中心点 + 设备图标 + 敌方无人机 -->
        <div v-if="locatedSystem" class="location-marker" @click.stop="onMarkerClick">
          <!-- 测距范围网格（极坐标） -->
          <svg class="range-grid" viewBox="-400 -400 800 800" xmlns="http://www.w3.org/2000/svg">
            <!-- 同心圆：1.5km、3km、4.5km、6km -->
            <circle cx="0" cy="0" r="100" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <circle cx="0" cy="0" r="200" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <circle cx="0" cy="0" r="300" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <circle cx="0" cy="0" r="400" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />

            <!-- 放射状方位角线（每30°一条，共12条） -->
            <line x1="0" y1="0" x2="0" y2="-400" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="200" y2="-346.41" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="346.41" y2="-200" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="400" y2="0" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="346.41" y2="200" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="200" y2="346.41" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="0" y2="400" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="-200" y2="346.41" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="-346.41" y2="200" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="-400" y2="0" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="-346.41" y2="-200" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
            <line x1="0" y1="0" x2="-200" y2="-346.41" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />

            <!-- 方位角标注（外圈） -->
            <text x="0" y="-415" text-anchor="middle" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">0°</text>
            <text x="220" y="-346" text-anchor="start" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">30°</text>
            <text x="366" y="-195" text-anchor="start" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">60°</text>
            <text x="415" y="5" text-anchor="start" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">90°</text>
            <text x="366" y="210" text-anchor="start" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">120°</text>
            <text x="220" y="361" text-anchor="start" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">150°</text>
            <text x="0" y="428" text-anchor="middle" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">180°</text>
            <text x="-220" y="361" text-anchor="end" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">210°</text>
            <text x="-366" y="210" text-anchor="end" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">240°</text>
            <text x="-415" y="5" text-anchor="end" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">270°</text>
            <text x="-366" y="-195" text-anchor="end" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">300°</text>
            <text x="-220" y="-346" text-anchor="end" fill="rgba(255, 255, 255, 0.4)" font-size="11" font-family="monospace">330°</text>

            <!-- 距离标注（右侧） -->
            <text x="105" y="5" text-anchor="start" fill="rgba(255, 255, 255, 0.5)" font-size="10" font-weight="500">1.5km</text>
            <text x="205" y="5" text-anchor="start" fill="rgba(255, 255, 255, 0.5)" font-size="10" font-weight="500">3km</text>
            <text x="305" y="5" text-anchor="start" fill="rgba(255, 255, 255, 0.5)" font-size="10" font-weight="500">4.5km</text>
            <text x="405" y="5" text-anchor="start" fill="rgba(255, 255, 255, 0.5)" font-size="10" font-weight="500">6km</text>
          </svg>

          <!-- 预警区（黄色外圈） -->
          <div class="warning-zone"></div>

          <!-- 反制区（红色内圈） -->
          <div class="counteract-zone"></div>

          <!-- 中心点雷达图标 -->
          <div class="center-radar">
            <RadarChartOutlined />
          </div>

          <!-- 设备图标（在中心点附近均匀分布） -->
          <div
            v-for="(device, index) in locatedSystem.devices"
            :key="device.id"
            class="device-icon"
            :style="getDeviceIconPosition(index, locatedSystem.devices.length)"
            @click.stop="showDeviceDetail(device)"
          >
            <!-- 设备图标 -->
            <div class="device-icon-symbol">
              <img
                v-if="device.device_type === 'detect'"
                src="/device-detect.svg"
                alt="侦测设备"
                class="device-icon-image"
              />
              <img
                v-else
                src="/device-counteract.svg"
                alt="反制设备"
                class="device-icon-image"
              />
            </div>
            <!-- 设备名称标签 -->
            <div class="device-icon-label">{{ device.name }}</div>
          </div>

          <!-- 探测到的无人机图标（敌方 + 己方） -->
          <a-popover
            v-for="drone in detectedDrones"
            :key="drone.id"
            :open="dronePopoverVisible && selectedDrone?.id === drone.id"
            placement="right"
            trigger="click"
            :overlayStyle="{ zIndex: 30 }"
            @openChange="(visible) => { if (!visible) closeDronePopover() }"
          >
            <template #content>
              <div class="drone-popover-content">
                <!-- 关闭按钮 -->
                <div class="drone-popover-close" @click="closeDronePopover">
                  <CloseOutlined />
                </div>

                <!-- 第一行：SN + 白名单徽章 -->
                <div class="drone-popover-header">
                  <span class="drone-popover-sn">{{ drone.sn }}</span>
                  <span v-if="drone.type === 'friendly'" class="whitelist-badge">白名单</span>
                </div>

                <!-- 第二行：型号 -->
                <div class="drone-popover-model">{{ drone.model }}</div>

                <!-- 分割线 -->
                <div class="drone-popover-divider"></div>

                <!-- 两列布局 -->
                <div class="drone-popover-grid">
                  <div class="drone-popover-row">
                    <span class="drone-popover-label">速度</span>
                    <span class="drone-popover-value">{{ drone.speed }} m/s</span>
                  </div>
                  <div class="drone-popover-row">
                    <span class="drone-popover-label">高度</span>
                    <span class="drone-popover-value">{{ drone.altitude }} m</span>
                  </div>
                  <div class="drone-popover-row">
                    <span class="drone-popover-label">频率</span>
                    <span class="drone-popover-value">{{ drone.frequency }}</span>
                  </div>
                  <div class="drone-popover-row">
                    <span class="drone-popover-label">方位距离</span>
                    <span class="drone-popover-value">{{ formatAzimuthDistance(drone.azimuth, drone.distance) }}</span>
                  </div>
                  <div class="drone-popover-row">
                    <span class="drone-popover-label">开始</span>
                    <span class="drone-popover-value">{{ formatTime(drone.detection_start_time) }}</span>
                  </div>
                  <div class="drone-popover-row">
                    <span class="drone-popover-label">持续</span>
                    <span class="drone-popover-value drone-popover-value--highlight">{{ formatDuration(drone.detection_start_time) }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div
              class="detected-drone-icon"
              :class="`detected-drone-icon--${drone.type}`"
              :style="getDronePosition(drone)"
              @click="onDroneClick(drone, $event)"
            >
              <!-- 己方无人机：使用 drone-icon.png -->
              <img
                v-if="drone.type === 'friendly'"
                src="/drone-icon.png"
                alt="己方无人机"
                class="drone-image"
                :style="{ transform: `rotate(${drone.heading}deg)` }"
              />
              <!-- 敌方无人机：使用 enemy-drone-icon.png -->
              <img
                v-else
                src="/enemy-drone-icon.png"
                alt="敌方无人机"
                class="drone-image"
                :style="{ transform: `rotate(${drone.heading}deg)` }"
              />
            </div>
          </a-popover>
        </div>

        <!-- 测距圈渲染 -->
        <div
          v-for="rc in rangeCircles"
          :key="rc.id"
          class="custom-range-marker"
          :style="{ left: rc.x + '%', top: rc.y + '%' }"
          @click.stop="removeRangeCircle(rc.id)"
        >
          <svg class="custom-range-svg" viewBox="-400 -400 800 800" xmlns="http://www.w3.org/2000/svg">
            <!-- 同心圆：每5km一圈 -->
            <circle
              v-for="(radiusKm, idx) in rc.rings"
              :key="`circle-${idx}`"
              cx="0"
              cy="0"
              :r="radiusKm * 20"
              fill="none"
              stroke="#00ffff"
              stroke-opacity="0.8"
              stroke-width="2.5"
            />

            <!-- 方位角线（12条） -->
            <line x1="0" y1="0" x2="0" y2="-500" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="250" y2="-433" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="433" y2="-250" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="500" y2="0" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="433" y2="250" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="250" y2="433" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="0" y2="500" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="-250" y2="433" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="-433" y2="250" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="-500" y2="0" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="-433" y2="-250" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />
            <line x1="0" y1="0" x2="-250" y2="-433" stroke="#00ffff" stroke-opacity="0.6" stroke-width="1.5" />

            <!-- 方位角标注（12点钟方位） -->
            <text x="0" y="-520" text-anchor="middle" fill="#00ffff" font-size="18" font-weight="700">12</text>
            <text x="270" y="-450" text-anchor="start" fill="#00ffff" font-size="18" font-weight="700">1</text>
            <text x="455" y="-250" text-anchor="start" fill="#00ffff" font-size="18" font-weight="700">2</text>
            <text x="520" y="8" text-anchor="start" fill="#00ffff" font-size="18" font-weight="700">3</text>
            <text x="455" y="265" text-anchor="start" fill="#00ffff" font-size="18" font-weight="700">4</text>
            <text x="270" y="465" text-anchor="start" fill="#00ffff" font-size="18" font-weight="700">5</text>
            <text x="0" y="535" text-anchor="middle" fill="#00ffff" font-size="18" font-weight="700">6</text>
            <text x="-270" y="465" text-anchor="end" fill="#00ffff" font-size="18" font-weight="700">7</text>
            <text x="-455" y="265" text-anchor="end" fill="#00ffff" font-size="18" font-weight="700">8</text>
            <text x="-520" y="8" text-anchor="end" fill="#00ffff" font-size="18" font-weight="700">9</text>
            <text x="-455" y="-250" text-anchor="end" fill="#00ffff" font-size="18" font-weight="700">10</text>
            <text x="-270" y="-450" text-anchor="end" fill="#00ffff" font-size="18" font-weight="700">11</text>

            <!-- 距离标注（东南西北四个方向） -->
            <template v-for="(radiusKm, idx) in rc.rings" :key="`label-${idx}`">
              <text :x="radiusKm * 20 + 10" y="5" text-anchor="start" fill="#ffffff" font-size="14" font-weight="600">{{ radiusKm }}km</text>
              <text x="0" :y="radiusKm * 20 + 18" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="600">{{ radiusKm }}km</text>
              <text :x="-radiusKm * 20 - 10" y="5" text-anchor="end" fill="#ffffff" font-size="14" font-weight="600">{{ radiusKm }}km</text>
              <text x="0" :y="-radiusKm * 20 - 8" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="600">{{ radiusKm }}km</text>
            </template>

            <!-- 中心点 -->
            <circle cx="0" cy="0" r="6" fill="#00ffff" stroke="#ffffff" stroke-width="2" />
          </svg>
        </div>
      </div>

      <!-- 左侧：系统卡片列表 -->
      <div class="device-list-panel" :class="{ 'device-list-panel--collapsed': leftPanelCollapsed }">
        <!-- 收起/展开按钮 -->
        <div class="panel-toggle-btn panel-toggle-btn--left" @click="toggleLeftPanel">
          <LeftOutlined v-if="!leftPanelCollapsed" />
          <RightOutlined v-else />
        </div>

        <!-- KPI 统计栏 -->
        <div class="kpi-bar">
          <div class="kpi-item">
            <span class="kpi-value">{{ kpiStats.total }}</span>
            <span class="kpi-label">总数</span>
          </div>
          <div class="kpi-divider"></div>
          <div class="kpi-item">
            <span class="kpi-value kpi-detecting">{{ kpiStats.detecting }}</span>
            <span class="kpi-label">探测中</span>
          </div>
          <div class="kpi-divider"></div>
          <div class="kpi-item">
            <span class="kpi-value kpi-striking">{{ kpiStats.striking }}</span>
            <span class="kpi-label">打击中</span>
          </div>
          <div class="kpi-divider"></div>
          <div class="kpi-item">
            <span class="kpi-value kpi-offline">{{ kpiStats.offline }}</span>
            <span class="kpi-label">离线</span>
          </div>
        </div>

        <!-- 筛选器 -->
        <div class="filter-bar">
          <div class="filter-item">
            <span class="filter-label">区域</span>
            <a-select
              v-model:value="selectedCamp"
              :options="CAMP_OPTIONS"
              style="width: 100%"
            />
          </div>
          <div class="filter-item">
            <span class="filter-label">状态</span>
            <a-select
              v-model:value="selectedStatus"
              :options="[
                { label: '全部状态', value: 'all' },
                { label: '探测中', value: 'detecting' },
                { label: '打击中', value: 'striking' },
                { label: '离线', value: 'offline' },
              ]"
              style="width: 100%"
            />
          </div>
        </div>

        <!-- 卡片列表 -->
        <div class="device-cards">
          <div
            v-for="system in filteredSystems"
            :key="system.camp"
            class="device-card"
            @click="showDetail(system)"
          >
            <!-- 雷达图标区域 -->
            <div class="radar-icon-area">
              <svg
                class="radar-svg"
                :class="`radar-svg--${system.status}`"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <!-- 渐变定义 -->
                  <radialGradient id="radar-gradient-detecting" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#52c41a" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="#52c41a" stop-opacity="0.05" />
                  </radialGradient>
                  <radialGradient id="radar-gradient-striking" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#ff4d4f" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="#ff4d4f" stop-opacity="0.1" />
                  </radialGradient>
                  <radialGradient id="radar-gradient-offline" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#8c8c8c" stop-opacity="0.2" />
                    <stop offset="100%" stop-color="#8c8c8c" stop-opacity="0.05" />
                  </radialGradient>
                </defs>

                <!-- 探测中：绿色扇形 + 旋转扫描线 -->
                <template v-if="system.status === 'detecting'">
                  <!-- 背景圆 -->
                  <circle cx="50" cy="50" r="45" fill="url(#radar-gradient-detecting)" stroke="#52c41a" stroke-width="1" />
                  <!-- 扇形扫描区（120度） -->
                  <path
                    class="radar-scan-sector"
                    d="M 50 50 L 50 5 A 45 45 0 0 1 88.97 69.95 Z"
                    fill="#52c41a"
                    fill-opacity="0.3"
                  />
                  <!-- 中心点 -->
                  <circle cx="50" cy="50" r="3" fill="#52c41a" />
                  <!-- 扫描线 -->
                  <line
                    class="radar-scan-line"
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="5"
                    stroke="#52c41a"
                    stroke-width="2"
                  />
                </template>

                <!-- 打击中：红色整圆 + 脉冲波纹 -->
                <template v-else-if="system.status === 'striking'">
                  <!-- 背景圆 -->
                  <circle cx="50" cy="50" r="45" fill="url(#radar-gradient-striking)" stroke="#ff4d4f" stroke-width="2" />
                  <!-- 脉冲波纹圈 -->
                  <circle class="radar-pulse-ring" cx="50" cy="50" r="35" fill="none" stroke="#ff4d4f" stroke-width="2" />
                  <circle class="radar-pulse-ring radar-pulse-ring--delay" cx="50" cy="50" r="35" fill="none" stroke="#ff4d4f" stroke-width="2" />
                  <!-- 中心点 -->
                  <circle cx="50" cy="50" r="4" fill="#ff4d4f" />
                </template>

                <!-- 离线：灰色静态圆 -->
                <template v-else>
                  <circle cx="50" cy="50" r="45" fill="url(#radar-gradient-offline)" stroke="#8c8c8c" stroke-width="1" stroke-dasharray="3,3" />
                  <circle cx="50" cy="50" r="2" fill="#8c8c8c" />
                </template>
              </svg>
            </div>

            <!-- 右侧内容区域 -->
            <div class="card-content">
              <!-- 头部：营地名称 + 状态徽章 -->
              <div class="card-header">
                <div class="device-name">{{ system.camp }}</div>
                <span
                  class="status-badge"
                  :style="{ backgroundColor: STATUS_COLOR_MAP[system.status] }"
                >
                  {{ STATUS_TEXT_MAP[system.status] }}
                </span>
              </div>

              <!-- 当前探测数量 + 定位按钮 -->
              <div class="bottom-row">
                <div class="target-count">
                  <span class="target-label">当前探测</span>
                  <span class="target-value" :class="{ 'target-value--active': system.current_targets > 0 }">
                    {{ system.current_targets }}
                  </span>
                </div>
                <a-tooltip
                  :title="system.status === 'offline' ? '离线中不可用' : '定位'"
                  placement="top"
                >
                  <div
                    class="action-btn"
                    :class="{ 'action-btn--disabled': system.status === 'offline' }"
                    @click.stop="system.status !== 'offline' ? onSystemLocation(system) : null"
                  >
                    <AimOutlined />
                  </div>
                </a-tooltip>
              </div>

              <!-- 反制设备 -->
              <div class="strike-info-row">
                <span class="strike-label">反制设备</span>
                <span class="strike-value">{{ system.striking_devices }}</span>
              </div>
            </div>

            <!-- 今日统计（横跨整个卡片底部） -->
            <div class="stats-section-full">
              <div class="stat-item">
                <span class="stat-label">当日探测</span>
                <span class="stat-value">{{ system.today_detection_count }} 次</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">当日预警</span>
                <span class="stat-value">{{ system.today_warning_count }} 次</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">当日入侵</span>
                <span class="stat-value">{{ system.today_intrusion_count }} 次</span>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredSystems.length === 0" class="empty-state">
            <a-empty description="暂无系统数据" />
          </div>
        </div>
      </div>

      <!-- 左侧面板收起后的触发按钮 -->
      <div
        v-if="leftPanelCollapsed"
        class="collapsed-trigger collapsed-trigger--left"
        @click="toggleLeftPanel"
      >
        <div class="trigger-content">
          <RightOutlined class="trigger-icon" />
          <span class="trigger-text">系统列表</span>
        </div>
      </div>

      <!-- 右侧：实时探测无人机列表 -->
      <DetectedDronesPanel
        ref="detectedDronesPanelRef"
        v-model:collapsed="rightPanelCollapsed"
      />

      <!-- 右侧面板收起后的触发按钮 -->
      <div
        v-if="rightPanelCollapsed"
        class="collapsed-trigger collapsed-trigger--right"
        @click="rightPanelCollapsed = false"
      >
        <div class="trigger-content">
          <LeftOutlined class="trigger-icon" />
          <span class="trigger-text">探测目标</span>
        </div>
      </div>
    </div>

    <!-- 设备详情弹窗 -->
    <a-modal
      v-model:open="deviceDetailVisible"
      :title="selectedDevice?.name"
      width="600px"
      :footer="null"
      @cancel="closeDeviceDetail"
    >
      <div v-if="selectedDevice" class="device-detail">
        <div class="detail-row">
          <span class="detail-label">设备名称</span>
          <span class="detail-value">{{ selectedDevice.name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">设备ID</span>
          <span class="detail-value">{{ selectedDevice.id }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">设备类型</span>
          <span class="detail-value">{{ selectedDevice.device_type === 'detect' ? '侦测' : '反制' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">经纬度</span>
          <span class="detail-value">{{ formatCoordinates(selectedDevice.latitude, selectedDevice.longitude) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">设备状态</span>
          <span class="detail-value" :class="{ 'status-online': selectedDevice.status !== 'offline', 'status-offline': selectedDevice.status === 'offline' }">
            {{ selectedDevice.status === 'offline' ? '离线' : '在线' }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">通信时间</span>
          <span class="detail-value">{{ formatCommunicationTime(selectedDevice.last_communication_time) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">GPS星数</span>
          <span class="detail-value">{{ selectedDevice.gps_satellites }}</span>
        </div>
        <div v-if="selectedDevice.device_type === 'detect'" class="detail-row">
          <span class="detail-label">温度</span>
          <span class="detail-value">{{ selectedDevice.temperature }}°C</span>
        </div>
      </div>
    </a-modal>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="detailVisible"
      :title="`${selectedSystem?.camp} 反无系统`"
      width="900px"
      :footer="null"
      @cancel="closeDetail"
    >
      <div v-if="selectedSystem" class="detail-content">
        <!-- 系统总览 -->
        <div class="system-summary">
          <div class="summary-item">
            <span class="summary-label">系统状态</span>
            <span
              class="status-badge"
              :style="{ backgroundColor: STATUS_COLOR_MAP[selectedSystem.status] }"
            >
              {{ STATUS_TEXT_MAP[selectedSystem.status] }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">设备总数</span>
            <span class="summary-value">{{ selectedSystem.devices.length }} 台</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">当前探测目标</span>
            <span class="summary-value" :class="{ 'summary-value--highlight': selectedSystem.current_targets > 0 }">
              {{ selectedSystem.current_targets }} 个
            </span>
          </div>
        </div>

        <div class="detail-divider"></div>

        <!-- 设备列表 -->
        <div class="device-list-section">
          <div class="section-title">设备列表</div>
          <a-table
            :columns="deviceColumns"
            :data-source="selectedSystem.devices"
            :pagination="false"
            :scroll="{ y: 400 }"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <span
                  class="status-badge status-badge--small"
                  :style="{ backgroundColor: STATUS_COLOR_MAP[record.status] }"
                >
                  {{ STATUS_TEXT_MAP[record.status] }}
                </span>
              </template>
              <template v-else-if="column.key === 'device_type'">
                {{ record.device_type === 'detect' ? '侦测' : '反制' }}
              </template>
              <template v-else-if="column.key === 'current_targets'">
                <span :class="{ 'target-highlight': record.current_targets > 0 }">
                  {{ record.current_targets }}
                </span>
              </template>
              <template v-else-if="column.key === 'strike_mode'">
                <template v-if="record.device_type === 'counteract' && record.strike_mode && record.strike_mode.length > 0">
                  {{ record.strike_mode.map((m: string) => m === 'expel' ? '驱离' : '迫降').join('、') }}
                </template>
                <template v-else>-</template>
              </template>
              <template v-else-if="column.key === 'strike_duration'">
                <template v-if="record.device_type === 'counteract' && record.strike_duration !== undefined">
                  {{ record.strike_duration }}s
                </template>
                <template v-else>-</template>
              </template>
              <template v-else-if="column.key === 'strike_power'">
                <template v-if="record.device_type === 'counteract' && record.strike_power !== undefined">
                  {{ record.strike_power }}%
                </template>
                <template v-else>-</template>
              </template>
              <template v-else-if="column.key === 'coordinate'">
                {{ formatCoordinate(record.longitude, record.latitude) }}
              </template>
            </template>
          </a-table>
        </div>
      </div>
    </a-modal>
  </PageContainer>
</template>

<style scoped lang="scss">
/* ==================== 容器布局 ==================== */
.realtime-container {
  position: relative;
  height: calc(100vh - 120px);
  overflow: hidden;
}

.map-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: hidden;
}

/* ==================== 左侧设备列表面板（悬浮） ==================== */
.device-list-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 400px;
  height: calc(100% - 32px);
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: rgba(10, 13, 18, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: visible;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: transform 0.3s ease, opacity 0.3s ease;

  &--collapsed {
    transform: translateX(-100%);
    opacity: 0;
    pointer-events: none;
  }
}

/* ==================== 面板收起/展开按钮 ==================== */
.panel-toggle-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: rgba(10, 13, 18, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s ease;
  color: var(--of-text-secondary);
  font-size: 12px;

  &:hover {
    background: rgba(10, 13, 18, 0.75);
    border-color: rgba(255, 255, 255, 0.2);
    color: var(--of-text-primary);
  }

  &--left {
    right: -24px;
    border-radius: 0 6px 6px 0;
    border-left: none;
  }
}

/* ==================== KPI 统计栏 ==================== */
.kpi-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 14px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.kpi-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--of-color-accent-ice);
  line-height: 1;
  font-variant-numeric: tabular-nums;

  &.kpi-detecting {
    color: var(--of-color-success);
  }

  &.kpi-striking {
    color: var(--of-color-danger);
  }

  &.kpi-offline {
    color: var(--of-text-quaternary);
  }
}

.kpi-label {
  font-size: 11px;
  color: var(--of-text-tertiary);
}

.kpi-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
}

/* ==================== 筛选器 ==================== */
.filter-bar {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  color: var(--of-text-secondary);
}

/* ==================== 卡片列表 ==================== */
.device-cards {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  display: grid;
  grid-template-columns: 72px 1fr;
  grid-template-rows: auto auto;
  gap: 12px;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

/* ==================== 定位标记（地图中心） ==================== */
.location-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  pointer-events: none;
  z-index: 20;
}

/* 测距范围网格（极坐标） */
.range-grid {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 900px;
  height: 900px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
  opacity: 0.8;
}

/* 预警区（黄色外圈） */
.warning-zone {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 560px;
  height: 560px;
  border: 2px solid #faad14;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(250, 173, 20, 0.05);
  pointer-events: none;
  z-index: 2;
}

/* 反制区（红色内圈） */
.counteract-zone {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 320px;
  height: 320px;
  border: 2px solid #ff4d4f;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 77, 79, 0.08);
  pointer-events: none;
  z-index: 3;
}

/* 中心雷达图标 */
.center-radar {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 217, 255, 0.2);
  border: 2px solid #00D9FF;
  border-radius: 50%;
  color: #00D9FF;
  font-size: 24px;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  z-index: 10;

  &:hover {
    background: rgba(0, 217, 255, 0.3);
    transform: translate(-50%, -50%) scale(1.1);
  }

  :deep(.anticon) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 设备图标 */
.device-icon {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
  z-index: 5;
  transition: all 0.3s ease;
}

.device-icon-symbol {
  width: 60px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: scale(1.15);
  }
}

.device-icon-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
  transition: filter 0.3s ease;

  &:hover {
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6));
  }
}

.device-icon-label {
  padding: 2px 8px;
  background: rgba(10, 13, 18, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 11px;
  color: var(--of-text-primary);
  white-space: nowrap;
  backdrop-filter: blur(4px);
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* ==================== 探测到的无人机图标（敌方 + 己方） ==================== */
.detected-drone-icon {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 6;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translate(-50%, -50%) scale(1.15);
    z-index: 7;
  }

  .drone-image {
    width: 40px;
    height: 40px;
    object-fit: contain;
    transition: transform 0.3s ease;
  }

  /* 敌方无人机：红色阴影 */
  &--enemy .drone-image {
    filter: drop-shadow(0 2px 8px rgba(255, 77, 79, 0.6));
  }

  /* 己方无人机：蓝色阴影 */
  &--friendly .drone-image {
    filter: drop-shadow(0 2px 8px rgba(22, 119, 255, 0.6));
  }
}

/* ==================== 无人机 Popover 样式 ==================== */
.drone-popover-content {
  width: 280px;
  padding: 8px;
  padding-top: 32px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.drone-popover-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--of-text-tertiary);
  transition: all 0.2s ease;
  border-radius: 4px;
  z-index: 10;

  &:hover {
    color: var(--of-text-primary);
    background: rgba(255, 255, 255, 0.1);
  }

  :deep(.anticon) {
    font-size: 12px;
  }
}

.drone-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.drone-popover-sn {
  font-size: 14px;
  font-weight: 600;
  color: var(--of-text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.whitelist-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #52c41a;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  border-radius: 10px;
}

.drone-popover-model {
  font-size: 12px;
  color: var(--of-text-secondary);
  margin-bottom: 8px;
}

.drone-popover-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
}

.drone-popover-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.drone-popover-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.drone-popover-label {
  color: var(--of-text-tertiary);
  font-size: 11px;
}

.drone-popover-value {
  color: var(--of-text-secondary);
  font-weight: 500;

  &--highlight {
    color: var(--of-color-accent-ice);
    font-weight: 600;
  }
}

/* ==================== 雷达图标区域 ==================== */
.radar-icon-area {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
}

.radar-svg {
  width: 100%;
  height: 100%;
}

/* 探测中：扇形旋转动画 */
.radar-svg--detecting .radar-scan-sector,
.radar-svg--detecting .radar-scan-line {
  transform-origin: 50px 50px;
  animation: radar-rotate 3s linear infinite;
}

@keyframes radar-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 打击中：脉冲波纹动画 */
.radar-pulse-ring {
  animation: radar-pulse 1.5s ease-out infinite;
}

.radar-pulse-ring--delay {
  animation-delay: 0.75s;
}

@keyframes radar-pulse {
  0% {
    r: 20;
    stroke-opacity: 1;
    stroke-width: 3;
  }
  100% {
    r: 45;
    stroke-opacity: 0;
    stroke-width: 0.5;
  }
}

/* ==================== 卡片内容区 ==================== */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.device-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--of-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--of-text-primary);
  white-space: nowrap;
}

.target-count-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.target-count {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.target-label {
  font-size: 12px;
  color: var(--of-text-secondary);
}

.target-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--of-color-accent-ice);
  transition: color 0.2s;
  font-variant-numeric: tabular-nums;

  &--active {
    color: #d4f8ff;
  }
}

.bottom-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 反制设备信息行 */
.strike-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.strike-label {
  color: var(--of-text-secondary);
  flex-shrink: 0;
}

.strike-value {
  color: var(--of-text-primary);
  font-weight: 500;
}

/* 今日统计区域（横跨整个卡片底部） */
.stats-section-full {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px 0 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 4px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--of-text-tertiary);
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--of-text-primary);
  font-variant-numeric: tabular-nums;
}

/* 操作按钮行 */
.action-row {
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  flex-shrink: 0;
  width: 56px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--of-text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;

  &:hover:not(.action-btn--disabled) {
    color: var(--of-color-link);
    border-color: var(--of-color-link);
    background: rgba(20, 129, 166, 0.1);
  }

  &--disabled {
    color: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.05);
    background: rgba(255, 255, 255, 0.01);
    cursor: not-allowed;
  }

  :deep(.anticon) {
    font-size: 16px;
  }
}

/* ==================== 空状态 ==================== */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}

/* ==================== 设备详情弹窗 ==================== */
.device-detail {
  padding: 12px 0;
}

.detail-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--of-border-color);

  &:last-child {
    border-bottom: none;
  }
}

.detail-label {
  width: 120px;
  font-size: 14px;
  color: var(--of-text-secondary);
  flex-shrink: 0;
}

.detail-value {
  flex: 1;
  font-size: 14px;
  color: var(--of-text-primary);
  font-weight: 500;

  &.status-online {
    color: #52c41a;
  }

  &.status-offline {
    color: #ff4d4f;
  }
}

/* ==================== 收起触发按钮 ==================== */
.collapsed-trigger {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 120px;
  background: rgba(10, 13, 18, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(10, 13, 18, 0.75);
    border-color: rgba(255, 255, 255, 0.2);

    .trigger-text,
    .trigger-icon {
      color: var(--of-text-primary);
    }
  }

  &--left {
    left: 16px;
    border-radius: 0 8px 8px 0;
  }

  &--right {
    right: 16px;
    border-radius: 8px 0 0 8px;
  }
}

.trigger-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.trigger-icon {
  font-size: 14px;
  color: var(--of-text-secondary);
  transition: color 0.2s ease;
  writing-mode: horizontal-tb;
  transform: rotate(0deg);
}

.trigger-text {
  font-size: 13px;
  color: var(--of-text-secondary);
  font-weight: 500;
  letter-spacing: 2px;
  transition: color 0.2s ease;
}

/* ==================== 详情弹窗 ==================== */
.detail-content {
  padding: 8px 0;
}

.system-summary {
  display: flex;
  gap: 32px;
  padding: 16px 0;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  font-size: 13px;
  color: var(--of-text-secondary);
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--of-text-primary);
  font-variant-numeric: tabular-nums;

  &--highlight {
    color: var(--of-color-danger);
  }
}

.detail-divider {
  height: 1px;
  background: var(--of-border-color);
  margin: 20px 0;
}

.device-list-section {
  margin-top: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--of-text-primary);
  margin-bottom: 12px;
}

.status-badge--small {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--of-text-primary);
}

.target-highlight {
  color: var(--of-color-danger);
  font-weight: 600;
}
/* ==================== 测距工具 ==================== */
.ranging-toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.ranging-btn {
  width: 40px;
  height: 40px;
  background: rgba(20, 30, 48, 0.95);
  border: 2px solid #00ffff;
  color: #00ffff;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);

  &:hover {
    border-color: #5cffff;
    color: #5cffff;
    background: rgba(20, 30, 48, 1);
    transform: scale(1.05);
  }

  &.active {
    border-color: #00ffff;
    color: #00ffff;
    background: rgba(0, 255, 255, 0.2);
  }

  &--clear {
    font-size: 24px;
    font-weight: 600;

    &:hover {
      border-color: #ff4d4f;
      color: #ff4d4f;
      background: rgba(255, 77, 79, 0.2);
    }
  }
}

/* ==================== 测距圈标记 ==================== */
.custom-range-marker {
  position: absolute;
  width: 600px;
  height: 600px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 500;
  cursor: pointer;
}

.custom-range-svg {
  width: 100%;
  height: 100%;
  pointer-events: all;
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.3));

  text {
    text-shadow:
      0 0 4px rgba(0, 0, 0, 0.9),
      0 0 8px rgba(0, 0, 0, 0.7),
      0 0 12px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }

  circle, line {
    pointer-events: all;
  }
}

</style>
