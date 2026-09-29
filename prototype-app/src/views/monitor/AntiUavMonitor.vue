<script setup lang="ts">
/**
 * 反无监控 —— 实时监控中心 PC端
 * PRD: 实时监控中心 · 反无监控 V1.0
 *
 * 布局：左侧模拟 GIS 地图（flex:1）+ 右侧目标列表（320px固定）
 * 关注点：「有没有敌方/未知无人机靠近」
 * WS 模拟：侦测区/反制区 Polygon + 实时目标轨迹点 增量推送
 * 警戒联动：目标进入侦测区/反制区 → 图标高亮 + 列表标红 + Toast
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { AppstoreOutlined, WarningOutlined, AimOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { INITIAL_TARGETS, ANTI_MAP_BOUNDS, type UavTarget } from '@/mock/antiUavMonitor'

// ========================= 反无设备（只读引用台账）=========================

/** 定义与本页地图范围匹配的 GIS 坐标（扩展信息，平台侧维护） */
interface PlacedAntiUav {
  id: string
  name: string
  deviceType: 'detect' | 'nemesis'
  camp: string
  online: boolean
  lat: number
  lng: number
}

// 从台账筛选出有真实 GIS 坐标的设备，落到地图
const ANTI_DEVICES: PlacedAntiUav[] = [
  // Koulele 区块（lat~13.31-13.33, lng~2.63-2.64）
  { id: 'anti-k1', name: '东南角侦测(Koulele)', deviceType: 'detect',  camp: 'Koulele',  online: true,  lat: 13.3144, lng: 2.6358 },
  { id: 'anti-k2', name: '东北角反制(Koulele)', deviceType: 'nemesis', camp: 'Koulele',  online: true,  lat: 13.3156, lng: 2.6361 },
  { id: 'anti-k3', name: '西北角侦测(Koulele)', deviceType: 'detect',  camp: 'Koulele',  online: true,  lat: 13.3160, lng: 2.6340 },
  { id: 'anti-k4', name: '西南角反制(Koulele)', deviceType: 'nemesis', camp: 'Koulele',  online: true,  lat: 13.3142, lng: 2.6342 },
  // Dibeilla 区块（lat~13.51-13.53, lng~2.11-2.13）
  { id: 'anti-d1', name: '主入口侦测(Dibeilla)', deviceType: 'detect',  camp: 'Dibeilla', online: true,  lat: 13.5127, lng: 2.1126 },
  { id: 'anti-d2', name: '北侧围栏反制(Dibeilla)', deviceType: 'nemesis', camp: 'Dibeilla', online: true, lat: 13.5145, lng: 2.1128 },
  { id: 'anti-d3', name: '南侧围栏侦测(Dibeilla)', deviceType: 'detect',  camp: 'Dibeilla', online: false, lat: 13.5110, lng: 2.1130 },
  // Goumeri 区块（lat~13.64, lng~2.37-2.38）
  { id: 'anti-g1', name: '东门侦测(Goumeri)', deviceType: 'detect',  camp: 'Goumeri', online: true,  lat: 13.6428, lng: 2.3756 },
  { id: 'anti-g2', name: '西门反制(Goumeri)', deviceType: 'nemesis', camp: 'Goumeri', online: true,  lat: 13.6425, lng: 2.3740 },
]

// ========================= 侦测区/反制区 Polygon =========================
// 原型阶段：以每台设备为同心圆心按固定半径生成简化 Polygon（TBD-12 由三方推送真实边界）
// 双圆：外圈侦测区 + 内圈反制区，与设备类型无关

interface ZonePolygon {
  key: string
  deviceId: string
  deviceName: string
  kind: 'detect' | 'suppress'
  /** 多边形顶点 [lat, lng][]（地图内所有点） */
  points: [number, number][]
}

const zones = reactive<ZonePolygon[]>([])

function circlePoints(centerLat: number, centerLng: number, radiusKm: number, segments = 24): [number, number][] {
  // 近似：1 度纬 ≈ 111km
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180))
  const pts: [number, number][] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push([
      centerLat + dLat * Math.sin(a),
      centerLng + dLng * Math.cos(a),
    ])
  }
  return pts
}

// 侦测区 / 反制区半径（km）：以设备为同心圆心，外圈侦测、内圈反制
const DETECT_RADIUS_KM = 1.2
const SUPPRESS_RADIUS_KM = 0.5

function buildZones(devices: PlacedAntiUav[]): ZonePolygon[] {
  const out: ZonePolygon[] = []
  for (const d of devices) {
    // 每台设备画两个同心圆：外圈侦测区（蓝）+ 内圈反制区（橙），与 deviceType 无关
    out.push({
      key: `detect-${d.id}`, deviceId: d.id, deviceName: d.name, kind: 'detect',
      points: circlePoints(d.lat, d.lng, DETECT_RADIUS_KM),
    })
    out.push({
      key: `suppress-${d.id}`, deviceId: d.id, deviceName: d.name, kind: 'suppress',
      points: circlePoints(d.lat, d.lng, SUPPRESS_RADIUS_KM),
    })
  }
  return out
}

Object.assign(zones, buildZones(ANTI_DEVICES))

// ========================= 目标数据 =========================

const targets = reactive<UavTarget[]>(INITIAL_TARGETS.map(t => ({ ...t })))

function findTarget(id: string): UavTarget | undefined {
  return targets.find(t => t.targetId === id && !t.gone)
}

/** 尾迹线：targetId → [lat, lng][]（最近 50 点） */
const trails = reactive<Map<string, [number, number][]>>(new Map())

INITIAL_TARGETS.forEach(t => trails.set(t.targetId, [[t.lat, t.lng]]))

/** 消失目标尾迹清理定时器 */
const goneCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>()

// ========================= 点是否在 Polygon 内（射线法）=========================

function pointInPolygon(lat: number, lng: number, polyPts: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = polyPts.length - 1; i < polyPts.length; j = i++) {
    const [yi, xi] = polyPts[i]
    const [yj, xj] = polyPts[j]
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// ========================= 警戒判定 =========================

/** 返回目标命中区域（null 表示无告警；否则返回区域信息） */
function zoneAlertFor(lat: number, lng: number): { inSuppress: boolean; zoneName: string } | null {
  let inSuppress = false
  let zoneName = ''
  for (const z of zones) {
    if (!pointInPolygon(lat, lng, z.points)) continue
    if (z.kind === 'suppress') {
      inSuppress = true
      zoneName = z.deviceName
      break // 反制区优先级最高，命中即返回
    } else {
      // 侦测区：记录但继续查是否有更高优先级反制区
      if (!zoneName) zoneName = z.deviceName
    }
  }
  return zoneName ? { inSuppress, zoneName } : null
}

/** Toast 抑制：targetId + zoneKey + 时间戳，60s 内同目标同区域只弹 1 次 */
const suppressWindow = new Map<string, number>()

function shouldToast(targetId: string, zoneKey: string): boolean {
  const now = Date.now()
  const last = suppressWindow.get(`${targetId}:${zoneKey}`)
  if (last && now - last < 60_000) return false
  suppressWindow.set(`${targetId}:${zoneKey}`, now)
  return true
}

/** 更新某目标的告警状态，按需弹 Toast */
function updateTargetAlert(t: UavTarget) {
  const hit = zoneAlertFor(t.lat, t.lng)
  const wasAlert = t.alert

  t.alert = !!hit
  t.inSuppressZone = hit?.inSuppress ?? false

  // 进入告警（新增）→ 弹 Toast；抑制规则：60s 同目标同级别只弹 1 次
  if (hit && !wasAlert) {
    const level = hit.inSuppress ? 'suppress' : 'detect'
    if (shouldToast(t.targetId, level)) {
      const text = hit.inSuppress
        ? `⚠ 目标 ${t.targetId} 进入 ${hit.zoneName} 反制区`
        : `⚠ 目标 ${t.targetId} 进入 ${hit.zoneName} 侦测区`
      if (hit.inSuppress) message.error(text, 5)
      else message.warning(text, 5)
    }
  }
}

// ========================= 目标操作 =========================

/** 人工忽略：移除目标 + 尾迹，无保留 */
function ignoreTarget(id: string) {
  const idx = targets.findIndex(t => t.targetId === id)
  if (idx < 0) return
  targets.splice(idx, 1)
  trails.delete(id)
  if (goneCleanupTimers.has(id)) {
    clearTimeout(goneCleanupTimers.get(id)!)
    goneCleanupTimers.delete(id)
  }
  if (selectedTarget?.value?.targetId === id) selectedTarget.value = null
}

/** 目标进入「已消失」状态：列表保留 60s，之后连同尾迹清除 */
function markGone(id: string) {
  const t = findTarget(id)
  if (!t) return
  if (t.alert) message.info(`目标 ${id} 已消失`, 3)
  t.gone = true
  t.alert = false
  t.inSuppressZone = false
  // 60s 后清除
  const timer = setTimeout(() => {
    const idx = targets.findIndex(x => x.targetId === id)
    if (idx >= 0) targets.splice(idx, 1)
    trails.delete(id)
    if (selectedTarget.value?.targetId === id) selectedTarget.value = null
    goneCleanupTimers.delete(id)
  }, 60_000)
  goneCleanupTimers.set(id, timer)
}

// ========================= 图层控制 =========================

const layerVisible = reactive({ detect: true, suppress: true, targets: true, trails: true })
const layerPanelOpen = ref(false)

const trailEnabled = computed(() => layerVisible.trails && layerVisible.targets)

// ========================= 测距圈功能 =========================

interface RangeCircle {
  id: string
  lat: number
  lng: number
  /** 测距圈半径配置（km） */
  rings: number[]
}

const rangeCircles = reactive<RangeCircle[]>([])
const rangingMode = ref(false)
let rangeCircleSeq = 0

/** 5km 间隔，显示 5 个圈 */
const RANGE_RINGS_KM = [5, 10, 15, 20, 25]

function toggleRangingMode() {
  rangingMode.value = !rangingMode.value
  if (rangingMode.value) {
    message.info('测距模式已开启，点击地图任意位置放置测距圈', 3)
  } else {
    message.info('测距模式已关闭', 2)
  }
}

function addRangeCircle(lat: number, lng: number) {
  rangeCircleSeq++
  rangeCircles.push({
    id: `range-${rangeCircleSeq}`,
    lat,
    lng,
    rings: RANGE_RINGS_KM,
  })
}

function removeRangeCircle(id: string) {
  const idx = rangeCircles.findIndex(c => c.id === id)
  if (idx >= 0) rangeCircles.splice(idx, 1)
}

function clearAllRangeCircles() {
  rangeCircles.length = 0
  message.success('已清除所有测距圈', 2)
}

/** 地图点击事件：测距模式下添加测距圈 */
function onMapClick(e: MouseEvent) {
  if (!rangingMode.value) return

  const mapEl = e.currentTarget as HTMLElement
  const rect = mapEl.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width * 100
  const y = (e.clientY - rect.top) / rect.height * 100

  // 百分比坐标反算 lat/lng
  const lng = ANTI_MAP_BOUNDS.lngMin + (x / 100) * (ANTI_MAP_BOUNDS.lngMax - ANTI_MAP_BOUNDS.lngMin)
  const lat = ANTI_MAP_BOUNDS.latMax - (y / 100) * (ANTI_MAP_BOUNDS.latMax - ANTI_MAP_BOUNDS.latMin)

  addRangeCircle(lat, lng)
}

/** 生成测距圈的同心圆路径（SVG 格式） */
function rangeCirclePath(centerLat: number, centerLng: number, radiusKm: number): string {
  const points = circlePoints(centerLat, centerLng, radiusKm, 48)
  return points.map(([lat, lng]) => {
    const p = toMapXY(lat, lng)
    return `${p.x},${p.y}`
  }).join(' ')
}

/** 计算方位角标注位置（12个时钟方位） */
function azimuthPosition(centerLat: number, centerLng: number, radiusKm: number, clockPos: number): { x: number; y: number } {
  // clockPos: 1-12，12点=0°正北，顺时针
  const angle = ((clockPos - 3) * 30) * Math.PI / 180 // 转换为数学角度（3点钟=0°）
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180))
  const lat = centerLat + dLat * Math.sin(angle)
  const lng = centerLng + dLng * Math.cos(angle)
  return toMapXY(lat, lng)
}

/** 计算距离标注位置（东南西北四个方向） */
function distanceLabelPosition(centerLat: number, centerLng: number, radiusKm: number, direction: 'N' | 'E' | 'S' | 'W'): { x: number; y: number } {
  const angles = { N: 90, E: 0, S: -90, W: 180 }
  const angle = angles[direction] * Math.PI / 180
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180))
  const lat = centerLat + dLat * Math.sin(angle)
  const lng = centerLng + dLng * Math.cos(angle)
  return toMapXY(lat, lng)
}

// ========================= 选中目标（点击列表中 → 地图高亮）=========================

const selectedTarget = ref<UavTarget | null>(null)

// ========================= 下拉列表中目标的坐标转换 =========================

function toMapXY(lat: number, lng: number) {
  const x = (lng - ANTI_MAP_BOUNDS.lngMin) / (ANTI_MAP_BOUNDS.lngMax - ANTI_MAP_BOUNDS.lngMin) * 100
  const y = (1 - (lat - ANTI_MAP_BOUNDS.latMin) / (ANTI_MAP_BOUNDS.latMax - ANTI_MAP_BOUNDS.latMin)) * 100
  return { x, y }
}

// ========================= WS 模拟 =========================
// 每秒推送目标轨迹点 + 状态；原型阶段随机制造新目标/消失/进出区域

const wsConnected = ref(true)
const wsDisconnectTime = ref('')
let wsTimer: ReturnType<typeof setInterval> | null = null
let targetSeq = 2 // 新目标编号从 T-03 起

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function simulateWsTick() {
  if (!wsConnected.value) return

  // 1) 现有目标移动
  targets.forEach(t => {
    if (t.gone) return
    t.lat = Math.round((t.lat + (Math.random() - 0.4) * 0.0008) * 1e6) / 1e6
    t.lng = Math.round((t.lng + (Math.random() - 0.3) * 0.0008) * 1e6) / 1e6
    t.speed = Math.max(5, Math.min(40, Math.round((t.speed + (Math.random() - 0.5) * 3) * 10) / 10))
    if (Math.random() < 0.05) {
      t.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
    }
    if (!trails.has(t.targetId)) trails.set(t.targetId, [])
    const tr = trails.get(t.targetId)!
    tr.push([t.lat, t.lng])
    if (tr.length > 50) tr.shift()
    updateTargetAlert(t)
  })

  // 2) 偶发新增目标
  if (Math.random() < 0.006 && targets.filter(t => !t.gone).length < 10) {
    targetSeq++
    const id = `T-${String(targetSeq).padStart(2, '0')}`
    const anchor = ANTI_DEVICES[Math.floor(Math.random() * ANTI_DEVICES.length)]
    const nt: UavTarget = {
      targetId: id,
      lat: anchor.lat + (Math.random() - 0.5) * 0.01,
      lng: anchor.lng + (Math.random() - 0.5) * 0.01,
      speed: 10 + Math.random() * 20,
      direction: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
      firstSeenAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      alert: false, inSuppressZone: false, gone: false,
    }
    targets.unshift(nt)
    trails.set(nt.targetId, [[nt.lat, nt.lng]])
    updateTargetAlert(nt)
  }

  // 3) 偶发目标消失
  if (Math.random() < 0.004) {
    const live = targets.filter(t => !t.gone)
    if (live.length > 0) markGone(live[0].targetId)
  }
}

// ========================= 生命周期 =========================

onMounted(() => {
  targets.forEach(t => updateTargetAlert(t))
  wsTimer = setInterval(simulateWsTick, 1500)
})

onBeforeUnmount(() => {
  if (wsTimer) clearInterval(wsTimer)
  for (const t of goneCleanupTimers.values()) clearTimeout(t)
  goneCleanupTimers.clear()
})

// ========================= 派生视图 =========================

const visibleDevices = computed(() => ANTI_DEVICES)
const visibleZones = computed(() => zones)

const sortedTargets = computed(() =>
  [...targets].sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))
)
const aliveTargetCount = computed(() => targets.filter(t => !t.gone).length)
const hasAnyTarget = computed(() => targets.length > 0)

function selectTarget(t: UavTarget) {
  if (!t.gone) selectedTarget.value = t
}

function targetColor(t: UavTarget): string {
  if (t.gone) return '#595959'
  return t.alert ? '#ff4d4f' : '#faad14'
}
</script>

<template>
  <PageContainer title="反无监控">
    <PanelCard :body-style="{ padding: 0, display: 'flex', overflow: 'hidden', flexDirection: 'column' }">
      <div class="am-wrapper">

        <!-- WS 断线提示条 -->
        <div v-if="!wsConnected" class="am-ws-alert">
          <WarningOutlined style="margin-right: 8px" />
          反无数据同步中断（最后同步于 {{ wsDisconnectTime }}），当前为最后已知状态
        </div>

        <div class="am-layout">

          <!-- ===== 左侧：模拟地图 ===== -->
          <div class="am-map" @click="onMapClick">

            <!-- 图层控制面板 -->
            <div class="am-layer-ctrl">
              <button
                class="am-layer-ctrl__btn"
                :class="{ active: layerPanelOpen }"
                @click.stop="layerPanelOpen = !layerPanelOpen"
                title="图层控制"
              >
                <AppstoreOutlined />
              </button>
              <div v-if="layerPanelOpen" class="am-layer-ctrl__panel" @click.stop>
                <label class="am-layer-ctrl__row">
                  <input v-model="layerVisible.detect" type="checkbox" />
                  <span class="am-layer-ctrl__dot" style="background:#1677ff" />
                  <span>侦测区</span>
                </label>
                <label class="am-layer-ctrl__row">
                  <input v-model="layerVisible.suppress" type="checkbox" />
                  <span class="am-layer-ctrl__dot" style="background:#fa8c16" />
                  <span>反制区</span>
                </label>
                <label class="am-layer-ctrl__row">
                  <input v-model="layerVisible.targets" type="checkbox" />
                  <span class="am-layer-ctrl__dot" style="background:#faad14" />
                  <span>实时目标</span>
                </label>
                <label class="am-layer-ctrl__row" :class="{ disabled: !layerVisible.targets }">
                  <input v-model="layerVisible.trails" type="checkbox" :disabled="!layerVisible.targets" />
                  <span class="am-layer-ctrl__dot" style="background:#faad14;opacity:.5" />
                  <span>目标尾迹</span>
                </label>
              </div>
            </div>

            <!-- 测距工具栏 -->
            <div class="am-ranging-ctrl">
              <button
                class="am-ranging-ctrl__btn"
                :class="{ active: rangingMode }"
                @click.stop="toggleRangingMode"
                title="测距工具"
              >
                <AimOutlined />
              </button>
              <button
                v-if="rangeCircles.length > 0"
                class="am-ranging-ctrl__btn am-ranging-ctrl__btn--clear"
                @click.stop="clearAllRangeCircles"
                title="清除所有测距圈"
              >
                ×
              </button>
            </div>

            <div class="am-map__bg">
              <div class="am-map__bg-label">地图底图（GIS SDK 接入后替换 · TBD-08）</div>
              <svg class="am-map__grid" width="100%" height="100%">
                <defs>
                  <pattern id="am-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                    <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#1a2535" stroke-width="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#am-grid)"/>
              </svg>
            </div>

            <!-- 侦测区 / 反制区 Polygon SVG（viewBox 0-100 对应 toMapXY 返回的百分比坐标） -->
            <svg class="am-map__zones" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <g v-if="layerVisible.suppress">
                <template v-for="z in visibleZones.filter(z => z.kind === 'suppress')" :key="z.key">
                  <polygon
                    :points="z.points.map(([lat, lng]) => {
                      const p = toMapXY(lat, lng); return `${p.x},${p.y}`
                    }).join(' ')"
                    fill="#fa8c16"
                    fill-opacity="0.15"
                    stroke="#fa8c16"
                    stroke-opacity="0.5"
                    stroke-width="1"
                  />
                </template>
              </g>
              <g v-if="layerVisible.detect">
                <template v-for="z in visibleZones.filter(z => z.kind === 'detect')" :key="z.key">
                  <polygon
                    :points="z.points.map(([lat, lng]) => {
                      const p = toMapXY(lat, lng); return `${p.x},${p.y}`
                    }).join(' ')"
                    fill="#1677ff"
                    fill-opacity="0.15"
                    stroke="#1677ff"
                    stroke-opacity="0.4"
                    stroke-width="1"
                  />
                </template>
              </g>
            </svg>

            <!-- 测距圈 SVG -->
            <svg class="am-map__range-circles" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <template v-for="rc in rangeCircles" :key="rc.id">
                <g>
                  <!-- 同心圆 -->
                  <template v-for="(radiusKm, idx) in rc.rings" :key="`${rc.id}-ring-${idx}`">
                    <polygon
                      :points="rangeCirclePath(rc.lat, rc.lng, radiusKm)"
                      fill="none"
                      stroke="#00ffff"
                      stroke-opacity="0.8"
                      stroke-width="0.4"
                      class="am-range-ring"
                      @click.stop="removeRangeCircle(rc.id)"
                    />
                    <!-- 距离标注（东南西北四个方向） -->
                    <template v-for="dir in (['N', 'E', 'S', 'W'] as const)" :key="`${rc.id}-label-${radiusKm}-${dir}`">
                      <text
                        :x="distanceLabelPosition(rc.lat, rc.lng, radiusKm, dir).x"
                        :y="distanceLabelPosition(rc.lat, rc.lng, radiusKm, dir).y"
                        fill="#ffffff"
                        font-size="1.2"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        class="am-range-label"
                        @click.stop="removeRangeCircle(rc.id)"
                      >{{ radiusKm }}km</text>
                    </template>
                  </template>

                  <!-- 方位角标注（最外圈，12个时钟方位） -->
                  <template v-for="clockPos in [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]" :key="`${rc.id}-azimuth-${clockPos}`">
                    <text
                      :x="azimuthPosition(rc.lat, rc.lng, rc.rings[rc.rings.length - 1], clockPos).x"
                      :y="azimuthPosition(rc.lat, rc.lng, rc.rings[rc.rings.length - 1], clockPos).y"
                      fill="#00ffff"
                      font-size="1.5"
                      font-weight="600"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      class="am-range-azimuth"
                      @click.stop="removeRangeCircle(rc.id)"
                    >{{ clockPos }}</text>
                  </template>

                  <!-- 中心点标记 -->
                  <circle
                    :cx="toMapXY(rc.lat, rc.lng).x"
                    :cy="toMapXY(rc.lat, rc.lng).y"
                    r="0.5"
                    fill="#00ffff"
                    stroke="#ffffff"
                    stroke-width="0.2"
                    class="am-range-center"
                    @click.stop="removeRangeCircle(rc.id)"
                  />
                </g>
              </template>
            </svg>

            <!-- 目标尾迹线 -->
            <svg class="am-map__trails" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <template v-for="t in targets" :key="`trail-${t.targetId}`">
                <polyline
                  v-if="trailEnabled && !t.gone && (trails.get(t.targetId)?.length ?? 0) > 1"
                  :points="(trails.get(t.targetId) ?? []).map(([lat, lng]) => {
                    const p = toMapXY(lat, lng); return `${p.x},${p.y}`
                  }).join(' ')"
                  :stroke="t.alert ? '#ff4d4f' : '#faad14'"
                  stroke-opacity="0.5"
                  stroke-width="1.5"
                  fill="none"
                />
              </template>
            </svg>

            <!-- 反无设备图标 -->
            <div
              v-for="d in visibleDevices"
              :key="d.id"
              class="am-device"
              :style="{ left: toMapXY(d.lat, d.lng).x + '%', top: toMapXY(d.lat, d.lng).y + '%' }"
            >
              <svg class="am-device__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M13 2 L3 14 H9 L6 22 L16 10 H10 Z"
                  :fill="d.online ? '#52c41a' : '#8c8c8c'"
                />
              </svg>
              <div class="am-device__tooltip">{{ d.name }} | {{ d.online ? '接入正常' : '接入离线' }}</div>
            </div>

            <!-- 目标图标 -->
            <div
              v-for="t in targets"
              :key="t.targetId"
              v-show="layerVisible.targets"
              class="am-target"
              :class="{ 'am-target--alert': t.alert, 'am-target--gone': t.gone, 'am-target--selected': selectedTarget?.targetId === t.targetId }"
              :style="{ left: toMapXY(t.lat, t.lng).x + '%', top: toMapXY(t.lat, t.lng).y + '%' }"
              @click="selectTarget(t)"
            >
              <svg class="am-target__icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <g :stroke="targetColor(t)" fill="none">
                  <!-- 4个旋翼 -->
                  <circle cx="10" cy="10" r="5.5" stroke-width="1.6" :fill="targetColor(t)" :fill-opacity="t.alert ? 0.18 : 0.08"/>
                  <circle cx="10" cy="10" r="1.8" :fill="targetColor(t)"/>
                  <circle cx="38" cy="10" r="5.5" stroke-width="1.6" :fill="targetColor(t)" :fill-opacity="t.alert ? 0.18 : 0.08"/>
                  <circle cx="38" cy="10" r="1.8" :fill="targetColor(t)"/>
                  <circle cx="10" cy="38" r="5.5" stroke-width="1.6" :fill="targetColor(t)" :fill-opacity="t.alert ? 0.18 : 0.08"/>
                  <circle cx="10" cy="38" r="1.8" :fill="targetColor(t)"/>
                  <circle cx="38" cy="38" r="5.5" stroke-width="1.6" :fill="targetColor(t)" :fill-opacity="t.alert ? 0.18 : 0.08"/>
                  <circle cx="38" cy="38" r="1.8" :fill="targetColor(t)"/>
                  <!-- X型机臂 -->
                  <line x1="10" y1="10" x2="20" y2="20" stroke-width="2.2" stroke-linecap="round"/>
                  <line x1="38" y1="10" x2="28" y2="20" stroke-width="2.2" stroke-linecap="round"/>
                  <line x1="10" y1="38" x2="20" y2="28" stroke-width="2.2" stroke-linecap="round"/>
                  <line x1="38" y1="38" x2="28" y2="28" stroke-width="2.2" stroke-linecap="round"/>
                  <!-- 机身 -->
                  <rect x="20" y="20" width="8" height="8" rx="2" :fill="targetColor(t)" :fill-opacity="t.alert ? 0.3 : 0.18" stroke-width="1.8"/>
                  <!-- 前置云台 -->
                  <polygon points="22,20 26,20 24,16.5" :fill="targetColor(t)" :fill-opacity="t.alert ? 0.45 : 0.3" stroke-width="1.2" stroke-linejoin="round"/>
                  <!-- 前方向标识 -->
                  <circle cx="24" cy="22" r="1.1" :fill="targetColor(t)" :opacity="0.7"/>
                </g>
              </svg>
              <div class="am-target__tooltip">{{ t.targetId }} | {{ t.speed.toFixed(0) }} m/s | {{ t.direction }}</div>
            </div>

            <!-- 图层控制面板 -->
            <div class="am-layer-ctrl">
              <button
                class="am-layer-ctrl__btn"
                :class="{ active: layerPanelOpen }"
                @click.stop="layerPanelOpen = !layerPanelOpen"
                title="图层控制"
              >
                <AppstoreOutlined />
              </button>
              <div v-if="layerPanelOpen" class="am-layer-ctrl__panel" @click.stop>
                <label class="am-layer-ctrl__row">
                  <input v-model="layerVisible.detect" type="checkbox" />
                  <span class="am-layer-ctrl__dot" style="background:#1677ff" />
                  <span>侦测区</span>
                </label>
                <label class="am-layer-ctrl__row">
                  <input v-model="layerVisible.suppress" type="checkbox" />
                  <span class="am-layer-ctrl__dot" style="background:#fa8c16" />
                  <span>反制区</span>
                </label>
                <label class="am-layer-ctrl__row">
                  <input v-model="layerVisible.targets" type="checkbox" />
                  <span class="am-layer-ctrl__dot" style="background:#faad14" />
                  <span>实时目标</span>
                </label>
                <label class="am-layer-ctrl__row" :class="{ disabled: !layerVisible.targets }">
                  <input v-model="layerVisible.trails" type="checkbox" :disabled="!layerVisible.targets" />
                  <span class="am-layer-ctrl__dot" style="background:#faad14;opacity:.5" />
                  <span>目标尾迹</span>
                </label>
              </div>
            </div>

            <!-- 测距工具栏 -->
            <div class="am-ranging-ctrl">
              <button
                class="am-ranging-ctrl__btn"
                :class="{ active: rangingMode }"
                @click.stop="toggleRangingMode"
                title="测距工具"
              >
                <AimOutlined />
              </button>
              <button
                v-if="rangeCircles.length > 0"
                class="am-ranging-ctrl__btn am-ranging-ctrl__btn--clear"
                @click.stop="clearAllRangeCircles"
                title="清除所有测距圈"
              >
                ×
              </button>
            </div>

            <div v-if="!visibleDevices.length" class="am-map__empty">暂无可监控反无设备</div>
          </div>

          <!-- ===== 右侧：目标列表 ===== -->
          <div class="am-list">
            <div class="am-list__header">
              <span class="am-list__title">目标列表</span>
              <span class="am-list__badge">{{ aliveTargetCount }}</span>
            </div>

            <div v-if="!hasAnyTarget" class="am-list__empty">
              <span style="font-size:22px;opacity:.4">🎯</span>
              <span>暂无探测目标，等待三方反无系统推送</span>
            </div>

            <div class="am-list__body">
              <div
                v-for="t in sortedTargets"
                :key="t.targetId"
                class="am-list-item"
                :class="{
                  'am-list-item--alert': t.alert && !t.gone,
                  'am-list-item--gone': t.gone,
                  'am-list-item--selected': selectedTarget?.targetId === t.targetId,
                }"
                @click="selectTarget(t)"
              >
                <div class="am-list-item__row">
                  <span class="am-list-item__id">✈ {{ t.targetId }}</span>
                  <button class="am-list-item__ignore" title="忽略目标" @click.stop="ignoreTarget(t.targetId)">×</button>
                </div>
                <div class="am-list-item__row am-list-item__row--meta">
                  <span>速度 {{ t.speed.toFixed(0) }} m/s</span>
                  <span>方向 {{ t.direction }}</span>
                  <span>发现 {{ t.firstSeenAt }}</span>
                </div>
                <div v-if="t.gone" class="am-list-item__gone-tag">已消失</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PanelCard>
  </PageContainer>
</template>

<style scoped lang="scss">
.am-wrapper {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.am-ws-alert {
  padding: 8px 16px;
  background: rgba(250, 173, 20, 0.15);
  border-bottom: 1px solid #d48806;
  color: #faad14;
  font-size: 13px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.am-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ===== 地图 ===== */
.am-map { flex: 1; position: relative; overflow: hidden; background: #0a1628; }
.am-map__bg { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.am-map__bg-label {
  position: absolute; bottom: 12px; left: 50%;
  transform: translateX(-50%);
  color: #1a2535; font-size: 11px; white-space: nowrap; user-select: none;
}
.am-map__grid { position: absolute; inset: 0; z-index: 2; }
.am-map__zones { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.am-map__trails { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
.am-map__empty {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  color: #434343; font-size: 13px;
}

/* 反无设备图标 */
.am-device {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 5;
  &:hover .am-device__tooltip { display: block; }
}
.am-device__icon { width: 24px; height: 24px; filter: drop-shadow(0 0 3px rgba(0,0,0,.6)); }
.am-device__tooltip {
  display: none;
  position: absolute; bottom: calc(100% + 4px); left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,.8); color: #d9d9d9;
  font-size: 11px; padding: 3px 8px; border-radius: 3px;
  white-space: nowrap; pointer-events: none; z-index: 30;
}

/* 目标图标 */
.am-target {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
  &:hover .am-target__tooltip { display: block; }
  &--selected { filter: drop-shadow(0 0 6px rgba(250,173,20,.9)); }
  &--gone { opacity: .45; cursor: default; }
}
.am-target__icon { width: 30px; height: 30px; filter: drop-shadow(0 0 3px rgba(0,0,0,.7)); }
.am-target--alert .am-target__icon { width: 34px; height: 34px; }
.am-target--alert .am-target__icon { animation: am-blink 1s ease-in-out infinite; }
@keyframes am-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: .3; }
}
.am-target__tooltip {
  display: none;
  position: absolute; bottom: calc(100% + 4px); left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,.8); color: #d9d9d9;
  font-size: 11px; padding: 3px 8px; border-radius: 3px;
  white-space: nowrap; pointer-events: none; z-index: 30;
}

/* 图层控制 */
.am-layer-ctrl {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 9999 !important;
  pointer-events: auto;
}
.am-layer-ctrl__btn {
  width: 32px; height: 32px;
  background: rgba(20,30,48,.95) !important;
  border: 2px solid #1677ff !important;
  color: #1677ff !important;
  border-radius: 4px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; transition: all .15s;
  box-shadow: 0 2px 8px rgba(0,0,0,.5) !important;
  &:hover, &.active {
    border-color: #40a9ff !important;
    color: #40a9ff !important;
    background: rgba(20,30,48,1) !important;
  }
}
.am-layer-ctrl__panel {
  position: absolute; top: calc(100% + 6px); right: 0;
  background: rgba(20,30,48,.95); border: 1px solid #2a3a52;
  border-radius: 6px; padding: 10px 14px;
  display: flex; flex-direction: column; gap: 8px; white-space: nowrap;
}
.am-layer-ctrl__row {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #d9d9d9; cursor: pointer;
  input[type=checkbox] { cursor: pointer; accent-color: #1677ff; }
  &.disabled { color: #595959; cursor: not-allowed; }
}
.am-layer-ctrl__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

/* 测距工具栏 */
.am-ranging-ctrl {
  position: absolute;
  top: 16px;
  right: 56px;
  z-index: 9999 !important;
  display: flex;
  gap: 6px;
  pointer-events: auto;
}
.am-ranging-ctrl__btn {
  width: 32px; height: 32px;
  background: rgba(20,30,48,.95) !important;
  border: 2px solid #00ffff !important;
  color: #00ffff !important;
  border-radius: 4px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; transition: all .15s;
  box-shadow: 0 2px 8px rgba(0,0,0,.5) !important;
  &:hover {
    border-color: #5cffff !important;
    color: #5cffff !important;
    background: rgba(20,30,48,1) !important;
  }
  &.active {
    border-color: #00ffff !important;
    color: #00ffff !important;
    background: rgba(0,255,255,.2) !important;
  }
  &--clear {
    font-size: 20px; font-weight: 600;
    &:hover {
      border-color: #ff4d4f !important;
      color: #ff4d4f !important;
      background: rgba(255,77,79,.2) !important;
    }
  }
}

/* 测距圈样式 */
.am-map__range-circles { position: absolute; inset: 0; z-index: 8; }
.am-range-ring { cursor: pointer; }
.am-range-label {
  pointer-events: all; cursor: pointer;
  text-shadow: 0 0 3px rgba(0,0,0,.9), 0 0 6px rgba(0,0,0,.7);
}
.am-range-azimuth {
  pointer-events: all; cursor: pointer;
  text-shadow: 0 0 4px rgba(0,0,0,.9), 0 0 8px rgba(0,0,0,.7);
}
.am-range-center { cursor: pointer; }

/* ===== 右侧目标列表 ===== */
.am-list {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid #1f2f42;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: var(--of-bg-card, #18222b);
}
.am-list__header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #1f2f42;
  flex-shrink: 0;
}
.am-list__title { font-size: 14px; font-weight: 600; color: #d9d9d9; }
.am-list__badge {
  min-width: 20px; height: 20px; padding: 0 6px;
  background: rgba(250,173,20,.2); color: #faad14;
  border-radius: 10px; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
}
.am-list__empty {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; color: #434343; font-size: 12px;
  padding: 24px; text-align: center;
}
.am-list__body { flex: 1; overflow-y: auto; padding: 8px; }
.am-list-item {
  padding: 8px 10px; margin-bottom: 8px;
  border: 1px solid #1f2f42; border-radius: 5px;
  background: #141e2b; cursor: pointer;
  transition: all .15s; position: relative;
  &:hover { border-color: #2a3a52; }
  &--alert { border-color: #ff4d4f; background: rgba(255,77,79,.08); }
  &--gone { background: #10161f; opacity: .6; cursor: default; }
  &--selected { box-shadow: 0 0 0 1px #faad14; }
}
.am-list-item__row { display: flex; align-items: center; justify-content: space-between; }
.am-list-item__id { font-weight: 600; font-size: 13px; color: #d9d9d9; }
.am-list-item--alert .am-list-item__id { color: #ff4d4f; }
.am-list-item__row--meta {
  justify-content: flex-start; gap: 12px;
  margin-top: 6px; font-size: 11px; color: #595959;
}
.am-list-item__ignore {
  width: 20px; height: 20px;
  background: transparent; border: none;
  color: #434343; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border-radius: 3px; font-size: 14px;
  &:hover { background: rgba(255,77,79,.15); color: #ff4d4f; }
}
.am-list-item__gone-tag {
  position: absolute; top: 8px; right: 30px;
  font-size: 10px; color: #595959;
}
</style>