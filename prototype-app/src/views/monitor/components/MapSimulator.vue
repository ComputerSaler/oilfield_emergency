<script setup lang="ts">
/**
 * 地图模拟组件
 * Phase 4 占位：使用卫星图底图 + 标记点模拟
 * 不支持缩放/拖拽（图片底图限制），支持点击标记查看信息
 */
import { ref, computed } from 'vue'
import { Crosshair } from 'lucide-vue-next'
import type { UavDevice } from '@/types/drone'
import type { Alert, Event } from '@/types/alert'

// 导入图标图片
import cDroneIcon from '@/assets/icons/c-drone.png'
import aDroneIcon from '@/assets/icons/a-drone.png'
import alertIcon from '@/assets/icons/alert.png'
import eventIcon from '@/assets/icons/event.png'
import personnelIcon from '@/assets/icons/personnel.png'
import vehicleIcon from '@/assets/icons/vehicle.png'
import valveRoomIcon from '@/assets/icons/valve-room.png'
import campIcon from '@/assets/icons/camp.png'
import oilWellIcon from '@/assets/icons/oil-well.png'
import stationIcon from '@/assets/icons/station.png'
import sentryIcon from '@/assets/icons/sentry.png'
import pumpStationIcon from '@/assets/icons/pump-station.png'

// 为了兼容，使用别名
type Drone = UavDevice

interface Props {
  drones: Drone[]
  alerts: Alert[]
  events: Event[]
  layers: {
    uavPosition: boolean
    alertEvent: boolean
  }
  pulsingAlertId?: string
  showEntityMarkers?: boolean // 是否显示其他实体标记（人员、车辆、设施）
  showLegend?: boolean // 是否显示图例
}

const props = withDefaults(defineProps<Props>(), {
  showEntityMarkers: true, // 默认显示
  showLegend: true // 默认显示
})
const emit = defineEmits<{
  'drone-click': [droneId: string]
  'alert-click': [alertId: string]
  'video-mode-change': [isVideoMode: boolean]
}>()

// 地图容器尺寸（用于计算标记位置）
// 注：暂时未使用，预留给未来的自适应缩放功能
// const MAP_WIDTH = 1200
// const MAP_HEIGHT = 800

// 无人机模拟坐标（像素坐标，相对于地图容器）
const dronePositions = computed(() => {
  const positions: Record<string, { x: number; y: number }> = {
    // DroneCommandCenter 的原始位置
    'REAL-A-001': { x: 320, y: 180 },
    'REAL-A-002': { x: 580, y: 320 },
    'REAL-A-003': { x: 780, y: 140 },
    'REAL-A-004': { x: 920, y: 380 },
    'REAL-C-001': { x: 180, y: 450 },
    'REAL-C-002': { x: 380, y: 520 },
    'REAL-C-003': { x: 620, y: 480 },
    'REAL-C-004': { x: 820, y: 560 },
    'REAL-C-005': { x: 980, y: 240 },

    // A 类无人机实况页面的真实 drone_sn（来自 aUav.ts）
    '1ZNDH9H003F8PH': { x: 280, y: 350 },           // 现场数据1: Jaouro
    'YDUA25V0250102YCATEY': { x: 420, y: 250 },    // 现场数据2: Dibeilla 飞行中
    'YDUA25V0250202YCAYTV': { x: 650, y: 180 },    // 现场数据3: Koulele 飞行中
    'YDUA25V0250302YCADZB': { x: 850, y: 480 },    // 现场数据4: Jaouro 离线
    'A-001': { x: 520, y: 520 },                   // UAV-01
    'A-002': { x: 180, y: 280 },                   // UAV-02
    'A-003': { x: 720, y: 420 },                   // UAV-03
    'A-004': { x: 380, y: 580 },                   // UAV-04 飞行
    'A-005': { x: 950, y: 220 },                   // UAV-05
    'A-009': { x: 560, y: 380 },                   // UAV-09（归档）

    // C 类无人机实况页面的真实 drone_sn（来自 cUavRealtime.ts）
    'C-UAV-0001': { x: 260, y: 420 },              // DJI Mini 3 Pro
    'C-UAV-0002': { x: 480, y: 280 },              // DJI Air 3
    'C-UAV-0003': { x: 740, y: 360 },              // DJI Mavic 3
    'C-UAV-0004': { x: 560, y: 500 },              // Autel Evo Lite+
    'C-UAV-0005': { x: 880, y: 240 },              // Parrot Anafi
    'C-UAV-0006': { x: 340, y: 560 },              // DJI Mini 2 SE
    'C-UAV-0007': { x: 680, y: 140 },              // DJI Air 2S
    'C-UAV-0008': { x: 820, y: 440 },              // Autel Evo Nano+
    'C-UAV-0009': { x: 200, y: 320 },              // DJI Mavic 3 Classic
    'C-UAV-0010': { x: 920, y: 560 },              // Skydio 2+
    'C-UAV-0011': { x: 440, y: 380 },              // DJI Mini 4 Pro
    'C-UAV-0012': { x: 600, y: 220 },              // Autel Evo II Pro
    'C-UAV-0013': { x: 760, y: 520 },              // C类无人机-13
    'C-UAV-0014': { x: 300, y: 180 },              // C类无人机-14
    'C-UAV-0015': { x: 980, y: 380 },              // C类无人机-15
  }

  return props.drones
    .filter(() => props.layers.uavPosition)
    .map(drone => ({
      ...drone,
      position: positions[drone.id] || { x: 100, y: 100 }
    }))
})

// 预警/事件模拟坐标
const alertPositions = computed(() => {
  const positions: Record<string, { x: number; y: number }> = {
    // 预警位置（5个）- 分散在地图各个区域
    'alert-001': { x: 240, y: 280 },  // Koulele营地东围界
    'alert-002': { x: 680, y: 200 },  // Dibeilla营地西围界
    'alert-003': { x: 420, y: 460 },  // Jaouro营地南围界
    'alert-004': { x: 860, y: 340 },  // Sokor营地管道阀门
    'alert-005': { x: 340, y: 620 },  // Goumeri营地外围
    // 事件位置（2个）
    'event-001': { x: 520, y: 380 },  // 事件1
    'event-002': { x: 760, y: 520 }   // 事件2
  }

  const allItems = [...props.alerts, ...props.events]

  return allItems
    .filter(() => props.layers.alertEvent)
    .map(item => ({
      ...item,
      position: positions[item.id] || { x: 150, y: 150 }
    }))
})

// 其他实体（人员、车辆、设施）模拟数据
interface EntityMarker {
  id: string
  type: 'personnel' | 'vehicle' | 'valve-room' | 'camp' | 'oil-well' | 'station' | 'sentry' | 'pump-station'
  name: string
  position: { x: number; y: number }
  icon: string
}

const entityMarkers = ref<EntityMarker[]>([
  // 人员（4个）
  { id: 'personnel-001', type: 'personnel', name: '张建国', position: { x: 280, y: 350 }, icon: personnelIcon },
  { id: 'personnel-002', type: 'personnel', name: 'John Smith', position: { x: 540, y: 240 }, icon: personnelIcon },
  { id: 'personnel-003', type: 'personnel', name: '李明华', position: { x: 720, y: 450 }, icon: personnelIcon },
  { id: 'personnel-004', type: 'personnel', name: 'Ahmed Hassan', position: { x: 890, y: 180 }, icon: personnelIcon },

  // 车辆（2个）
  { id: 'vehicle-001', type: 'vehicle', name: '尼A-8752', position: { x: 400, y: 300 }, icon: vehicleIcon },
  { id: 'vehicle-002', type: 'vehicle', name: '尼B-3621', position: { x: 800, y: 420 }, icon: vehicleIcon },

  // 阀室（2个）
  { id: 'valve-001', type: 'valve-room', name: '1号阀室', position: { x: 220, y: 520 }, icon: valveRoomIcon },
  { id: 'valve-002', type: 'valve-room', name: '3号阀室', position: { x: 640, y: 580 }, icon: valveRoomIcon },

  // 营地（1个）
  { id: 'camp-001', type: 'camp', name: 'Koulele营地', position: { x: 160, y: 240 }, icon: campIcon },

  // 油井（1个）
  { id: 'oil-well-001', type: 'oil-well', name: 'A7油井', position: { x: 480, y: 160 }, icon: oilWellIcon },

  // 站点（1个）
  { id: 'station-001', type: 'station', name: '中央处理站', position: { x: 920, y: 520 }, icon: stationIcon },

  // 哨岗（1个）
  { id: 'sentry-001', type: 'sentry', name: '东门哨岗', position: { x: 340, y: 140 }, icon: sentryIcon },

  // 泵站（1个）
  { id: 'pump-001', type: 'pump-station', name: '2号增压泵站', position: { x: 600, y: 360 }, icon: pumpStationIcon }
])

// 吊舱准星位置（仅A类无人机，且仅在定位模式下显示）
const gimbalCrosshairPositions = computed(() => {
  const crosshairs: Record<string, { x: number; y: number; lng: number; lat: number }> = {}

  // 只在定位模式下，为当前定位的A类无人机显示准星
  if (!currentDrone.value || currentDrone.value.uavClass !== 'A') {
    return crosshairs
  }

  const drone = dronePositions.value.find(d => d.id === currentDrone.value.id)
  if (!drone || !drone.telemetry?.gimbalPitch) {
    return crosshairs
  }

  // 模拟：根据云台俯仰角和高度计算地面投影距离
  const pitch = Math.abs(drone.telemetry.gimbalPitch) // 俯仰角（负值表示向下）
  const altitude = drone.telemetry.altitude || 1000
  const yaw = drone.telemetry.gimbalYaw || 0

  // 简化计算：投影距离 ≈ 高度 * tan(俯仰角)
  // 这里用像素模拟，实际系统会用真实GPS计算
  const distance = altitude * Math.tan((pitch * Math.PI) / 180) * 0.15 // 缩放到像素

  // 根据偏航角计算X、Y偏移
  const offsetX = distance * Math.sin((yaw * Math.PI) / 180)
  const offsetY = -distance * Math.cos((yaw * Math.PI) / 180)

  crosshairs[drone.id] = {
    x: drone.position.x + offsetX,
    y: drone.position.y + offsetY,
    // 模拟吊舱经纬度（实际系统会精确计算）
    lng: (drone.telemetry.position?.lng || 0) + offsetX * 0.0001,
    lat: (drone.telemetry.position?.lat || 0) + offsetY * 0.0001
  }

  return crosshairs
})

// 信息卡片状态
const infoCard = ref<{
  visible: boolean
  type: 'drone' | 'alert'
  data: any
  position: { x: number; y: number }
}>({
  visible: false,
  type: 'drone',
  data: null,
  position: { x: 0, y: 0 }
})

// 点击无人机标记
function onDroneMarkerClick(drone: any, event: MouseEvent) {
  event.stopPropagation()

  infoCard.value = {
    visible: true,
    type: 'drone',
    data: drone,
    position: { x: drone.position.x, y: drone.position.y }
  }
}

// 点击预警/事件标记
function onAlertMarkerClick(item: any, event: MouseEvent) {
  event.stopPropagation()

  infoCard.value = {
    visible: true,
    type: 'alert',
    data: item,
    position: { x: item.position.x, y: item.position.y }
  }
}

// 点击地图空白处关闭信息卡片
function onMapClick() {
  if (infoCard.value.visible) {
    infoCard.value.visible = false
  }
}

// 获取无人机图标路径
function getDroneIconSrc(uavClass: string) {
  return uavClass === 'C' ? cDroneIcon : aDroneIcon
}

// 获取预警/事件图标路径
function getAlertIconSrc(type: string) {
  return type === 'event' ? eventIcon : alertIcon
}

// 获取等级中文文本
function getLevelText(level: string) {
  const levelMap: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低',
    'critical': '紧急',
    'warning': '警告',
    'info': '信息',
    'level_1': '一级',
    'level_2': '二级',
    'level_3': '三级',
    'level_4': '四级'
  }
  return levelMap[level] || level
}

// 获取状态中文文本
function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    'standby': '待命',
    'charging': '充电中',
    'flying': '飞行中',
    'maintenance': '维护中',
    'alert_response': '告警响应',
    'escort': '伴飞中'
  }
  return statusMap[status] || status
}

// 打开详情（触发父组件事件）
function openDetail() {
  if (infoCard.value.type === 'drone') {
    emit('drone-click', infoCard.value.data.id)
  } else {
    emit('alert-click', infoCard.value.data.id)
  }
  infoCard.value.visible = false
}

// 视频流模式状态
const videoMode = ref(false)
const currentDrone = ref<any>(null)
const viewMode = ref<'video-main' | 'map-main'>('video-main') // 主次视图切换

// 打开视频流模式
function openVideoMode(drone: any) {
  currentDrone.value = drone
  videoMode.value = true
  viewMode.value = 'video-main'
  infoCard.value.visible = false
  emit('video-mode-change', true)
}

// 打开地图主画面模式（定位到无人机）
function openMapMode(drone: any) {
  currentDrone.value = drone
  videoMode.value = true
  viewMode.value = 'map-main'
  infoCard.value.visible = false
  emit('video-mode-change', true)
}

// 关闭视频流模式（回到正常地图）
function closeVideoMode() {
  videoMode.value = false
  currentDrone.value = null
  viewMode.value = 'video-main'
  emit('video-mode-change', false)
}

// 切换地图/视频主次位置
function toggleViewMode() {
  viewMode.value = viewMode.value === 'video-main' ? 'map-main' : 'video-main'
}

// 历史回放模式状态
const playbackMode = ref(false)
const playbackDrone = ref<any>(null)
const playbackTrajectory = ref<Array<{ x: number; y: number; time: string }>>([])
const playbackCurrentIndex = ref(0)
const playbackTimer = ref<number | null>(null)

// 开始历史回放
function startPlayback(droneId: string, startTime: string, _endTime: string, speed: number) {
  const drone = props.drones.find(d => d.id === droneId)
  if (!drone) return

  // 生成模拟轨迹（从当前位置开始的随机路径）
  const startPos = dronePositions.value.find(d => d.id === droneId)?.position || { x: 500, y: 300 }

  // 生成30个轨迹点（模拟30分钟的飞行）
  const trajectory: Array<{ x: number; y: number; time: string }> = []
  let currentX = startPos.x
  let currentY = startPos.y

  for (let i = 0; i < 30; i++) {
    // 随机移动
    currentX += (Math.random() - 0.5) * 60
    currentY += (Math.random() - 0.5) * 60

    // 限制在地图范围内
    currentX = Math.max(50, Math.min(1150, currentX))
    currentY = Math.max(50, Math.min(650, currentY))

    const time = new Date(new Date(startTime).getTime() + i * 60000).toISOString()
    trajectory.push({ x: currentX, y: currentY, time })
  }

  playbackDrone.value = drone
  playbackTrajectory.value = trajectory
  playbackCurrentIndex.value = 0
  playbackMode.value = true

  // 关闭视频模式
  videoMode.value = false

  // 开始播放动画
  startPlaybackAnimation(speed)
}

// 播放动画
function startPlaybackAnimation(speed: number) {
  if (playbackTimer.value) {
    clearInterval(playbackTimer.value)
  }

  const interval = 1000 / speed // 速度越快，间隔越短
  playbackTimer.value = window.setInterval(() => {
    if (playbackCurrentIndex.value < playbackTrajectory.value.length - 1) {
      playbackCurrentIndex.value++
    } else {
      stopPlayback()
    }
  }, interval)
}

// 停止回放
function stopPlayback() {
  if (playbackTimer.value) {
    clearInterval(playbackTimer.value)
    playbackTimer.value = null
  }
  playbackMode.value = false
  playbackDrone.value = null
  playbackTrajectory.value = []
  playbackCurrentIndex.value = 0
}

// 跳转到指定进度
function seekPlayback(progress: number) {
  const index = Math.floor((progress / 100) * (playbackTrajectory.value.length - 1))
  playbackCurrentIndex.value = Math.max(0, Math.min(index, playbackTrajectory.value.length - 1))
}

// 改变播放速度
function changePlaybackSpeed(speed: number) {
  if (playbackTimer.value && playbackMode.value) {
    startPlaybackAnimation(speed)
  }
}

// 当前回放位置
const currentPlaybackPosition = computed(() => {
  if (!playbackMode.value || playbackTrajectory.value.length === 0) {
    return null
  }
  return playbackTrajectory.value[playbackCurrentIndex.value]
})

// 已绘制的轨迹路径
const drawnTrajectory = computed(() => {
  if (!playbackMode.value) return []
  return playbackTrajectory.value.slice(0, playbackCurrentIndex.value + 1)
})

// 暴露方法给父组件调用
defineExpose({
  openVideoMode,
  openMapMode,
  startPlayback,
  stopPlayback,
  seekPlayback,
  changePlaybackSpeed
})
</script>

<template>
  <div class="map-simulator" @click="onMapClick">
    <!-- 历史回放模式 -->
    <template v-if="playbackMode">
      <!-- 卫星底图 -->
      <div class="map-bg">
        <img src="/map-satellite.jpg" alt="卫星底图" class="map-bg__image" />
      </div>

      <!-- 轨迹线（放在最上层，在无人机标记之前） -->
      <svg class="trajectory-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 50;">
        <polyline
          v-if="drawnTrajectory.length > 1"
          :points="drawnTrajectory.map(p => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="#52c41a"
          stroke-width="4"
          stroke-dasharray="8,4"
          opacity="0.9"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

      <!-- 实时无人机标记（半透明） -->
      <div
        v-for="drone in dronePositions"
        :key="drone.id"
        class="map-marker map-marker--drone map-marker--dimmed"
        :style="{
          left: `${drone.position.x}px`,
          top: `${drone.position.y}px`
        }"
      >
        <img
          :src="getDroneIconSrc(drone.uavClass)"
          class="map-marker__icon drone-icon-img"
          alt="drone"
        />
      </div>

      <!-- 虚拟无人机（回放中） -->
      <div
        v-if="currentPlaybackPosition"
        class="map-marker map-marker--drone map-marker--playback"
        :style="{
          left: `${currentPlaybackPosition.x}px`,
          top: `${currentPlaybackPosition.y}px`
        }"
      >
        <img
          :src="getDroneIconSrc(playbackDrone?.uavClass || 'C')"
          class="map-marker__icon drone-icon-img"
          alt="drone"
        />
        <div class="map-marker__label">{{ playbackDrone?.name }} (回放)</div>
      </div>

      <!-- 回放提示 -->
      <div class="playback-indicator">
        <span class="playback-indicator__icon">⏯️</span>
        <span class="playback-indicator__text">历史轨迹回放中</span>
      </div>
    </template>

    <!-- 正常模式：地图全屏 + 所有POI -->
    <template v-else-if="!videoMode">
      <!-- 卫星底图 -->
      <div class="map-bg">
        <img src="/map-satellite.jpg" alt="卫星底图" class="map-bg__image" />
      </div>

      <!-- 无人机标记 -->
      <div
        v-for="drone in dronePositions"
        :key="drone.id"
        class="map-marker map-marker--drone"
        :style="{
          left: `${drone.position.x}px`,
          top: `${drone.position.y}px`
        }"
        @click="onDroneMarkerClick(drone, $event)"
      >
        <img
          :src="getDroneIconSrc(drone.uavClass)"
          class="map-marker__icon drone-icon-img"
          alt="drone"
        />
        <div class="map-marker__label">{{ drone.name }}</div>
      </div>

      <!-- A类无人机吊舱准星 -->
      <div
        v-for="(crosshair, droneId) in gimbalCrosshairPositions"
        :key="`crosshair-${droneId}`"
        class="map-marker map-marker--crosshair"
        :style="{
          left: `${crosshair.x}px`,
          top: `${crosshair.y}px`
        }"
      >
        <Crosshair class="crosshair-icon" :size="28" :stroke-width="2" />
      </div>

      <!-- 预警/事件标记 -->
      <div
        v-for="item in alertPositions"
        :key="item.id"
        class="map-marker map-marker--alert"
        :class="{ 'map-marker--pulsing': pulsingAlertId === item.id }"
        :style="{
          left: `${item.position.x}px`,
          top: `${item.position.y}px`
        }"
        @click="onAlertMarkerClick(item, $event)"
      >
        <img
          :src="getAlertIconSrc(item.type)"
          class="map-marker__icon alert-icon-img"
          :alt="item.type === 'event' ? '事件' : '预警'"
        />
        <div class="map-marker__label">{{ item.type === 'event' ? '事件' : '预警' }}</div>
      </div>

      <!-- 其他实体标记（人员、车辆、设施） -->
      <div
        v-for="entity in entityMarkers"
        v-show="props.showEntityMarkers"
        :key="entity.id"
        class="map-marker map-marker--entity"
        :style="{
          left: `${entity.position.x}px`,
          top: `${entity.position.y}px`
        }"
      >
        <img
          :src="entity.icon"
          class="map-marker__icon entity-icon-img"
          :alt="entity.type"
        />
        <div class="map-marker__label">{{ entity.name }}</div>
      </div>

      <!-- 信息卡片 -->
      <div
        v-if="infoCard.visible"
        class="map-info-card"
        :style="{
          left: `${infoCard.position.x + 20}px`,
          top: `${infoCard.position.y}px`
        }"
        @click.stop
      >
        <!-- 无人机信息 -->
        <div v-if="infoCard.type === 'drone'" class="map-info-card__content">
          <div class="map-info-card__title">{{ infoCard.data.name }}</div>
          <div class="map-info-card__row">
            <span class="label">序列号:</span>
            <span>{{ infoCard.data.sn }}</span>
          </div>
          <div class="map-info-card__row">
            <span class="label">类型:</span>
            <span>{{ infoCard.data.uavClass }}类</span>
          </div>
          <div class="map-info-card__row">
            <span class="label">电量:</span>
            <span>{{ infoCard.data.telemetry.battery }}%</span>
          </div>
          <div class="map-info-card__row">
            <span class="label">高度:</span>
            <span>{{ infoCard.data.telemetry.altitude }}m</span>
          </div>
          <!-- A类无人机额外显示吊舱经纬度 -->
          <template v-if="infoCard.data.uavClass === 'A' && gimbalCrosshairPositions[infoCard.data.id]">
            <div class="map-info-card__row">
              <span class="label">吊舱经度:</span>
              <span>{{ gimbalCrosshairPositions[infoCard.data.id].lng.toFixed(6) }}°</span>
            </div>
            <div class="map-info-card__row">
              <span class="label">吊舱纬度:</span>
              <span>{{ gimbalCrosshairPositions[infoCard.data.id].lat.toFixed(6) }}°</span>
            </div>
          </template>
          <a-space style="margin-top: 8px; width: 100%">
            <a-button size="small" type="link" @click="openVideoMode(infoCard.data)">
              视频
            </a-button>
            <a-button size="small" type="primary" @click="openDetail">
              详情
            </a-button>
          </a-space>
        </div>

      <!-- 预警/事件信息 -->
      <div v-else class="map-info-card__content">
        <div class="map-info-card__title">{{ infoCard.data.title }}</div>
        <div class="map-info-card__row">
          <span class="label">ID:</span>
          <span>{{ infoCard.data.id }}</span>
        </div>
        <div class="map-info-card__row">
          <span class="label">等级:</span>
          <span>{{ getLevelText(infoCard.data.level) }}</span>
        </div>
        <div class="map-info-card__row">
          <span class="label">来源:</span>
          <span>{{ infoCard.data.source }}</span>
        </div>
        <div class="map-info-card__row">
          <span class="label">时间:</span>
          <span>{{ infoCard.data.time }}</span>
        </div>
        <a-button size="small" type="primary" style="margin-top: 8px; width: 100%" @click="openDetail">
          查看详情
        </a-button>
      </div>
    </div>

    <!-- 图例 -->
    <div v-if="props.showLegend" class="map-legend">
      <div class="map-legend__title">图例</div>
      <div class="map-legend__item">
        <img :src="cDroneIcon" class="legend-icon-img" alt="C类无人机" />
        <span>C类无人机</span>
      </div>
      <div class="map-legend__item">
        <img :src="aDroneIcon" class="legend-icon-img" alt="A类无人机" />
        <span>A类无人机</span>
      </div>
      <div class="map-legend__item">
        <img :src="alertIcon" class="legend-icon-img" alt="预警" />
        <span>预警</span>
      </div>
      <div class="map-legend__item">
        <img :src="eventIcon" class="legend-icon-img" alt="事件" />
        <span>事件</span>
      </div>
      <div class="map-legend__item">
        <img :src="personnelIcon" class="legend-icon-img" alt="人员" />
        <span>人员</span>
      </div>
      <div class="map-legend__item">
        <img :src="vehicleIcon" class="legend-icon-img" alt="车辆" />
        <span>车辆</span>
      </div>
      <div class="map-legend__item">
        <img :src="valveRoomIcon" class="legend-icon-img" alt="阀室" />
        <span>阀室</span>
      </div>
      <div class="map-legend__item">
        <img :src="campIcon" class="legend-icon-img" alt="营地" />
        <span>营地</span>
      </div>
      <div class="map-legend__item">
        <img :src="oilWellIcon" class="legend-icon-img" alt="油井" />
        <span>油井</span>
      </div>
      <div class="map-legend__item">
        <img :src="stationIcon" class="legend-icon-img" alt="站点" />
        <span>站点</span>
      </div>
      <div class="map-legend__item">
        <img :src="sentryIcon" class="legend-icon-img" alt="哨岗" />
        <span>哨岗</span>
      </div>
      <div class="map-legend__item">
        <img :src="pumpStationIcon" class="legend-icon-img" alt="泵站" />
        <span>泵站</span>
      </div>
    </div>
    </template>

    <!-- 视频流模式：根据viewMode显示主次画面 -->
    <template v-else>
      <!-- 模式A：视频流主画面 + 地图缩略图 -->
      <template v-if="viewMode === 'video-main'">
        <!-- 视频流主画面 -->
        <div class="video-main">
          <div class="video-placeholder">
            <div class="video-placeholder__icon">📹</div>
            <div class="video-placeholder__text">
              {{ currentDrone.name }} 实时视频流
            </div>
            <div class="video-placeholder__hint">
              Phase 6 占位 - 实际对接视频流协议
            </div>
          </div>

          <!-- 视频信息叠加层 -->
          <div class="video-overlay">
            <div class="video-overlay__header">
              <div class="video-info">
                <div class="video-info__title">{{ currentDrone.name }}</div>
                <div class="video-info__meta">
                  {{ currentDrone.sn }} · {{ currentDrone.uavClass }}类 ·
                  电量 {{ currentDrone.telemetry.battery }}%
                </div>
              </div>
              <a-button type="text" danger @click="closeVideoMode">
                退出
              </a-button>
            </div>
          </div>
        </div>

        <!-- 遥测数据面板（底部） - 分组显示 -->
        <div class="telemetry-panel-bottom">
          <!-- 位置信息组 -->
          <div class="telemetry-group">
            <div class="telemetry-item">
              <span class="telemetry-label">经度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.position?.lng?.toFixed(4) || '-' }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">纬度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.position?.lat?.toFixed(4) || '-' }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">相对高度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.altitude || 0 }}m</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">海拔高度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.position?.altitude || 0 }}m</span>
            </div>
          </div>

          <div class="telemetry-divider"></div>

          <!-- 速度信息组 -->
          <div class="telemetry-group">
            <div class="telemetry-item">
              <span class="telemetry-label">水平速度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.speed || 0 }}m/s</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">垂直速度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.verticalSpeed || 0 }}m/s</span>
            </div>
          </div>

          <div class="telemetry-divider"></div>

          <!-- 云台角度组 -->
          <div class="telemetry-group">
            <div class="telemetry-item">
              <span class="telemetry-label">俯仰角</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.gimbalPitch || 0 }}°</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">横滚角</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.gimbalRoll || 0 }}°</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">航向角</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.gimbalYaw || 0 }}°</span>
            </div>
          </div>
        </div>

        <!-- 缩略地图（右下角） - 点击切换到地图主画面 -->
        <div class="thumbnail-view" @click="toggleViewMode">
          <div class="thumbnail-view__bg">
            <img src="/map-satellite.jpg" alt="地图缩略图" />
            <!-- 缩略地图上的无人机标记 -->
            <div class="thumbnail-marker">
              <img
                :src="getDroneIconSrc(currentDrone.uavClass)"
                class="thumbnail-marker__icon"
                alt="drone"
              />
            </div>
          </div>
          <div class="thumbnail-view__hint">点击切换到地图</div>
        </div>
      </template>

      <!-- 模式B：地图主画面 + 视频流缩略图 -->
      <template v-else>
        <!-- 地图主画面（只显示当前无人机居中） -->
        <div class="map-bg">
          <img src="/map-satellite.jpg" alt="卫星底图" class="map-bg__image" />
        </div>

        <!-- 当前无人机标记（居中显示） -->
        <div
          class="map-marker map-marker--drone map-marker--focused"
          style="left: 50%; top: 50%"
        >
          <img
            :src="getDroneIconSrc(currentDrone.uavClass)"
            class="map-marker__icon drone-icon-img"
            alt="drone"
          />
          <div class="map-marker__label">{{ currentDrone.name }}</div>
        </div>

        <!-- 顶部工具栏 -->
        <div class="video-overlay">
          <div class="video-overlay__header">
            <div class="video-info">
              <div class="video-info__title">{{ currentDrone.name }}</div>
              <div class="video-info__meta">
                {{ currentDrone.sn }} · {{ currentDrone.uavClass }}类 ·
                电量 {{ currentDrone.telemetry.battery }}%
              </div>
            </div>
            <a-button type="text" danger @click="closeVideoMode">
              退出
            </a-button>
          </div>
        </div>

        <!-- 遥测数据面板（底部） - 分组显示 -->
        <div class="telemetry-panel-bottom">
          <!-- 位置信息组 -->
          <div class="telemetry-group">
            <div class="telemetry-item">
              <span class="telemetry-label">经度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.position?.lng?.toFixed(4) || '-' }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">纬度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.position?.lat?.toFixed(4) || '-' }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">相对高度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.altitude || 0 }}m</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">海拔高度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.position?.altitude || 0 }}m</span>
            </div>
          </div>

          <div class="telemetry-divider"></div>

          <!-- 速度信息组 -->
          <div class="telemetry-group">
            <div class="telemetry-item">
              <span class="telemetry-label">水平速度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.speed || 0 }}m/s</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">垂直速度</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.verticalSpeed || 0 }}m/s</span>
            </div>
          </div>

          <div class="telemetry-divider"></div>

          <!-- 云台角度组 -->
          <div class="telemetry-group">
            <div class="telemetry-item">
              <span class="telemetry-label">俯仰角</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.gimbalPitch || 0 }}°</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">横滚角</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.gimbalRoll || 0 }}°</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">航向角</span>
              <span class="telemetry-value">{{ currentDrone.telemetry.gimbalYaw || 0 }}°</span>
            </div>
          </div>
        </div>

        <!-- 缩略视频流（右下角） - 点击切换回视频主画面 -->
        <div class="thumbnail-view" @click="toggleViewMode">
          <div class="video-placeholder video-placeholder--small">
            <div class="video-placeholder__icon">📹</div>
            <div class="video-placeholder__text">视频流</div>
          </div>
          <div class="thumbnail-view__hint">点击切换到视频</div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.map-simulator {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1a1a1a;
}

/* 卫星底图 */
.map-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.map-bg__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

/* 标记点 */
.map-marker {
  position: absolute;
  transform: translate(-50%, -100%);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s;
  z-index: 10;
}

.map-marker:hover {
  transform: translate(-50%, -100%) scale(1.2);
  z-index: 20;
}

/* 吊舱准星标记 */
.map-marker--crosshair {
  cursor: default;
  pointer-events: none;
  z-index: 15;

  .crosshair-icon {
    color: #52c41a;
    filter: drop-shadow(0 0 4px rgba(82, 196, 26, 0.6));
    animation: crosshair-pulse 2s ease-in-out infinite;
  }
}

@keyframes crosshair-pulse {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

/* 脉冲效果 */
.map-marker--pulsing {
  position: relative;
  animation: pulse 1s ease-in-out infinite;
}

.map-marker--pulsing::before,
.map-marker--pulsing::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 2px solid #ffc107;
  border-radius: 50%;
  opacity: 0;
  animation: ripple 1.5s ease-out infinite;
}

.map-marker--pulsing::after {
  animation-delay: 0.5s;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -100%) scale(1);
  }
  50% {
    transform: translate(-50%, -100%) scale(1.2);
  }
  100% {
    transform: translate(-50%, -100%) scale(1);
  }
}

@keyframes ripple {
  0% {
    width: 40px;
    height: 40px;
    opacity: 0.8;
  }
  100% {
    width: 240px;
    height: 240px;
    opacity: 0;
  }
}

.map-marker__icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));

  &.drone-icon-img {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  &.alert-icon-img {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }
}

.map-marker__label {
  margin-top: 4px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 11px;
  border-radius: 3px;
  white-space: nowrap;
}

/* 回放模式样式 */
.map-marker--dimmed {
  opacity: 0.3;
  pointer-events: none;
}

.map-marker--playback {
  filter: drop-shadow(0 4px 8px rgba(24, 144, 255, 0.5));
  animation: playback-pulse 2s ease-in-out infinite;
}

@keyframes playback-pulse {
  0%, 100% {
    transform: translate(-50%, -100%) scale(1);
  }
  50% {
    transform: translate(-50%, -100%) scale(1.15);
  }
}

.trajectory-overlay {
  z-index: 5;
}

.playback-indicator {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(24, 144, 255, 0.5);
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.playback-indicator__icon {
  font-size: 16px;
}

.playback-indicator__text {
  font-weight: 500;
}

/* 信息卡片 */
.map-info-card {
  position: absolute;
  z-index: 100;
  width: 220px;
  background: rgba(10, 13, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.map-info-card__title {
  font-weight: 600;
  font-size: 14px;
  color: #ffffff;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.map-info-card__row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #d9d9d9;
  margin-bottom: 4px;
}

.map-info-card__row .label {
  color: #8c8c8c;
}

/* 图例 */
.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  z-index: 50;
}

.map-legend__title {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.map-legend__item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #d9d9d9;
  margin-bottom: 4px;

  .legend-icon-img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.map-legend__item:last-child {
  margin-bottom: 0;
}

/* 图标样式 */
.drone-icon-img,
.alert-icon-img,
.entity-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

/* 视频流模式 */
.video-main {
  position: absolute;
  inset: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-placeholder {
  text-align: center;
  color: #fff;
}

.video-placeholder__icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.video-placeholder__text {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.video-placeholder__hint {
  font-size: 12px;
  color: #8c8c8c;
}

/* 视频叠加层 */
.video-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.video-overlay > * {
  pointer-events: auto;
}

.video-overlay__header {
  position: absolute;
  top: 0;
  left: 0;
  right: 60px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
}

.video-info__title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.video-info__meta {
  font-size: 12px;
  color: #d9d9d9;
}

/* 遥测数据面板 */
.telemetry-panel {
  position: absolute;
  top: 80px;
  right: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px;
  background: rgba(10, 13, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  backdrop-filter: blur(8px);
}

.telemetry-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.telemetry-label {
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
}

.telemetry-value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

/* 底部遥测数据面板（视频流/地图模式） */
.telemetry-panel-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 12px 24px;
  background: rgba(10, 13, 18, 0.75);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}

/* 遥测数据分组 */
.telemetry-group {
  display: flex;
  gap: 20px;
}

/* 分隔线 */
.telemetry-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.15);
}

.telemetry-panel-bottom .telemetry-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.telemetry-panel-bottom .telemetry-label {
  font-size: 11px;
  color: #8c8c8c;
}

.telemetry-panel-bottom .telemetry-value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

/* 缩略视图（通用：地图或视频） */
.thumbnail-view {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 240px;
  height: 160px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.thumbnail-view:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.thumbnail-view__bg {
  width: 100%;
  height: 100%;
  position: relative;
}

.thumbnail-view__bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 缩略地图上的无人机标记 */
.thumbnail-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.thumbnail-marker__icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
}

.thumbnail-view__hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 11px;
  text-align: center;
}

/* 缩略视频流 */
.video-placeholder--small {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
}

.video-placeholder--small .video-placeholder__icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.video-placeholder--small .video-placeholder__text {
  font-size: 12px;
  margin-bottom: 0;
}

/* 聚焦的无人机标记（地图主画面时放大） */
.map-marker--focused {
  transform: translate(-50%, -100%) scale(1.5);
  z-index: 100;
}
</style>
