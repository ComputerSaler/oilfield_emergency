<script setup lang="ts">
/**
 * C类无人机实况 —— 实时监控中心
 * 左侧卡片列表 + 右侧GIS地图（本期仅做左侧列表）
 */
import { computed, ref } from 'vue'
import { RightOutlined, LeftOutlined, AimOutlined, VideoCameraOutlined } from '@ant-design/icons-vue'
import MapSimulator from './components/MapSimulator.vue'
import CFlightRecordsPanel from './components/CFlightRecordsPanel.vue'
import {
  C_UAV_REALTIME_DATA,
  CAMP_OPTIONS,
  FLIGHT_STATUS_OPTIONS,
  STATUS_COLOR_MAP,
  RID_STATUS_COLOR_MAP,
  type CUavRealtimeData,
  type RealtimeFlightStatus,
  type RidStatus,
} from '@/mock/cUavRealtime'

// ============================ MapSimulator ref ============================

const mapSimulatorRef = ref<any>(null)

// ============================ 视频模式联动 ============================

// 进入视频/地图模式时，自动收起左右两侧面板
// 退出时，自动展开左右两侧面板
function onVideoModeChange(isVideoMode: boolean) {
  leftPanelCollapsed.value = isVideoMode
  rightPanelCollapsed.value = isVideoMode
}

// ============================ 视频/定位操作 ============================

function onDroneVideo(drone: CUavRealtimeData) {
  if (mapSimulatorRef.value) {
    // 转换数据格式给 MapSimulator
    const droneData = {
      id: drone.drone_sn,
      name: drone.aircraft_name || drone.drone_sn,
      sn: drone.drone_sn,
      uavClass: 'C',
      ...drone,
      // C 类无人机模拟遥测数据
      telemetry: {
        battery: 85,
        position: { lng: 13.5127, lat: 2.1128, altitude: 450 },
        altitude: 120,
        speed: 8.5,
        verticalSpeed: 0.2,
        gimbalPitch: -45,
        gimbalYaw: 0,
      }
    }
    mapSimulatorRef.value.openVideoMode(droneData)
  }
}

function onDroneLocation(drone: CUavRealtimeData) {
  if (mapSimulatorRef.value) {
    // 转换数据格式给 MapSimulator
    const droneData = {
      id: drone.drone_sn,
      name: drone.aircraft_name || drone.drone_sn,
      sn: drone.drone_sn,
      uavClass: 'C',
      ...drone,
      // C 类无人机模拟遥测数据
      telemetry: {
        battery: 85,
        position: { lng: 13.5127, lat: 2.1128, altitude: 450 },
        altitude: 120,
        speed: 8.5,
        verticalSpeed: 0.2,
        gimbalPitch: -45,
        gimbalYaw: 0,
      }
    }
    mapSimulatorRef.value.openMapMode(droneData)
  }
}

// ============================ 面板收起/展开 ============================

const leftPanelCollapsed = ref(false)
const rightPanelCollapsed = ref(false)

function toggleLeftPanel() {
  leftPanelCollapsed.value = !leftPanelCollapsed.value
}

// ============================ 筛选 ============================

const selectedCamp = ref<string>('all')
const selectedFlightStatus = ref<string>('all')

const filteredDrones = computed(() => {
  return C_UAV_REALTIME_DATA.filter((d) => {
    // 营地筛选（根据机巢名称推断）
    if (selectedCamp.value !== 'all') {
      const camp = inferCamp(d.nest_name)
      if (camp !== selectedCamp.value) return false
    }
    // 飞行状态筛选
    if (selectedFlightStatus.value !== 'all') {
      if (d.realtime_status !== selectedFlightStatus.value) return false
    }
    return true
  })
})

// ============================ KPI 统计 ============================

const kpiStats = computed(() => {
  const drones = filteredDrones.value
  const total = drones.length
  const online = drones.filter((d) => d.online_status === 'ONLINE').length
  const flying = drones.filter((d) => d.realtime_status === '飞行中').length
  const offline = drones.filter((d) => d.online_status === 'OFFLINE').length

  return { total, online, flying, offline }
})

// ============================ MapSimulator 数据转换 ============================

// 将 C_UAV_REALTIME_DATA 转换为 MapSimulator 需要的格式
const dronesForMap = computed(() => {
  return C_UAV_REALTIME_DATA.map((d) => ({
    id: d.drone_sn,
    name: d.aircraft_name || d.drone_sn,
    uavClass: 'C',
    type: 'C类' as const,
    status: d.online_status === 'ONLINE' ? 'online' : 'offline',
    battery: 0, // C类无人机暂不显示电量
    position: null, // MapSimulator 会用自己的位置数据
  }))
})

// 图层控制（简化版，只需要无人机位置）
const layers = ref({
  uavPosition: true,
  alertEvent: false,
})

function inferCamp(nestName: string | null): string {
  if (!nestName) return 'Jaouro'
  const lower = nestName.toLowerCase()
  if (lower.includes('jaouro')) return 'Jaouro'
  if (lower.includes('koulele')) return 'Koulele'
  if (lower.includes('dibeilla')) return 'Dibeilla'
  return 'Jaouro'
}

// ============================ 按钮可用性判断 ============================

function canUseLocation(drone: CUavRealtimeData): boolean {
  return drone.online_status === 'ONLINE'
}

function canUseVideo(drone: CUavRealtimeData): boolean {
  return drone.online_status === 'ONLINE' && drone.realtime_status === '飞行中'
}

function getLocationTooltip(drone: CUavRealtimeData): string {
  if (drone.online_status === 'OFFLINE') return '离线中不可用'
  return ''
}

function getVideoTooltip(drone: CUavRealtimeData): string {
  if (drone.online_status === 'OFFLINE') return '离线中不可用'
  if (drone.realtime_status === '未飞行') return '未飞行，无实时视频流'
  return ''
}

/** 浅底徽章需配深色文字 */
function isLightBadge(status: RealtimeFlightStatus | RidStatus): boolean {
  return false // 当前所有状态都用白字
}

// ============================ 详情弹窗 ============================

const detailVisible = ref(false)
const selectedDrone = ref<CUavRealtimeData | null>(null)

function showDetail(drone: CUavRealtimeData) {
  selectedDrone.value = drone
  detailVisible.value = true
}

function closeDetail() {
  detailVisible.value = false
  selectedDrone.value = null
}

// ============================ 格式化工具 ============================

function formatDistance(meters: number | null): string {
  if (meters === null) return '--'
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours} 小时 ${minutes} 分`
}

function formatSorties(count: number | null): string {
  if (count === null) return '--'
  return `${count} 次`
}

function formatTime(isoString: string | undefined): string {
  if (!isoString) return '--'
  const d = new Date(isoString)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

function formatCoordinate(lng: number | undefined, lat: number | undefined): string {
  if (lng === undefined || lat === undefined) return '--'
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
}

function formatSpeed(ms: number | undefined): string {
  if (ms === undefined) return '--'
  return `${ms.toFixed(1)} m/s`
}

function formatAltitude(meters: number | undefined): string {
  if (meters === undefined) return '--'
  return `${meters} m`
}

function formatBattery(percent: number | undefined): string {
  if (percent === undefined) return '--'
  return `${percent}%`
}

function formatDistanceM(meters: number | undefined): string {
  if (meters === undefined) return '--'
  return `${(meters / 1000).toFixed(2)} km`
}

function batteryClass(percent: number | undefined): string {
  if (percent === undefined) return ''
  if (percent <= 20) return 'battery-low'
  if (percent <= 50) return 'battery-medium'
  return 'battery-high'
}
</script>

<template>
  <PageContainer title="C类无人机实况">
    <div class="realtime-container">
      <!-- GIS地图背景（使用 MapSimulator 组件） -->
      <div class="map-background">
        <MapSimulator
          ref="mapSimulatorRef"
          :drones="dronesForMap"
          :alerts="[]"
          :events="[]"
          :layers="layers"
          :show-entity-markers="false"
          :show-legend="false"
          @video-mode-change="onVideoModeChange"
        />
      </div>

      <!-- 左侧：无人机卡片列表（悬浮在地图上） -->
      <div class="drone-list-panel" :class="{ 'drone-list-panel--collapsed': leftPanelCollapsed }">
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
            <span class="kpi-value kpi-online">{{ kpiStats.online }}</span>
            <span class="kpi-label">在线</span>
          </div>
          <div class="kpi-divider"></div>
          <div class="kpi-item">
            <span class="kpi-value kpi-mission">{{ kpiStats.flying }}</span>
            <span class="kpi-label">飞行中</span>
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
            <span class="filter-label">营地</span>
            <a-select
              v-model:value="selectedCamp"
              :options="CAMP_OPTIONS"
              style="width: 100%"
            />
          </div>
          <div class="filter-item">
            <span class="filter-label">飞行状态</span>
            <a-select
              v-model:value="selectedFlightStatus"
              :options="FLIGHT_STATUS_OPTIONS"
              style="width: 100%"
            />
          </div>
        </div>

        <!-- 卡片列表（无限滚动） -->
        <div class="drone-cards">
          <div
            v-for="drone in filteredDrones"
            :key="drone.drone_sn"
            class="drone-card"
            @click="showDetail(drone)"
          >
            <!-- 头部：名称 + 在线状态 + 飞行状态徽章 -->
            <div class="card-header">
              <div class="drone-name-line">
                <span class="drone-name">
                  {{ drone.aircraft_name || drone.drone_sn }}
                </span>
                <span class="online-indicator">
                  <span class="online-dot" :class="{ 'online-dot--offline': drone.online_status !== 'ONLINE' }"></span>
                  <span class="online-text">{{ drone.online_status === 'ONLINE' ? '在线' : '离线' }}</span>
                </span>
              </div>
              <span
                class="status-badge"
                :class="{ 'status-badge--dark-text': isLightBadge(drone.realtime_status) }"
                :style="{ backgroundColor: STATUS_COLOR_MAP[drone.realtime_status] }"
              >
                {{ drone.realtime_status }}
              </span>
            </div>

            <!-- 累计统计 -->
            <div class="stats-section">
              <div class="stat-item">
                <span class="stat-label">总里程</span>
                <span class="stat-value">{{ formatDistance(drone.total_flight_distance_m) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">总航时</span>
                <span class="stat-value">{{ formatDuration(drone.total_flight_duration_sec) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">总架次</span>
                <span class="stat-value">{{ formatSorties(drone.total_sorties) }}</span>
              </div>
            </div>

            <!-- 分割线 -->
            <div class="divider"></div>

            <!-- 今日统计 -->
            <div class="stats-section">
              <div class="stat-item">
                <span class="stat-label">今日里程</span>
                <span class="stat-value">{{ formatDistance(drone.today_stats.today_distance_m) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">今日航时</span>
                <span class="stat-value">{{ formatDuration(drone.today_stats.today_duration_sec) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">今日架次</span>
                <span class="stat-value">{{ formatSorties(drone.today_stats.today_sorties) }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="card-actions">
              <a-tooltip
                :title="getLocationTooltip(drone)"
                placement="top"
              >
                <div
                  class="action-btn"
                  :class="{ 'action-btn--disabled': !canUseLocation(drone) }"
                  @click.stop="canUseLocation(drone) ? onDroneLocation(drone) : null"
                >
                  <AimOutlined />
                </div>
              </a-tooltip>
              <a-tooltip
                :title="getVideoTooltip(drone)"
                placement="top"
              >
                <div
                  class="action-btn"
                  :class="{ 'action-btn--disabled': !canUseVideo(drone) }"
                  @click.stop="canUseVideo(drone) ? onDroneVideo(drone) : null"
                >
                  <VideoCameraOutlined />
                </div>
              </a-tooltip>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredDrones.length === 0" class="empty-state">
            <a-empty description="暂无无人机数据" />
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
          <span class="trigger-text">无人机列表</span>
        </div>
      </div>

      <!-- 右侧：飞行记录面板 -->
      <CFlightRecordsPanel
        v-model:collapsed="rightPanelCollapsed"
      />
    </div>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="detailVisible"
      :title="`${selectedDrone?.aircraft_name || selectedDrone?.drone_sn} - 详情`"
      width="1000px"
      :footer="null"
      @cancel="closeDetail"
    >
      <div v-if="selectedDrone" class="detail-content">
        <!-- 顶部：基本信息 -->
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <div class="info-grid-compact">
            <div class="info-item">
              <span class="info-label">无人机名称</span>
              <span class="info-value">{{ selectedDrone.aircraft_name || '--' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">在线状态</span>
              <span class="info-value">
                <span class="online-indicator">
                  <span class="online-dot" :class="{ 'online-dot--offline': selectedDrone.online_status !== 'ONLINE' }"></span>
                  <span>{{ selectedDrone.online_status === 'ONLINE' ? '在线' : '离线' }}</span>
                </span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">飞行状态</span>
              <span>
                <span
                  class="status-badge"
                  :class="{ 'status-badge--dark-text': isLightBadge(selectedDrone.realtime_status) }"
                  :style="{ backgroundColor: STATUS_COLOR_MAP[selectedDrone.realtime_status] }"
                >
                  {{ selectedDrone.realtime_status }}
                </span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">RID状态</span>
              <span>
                <span
                  class="status-badge"
                  :class="{ 'status-badge--dark-text': isLightBadge(selectedDrone.rid_status) }"
                  :style="{ backgroundColor: RID_STATUS_COLOR_MAP[selectedDrone.rid_status] }"
                >
                  {{ selectedDrone.rid_status }}
                </span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">所属机巢</span>
              <span class="info-value">{{ selectedDrone.nest_name || '--' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">设备序列号</span>
              <span class="info-value">{{ selectedDrone.drone_sn }}</span>
            </div>
          </div>
        </div>

        <!-- 左右分栏区域 -->
        <div class="two-column-layout">
          <!-- 左侧：累计统计 + 今日统计 + 视频流 -->
          <div class="left-column">
            <!-- 累计统计 -->
            <div class="detail-section">
              <div class="section-title">累计统计</div>
              <div class="stats-grid">
                <div class="stat-card">
                  <span class="stat-label">总里程</span>
                  <span class="stat-value">{{ formatDistance(selectedDrone.total_flight_distance_m) }}</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">总航时</span>
                  <span class="stat-value">{{ formatDuration(selectedDrone.total_flight_duration_sec) }}</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">总架次</span>
                  <span class="stat-value">{{ formatSorties(selectedDrone.total_sorties) }}</span>
                </div>
              </div>
            </div>

            <!-- 今日统计 -->
            <div class="detail-section">
              <div class="section-title">今日统计</div>
              <div class="stats-grid">
                <div class="stat-card">
                  <span class="stat-label">今日里程</span>
                  <span class="stat-value">{{ formatDistance(selectedDrone.today_stats.today_distance_m) }}</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">今日航时</span>
                  <span class="stat-value">{{ formatDuration(selectedDrone.today_stats.today_duration_sec) }}</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">今日架次</span>
                  <span class="stat-value">{{ formatSorties(selectedDrone.today_stats.today_sorties) }}</span>
                </div>
              </div>
            </div>

            <!-- 实时视频流 -->
            <div class="detail-section">
              <div class="section-title">实时视频流</div>
              <div class="video-placeholder-compact">
                <div class="video-content">
                  <div class="video-icon">📹</div>
                  <div class="video-text">实时视频流</div>
                  <div class="video-hint">（开发中）</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：飞行实况 -->
          <div class="right-column">
            <div class="detail-section">
              <div class="section-title">飞行实况</div>
              <div v-if="selectedDrone.telemetry" class="info-list">
                <div class="info-row">
                  <span class="info-label">起飞时间</span>
                  <span class="info-value">{{ formatTime(selectedDrone.telemetry.takeoff_time) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">飞行时长</span>
                  <span class="info-value">{{ formatDuration(selectedDrone.telemetry.flight_duration_sec) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">剩余距离</span>
                  <span class="info-value">{{ formatDistanceM(selectedDrone.telemetry.remaining_distance_m) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">实时经纬度</span>
                  <span class="info-value">
                    {{ formatCoordinate(selectedDrone.telemetry.longitude, selectedDrone.telemetry.latitude) }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">飞行高度</span>
                  <span class="info-value">{{ formatAltitude(selectedDrone.telemetry.altitude_m) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">地速</span>
                  <span class="info-value">{{ formatSpeed(selectedDrone.telemetry.ground_speed_ms) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">垂直速度</span>
                  <span class="info-value">{{ formatSpeed(selectedDrone.telemetry.vertical_speed_ms) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">当前电量</span>
                  <span class="info-value battery" :class="batteryClass(selectedDrone.telemetry.battery_percent)">
                    {{ formatBattery(selectedDrone.telemetry.battery_percent) }}
                  </span>
                </div>
              </div>
              <div v-else class="no-telemetry">
                <a-empty description="当前无飞行实况数据" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </PageContainer>
</template>

<style scoped lang="scss">
.realtime-container {
  position: relative;
  height: calc(100vh - 120px);
  overflow: hidden;
}

// ==================== GIS地图背景 ====================

.map-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: hidden;
}

// ==================== 左侧列表面板（悬浮） ====================

.drone-list-panel {
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

// ==================== 面板收起/展开按钮 ====================

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

// ==================== 面板收起后的触发按钮 ====================

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

    .trigger-text {
      color: var(--of-text-primary);
    }

    .trigger-icon {
      color: var(--of-text-primary);
    }
  }

  &--left {
    left: 16px;
    border-radius: 0 8px 8px 0;
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

// ====================  KPI 统计栏 ====================

.kpi-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 14px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
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

  &.kpi-online {
    color: var(--of-color-success);
  }

  &.kpi-mission {
    color: var(--of-color-link);
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

// ==================== 筛选器 ====================

.filter-bar {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
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

// ==================== 卡片列表 ====================

.drone-cards {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drone-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.drone-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.drone-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--of-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.online-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--of-color-success);

  &--offline {
    background-color: var(--of-text-quaternary);
  }
}

.online-text {
  font-size: 11px;
  color: var(--of-text-tertiary);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--of-text-primary);
  white-space: nowrap;

  /* 浅底徽章需要深色文字 */
  &--dark-text {
    color: #16202a;
  }
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 12px 0;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--of-text-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--of-color-accent-ice);
  font-variant-numeric: tabular-nums;
}

// ==================== 卡片操作按钮 ====================

.card-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  min-width: 0;
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

// ==================== 空状态 ====================

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

// ==================== 详情弹窗 ====================

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.detail-section {
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--of-text-primary);
    margin-bottom: 12px;
    padding-left: 8px;
    border-left: 3px solid rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

// 顶部基本信息 - 6列紧凑布局（增加了 RID 状态）
.info-grid-compact {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
}

// 左右分栏布局
.two-column-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// 统计卡片网格
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .stat-label {
    font-size: 12px;
    color: var(--of-text-secondary);
  }

  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--of-color-accent-ice);
    font-variant-numeric: tabular-nums;
  }
}

// 信息项（弹窗内）
.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--of-text-secondary);
}

.info-value {
  font-size: 14px;
  color: var(--of-text-primary);
  font-weight: 500;

  &.status-text {
    font-weight: 600;
  }

  &.battery {
    font-weight: 600;

    &.battery-low {
      color: var(--of-color-error);
    }

    &.battery-medium {
      color: var(--of-color-warning);
    }

    &.battery-high {
      color: var(--of-color-success);
    }
  }
}

// 飞行实况信息列表
.info-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .info-label {
    font-size: 13px;
    color: var(--of-text-secondary);
    min-width: 100px;
  }

  .info-value {
    font-size: 14px;
    color: var(--of-text-primary);
    font-weight: 500;
    text-align: right;
  }
}

.no-telemetry {
  padding: 30px 0;
  text-align: center;
}

// ==================== 视频占位 ====================

.video-placeholder-compact {
  height: 200px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-content {
  text-align: center;
}

.video-icon {
  font-size: 36px;
  margin-bottom: 8px;
  opacity: 0.4;
}

.video-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--of-text-primary);
  margin-bottom: 4px;
}

.video-hint {
  font-size: 12px;
  color: var(--of-text-secondary);
}
</style>
