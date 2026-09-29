<script setup lang="ts">
/**
 * 无人机监控 —— 实时监控中心 PC端
 * PRD: 实时监控中心 · 无人机监控 V1.0
 *
 * 布局：左侧设备树（260px固定）+ 右侧模拟地图（flex:1）
 * 右侧面板（480px，从右滑入）覆盖于地图上方
 * WS 模拟：飞行中无人机每 1.5s 微移位置 + 更新电量/速度/高度
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  CloseOutlined,
  SearchOutlined,
  WarningOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue'
import { MOCK_UAV_DEVICES, type UavDevice, type UavFlightStatus } from '@/mock/uavMonitor'
// 地图标记图标：内联 SVG（无外部图标文件依赖）

// ========================= 设备数据 =========================

const devices = reactive<UavDevice[]>(MOCK_UAV_DEVICES.map(d => ({ ...d })))

function getDevice(id: string): UavDevice | undefined {
  return devices.find(d => d.id === id)
}

// ========================= 设备树 =========================

const searchTerm = ref('')
const groupExpanded = reactive({ c: true, a: true })

function expandAll() {
  groupExpanded.c = true
  groupExpanded.a = true
}
function collapseAll() {
  groupExpanded.c = false
  groupExpanded.a = false
}

const cDevices = computed(() =>
  devices.filter(d => d.uavClass === 'C' && (
    !searchTerm.value ||
    d.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    d.sn.toLowerCase().includes(searchTerm.value.toLowerCase())
  ))
)
const aDevices = computed(() =>
  devices.filter(d => d.uavClass === 'A' && (
    !searchTerm.value ||
    d.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    d.sn.toLowerCase().includes(searchTerm.value.toLowerCase())
  ))
)

const cFlyingCount = computed(() => devices.filter(d => d.uavClass === 'C' && d.flightStatus === 'flying').length)
const aFlyingCount = computed(() => devices.filter(d => d.uavClass === 'A' && d.flightStatus === 'flying').length)
const cTotal = computed(() => devices.filter(d => d.uavClass === 'C').length)
const aTotal = computed(() => devices.filter(d => d.uavClass === 'A').length)

// ========================= 地图图层 =========================

const layerVisible = reactive({ c: true, a: true })
const layerPanelOpen = ref(false)

// ========================= 右侧面板 =========================

const panelDeviceId = ref<string | null>(null)
const panelVisible = ref(false)

const panelDevice = computed(() =>
  panelDeviceId.value ? getDevice(panelDeviceId.value) : null
)

function openPanel(id: string) {
  panelDeviceId.value = id
  panelVisible.value = true
}

function closePanel() {
  panelVisible.value = false
  setTimeout(() => { panelDeviceId.value = null }, 300)
}

function onTreeNodeClick(device: UavDevice) {
  openPanel(device.id)
}

function onMapMarkerClick(device: UavDevice) {
  openPanel(device.id)
}

// ========================= 航迹线（最近 50 个点）=========================

// trails: deviceId → [lat, lng][]
const trails = reactive<Map<string, [number, number][]>>(new Map())

function addTrailPoint(id: string, lat: number, lng: number) {
  if (!trails.has(id)) trails.set(id, [])
  const pts = trails.get(id)!
  pts.push([lat, lng])
  if (pts.length > 50) pts.shift()
}

// 初始化飞行中设备的航迹起始点
devices.filter(d => d.flightStatus === 'flying').forEach(d => {
  trails.set(d.id, [[d.lat, d.lng]])
})

// ========================= WS 模拟 =========================

const wsConnected = ref(true)
const wsDisconnectTime = ref('')
let wsTimer: ReturnType<typeof setInterval> | null = null
let wsDisconnectTimer: ReturnType<typeof setInterval> | null = null

function simulateWsTick() {
  if (!wsConnected.value) return
  devices.forEach(d => {
    if (d.flightStatus !== 'flying') return
    // 微小位移（模拟飞行路径）
    const dlat = (Math.random() - 0.4) * 0.002
    const dlng = (Math.random() - 0.3) * 0.002
    d.lat = Math.round((d.lat + dlat) * 1e6) / 1e6
    d.lng = Math.round((d.lng + dlng) * 1e6) / 1e6
    // 航向缓慢偏转
    d.heading = (d.heading + Math.round((Math.random() - 0.5) * 10) + 360) % 360
    // 电量缓慢消耗
    if (d.battery > 1) d.battery = Math.max(0, d.battery - 0.3)
    // 高度/速度小幅波动
    d.altitude = Math.max(50, d.altitude + Math.round((Math.random() - 0.5) * 4))
    d.speed = Math.max(3, Math.min(30, d.speed + Math.round((Math.random() - 0.5) * 2)))
    // 航迹记录
    addTrailPoint(d.id, d.lat, d.lng)
    // 航线进度
    if (d.waypointIndex != null && d.totalWaypoints != null) {
      if (Math.random() < 0.03) d.waypointIndex = Math.min(d.totalWaypoints, d.waypointIndex + 1)
    }
  })
}

// ========================= 坐标到地图百分比 =========================

const MAP_BOUNDS = { latMin: 16.60, latMax: 17.40, lngMin: 13.32, lngMax: 14.10 }

function toMapXY(lat: number, lng: number) {
  const x = (lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin) * 100
  const y = (1 - (lat - MAP_BOUNDS.latMin) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * 100
  return { x, y }
}

// ========================= 地图标记 =========================

const visibleMarkers = computed(() =>
  devices.filter(d => {
    if (d.uavClass === 'C' && !layerVisible.c) return false
    if (d.uavClass === 'A' && !layerVisible.a) return false
    return true
  })
)

function markerColor(d: UavDevice): string {
  if (d.flightStatus === 'flying') return d.uavClass === 'C' ? '#1677ff' : '#fa8c16'
  return '#595959'
}

// ========================= 生命周期 =========================

onMounted(() => {
  wsTimer = setInterval(simulateWsTick, 1500)
})

onBeforeUnmount(() => {
  if (wsTimer) clearInterval(wsTimer)
  if (wsDisconnectTimer) clearInterval(wsDisconnectTimer)
})

// 状态工具函数
function statusColor(status: UavFlightStatus): string {
  if (status === 'flying') return '#1677ff'
  if (status === 'offline') return '#ff4d4f'
  return '#595959'
}
function statusLabel(status: UavFlightStatus): string {
  if (status === 'flying') return '飞行中'
  if (status === 'offline') return '离线'
  return '地面待机'
}
function isNodeDimmed(d: UavDevice): boolean {
  return d.flightStatus !== 'flying'
}
</script>

<template>
  <PageContainer title="无人机监控">
    <PanelCard :body-style="{ padding: 0, display: 'flex', overflow: 'hidden', flexDirection: 'column' }">
      <div class="um-wrapper">

        <!-- WS 断线提示条 -->
        <div v-if="!wsConnected" class="um-ws-alert">
          <WarningOutlined style="margin-right: 8px" />
          实时数据同步中断（最后同步于 {{ wsDisconnectTime }}），当前为最后已知状态
        </div>

        <!-- 主体布局：树 + 地图 -->
        <div class="um-layout">

          <!-- ===== 左侧：设备树 ===== -->
          <div class="um-tree">
            <div class="um-tree__search">
              <a-input
                v-model:value="searchTerm"
                placeholder="搜索无人机..."
                :allow-clear="true"
                size="small"
              >
                <template #prefix><SearchOutlined style="color: #8c8c8c" /></template>
              </a-input>
              <div class="um-tree__actions">
                <a @click="expandAll">展开所有</a>
                <span class="um-tree__divider">|</span>
                <a @click="collapseAll">收起所有</a>
              </div>
            </div>

            <div class="um-tree__body">
              <!-- 空状态 -->
              <div v-if="!cDevices.length && !aDevices.length" class="um-tree__empty">
                {{ searchTerm ? '未找到匹配设备' : '暂无可监控无人机' }}
              </div>

              <!-- C 类分组 -->
              <div class="um-group-header" @click="groupExpanded.c = !groupExpanded.c">
                <span class="um-group-arrow" :class="{ expanded: groupExpanded.c }">▶</span>
                <span class="um-group-label">C类无人机</span>
                <span class="um-group-badge">{{ cFlyingCount }}/{{ cTotal }}</span>
              </div>
              <template v-if="groupExpanded.c">
                <div
                  v-for="d in cDevices"
                  :key="d.id"
                  class="um-device-node"
                  :class="{
                    'is-flying': d.flightStatus === 'flying',
                    'is-dimmed': isNodeDimmed(d),
                    'is-selected': panelDeviceId === d.id && panelVisible,
                    'low-opacity': searchTerm && !d.name.toLowerCase().includes(searchTerm.toLowerCase()) && !d.sn.toLowerCase().includes(searchTerm.toLowerCase()),
                  }"
                  @click="onTreeNodeClick(d)"
                >
                  <span class="um-dot" :style="{ background: statusColor(d.flightStatus) }" />
                  <span class="um-node-name" :title="d.name">{{ d.name }}</span>
                  <span class="um-node-status">{{ statusLabel(d.flightStatus) }}</span>
                </div>
                <div v-if="!cDevices.length && searchTerm" class="um-tree__empty um-tree__empty--sub">无匹配</div>
              </template>

              <!-- A 类分组 -->
              <div class="um-group-header" @click="groupExpanded.a = !groupExpanded.a">
                <span class="um-group-arrow" :class="{ expanded: groupExpanded.a }">▶</span>
                <span class="um-group-label">A类无人机</span>
                <span class="um-group-badge">{{ aFlyingCount }}/{{ aTotal }}</span>
              </div>
              <template v-if="groupExpanded.a">
                <div
                  v-for="d in aDevices"
                  :key="d.id"
                  class="um-device-node"
                  :class="{
                    'is-flying': d.flightStatus === 'flying',
                    'is-dimmed': isNodeDimmed(d),
                    'is-selected': panelDeviceId === d.id && panelVisible,
                    'low-opacity': searchTerm && !d.name.toLowerCase().includes(searchTerm.toLowerCase()) && !d.sn.toLowerCase().includes(searchTerm.toLowerCase()),
                  }"
                  @click="onTreeNodeClick(d)"
                >
                  <span class="um-dot" :style="{ background: statusColor(d.flightStatus) }" />
                  <span class="um-node-name" :title="d.name">{{ d.name }}</span>
                  <span class="um-node-status">{{ statusLabel(d.flightStatus) }}</span>
                </div>
                <div v-if="!aDevices.length && searchTerm" class="um-tree__empty um-tree__empty--sub">无匹配</div>
              </template>
            </div>
          </div>

          <!-- ===== 右侧：模拟地图区域 ===== -->
          <div class="um-map" @click.self="layerPanelOpen = false">

            <!-- 地图背景（模拟 GIS 底图，TBD-08 接入高德后替换） -->
            <div class="um-map__bg">
              <img src="/map-bg.png" class="um-map__bg-image" alt="地图底图" />
              <div class="um-map__bg-label">地图底图（GIS SDK 接入后替换 · TBD-08）</div>
            </div>

            <!-- 航迹线 SVG overlay -->
            <svg class="um-map__trails" width="100%" height="100%">
              <template v-for="d in visibleMarkers" :key="`trail-${d.id}`">
                <polyline
                  v-if="d.flightStatus === 'flying' && (trails.get(d.id)?.length ?? 0) > 1"
                  :points="(trails.get(d.id) ?? []).map(([lat, lng]) => {
                    const p = toMapXY(lat, lng)
                    return `${p.x}%,${p.y}%`
                  }).join(' ')"
                  :stroke="d.uavClass === 'C' ? '#1677ff' : '#fa8c16'"
                  stroke-width="1.5"
                  fill="none"
                  stroke-opacity="0.5"
                />
              </template>
            </svg>

            <!-- UAV 标记 -->
            <template v-for="d in visibleMarkers" :key="`marker-${d.id}`">
              <div
                class="um-marker"
                :class="{
                  'um-marker--flying': d.flightStatus === 'flying',
                  'um-marker--grounded': d.flightStatus === 'grounded',
                  'um-marker--offline': d.flightStatus === 'offline',
                  'um-marker--selected': panelDeviceId === d.id && panelVisible,
                }"
                :style="{
                  left: toMapXY(d.lat, d.lng).x + '%',
                  top: toMapXY(d.lat, d.lng).y + '%',
                }"
                :title="`${d.name} | ${statusLabel(d.flightStatus)}`"
                @click="onMapMarkerClick(d)"
              >
                <!-- C类四旋翼 V2（DJI M30T / M30） -->
                <svg
                  v-if="d.uavClass === 'C'"
                  class="um-marker__icon"
                  viewBox="0 0 48 48"
                  :style="{ transform: `rotate(${d.heading}deg)` }"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g :stroke="d.flightStatus === 'flying' ? markerColor(d) : '#595959'" fill="none">
                    <!-- 4个旋翼 -->
                    <circle cx="10" cy="10" r="5.5" stroke-width="1.6" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.08 : 0"/>
                    <circle cx="10" cy="10" r="1.8" :fill="markerColor(d)"/>
                    <circle cx="38" cy="10" r="5.5" stroke-width="1.6" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.08 : 0"/>
                    <circle cx="38" cy="10" r="1.8" :fill="markerColor(d)"/>
                    <circle cx="10" cy="38" r="5.5" stroke-width="1.6" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.08 : 0"/>
                    <circle cx="10" cy="38" r="1.8" :fill="markerColor(d)"/>
                    <circle cx="38" cy="38" r="5.5" stroke-width="1.6" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.08 : 0"/>
                    <circle cx="38" cy="38" r="1.8" :fill="markerColor(d)"/>
                    <!-- X型机臂 -->
                    <line x1="10" y1="10" x2="20" y2="20" stroke-width="2.2" stroke-linecap="round"/>
                    <line x1="38" y1="10" x2="28" y2="20" stroke-width="2.2" stroke-linecap="round"/>
                    <line x1="10" y1="38" x2="20" y2="28" stroke-width="2.2" stroke-linecap="round"/>
                    <line x1="38" y1="38" x2="28" y2="28" stroke-width="2.2" stroke-linecap="round"/>
                    <!-- 机身 -->
                    <rect x="20" y="20" width="8" height="8" rx="2" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.18 : 0" stroke-width="1.8"/>
                    <!-- 前置云台 -->
                    <polygon points="22,20 26,20 24,16.5" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.3 : 0" stroke-width="1.2" stroke-linejoin="round"/>
                    <!-- 前方向标识 -->
                    <circle cx="24" cy="22" r="1.1" :fill="markerColor(d)" :opacity="d.flightStatus === 'flying' ? 0.7 : 0.5"/>
                  </g>
                </svg>

                <!-- A类垂直起降固定翼 V2（持恒 CHIHENG-ZL） — 无航向角，不旋转 -->
                <svg
                  v-else
                  class="um-marker__icon um-marker__icon--a"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g :stroke="d.flightStatus === 'flying' ? markerColor(d) : '#595959'" fill="none">
                    <!-- 4个升力旋翼（带旋转虚线圆环） -->
                    <line x1="18" y1="22" x2="11" y2="15" stroke-width="1.6" stroke-linecap="round"/>
                    <circle cx="11" cy="15" r="3.2" stroke-width="1.2" stroke-dasharray="2 1.5" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.06 : 0"/>
                    <circle cx="11" cy="15" r="1" :fill="markerColor(d)"/>
                    <line x1="30" y1="22" x2="37" y2="15" stroke-width="1.6" stroke-linecap="round"/>
                    <circle cx="37" cy="15" r="3.2" stroke-width="1.2" stroke-dasharray="2 1.5" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.06 : 0"/>
                    <circle cx="37" cy="15" r="1" :fill="markerColor(d)"/>
                    <line x1="18" y1="30" x2="11" y2="33" stroke-width="1.6" stroke-linecap="round"/>
                    <circle cx="11" cy="33" r="3.2" stroke-width="1.2" stroke-dasharray="2 1.5" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.06 : 0"/>
                    <circle cx="11" cy="33" r="1" :fill="markerColor(d)"/>
                    <line x1="30" y1="30" x2="37" y2="33" stroke-width="1.6" stroke-linecap="round"/>
                    <circle cx="37" cy="33" r="3.2" stroke-width="1.2" stroke-dasharray="2 1.5" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.06 : 0"/>
                    <circle cx="37" cy="33" r="1" :fill="markerColor(d)"/>
                    <!-- 主翼（后掠翼） -->
                    <path d="M9,24 L19,22.5 L29,22.5 L39,24 L29,23.5 L19,23.5 Z" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.2 : 0" stroke-width="1.3" stroke-linejoin="round"/>
                    <!-- 机身（细长） -->
                    <path d="M22.5,12 L25.5,12 L26,22 L27,36 L24,38 L21,36 L22,22 Z" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.15 : 0" stroke-width="1.6" stroke-linejoin="round"/>
                    <!-- V型尾翼 -->
                    <path d="M22,36 L17,42 L20,38" stroke-width="1.3" stroke-linejoin="round" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.12 : 0"/>
                    <path d="M26,36 L31,42 L28,38" stroke-width="1.3" stroke-linejoin="round" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.12 : 0"/>
                    <!-- 尾部推进螺旋桨 -->
                    <ellipse cx="24" cy="38.5" rx="2.5" ry="0.8" stroke-width="0.9" :fill="markerColor(d)" :fill-opacity="d.flightStatus === 'flying' ? 0.06 : 0"/>
                    <!-- 机头方向标识 -->
                    <circle cx="24" cy="13.5" r="1.1" :fill="markerColor(d)" :opacity="d.flightStatus === 'flying' ? 0.75 : 0.5"/>
                    <!-- 机身中线 -->
                    <line x1="24" y1="14" x2="24" y2="35" stroke-width="0.5" :opacity="d.flightStatus === 'flying' ? 0.25 : 0.15"/>
                  </g>
                </svg>
                <!-- 悬浮 Tooltip -->
                <div class="um-marker__tooltip">{{ d.name }} | {{ statusLabel(d.flightStatus) }}</div>
              </div>
            </template>

            <!-- 图层控制面板 -->
            <div class="um-layer-ctrl">
              <button
                class="um-layer-ctrl__btn"
                :class="{ active: layerPanelOpen }"
                @click.stop="layerPanelOpen = !layerPanelOpen"
                title="图层控制"
              >
                <AppstoreOutlined />
              </button>
              <div v-if="layerPanelOpen" class="um-layer-ctrl__panel" @click.stop>
                <label class="um-layer-ctrl__row">
                  <input v-model="layerVisible.c" type="checkbox" />
                  <span class="um-layer-ctrl__dot" style="background:#1677ff" />
                  <span>C类无人机</span>
                </label>
                <label class="um-layer-ctrl__row">
                  <input v-model="layerVisible.a" type="checkbox" />
                  <span class="um-layer-ctrl__dot" style="background:#fa8c16" />
                  <span>A类无人机</span>
                </label>
              </div>
            </div>

          </div>

          <!-- ===== 右侧面板（绝对定位，滑入） ===== -->
          <transition name="panel-slide">
            <div v-if="panelVisible && panelDevice" class="um-panel">
              <div class="um-panel__header">
                <span class="um-panel__title">{{ panelDevice.name }}</span>
                <button class="um-panel__close" @click="closePanel"><CloseOutlined /></button>
              </div>

              <!-- 飞行中：视频 + 飞行参数 -->
              <template v-if="panelDevice.flightStatus === 'flying'">
                <div class="um-panel__video">
                  <div class="um-panel__video-placeholder">
                    <div class="um-panel__video-text">
                      <span style="font-size:28px;opacity:.35">📡</span><br/>
                      视频流播放中（原型占位）<br/>
                      <span style="font-size:11px;color:#595959">TBD-03：接入 HLS 流后替换</span>
                    </div>
                  </div>
                </div>
                <div class="um-panel__section-title">飞行参数</div>
                <div class="um-panel__params">
                  <div class="um-param-row">
                    <span class="um-param-label">电量</span>
                    <span class="um-param-value" :class="{ 'um-param--warn': panelDevice.battery <= 20 }">
                      {{ panelDevice.battery.toFixed(0) }}%
                    </span>
                    <div class="um-battery-bar">
                      <div
                        class="um-battery-fill"
                        :style="{ width: panelDevice.battery + '%', background: panelDevice.battery <= 20 ? '#ff4d4f' : '#1677ff' }"
                      />
                    </div>
                  </div>
                  <div class="um-param-row">
                    <span class="um-param-label">高度</span>
                    <span class="um-param-value">{{ panelDevice.altitude }} m</span>
                  </div>
                  <div class="um-param-row">
                    <span class="um-param-label">速度</span>
                    <span class="um-param-value">{{ panelDevice.speed }} m/s</span>
                  </div>
                  <div class="um-param-row">
                    <span class="um-param-label">经纬度</span>
                    <span class="um-param-value">{{ panelDevice.lat.toFixed(4) }}°N, {{ panelDevice.lng.toFixed(4) }}°E</span>
                  </div>
                  <div v-if="panelDevice.waypointIndex != null" class="um-param-row">
                    <span class="um-param-label">航线进度</span>
                    <span class="um-param-value">{{ panelDevice.waypointIndex }}/{{ panelDevice.totalWaypoints }} 航点</span>
                  </div>
                </div>
              </template>

              <!-- 地面待机 / 离线：设备状态 -->
              <template v-else>
                <div class="um-panel__no-video">
                  <span style="font-size:22px">⚠</span>
                  <span>{{ panelDevice.flightStatus === 'offline' ? '设备已离线' : '设备未飞行，暂无视频流' }}</span>
                </div>
                <div class="um-panel__section-title">设备状态</div>
                <div class="um-panel__params">
                  <div class="um-param-row">
                    <span class="um-param-label">飞行状态</span>
                    <span class="um-param-value">{{ statusLabel(panelDevice.flightStatus) }}</span>
                  </div>
                  <div v-if="panelDevice.lastFlightTime" class="um-param-row">
                    <span class="um-param-label">最后飞行</span>
                    <span class="um-param-value">{{ panelDevice.lastFlightTime }}</span>
                  </div>
                  <div v-if="panelDevice.battery" class="um-param-row">
                    <span class="um-param-label">电量</span>
                    <span class="um-param-value">{{ panelDevice.battery }}%</span>
                  </div>
                </div>
              </template>

              <div class="um-panel__section-title">设备信息</div>
              <div class="um-panel__params">
                <div class="um-param-row">
                  <span class="um-param-label">SN</span>
                  <span class="um-param-value um-param-sn" :title="panelDevice.sn">{{ panelDevice.sn }}</span>
                </div>
                <div class="um-param-row">
                  <span class="um-param-label">所属营地</span>
                  <span class="um-param-value">{{ panelDevice.campName }}</span>
                </div>
                <div class="um-param-row">
                  <span class="um-param-label">接入状态</span>
                  <span class="um-param-value" :style="{ color: panelDevice.accessStatus === 'ONLINE' ? '#52c41a' : '#ff4d4f' }">
                    {{ panelDevice.accessStatus === 'ONLINE' ? '已接入' : '未接入' }}
                  </span>
                </div>
              </div>
            </div>
          </transition>

        </div>
      </div>
    </PanelCard>
  </PageContainer>
</template>

<style scoped lang="scss">
.um-wrapper {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.um-ws-alert {
  padding: 8px 16px;
  background: rgba(250, 173, 20, 0.15);
  border-bottom: 1px solid #d48806;
  color: #faad14;
  font-size: 13px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.um-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

/* ===== 设备树 ===== */
.um-tree {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #1f1f1f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
  background: var(--of-bg-card, #18222b);
}
.um-tree__search {
  padding: 8px;
  border-bottom: 1px solid #1f1f1f;
  flex-shrink: 0;
}
.um-tree__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;

  a {
    color: #1677ff;
    cursor: pointer;
    transition: color 0.15s;
    &:hover { color: #4096ff; }
  }
}
.um-tree__divider {
  color: #434343;
  user-select: none;
}
.um-tree__body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.um-tree__empty {
  padding: 20px 12px;
  color: #595959;
  font-size: 12px;
  text-align: center;
  &--sub { padding: 8px 32px; }
}
.um-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #d9d9d9;
  user-select: none;
  &:hover { background: rgba(255,255,255,.04); }
}
.um-group-arrow {
  font-size: 9px;
  color: #595959;
  transition: transform .2s;
  &.expanded { transform: rotate(90deg); }
}
.um-group-label { flex: 1; }
.um-group-badge { font-size: 11px; color: #52c41a; }
.um-device-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px 5px 28px;
  cursor: pointer;
  font-size: 13px;
  color: #8c8c8c;
  user-select: none;
  transition: background .15s;
  &:hover { background: rgba(255,255,255,.05); }
  &.is-flying { color: #d9d9d9; font-weight: 500; }
  &.is-selected { background: rgba(22,119,255,.12); }
  &.low-opacity { opacity: 0.35; }
}
.um-dot {
  width: 8px; height: 8px;
  border-radius: 50%; flex-shrink: 0;
}
.um-node-name {
  flex: 1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.um-node-status {
  font-size: 10px; color: #434343;
  flex-shrink: 0; min-width: 48px; text-align: right;
}

/* ===== 地图区域 ===== */
.um-map {
  flex: 1; position: relative;
  overflow: hidden; background: #0a1628; cursor: default;
}
.um-map__bg {
  position: absolute; inset: 0; pointer-events: none;
}
.um-map__bg-image {
  width: 100%; height: 100%; object-fit: cover; opacity: 0.85;
}
.um-map__bg-label {
  position: absolute; bottom: 12px; left: 50%;
  transform: translateX(-50%);
  color: #1a2535; font-size: 11px; white-space: nowrap; user-select: none;
}
.um-map__trails { position: absolute; inset: 0; pointer-events: none; }

/* UAV 标记 */
.um-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer; z-index: 10;
  &:hover .um-marker__tooltip { display: block; }
}
.um-marker__icon {
  width: 28px; height: 28px;
  filter: drop-shadow(0 0 3px rgba(0,0,0,.6));
  .um-marker--flying & { width: 32px; height: 32px; }
  .um-marker--offline & { opacity: .5; }
  .um-marker--selected & { filter: drop-shadow(0 0 6px rgba(22,119,255,.8)); }
  // A类固定翼更大（无航向角，靠尺寸区分）
  &--a { width: 36px; height: 36px; }
}
.um-marker--flying .um-marker__icon--a { width: 42px; height: 42px; }
.um-marker__tooltip {
  display: none;
  position: absolute; bottom: calc(100% + 4px); left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,.8); color: #d9d9d9;
  font-size: 11px; padding: 3px 8px; border-radius: 3px;
  white-space: nowrap; pointer-events: none; z-index: 20;
}

/* 图层控制 */
.um-layer-ctrl { position: absolute; top: 16px; right: 16px; z-index: 20; }
.um-layer-ctrl__btn {
  width: 32px; height: 32px;
  background: rgba(20,30,48,.85); border: 1px solid #2a3a52;
  color: #8c8c8c; border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; transition: all .15s;
  &:hover, &.active { border-color: #1677ff; color: #1677ff; }
}
.um-layer-ctrl__panel {
  position: absolute; top: calc(100% + 6px); right: 0;
  background: rgba(20,30,48,.95); border: 1px solid #2a3a52;
  border-radius: 6px; padding: 10px 14px;
  display: flex; flex-direction: column; gap: 8px; white-space: nowrap;
}
.um-layer-ctrl__row {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #d9d9d9; cursor: pointer;
  input[type=checkbox] { cursor: pointer; accent-color: #1677ff; }
}
.um-layer-ctrl__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

/* ===== 右侧面板 ===== */
.um-panel {
  position: absolute; top: 0; right: 0;
  width: 480px; height: 100%;
  background: #141e2b; border-left: 1px solid #1f2f42;
  z-index: 30; display: flex; flex-direction: column; overflow-y: auto;
}
.panel-slide-enter-active, .panel-slide-leave-active { transition: transform .3s ease; }
.panel-slide-enter-from, .panel-slide-leave-to { transform: translateX(100%); }

.um-panel__header {
  display: flex; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid #1f2f42; flex-shrink: 0;
}
.um-panel__title {
  flex: 1; font-size: 14px; font-weight: 600; color: #d9d9d9;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.um-panel__close {
  width: 24px; height: 24px; background: transparent; border: none;
  color: #595959; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  border-radius: 3px; transition: all .15s;
  &:hover { background: rgba(255,77,79,.15); color: #ff4d4f; }
}
.um-panel__video { flex-shrink: 0; padding: 12px 16px; }
.um-panel__video-placeholder {
  aspect-ratio: 16/9; background: #0a1020;
  border: 1px dashed #1f2f42; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
.um-panel__video-text { text-align: center; color: #595959; font-size: 13px; line-height: 1.8; }
.um-panel__no-video {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 24px 16px; color: #595959; font-size: 13px;
  border-bottom: 1px solid #1f2f42;
}
.um-panel__section-title {
  padding: 8px 16px 4px; font-size: 11px; font-weight: 600;
  color: #434343; letter-spacing: .5px; text-transform: uppercase;
  border-top: 1px solid #1a2535;
}
.um-panel__params { padding: 4px 16px 8px; }
.um-param-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-bottom: 1px solid #1a2535; font-size: 13px;
}
.um-param-label { color: #595959; flex-shrink: 0; width: 70px; }
.um-param-value {
  color: #d9d9d9; flex: 1;
  &.um-param--warn { color: #ff4d4f; font-weight: 600; }
}
.um-param-sn {
  font-family: monospace; font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.um-battery-bar {
  width: 80px; height: 6px; background: #1f2f42;
  border-radius: 3px; overflow: hidden; flex-shrink: 0;
}
.um-battery-fill { height: 100%; border-radius: 3px; transition: width .3s; }
</style>