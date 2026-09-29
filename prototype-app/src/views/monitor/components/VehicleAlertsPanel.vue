<script setup lang="ts">
/**
 * 车辆预警面板 —— 右侧悬浮面板
 */
import { computed, ref, watch } from 'vue'
import { RightOutlined, LeftOutlined } from '@ant-design/icons-vue'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  VEHICLE_ALERTS,
  ALERT_TYPE_OPTIONS,
  TIME_RANGE_OPTIONS,
  ALERT_TYPE_COLOR_MAP,
  type VehicleAlert,
} from '@/mock/vehicleAlerts'

// ============================ 面板收起/展开 ============================

const collapsed = defineModel<boolean>('collapsed', { default: false })

function togglePanel() {
  collapsed.value = !collapsed.value
}

// ============================ 筛选 ============================

const selectedAlertType = ref<string>('all')
const selectedTimeRange = ref<string>('week')
const customDateRange = ref<[Dayjs, Dayjs] | null>(null)

// 监听时间范围切换，清空自定义日期
watch(selectedTimeRange, (newVal) => {
  if (newVal !== 'custom') {
    customDateRange.value = null
  }
})

const filteredAlerts = computed(() => {
  let alerts = VEHICLE_ALERTS

  // 预警类型筛选
  if (selectedAlertType.value !== 'all') {
    alerts = alerts.filter((a) => a.alert_type === selectedAlertType.value)
  }

  // 时间范围筛选
  const now = dayjs()
  let startTime: Dayjs | null = null

  if (selectedTimeRange.value === 'today') {
    startTime = now.startOf('day')
  } else if (selectedTimeRange.value === 'week') {
    startTime = now.subtract(7, 'day')
  } else if (selectedTimeRange.value === 'month') {
    startTime = now.subtract(30, 'day')
  } else if (selectedTimeRange.value === 'custom' && customDateRange.value) {
    const [start, end] = customDateRange.value
    alerts = alerts.filter((a) => {
      const time = dayjs(a.timestamp)
      return time.isAfter(start) && time.isBefore(end.add(1, 'day'))
    })
    return alerts
  }

  if (startTime) {
    alerts = alerts.filter((a) => dayjs(a.timestamp).isAfter(startTime))
  }

  return alerts
})

// ============================ KPI 统计 ============================

const kpiStats = computed(() => {
  const alerts = filteredAlerts.value
  const total = alerts.length
  const sos = alerts.filter((a) => a.alert_type === 'SOS').length
  const speeding = alerts.filter((a) => a.alert_type === '超速').length

  return { total, sos, speeding }
})

// ============================ 格式化工具 ============================

function formatDateTime(isoString: string): string {
  const d = dayjs(isoString)
  return d.format('YYYY-MM-DD HH:mm:ss')
}

function formatCoordinate(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
}
</script>

<template>
  <div class="vehicle-alerts-panel" :class="{ 'vehicle-alerts-panel--collapsed': collapsed }">
    <!-- 收起/展开按钮 -->
    <div class="panel-toggle-btn panel-toggle-btn--right" @click="togglePanel">
      <RightOutlined v-if="!collapsed" />
      <LeftOutlined v-else />
    </div>

    <!-- KPI 统计栏 -->
    <div class="kpi-bar">
      <div class="kpi-item">
        <span class="kpi-value">{{ kpiStats.total }}</span>
        <span class="kpi-label">总数</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-value kpi-sos">{{ kpiStats.sos }}</span>
        <span class="kpi-label">SOS数</span>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <span class="kpi-value kpi-speeding">{{ kpiStats.speeding }}</span>
        <span class="kpi-label">超速数</span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-item">
        <span class="filter-label">预警类型</span>
        <a-select
          v-model:value="selectedAlertType"
          :options="ALERT_TYPE_OPTIONS"
          style="width: 100%"
        />
      </div>
      <div class="filter-item">
        <span class="filter-label">时间</span>
        <a-select
          v-model:value="selectedTimeRange"
          :options="TIME_RANGE_OPTIONS"
          style="width: 100%"
        />
      </div>
      <!-- 自定义时间范围 -->
      <div v-if="selectedTimeRange === 'custom'" class="filter-item filter-item--full">
        <a-range-picker
          v-model:value="customDateRange"
          format="YYYY-MM-DD"
          style="width: 100%"
          :placeholder="['开始日期', '结束日期']"
        />
      </div>
    </div>

    <!-- 预警卡片列表 -->
    <div class="alert-cards">
      <div
        v-for="alert in filteredAlerts"
        :key="alert.id"
        class="alert-card"
      >
        <!-- 头部：车牌号 + 预警类型徽章 -->
        <div class="card-header">
          <span class="vehicle-name">{{ alert.plate_number }}</span>
          <span
            class="alert-badge"
            :style="{ backgroundColor: ALERT_TYPE_COLOR_MAP[alert.alert_type] }"
          >
            {{ alert.alert_type }}
          </span>
        </div>

        <!-- 信息行 -->
        <div class="alert-info">
          <div class="info-row">
            <span class="info-label">所属营地</span>
            <span class="info-value">{{ alert.camp }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">经纬度</span>
            <span class="info-value">{{ formatCoordinate(alert.latitude, alert.longitude) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">时间</span>
            <span class="info-value">{{ formatDateTime(alert.timestamp) }}</span>
          </div>
          <!-- 超速专有字段 -->
          <template v-if="alert.alert_type === '超速'">
            <div class="info-row">
              <span class="info-label">速度</span>
              <span class="info-value speed-highlight">{{ alert.speed_kmh }} km/h</span>
            </div>
            <div class="info-row">
              <span class="info-label">超速阈值</span>
              <span class="info-value">{{ alert.speed_limit_kmh }} km/h</span>
            </div>
          </template>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredAlerts.length === 0" class="empty-state">
        <a-empty description="暂无预警数据" />
      </div>
    </div>
  </div>

  <!-- 右侧面板收起后的触发按钮 -->
  <div
    v-if="collapsed"
    class="collapsed-trigger collapsed-trigger--right"
    @click="togglePanel"
  >
    <div class="trigger-content">
      <LeftOutlined class="trigger-icon" />
      <span class="trigger-text">预警列表</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.vehicle-alerts-panel {
  position: absolute;
  top: 16px;
  right: 16px;
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
    transform: translateX(100%);
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

  &.kpi-sos {
    color: #ff6666;
  }

  &.kpi-speeding {
    color: #faad14;
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

  &--full {
    grid-column: 1 / -1;
  }
}

.filter-label {
  font-size: 12px;
  color: var(--of-text-secondary);
}

// RangePicker 深度样式覆写
:deep(.ant-picker) {
  background: var(--of-bg-select);
  border-color: transparent;

  .ant-picker-input > input {
    color: var(--of-text-primary);
  }

  .ant-picker-separator,
  .ant-picker-suffix {
    color: var(--of-text-tertiary);
  }
}

:deep(.ant-picker-focused) {
  border-color: var(--of-color-primary);
  box-shadow: 0 0 0 2px rgba(20, 129, 166, 0.2);
}

// ==================== 预警卡片列表 ====================

.alert-cards {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-card {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
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

.alert-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}

// ==================== 信息区域 ====================

.alert-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}

.info-label {
  color: var(--of-text-secondary);
  flex-shrink: 0;
}

.info-value {
  color: var(--of-text-primary);
  font-weight: 500;
  text-align: right;
  font-variant-numeric: tabular-nums;
  word-break: break-all;

  &.speed-highlight {
    color: #faad14;
    font-weight: 600;
  }
}

// ==================== 空状态 ====================

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 0;
}
</style>
