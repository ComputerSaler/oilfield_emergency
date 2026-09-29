<script setup lang="ts">
/**
 * 车辆实况 —— 实时监控中心
 * 左侧车辆列表 + 右侧预警列表 + 中间GIS地图
 */
import { computed, ref } from 'vue'
import { LeftOutlined, RightOutlined, AimOutlined } from '@ant-design/icons-vue'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import VehicleAlertsPanel from './components/VehicleAlertsPanel.vue'
import VehicleMapView from './components/VehicleMapView.vue'
import {
  VEHICLE_REALTIME_DATA,
  CAMP_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  type VehicleRealtimeData,
} from '@/mock/vehicleRealtime'

// ============================ 面板收起/展开 ============================

const leftPanelCollapsed = ref(false)
const rightPanelCollapsed = ref(false)

function toggleLeftPanel() {
  leftPanelCollapsed.value = !leftPanelCollapsed.value
}

// ============================ 定位模式 ============================

const focusedVehicle = ref<VehicleRealtimeData | null>(null)

function onVehicleLocation(vehicle: VehicleRealtimeData) {
  if (vehicle.online_status === 'OFFLINE' || !vehicle.telemetry) return

  // 设置聚焦车辆
  focusedVehicle.value = vehicle

  // 自动收起左右面板
  leftPanelCollapsed.value = true
  rightPanelCollapsed.value = true
}

function onExitFocus() {
  // 退出定位模式
  focusedVehicle.value = null

  // 自动展开左右面板
  leftPanelCollapsed.value = false
  rightPanelCollapsed.value = false
}

// ============================ 筛选 ============================

const selectedCamp = ref<string>('all')
const selectedVehicleType = ref<string>('all')

const filteredVehicles = computed(() => {
  return VEHICLE_REALTIME_DATA.filter((v) => {
    // 营地筛选
    if (selectedCamp.value !== 'all' && v.camp !== selectedCamp.value) {
      return false
    }
    // 车辆类型筛选
    if (selectedVehicleType.value !== 'all' && v.vehicle_type !== selectedVehicleType.value) {
      return false
    }
    return true
  })
})

// ============================ KPI 统计 ============================

const kpiStats = computed(() => {
  const vehicles = filteredVehicles.value
  const total = vehicles.length
  const online = vehicles.filter((v) => v.online_status === 'ONLINE').length
  const offline = vehicles.filter((v) => v.online_status === 'OFFLINE').length

  return { total, online, offline }
})

// ============================ 地图数据转换 ============================

const vehiclesForMap = computed(() => {
  return VEHICLE_REALTIME_DATA.map((v) => ({
    id: v.vehicle_id,
    name: v.plate_number,
    status: v.online_status === 'ONLINE' ? 'online' as const : 'offline' as const,
    position: v.telemetry ? {
      lat: v.telemetry.latitude,
      lng: v.telemetry.longitude,
    } : null,
  }))
})

// 聚焦车辆的地图数据
const focusedVehicleForMap = computed(() => {
  if (!focusedVehicle.value) return null

  return {
    id: focusedVehicle.value.vehicle_id,
    name: focusedVehicle.value.plate_number,
    status: focusedVehicle.value.online_status === 'ONLINE' ? 'online' as const : 'offline' as const,
    position: focusedVehicle.value.telemetry ? {
      lat: focusedVehicle.value.telemetry.latitude,
      lng: focusedVehicle.value.telemetry.longitude,
    } : null,
  }
})

// ============================ 格式化工具 ============================

function formatSpeed(kmh: number | null): string {
  if (kmh === null) return '--'
  return `${kmh} km/h`
}
</script>

<template>
  <PageContainer title="车辆实况">
    <div class="realtime-container">
      <!-- GIS地图背景 -->
      <div class="map-background">
        <VehicleMapView
          :vehicles="vehiclesForMap"
          :focused-vehicle="focusedVehicleForMap"
          @exit-focus="onExitFocus"
        />
      </div>

      <!-- 左侧：车辆卡片列表 -->
      <div class="vehicle-list-panel" :class="{ 'vehicle-list-panel--collapsed': leftPanelCollapsed }">
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
            <span class="filter-label">类型</span>
            <a-select
              v-model:value="selectedVehicleType"
              :options="VEHICLE_TYPE_OPTIONS"
              style="width: 100%"
            />
          </div>
        </div>

        <!-- 卡片列表 -->
        <div class="vehicle-cards">
          <div
            v-for="vehicle in filteredVehicles"
            :key="vehicle.vehicle_id"
            class="vehicle-card"
          >
            <!-- 头部：车牌号 + 在线状态 -->
            <div class="card-header">
              <div class="vehicle-name-line">
                <span class="vehicle-name">{{ vehicle.plate_number }}</span>
                <span class="online-indicator">
                  <span class="online-dot" :class="{ 'online-dot--offline': vehicle.online_status !== 'ONLINE' }"></span>
                  <span class="online-text">{{ vehicle.online_status === 'ONLINE' ? '在线' : '离线' }}</span>
                </span>
              </div>
            </div>

            <!-- 信息行 -->
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">类型</span>
                <span class="info-value">{{ vehicle.vehicle_type }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">所属营地</span>
                <span class="info-value">{{ vehicle.camp }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">当前速度</span>
                <span class="info-value speed-value">{{ formatSpeed(vehicle.current_speed_kmh) }}</span>
              </div>
            </div>

            <!-- 定位按钮 -->
            <div class="card-actions">
              <a-tooltip
                :title="vehicle.online_status === 'OFFLINE' ? '离线中不可用' : ''"
                placement="top"
              >
                <div
                  class="action-btn"
                  :class="{ 'action-btn--disabled': vehicle.online_status === 'OFFLINE' }"
                  @click.stop="vehicle.online_status !== 'OFFLINE' ? onVehicleLocation(vehicle) : null"
                >
                  <AimOutlined />
                  <span class="action-text">定位</span>
                </div>
              </a-tooltip>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredVehicles.length === 0" class="empty-state">
            <a-empty description="暂无车辆数据" />
          </div>
        </div>
      </div>

      <!-- 右侧：预警面板 -->
      <VehicleAlertsPanel
        v-model:collapsed="rightPanelCollapsed"
      />

      <!-- 左侧面板收起后的触发按钮 -->
      <div
        v-if="leftPanelCollapsed"
        class="collapsed-trigger collapsed-trigger--left"
        @click="toggleLeftPanel"
      >
        <div class="trigger-content">
          <RightOutlined class="trigger-icon" />
          <span class="trigger-text">车辆列表</span>
        </div>
      </div>
    </div>
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

// ==================== 左侧列表面板 ====================

.vehicle-list-panel {
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

  &--right {
    left: -24px;
    border-radius: 6px 0 0 6px;
    border-right: none;
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

// ====================  KPI 统计栏 ====================

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

  &.kpi-online {
    color: var(--of-color-success);
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

// ==================== 筛选栏 ====================

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

// ==================== 卡片列表 ====================

.vehicle-cards {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vehicle-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.card-header {
  margin-bottom: 12px;
}

.vehicle-name-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.vehicle-name {
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

// ==================== 信息区域 ====================

.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.info-label {
  color: var(--of-text-secondary);
}

.info-value {
  color: var(--of-text-primary);
  font-weight: 500;

  &.speed-value {
    font-variant-numeric: tabular-nums;
    color: var(--of-color-accent-ice);
  }
}

// ==================== 卡片操作按钮 ====================

.card-actions {
  display: flex;
  justify-content: center;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
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

.action-text {
  font-size: 13px;
  font-weight: 500;
}

// ==================== 空状态 ====================

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
