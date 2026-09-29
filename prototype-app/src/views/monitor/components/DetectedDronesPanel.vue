<script setup lang="ts">
/**
 * 实时探测无人机列表面板
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RightOutlined, LeftOutlined } from '@ant-design/icons-vue'
import { DETECTED_DRONES_DATA, REPORTING_SYSTEM_OPTIONS, type DetectedDrone } from '@/mock/detectedDrones'

// ============================ Props ============================

const collapsed = defineModel<boolean>('collapsed', { required: true })

// ============================ 筛选 ============================

const selectedReportingSystem = ref<string>('all')

// 暴露方法给父组件，用于联动
defineExpose({
  setReportingSystem(system: string) {
    selectedReportingSystem.value = system
  },
})

// ============================ 筛选后的数据 ============================

const filteredDrones = computed(() => {
  return DETECTED_DRONES_DATA.filter((drone) => {
    if (selectedReportingSystem.value !== 'all' && drone.reporting_system !== selectedReportingSystem.value) {
      return false
    }
    return true
  })
})

// ============================ KPI 统计 ============================

const totalCount = computed(() => filteredDrones.value.length)

// ============================ 持续时长计算 ============================

const currentTime = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

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

function formatTime(isoTime: string): string {
  const d = new Date(isoTime)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

// 格式化距离（米转换为合适单位）
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

// ============================ 生命周期 ============================

onMounted(() => {
  // 每秒更新当前时间
  timer = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="detected-drones-panel" :class="{ 'detected-drones-panel--collapsed': collapsed }">
    <!-- 收起/展开按钮 -->
    <div class="panel-toggle-btn" @click="collapsed = !collapsed">
      <RightOutlined v-if="!collapsed" />
      <LeftOutlined v-else />
    </div>

    <!-- KPI 统计 -->
    <div class="kpi-section">
      <div class="kpi-item">
        <span class="kpi-label">总数</span>
        <span class="kpi-value">{{ totalCount }}</span>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filter-section">
      <div class="filter-item">
        <span class="filter-label">上报系统</span>
        <a-select
          v-model:value="selectedReportingSystem"
          :options="REPORTING_SYSTEM_OPTIONS"
          style="width: 100%"
        />
      </div>
    </div>

    <!-- 无人机列表 -->
    <div class="drone-list">
      <div
        v-for="drone in filteredDrones"
        :key="drone.id"
        class="drone-card"
      >
        <!-- 第一行：SN + 白名单徽章 -->
        <div class="drone-header">
          <span class="drone-sn">{{ drone.sn }}</span>
          <span v-if="drone.is_whitelist" class="whitelist-badge">白名单</span>
        </div>

        <!-- 第二行：型号 -->
        <div class="drone-model">{{ drone.model }}</div>

        <!-- 分割线 -->
        <div class="drone-divider"></div>

        <!-- 两列布局 -->
        <div class="drone-grid">
          <div class="drone-row">
            <span class="drone-label">速度</span>
            <span class="drone-value">{{ drone.speed }} m/s</span>
          </div>
          <div class="drone-row">
            <span class="drone-label">高度</span>
            <span class="drone-value">{{ drone.altitude }} m</span>
          </div>
          <div class="drone-row">
            <span class="drone-label">频率</span>
            <span class="drone-value">{{ drone.frequency }}</span>
          </div>
          <div class="drone-row">
            <span class="drone-label">方位距离</span>
            <span class="drone-value">{{ formatAzimuthDistance(drone.azimuth, drone.distance) }}</span>
          </div>
          <div class="drone-row">
            <span class="drone-label">开始</span>
            <span class="drone-value">{{ formatTime(drone.detection_start_time) }}</span>
          </div>
          <div class="drone-row">
            <span class="drone-label">持续</span>
            <span class="drone-value drone-value--highlight">{{ formatDuration(drone.detection_start_time) }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredDrones.length === 0" class="empty-state">
        <a-empty description="暂无探测目标" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.detected-drones-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 360px;
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

/* 收起/展开按钮 */
.panel-toggle-btn {
  position: absolute;
  top: 50%;
  left: -24px;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: rgba(10, 13, 18, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-right: none;
  border-radius: 6px 0 0 6px;
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
}

/* KPI 统计 */
.kpi-section {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.kpi-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-label {
  font-size: 13px;
  color: var(--of-text-secondary);
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--of-color-accent-ice);
  font-variant-numeric: tabular-nums;
}

/* 筛选器 */
.filter-section {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

/* 无人机列表 */
.drone-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

/* 无人机卡片 */
.drone-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.drone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.drone-sn {
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

.drone-model {
  font-size: 12px;
  color: var(--of-text-secondary);
  margin-bottom: 8px;
}

.drone-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
}

.drone-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.drone-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.drone-label {
  color: var(--of-text-tertiary);
  font-size: 11px;
}

.drone-value {
  color: var(--of-text-secondary);
  font-weight: 500;

  &--highlight {
    color: var(--of-color-accent-ice);
    font-weight: 600;
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}
</style>
