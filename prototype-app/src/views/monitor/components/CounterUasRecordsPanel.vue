<script setup lang="ts">
/**
 * 反无系统记录列表 - 右侧面板
 * 包含：探测记录 + 打击记录
 */
import { computed, ref } from 'vue'
import type { Dayjs } from 'dayjs'
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'

// ============================ 类型定义 ============================

interface DetectionRecord {
  id: string
  intruder_sn: string // 入侵无人机SN
  intruder_model: string // 入侵无人机型号
  frequency: string // 频率
  bandwidth: string // 带宽
  estimated_distance: number // 估算距离(m)
  duration_sec: number // 持续时间(秒)
  detected_at: string // 探测时间
  camp: string // 营地
}

interface StrikeRecord {
  id: string
  strike_type: '自动' | '强制/人工' // 打击类型
  target_type: 'UAV' | 'FPV' // 目标类型
  strike_mode: '驱离' | '迫降' // 打击模式
  duration_sec: number // 打击持续时间(秒)
  strike_at: string // 打击时间
  camp: string // 营地
}

// ============================ Props ============================

interface Props {
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false
})

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

// ============================ 面板收起/展开 ============================

function togglePanel() {
  emit('update:collapsed', !props.collapsed)
}

// ============================ Tab 状态 ============================

const activeTab = ref<'detection' | 'strike'>('detection')

// ============================ 模拟数据 ============================

const CAMP_OPTIONS = [
  { label: '全部营地', value: 'all' },
  { label: 'Koulele东北角营地', value: 'koulele_ne' },
  { label: 'Agadem主营地', value: 'agadem' },
]

const TIME_RANGE_OPTIONS = [
  { label: '今天', value: 'today' },
  { label: '最近7天', value: 'last7days' },
  { label: '最近30天', value: 'last30days' },
  { label: '自定义', value: 'custom' },
]

// 模拟探测记录数据
const DETECTION_RECORDS: DetectionRecord[] = [
  {
    id: 'd1',
    intruder_sn: 'DJI-MAVIC3-F8A2B1',
    intruder_model: 'DJI Mavic 3',
    frequency: '2.4 GHz',
    bandwidth: '20 MHz',
    estimated_distance: 1200,
    duration_sec: 180,
    detected_at: '2026-09-06T14:23:15',
    camp: 'koulele_ne',
  },
  {
    id: 'd2',
    intruder_sn: 'UNKNOWN-FPV-3C9D21',
    intruder_model: 'Unknown FPV',
    frequency: '5.8 GHz',
    bandwidth: '40 MHz',
    estimated_distance: 800,
    duration_sec: 45,
    detected_at: '2026-09-06T12:15:33',
    camp: 'koulele_ne',
  },
  {
    id: 'd3',
    intruder_sn: 'AUTEL-EVO2-7B4E12',
    intruder_model: 'Autel EVO II',
    frequency: '2.4 GHz',
    bandwidth: '20 MHz',
    estimated_distance: 1500,
    duration_sec: 240,
    detected_at: '2026-09-06T09:42:18',
    camp: 'agadem',
  },
]

// 模拟打击记录数据
const STRIKE_RECORDS: StrikeRecord[] = [
  {
    id: 's1',
    strike_type: '自动',
    target_type: 'UAV',
    strike_mode: '驱离',
    duration_sec: 120,
    strike_at: '2026-09-06T14:25:30',
    camp: 'koulele_ne',
  },
  {
    id: 's2',
    strike_type: '强制/人工',
    target_type: 'FPV',
    strike_mode: '迫降',
    duration_sec: 30,
    strike_at: '2026-09-06T12:16:45',
    camp: 'koulele_ne',
  },
  {
    id: 's3',
    strike_type: '自动',
    target_type: 'UAV',
    strike_mode: '驱离',
    duration_sec: 90,
    strike_at: '2026-09-06T09:45:20',
    camp: 'agadem',
  },
]

// ============================ 探测记录筛选 ============================

const selectedDetectionCamp = ref<string>('all')
const selectedDetectionTimeRange = ref<string>('today')
const customDetectionDateRange = ref<[Dayjs, Dayjs] | null>(null)

// 计算时间范围的起止时间戳
const detectionTimeRangeBounds = computed(() => {
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  switch (selectedDetectionTimeRange.value) {
    case 'today':
      return { start: todayStart, end: now }
    case 'last7days':
      return { start: todayStart - 6 * 86400000, end: now }
    case 'last30days':
      return { start: todayStart - 29 * 86400000, end: now }
    case 'custom':
      if (customDetectionDateRange.value) {
        return {
          start: customDetectionDateRange.value[0].valueOf(),
          end: customDetectionDateRange.value[1].endOf('day').valueOf(),
        }
      }
      return null
    default:
      return null
  }
})

const filteredDetectionRecords = computed(() => {
  let filtered = DETECTION_RECORDS

  // 按营地筛选
  if (selectedDetectionCamp.value !== 'all') {
    filtered = filtered.filter((r) => r.camp === selectedDetectionCamp.value)
  }

  // 按时间筛选
  if (detectionTimeRangeBounds.value) {
    const { start, end } = detectionTimeRangeBounds.value
    filtered = filtered.filter((r) => {
      const recordTime = new Date(r.detected_at).getTime()
      return recordTime >= start && recordTime <= end
    })
  }

  return filtered
})

// 探测记录 KPI
const detectionKpi = computed(() => {
  const detectionCount = filteredDetectionRecords.value.length
  // 破解次数 = 持续时间 > 60秒的记录（简单模拟）
  const crackCount = filteredDetectionRecords.value.filter((r) => r.duration_sec > 60).length

  return { detectionCount, crackCount }
})

// ============================ 打击记录筛选 ============================

const selectedStrikeCamp = ref<string>('all')
const selectedStrikeTimeRange = ref<string>('today')
const customStrikeDateRange = ref<[Dayjs, Dayjs] | null>(null)

// 计算时间范围的起止时间戳
const strikeTimeRangeBounds = computed(() => {
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  switch (selectedStrikeTimeRange.value) {
    case 'today':
      return { start: todayStart, end: now }
    case 'last7days':
      return { start: todayStart - 6 * 86400000, end: now }
    case 'last30days':
      return { start: todayStart - 29 * 86400000, end: now }
    case 'custom':
      if (customStrikeDateRange.value) {
        return {
          start: customStrikeDateRange.value[0].valueOf(),
          end: customStrikeDateRange.value[1].endOf('day').valueOf(),
        }
      }
      return null
    default:
      return null
  }
})

const filteredStrikeRecords = computed(() => {
  let filtered = STRIKE_RECORDS

  // 按营地筛选
  if (selectedStrikeCamp.value !== 'all') {
    filtered = filtered.filter((r) => r.camp === selectedStrikeCamp.value)
  }

  // 按时间筛选
  if (strikeTimeRangeBounds.value) {
    const { start, end } = strikeTimeRangeBounds.value
    filtered = filtered.filter((r) => {
      const recordTime = new Date(r.strike_at).getTime()
      return recordTime >= start && recordTime <= end
    })
  }

  return filtered
})

// 打击记录 KPI
const strikeKpi = computed(() => {
  const uavStrikeCount = filteredStrikeRecords.value.filter((r) => r.target_type === 'UAV').length
  const fpvStrikeCount = filteredStrikeRecords.value.filter((r) => r.target_type === 'FPV').length

  return { uavStrikeCount, fpvStrikeCount }
})

// ============================ 格式化工具 ============================

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${meters} m`
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

function formatDateTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
</script>

<template>
  <div class="counter-uas-records-panel" :class="{ 'counter-uas-records-panel--collapsed': props.collapsed }">
    <!-- 收起/展开按钮 -->
    <div class="panel-toggle-btn panel-toggle-btn--right" @click="togglePanel">
      <RightOutlined v-if="!props.collapsed" />
      <LeftOutlined v-else />
    </div>

    <!-- Tab 切换 -->
    <div class="tabs-bar">
      <div
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === 'detection' }"
        @click="activeTab = 'detection'"
      >
        探测记录
      </div>
      <div
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === 'strike' }"
        @click="activeTab = 'strike'"
      >
        打击记录
      </div>
    </div>

    <!-- 探测记录 Tab 内容 -->
    <div v-show="activeTab === 'detection'" class="tab-content">
      <!-- KPI 统计 -->
      <div class="kpi-bar">
        <div class="kpi-item">
          <span class="kpi-value">{{ detectionKpi.detectionCount }}</span>
          <span class="kpi-label">探测次数</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-value kpi-highlight">{{ detectionKpi.crackCount }}</span>
          <span class="kpi-label">破解次数</span>
        </div>
      </div>

      <!-- 筛选器 -->
      <div class="filter-bar">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">营地</span>
            <a-select
              v-model:value="selectedDetectionCamp"
              :options="CAMP_OPTIONS"
              style="width: 100%"
            />
          </div>
          <div class="filter-item">
            <span class="filter-label">时间</span>
            <a-select
              v-model:value="selectedDetectionTimeRange"
              :options="TIME_RANGE_OPTIONS"
              style="width: 100%"
            />
          </div>
        </div>
        <div v-if="selectedDetectionTimeRange === 'custom'" class="filter-row">
          <div class="filter-item filter-item--full">
            <span class="filter-label">自定义时间</span>
            <a-range-picker
              v-model:value="customDetectionDateRange"
              style="width: 100%"
              :placeholder="['开始时间', '结束时间']"
            />
          </div>
        </div>
      </div>

      <!-- 探测记录卡片列表 -->
      <div class="record-cards">
        <div
          v-for="record in filteredDetectionRecords"
          :key="record.id"
          class="record-card"
        >
          <!-- 头部：入侵无人机SN + 型号徽章 -->
          <div class="card-header">
            <span class="record-title">{{ record.intruder_sn }}</span>
            <span class="model-badge">{{ record.intruder_model }}</span>
          </div>

          <!-- 分割线 -->
          <div class="card-divider"></div>

          <!-- 关键信息行 -->
          <div class="info-row-compact">
            <a-tooltip title="频率">
              <span class="info-chip">{{ record.frequency }}</span>
            </a-tooltip>
            <a-tooltip title="带宽">
              <span class="info-chip">{{ record.bandwidth }}</span>
            </a-tooltip>
            <a-tooltip title="估算距离">
              <span class="info-chip">{{ formatDistance(record.estimated_distance) }}</span>
            </a-tooltip>
            <a-tooltip title="持续时间">
              <span class="info-chip">{{ formatDuration(record.duration_sec) }}</span>
            </a-tooltip>
          </div>

          <!-- 探测时间 -->
          <div class="time-row">
            <span class="time-label">探测时间</span>
            <span class="time-value">{{ formatDateTime(record.detected_at) }}</span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredDetectionRecords.length === 0" class="empty-state">
          <a-empty description="暂无探测记录" />
        </div>
      </div>
    </div>

    <!-- 打击记录 Tab 内容 -->
    <div v-show="activeTab === 'strike'" class="tab-content">
      <!-- KPI 统计 -->
      <div class="kpi-bar">
        <div class="kpi-item">
          <span class="kpi-value">{{ strikeKpi.uavStrikeCount }}</span>
          <span class="kpi-label">UAV打击次数</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-value kpi-highlight">{{ strikeKpi.fpvStrikeCount }}</span>
          <span class="kpi-label">FPV打击次数</span>
        </div>
      </div>

      <!-- 筛选器 -->
      <div class="filter-bar">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">营地</span>
            <a-select
              v-model:value="selectedStrikeCamp"
              :options="CAMP_OPTIONS"
              style="width: 100%"
            />
          </div>
          <div class="filter-item">
            <span class="filter-label">时间</span>
            <a-select
              v-model:value="selectedStrikeTimeRange"
              :options="TIME_RANGE_OPTIONS"
              style="width: 100%"
            />
          </div>
        </div>
        <div v-if="selectedStrikeTimeRange === 'custom'" class="filter-row">
          <div class="filter-item filter-item--full">
            <span class="filter-label">自定义时间</span>
            <a-range-picker
              v-model:value="customStrikeDateRange"
              style="width: 100%"
              :placeholder="['开始时间', '结束时间']"
            />
          </div>
        </div>
      </div>

      <!-- 打击记录卡片列表 -->
      <div class="record-cards">
        <div
          v-for="record in filteredStrikeRecords"
          :key="record.id"
          class="record-card"
        >
          <!-- 头部：目标类型 + 打击类型徽章 -->
          <div class="card-header">
            <span class="record-title">{{ record.target_type }} 目标</span>
            <span class="strike-type-badge" :class="{
              'strike-type-badge--auto': record.strike_type === '自动',
              'strike-type-badge--manual': record.strike_type === '强制/人工'
            }">
              {{ record.strike_type }}
            </span>
          </div>

          <!-- 分割线 -->
          <div class="card-divider"></div>

          <!-- 关键信息行 -->
          <div class="info-row-compact">
            <a-tooltip title="打击模式">
              <span class="info-chip info-chip--mode">{{ record.strike_mode }}</span>
            </a-tooltip>
            <a-tooltip title="打击持续时间">
              <span class="info-chip">{{ record.duration_sec }}s</span>
            </a-tooltip>
          </div>

          <!-- 打击时间 -->
          <div class="time-row">
            <span class="time-label">打击时间</span>
            <span class="time-value">{{ formatDateTime(record.strike_at) }}</span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredStrikeRecords.length === 0" class="empty-state">
          <a-empty description="暂无打击记录" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.counter-uas-records-panel {
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
  color: var(--of-color-text-secondary);

  &--right {
    left: -24px;
    border-radius: 8px 0 0 8px;
    border-right: none;
  }

  &:hover {
    background: rgba(10, 13, 18, 0.8);
    color: var(--of-color-accent-ice);
  }

  :deep(.anticon) {
    font-size: 12px;
  }
}

// ==================== Tab 切换栏 ====================

.tabs-bar {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;
}

.tab-item {
  flex: 1;
  padding: 12px;
  text-align: center;
  font-size: 14px;
  color: var(--of-text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    color: var(--of-text-primary);
    background: rgba(255, 255, 255, 0.03);
  }

  &--active {
    color: var(--of-color-link);
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--of-color-link);
    }
  }
}

// ==================== Tab 内容区 ====================

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// ==================== KPI 统计栏 ====================

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
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--of-color-accent-ice);
  line-height: 1;
  font-variant-numeric: tabular-nums;

  &.kpi-highlight {
    color: var(--of-color-warning);
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
  flex-shrink: 0;
}

// ==================== 筛选器 ====================

.filter-bar {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.filter-row {
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
  color: var(--of-text-primary);
}

// ==================== 记录卡片列表 ====================

.record-cards {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.record-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  cursor: default;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.record-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--of-text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(56, 189, 248, 0.15);
  color: var(--of-color-link);
  flex-shrink: 0;
}

.strike-type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;

  &--auto {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
  }

  &--manual {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }
}

.card-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0;
}

.info-row-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.info-chip {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: var(--of-text-primary);
  white-space: nowrap;

  &--mode {
    background: rgba(56, 189, 248, 0.1);
    border-color: rgba(56, 189, 248, 0.2);
    color: var(--of-color-link);
  }
}

.time-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.time-label {
  font-size: 12px;
  color: var(--of-text-tertiary);
}

.time-value {
  font-size: 12px;
  color: var(--of-text-secondary);
  font-variant-numeric: tabular-nums;
}

// ==================== 空状态 ====================

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--of-text-tertiary);
}

// ==================== RangePicker 深色主题适配 ====================

:deep(.ant-picker) {
  background: var(--of-bg-select);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--of-text-primary);

  .ant-picker-input > input {
    color: var(--of-text-primary);

    &::placeholder {
      color: var(--of-text-placeholder);
    }
  }

  .ant-picker-separator {
    color: var(--of-text-secondary);
  }

  .ant-picker-suffix,
  .ant-picker-clear {
    color: var(--of-text-secondary);
  }
}
</style>
