<script setup lang="ts">
/**
 * C类无人机飞行记录列表 - 右侧面板
 */
import { computed, ref } from 'vue'
import type { Dayjs } from 'dayjs'
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import {
  C_FLIGHT_RECORDS,
  C_MARKED_EVENTS,
  C_RECORD_STATUS_COLOR_MAP,
  TARGET_TYPE_COLOR,
  FLIGHT_TYPE_COLOR,
  type CFlightRecord,
  type CMarkedEvent,
  type FlightRecordStatus,
  type TargetType,
} from '@/mock/cFlightRecords'

// 状态选项
const RECORD_STATUS_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '执行中', value: '执行中' },
  { label: '执行完成', value: '执行完成' },
]

// 时间范围选项
const TIME_RANGE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '最近7天', value: 'last7days' },
  { label: '最近30天', value: 'last30days' },
  { label: '自定义', value: 'custom' },
]

// 事件类型选项
const EVENT_TYPE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '骑行者', value: '骑行者' },
  { label: '车', value: '车' },
  { label: '人', value: '人' },
  { label: '无人机', value: '无人机' },
  { label: '烟雾', value: '烟雾' },
  { label: '火', value: '火' },
]

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

const activeTab = ref<'flight' | 'event'>('flight')

// ============================ 筛选 ============================

const selectedRecordStatus = ref<string>('all')
const selectedTimeRange = ref<string>('today')
const customDateRange = ref<[Dayjs, Dayjs] | null>(null)

// 事件列表筛选
const selectedEventType = ref<string>('all')
const selectedEventTimeRange = ref<string>('today')
const customEventDateRange = ref<[Dayjs, Dayjs] | null>(null)

// 计算时间范围的起止时间戳
const timeRangeBounds = computed(() => {
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  switch (selectedTimeRange.value) {
    case 'today':
      return { start: todayStart, end: now }
    case 'last7days':
      return { start: todayStart - 6 * 86400000, end: now }
    case 'last30days':
      return { start: todayStart - 29 * 86400000, end: now }
    case 'custom':
      if (customDateRange.value) {
        return {
          start: customDateRange.value[0].valueOf(),
          end: customDateRange.value[1].endOf('day').valueOf(),
        }
      }
      return null
    default:
      return null
  }
})

// ============================ 飞行记录列表 ============================

const records = computed(() => {
  let filtered = C_FLIGHT_RECORDS

  // 按状态筛选
  if (selectedRecordStatus.value !== 'all') {
    filtered = filtered.filter((r) => r.status === selectedRecordStatus.value)
  }

  // 按时间筛选
  if (timeRangeBounds.value) {
    const { start, end } = timeRangeBounds.value
    filtered = filtered.filter((r) => {
      const recordTime = new Date(r.start_time).getTime()
      return recordTime >= start && recordTime <= end
    })
  }

  return filtered
})

// ============================ 事件列表 ============================

// 事件时间范围
const eventTimeRangeBounds = computed(() => {
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  switch (selectedEventTimeRange.value) {
    case 'today':
      return { start: todayStart, end: now }
    case 'last7days':
      return { start: todayStart - 6 * 86400000, end: now }
    case 'last30days':
      return { start: todayStart - 29 * 86400000, end: now }
    case 'custom':
      if (customEventDateRange.value) {
        return {
          start: customEventDateRange.value[0].valueOf(),
          end: customEventDateRange.value[1].endOf('day').valueOf(),
        }
      }
      return null
    default:
      return null
  }
})

const events = computed(() => {
  let filtered = C_MARKED_EVENTS

  // 按类型筛选
  if (selectedEventType.value !== 'all') {
    filtered = filtered.filter((e) => e.target_type === selectedEventType.value)
  }

  // 按时间筛选
  if (eventTimeRangeBounds.value) {
    const { start, end } = eventTimeRangeBounds.value
    filtered = filtered.filter((e) => {
      const eventTime = new Date(e.reported_at).getTime()
      return eventTime >= start && eventTime <= end
    })
  }

  return filtered
})

// ============================ 事件 KPI 统计 ============================

const eventKpi = computed(() => {
  const total = events.value.length
  const cyclist = events.value.filter((e) => e.target_type === '骑行者').length
  const vehicle = events.value.filter((e) => e.target_type === '车').length
  const person = events.value.filter((e) => e.target_type === '人').length
  const drone = events.value.filter((e) => e.target_type === '无人机').length
  const smoke = events.value.filter((e) => e.target_type === '烟雾').length
  const fire = events.value.filter((e) => e.target_type === '火').length

  return { total, cyclist, vehicle, person, drone, smoke, fire }
})

// ============================ KPI 统计 ============================

const recordKpi = computed(() => {
  const ongoing = records.value.filter((r) => r.status === '执行中').length
  const completed = records.value.filter((r) => r.status === '执行完成').length
  const totalDistance = records.value.reduce((sum, r) => sum + r.actual_distance_m, 0)
  const totalDuration = records.value.reduce((sum, r) => sum + r.actual_duration_sec, 0)

  return { ongoing, completed, totalDistance, totalDuration }
})

// ============================ 详情弹窗 ============================

const detailVisible = ref(false)
const selectedRecord = ref<CFlightRecord | null>(null)

function showDetail(record: CFlightRecord) {
  selectedRecord.value = record
  detailVisible.value = true
}

function closeDetail() {
  detailVisible.value = false
  selectedRecord.value = null
}

function handleTaskPlayback() {
  alert('任务回放功能开发中')
}

function handleVideoPlayback() {
  alert('视频回放功能开发中')
}

// ============================ 格式化工具 ============================

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDistanceKpi(meters: number): string {
  return (meters / 1000).toFixed(1)
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分`
  }
  return `${minutes} 分钟`
}

function formatDurationKpi(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h${minutes}m`
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return '--'
  const d = new Date(isoString)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatRemaining(meters: number, status: string): string {
  if (status === '已完成') return '--'
  return `${(meters / 1000).toFixed(2)} km`
}

function formatCoordinate(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(3)}°${latDir}, ${Math.abs(lng).toFixed(3)}°${lngDir}`
}
</script>

<template>
  <div>
    <div class="flight-records-panel" :class="{ 'flight-records-panel--collapsed': props.collapsed }">
      <!-- 收起/展开按钮 -->
      <div class="panel-toggle-btn panel-toggle-btn--right" @click="togglePanel">
        <RightOutlined v-if="!props.collapsed" />
        <LeftOutlined v-else />
      </div>

      <!-- Tab 切换 -->
      <div class="tabs-bar">
        <div
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === 'flight' }"
          @click="activeTab = 'flight'"
        >
          飞行记录
        </div>
        <div
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === 'event' }"
          @click="activeTab = 'event'"
        >
          事件列表
        </div>
      </div>

      <!-- 飞行记录 Tab 内容 -->
      <div v-show="activeTab === 'flight'" class="tab-content">
        <!-- KPI 统计 -->
        <div class="kpi-bar">
          <div class="kpi-item">
            <span class="kpi-value kpi-ongoing">{{ recordKpi.ongoing }}</span>
            <span class="kpi-label">执行中</span>
          </div>
          <div class="kpi-divider"></div>
          <div class="kpi-item">
            <span class="kpi-value">{{ recordKpi.completed }}</span>
            <span class="kpi-label">执行完成</span>
          </div>
          <div class="kpi-divider"></div>
          <div class="kpi-item">
            <span class="kpi-value">{{ formatDistanceKpi(recordKpi.totalDistance) }}</span>
            <span class="kpi-label">总里程(km)</span>
          </div>
          <div class="kpi-divider"></div>
          <div class="kpi-item">
            <span class="kpi-value">{{ formatDurationKpi(recordKpi.totalDuration) }}</span>
            <span class="kpi-label">总时长</span>
          </div>
        </div>

        <!-- 筛选器 -->
        <div class="filter-bar">
          <div class="filter-row">
            <div class="filter-item">
              <span class="filter-label">状态</span>
              <a-select
                v-model:value="selectedRecordStatus"
                :options="RECORD_STATUS_OPTIONS"
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
          </div>
          <div v-if="selectedTimeRange === 'custom'" class="filter-row">
            <div class="filter-item filter-item--full">
              <span class="filter-label">自定义时间</span>
              <a-range-picker
                v-model:value="customDateRange"
                style="width: 100%"
                :placeholder="['开始时间', '结束时间']"
              />
            </div>
          </div>
        </div>

        <!-- 飞行记录卡片列表 -->
        <div class="record-cards">
          <div
            v-for="record in records"
            :key="record.id"
            class="record-card"
            @click="showDetail(record)"
          >
            <!-- 头部：无人机名称 + 状态徽章 -->
            <div class="card-header">
              <span class="drone-name">{{ record.drone_name }}</span>
              <span
                class="status-badge"
                :style="{ backgroundColor: C_RECORD_STATUS_COLOR_MAP[record.status] }"
              >
                {{ record.status }}
              </span>
            </div>

            <!-- 时间信息 -->
            <div class="time-info">
              <div class="time-row">
                <span class="time-label">开始</span>
                <span class="time-value">{{ formatDateTime(record.start_time) }}</span>
              </div>
              <div class="time-row">
                <span class="time-label">结束</span>
                <span class="time-value">{{ formatDateTime(record.end_time) }}</span>
              </div>
            </div>

            <!-- 分割线 -->
            <div class="divider"></div>

            <!-- 统计数据 -->
            <div class="stats-section">
              <div class="stat-item">
                <span class="stat-label">实际里程</span>
                <span class="stat-value">{{ formatDistance(record.actual_distance_m) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">实际时长</span>
                <span class="stat-value">{{ formatDuration(record.actual_duration_sec) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最大高度</span>
                <span class="stat-value">{{ record.max_altitude_m }}m</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">飞行类型</span>
                <span class="stat-value">{{ record.flight_type }}</span>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="records.length === 0" class="empty-state">
            <a-empty description="暂无飞行记录" />
          </div>
        </div>
      </div>

      <!-- 事件列表 Tab 内容 -->
      <div v-show="activeTab === 'event'" class="tab-content">
        <!-- KPI 统计（两行布局） -->
        <div class="kpi-container">
          <!-- 第一行：3 个 KPI -->
          <div class="kpi-bar">
            <div class="kpi-item">
              <span class="kpi-value">{{ eventKpi.total }}</span>
              <span class="kpi-label">总数</span>
            </div>
            <div class="kpi-divider"></div>
            <div class="kpi-item">
              <span class="kpi-value">{{ eventKpi.vehicle }}</span>
              <span class="kpi-label">车</span>
            </div>
            <div class="kpi-divider"></div>
            <div class="kpi-item">
              <span class="kpi-value">{{ eventKpi.drone }}</span>
              <span class="kpi-label">无人机</span>
            </div>
          </div>
          <!-- 第二行：4 个 KPI -->
          <div class="kpi-bar">
            <div class="kpi-item">
              <span class="kpi-value">{{ eventKpi.cyclist }}</span>
              <span class="kpi-label">骑行者</span>
            </div>
            <div class="kpi-divider"></div>
            <div class="kpi-item">
              <span class="kpi-value">{{ eventKpi.person }}</span>
              <span class="kpi-label">人</span>
            </div>
            <div class="kpi-divider"></div>
            <div class="kpi-item">
              <span class="kpi-value">{{ eventKpi.smoke }}</span>
              <span class="kpi-label">烟雾</span>
            </div>
            <div class="kpi-divider"></div>
            <div class="kpi-item">
              <span class="kpi-value">{{ eventKpi.fire }}</span>
              <span class="kpi-label">火</span>
            </div>
          </div>
        </div>

        <!-- 筛选器 -->
        <div class="filter-bar">
          <div class="filter-row">
            <div class="filter-item">
              <span class="filter-label">类型</span>
              <a-select
                v-model:value="selectedEventType"
                :options="EVENT_TYPE_OPTIONS"
                style="width: 100%"
              />
            </div>
            <div class="filter-item">
              <span class="filter-label">时间</span>
              <a-select
                v-model:value="selectedEventTimeRange"
                :options="TIME_RANGE_OPTIONS"
                style="width: 100%"
              />
            </div>
          </div>
          <div v-if="selectedEventTimeRange === 'custom'" class="filter-row">
            <div class="filter-item filter-item--full">
              <span class="filter-label">自定义时间</span>
              <a-range-picker
                v-model:value="customEventDateRange"
                style="width: 100%"
                :placeholder="['开始时间', '结束时间']"
              />
            </div>
          </div>
        </div>

        <!-- 事件卡片列表 -->
        <div class="record-cards">
          <div
            v-for="event in events"
            :key="event.id"
            class="record-card event-card"
          >
            <!-- 头部：事件名称 + 类型徽章 -->
            <div class="card-header">
              <span class="drone-name">{{ event.event_name }}</span>
              <span
                class="status-badge"
                :style="{ backgroundColor: TARGET_TYPE_COLOR }"
              >
                {{ event.target_type }}
              </span>
            </div>

            <!-- 事件信息 -->
            <div class="event-info">
              <div class="info-row">
                <span class="info-row-label">坐标</span>
                <span class="info-row-value">{{ formatCoordinate(event.latitude, event.longitude) }}</span>
              </div>
              <div class="info-row">
                <span class="info-row-label">创建时间</span>
                <span class="info-row-value">{{ formatDateTime(event.reported_at) }}</span>
              </div>
              <div class="info-row">
                <span class="info-row-label">创建人</span>
                <span class="info-row-value">{{ event.created_by }}</span>
              </div>
              <div class="info-row">
                <span class="info-row-label">任务编号</span>
                <span class="info-row-value">{{ event.task_id }}</span>
              </div>
              <div class="info-row">
                <span class="info-row-label">无人机名称</span>
                <span class="info-row-value">{{ event.drone_name }}</span>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="events.length === 0" class="empty-state">
            <a-empty description="暂无事件记录" />
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧面板收起后的触发按钮 -->
    <div
      v-if="props.collapsed"
      class="collapsed-trigger collapsed-trigger--right"
      @click="togglePanel"
    >
      <div class="trigger-content">
        <LeftOutlined class="trigger-icon" />
        <span class="trigger-text">飞行记录</span>
      </div>
    </div>
  </div>

  <!-- 飞行记录详情弹窗 -->
  <a-modal
    v-model:open="detailVisible"
    :title="`${selectedRecord?.drone_name} - 飞行记录详情`"
    width="1000px"
    :footer="null"
    @cancel="closeDetail"
  >
    <div v-if="selectedRecord" class="detail-content">
      <!-- 基本信息 -->
      <div class="detail-section">
        <div class="section-title">基本信息</div>
        <div class="info-grid-detail">
          <div class="info-item">
            <span class="info-label">无人机名称</span>
            <span class="info-value">{{ selectedRecord.drone_name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">起飞机巢</span>
            <span class="info-value">{{ selectedRecord.takeoff_nest }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">飞行类型</span>
            <span class="info-value">{{ selectedRecord.flight_type }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">状态</span>
            <span>
              <span
                class="status-badge"
                :style="{ backgroundColor: C_RECORD_STATUS_COLOR_MAP[selectedRecord.status] }"
              >
                {{ selectedRecord.status }}
              </span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">开始时间</span>
            <span class="info-value">{{ formatDateTime(selectedRecord.start_time) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">结束时间</span>
            <span class="info-value">{{ formatDateTime(selectedRecord.end_time) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">实际里程（m）</span>
            <span class="info-value">{{ selectedRecord.actual_distance_m }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">实际时长</span>
            <span class="info-value">{{ formatDuration(selectedRecord.actual_duration_sec) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">最大高度（m）</span>
            <span class="info-value">{{ selectedRecord.max_altitude_m }}</span>
          </div>
        </div>
      </div>

      <!-- 侦查事件列表 -->
      <div class="detail-section">
        <div class="section-title">侦查事件</div>
        <a-table
          v-if="selectedRecord.scout_events.length > 0"
          :columns="scoutEventColumns"
          :data-source="selectedRecord.scout_events"
          :pagination="false"
          size="small"
        />
        <a-empty v-else description="暂无侦查事件" />
      </div>

      <!-- 功能按钮 -->
      <div class="detail-actions">
        <a-button type="primary" @click="handleTaskPlayback">任务回放</a-button>
        <a-button @click="handleVideoPlayback">视频回放</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts">
const scoutEventColumns = [
  { title: '事件名称', dataIndex: 'event_name', key: 'event_name' },
  { title: '目标类型', dataIndex: 'target_type', key: 'target_type' },
  {
    title: '拍摄时间',
    dataIndex: 'captured_at',
    key: 'captured_at',
    customRender: ({ text }: { text: string }) => {
      const d = new Date(text)
      return d.toLocaleString('zh-CN', { hour12: false })
    },
  },
]
</script>

<style scoped lang="scss">
.flight-records-panel {
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
  overflow: visible; /* 改为 visible 让按钮能显示出来 */
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

// ==================== Tab 切换栏 ====================

.tabs-bar {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
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

.kpi-container {
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.kpi-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 14px 12px;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
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

  &.kpi-ongoing {
    color: var(--of-color-success);
  }

  &.kpi-friendly {
    color: #52c41a;
  }

  &.kpi-hostile {
    color: #ff6666;
  }

  &.kpi-unknown {
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

// KPI 分组样式（事件列表 7 个 KPI）
.kpi-bar--grouped {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  padding: 12px 8px;
}

.kpi-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.kpi-group-label {
  font-size: 10px;
  color: var(--of-text-quaternary);
  margin-bottom: 2px;
}

.kpi-group-items {
  display: flex;
  gap: 8px;
}

.kpi-mini-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.kpi-mini-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--of-color-accent-ice);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.kpi-mini-label {
  font-size: 10px;
  color: var(--of-text-tertiary);
}

// ==================== 筛选器 ====================

.filter-bar {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  color: var(--of-text-secondary);
}

// RangePicker 深色主题适配
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

  &:hover {
    border-color: var(--of-color-primary-border);
  }

  &.ant-picker-focused {
    border-color: var(--of-color-primary-border);
    box-shadow: 0 0 0 2px rgba(20, 129, 166, 0.2);
  }
}

// ==================== 飞行记录卡片列表 ====================

.record-cards {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* 防止水平滚动 */
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
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

.drone-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--of-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--of-text-primary);
  white-space: nowrap;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.time-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.time-label {
  color: var(--of-text-secondary);
}

.time-value {
  color: var(--of-text-primary);
  font-variant-numeric: tabular-nums;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 12px 0;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
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

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 0;
}

// ==================== 事件卡片 ====================

.event-card {
  cursor: default; // 暂时不支持点击
}

.event-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  align-items: baseline;
}

.info-row-label {
  color: var(--of-text-secondary);
  flex-shrink: 0;
  margin-right: 8px;
}

.info-row-value {
  color: var(--of-text-primary);
  text-align: right;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
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

.info-grid-detail {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 16px;
}

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
}

.detail-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
}
</style>
