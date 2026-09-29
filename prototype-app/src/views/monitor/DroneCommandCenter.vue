<template>
  <div class="drone-command-center">
    <!-- 中央地图区域 -->
    <main class="dcc-map-area">
      <!-- 顶部筛选栏 -->
      <div class="map-filter-bar">
        <div class="filter-item">
          <label class="filter-label">营地</label>
          <a-select
            v-model:value="filters.camps"
            mode="multiple"
            placeholder="全部"
            size="small"
            style="width: 120px"
          >
            <a-select-option value="Jaouro">Jaouro</a-select-option>
            <a-select-option value="Koulele">Koulele</a-select-option>
            <a-select-option value="Goumeri">Goumeri</a-select-option>
            <a-select-option value="Sokor">Sokor</a-select-option>
            <a-select-option value="Dibeilla">Dibeilla</a-select-option>
          </a-select>
        </div>

        <div class="filter-item">
          <label class="filter-label">类型</label>
          <a-select v-model:value="filters.uavType" size="small" style="width: 90px">
            <a-select-option value="all">全部</a-select-option>
            <a-select-option value="A">A类</a-select-option>
            <a-select-option value="C">C类</a-select-option>
          </a-select>
        </div>

        <div class="filter-item">
          <label class="filter-label">状态</label>
          <a-select v-model:value="filters.uavStatus" size="small" style="width: 100px">
            <a-select-option value="all">全部</a-select-option>
            <a-select-option value="flying">在飞</a-select-option>
            <a-select-option value="available">可用</a-select-option>
            <a-select-option value="charging">充电中</a-select-option>
            <a-select-option value="on_mission">任务中</a-select-option>
            <a-select-option value="fault">故障</a-select-option>
            <a-select-option value="offline">离线</a-select-option>
          </a-select>
        </div>

        <div class="filter-item">
          <label class="filter-label">预警/事件筛选</label>
          <a-select
            v-model:value="filters.eventFilters"
            mode="multiple"
            placeholder="默认待处理"
            size="small"
            style="width: 150px"
          >
            <a-select-option value="pending">待处理项</a-select-option>
            <a-select-option value="closedAlerts">已关闭预警</a-select-option>
            <a-select-option value="resolvedEvents">已处置事件</a-select-option>
          </a-select>
        </div>
      </div>

      <div class="map-container">
        <!-- 地图模拟器 -->
        <MapSimulator
          ref="mapSimulatorRef"
          :drones="filteredDrones"
          :alerts="filteredAlerts"
          :events="filteredEvents"
          :layers="layers"
          :pulsing-alert-id="pulsingAlertId"
          @drone-click="onDroneDetail"
          @alert-click="onAlertDetail"
        />

        <!-- 图层控制器（右上角） -->
        <div class="layer-control">
          <button class="layer-toggle-btn" @click="layerPanelOpen = !layerPanelOpen">
            <AppstoreOutlined />
          </button>
          <div v-show="layerPanelOpen" class="layer-panel">
            <div class="layer-item">
              <a-checkbox v-model:checked="layers.sensitiveArea">敏感区域</a-checkbox>
            </div>
            <div class="layer-item">
              <a-checkbox v-model:checked="layers.uavPosition">无人机位置</a-checkbox>
            </div>
            <div class="layer-item">
              <a-checkbox v-model:checked="layers.trajectory">航线轨迹</a-checkbox>
            </div>
            <div class="layer-item">
              <a-checkbox v-model:checked="layers.alertEvent">预警事件点</a-checkbox>
            </div>
            <div class="layer-item">
              <a-checkbox v-model:checked="layers.nest">机巢位置</a-checkbox>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 右侧面板（加宽） -->
    <aside class="dcc-right-panel">
      <!-- 统计卡片区域（可折叠） -->
      <div class="stats-section" :class="{ collapsed: statsCollapsed }">
        <div class="stats-header" @click="statsCollapsed = !statsCollapsed">
          <span class="stats-title">态势统计</span>
          <button class="collapse-icon">
            <DownOutlined v-if="statsCollapsed" />
            <UpOutlined v-else />
          </button>
        </div>

        <div v-show="!statsCollapsed" class="stats-cards">
          <!-- 6个KPI卡片（调整顺序：无人机状态在第一行） -->

          <!-- 第一行 -->
          <div class="stat-card" @click="onStatCardClick('status')">
            <div class="stat-header">无人机状态</div>
            <div class="stat-visual">
              <div class="status-bars">
                <div class="status-bar flying" :style="{ width: `${((droneStats.flying + droneStats.escort + droneStats.alertResponse) / droneStats.total * 100) || 0}%` }"></div>
                <div class="status-bar available" :style="{ width: `${(droneStats.available / droneStats.total * 100) || 0}%` }"></div>
                <div class="status-bar unavailable" :style="{ width: `${((droneStats.charging + droneStats.fault + droneStats.offline) / droneStats.total * 100) || 0}%` }"></div>
              </div>
            </div>
            <div class="stat-legend">
              <span class="legend-item"><i class="dot flying"></i>在飞 {{ droneStats.flying + droneStats.escort + droneStats.alertResponse }}</span>
              <span class="legend-item"><i class="dot available"></i>可用 {{ droneStats.available }}</span>
              <span class="legend-item"><i class="dot unavailable"></i>不可用 {{ droneStats.charging + droneStats.fault + droneStats.offline }}</span>
            </div>
          </div>

          <div class="stat-card" @click="onStatCardClick('completion')">
            <div class="stat-header">任务完成率</div>
            <div class="stat-progress">
              <svg viewBox="0 0 36 36" class="circular-chart">
                <path
                  class="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="circle"
                  :stroke-dasharray="`${completionRate}, 100`"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" class="percentage">{{ completionRate }}%</text>
              </svg>
            </div>
            <div class="stat-meta">
              <span class="meta-label">今日 15 / 完成 8</span>
            </div>
          </div>

          <div class="stat-card" @click="onStatCardClick('flight')">
            <div class="stat-header">今日飞行</div>
            <div class="stat-value">142<span class="stat-unit">KM</span></div>
            <div class="stat-meta">
              <span class="meta-label">今日时长</span>
              <span class="meta-value">8.5H</span>
            </div>
            <div class="stat-meta">
              <span class="meta-label">今日架次</span>
              <span class="meta-value">12次</span>
            </div>
          </div>

          <!-- 第二行 -->
          <div class="stat-card" @click="onStatCardClick('escort')">
            <div class="stat-header">调度任务</div>
            <div class="stat-value">{{ droneStats.escort }}<span class="stat-unit">个</span></div>
            <div class="stat-meta">
              <span class="meta-label">今日累计</span>
              <span class="meta-value">5个</span>
            </div>
          </div>

          <div class="stat-card" @click="onStatCardClick('response')">
            <div class="stat-header">今日告警响应</div>
            <div class="stat-value">{{ todayAlertResponseCount }}<span class="stat-unit">次</span></div>
            <div class="stat-meta">
              <span class="meta-label">平均响应</span>
              <span class="meta-value">2.3min</span>
              <span class="trend-up">↑ 12%</span>
            </div>
          </div>

          <div class="stat-card warning" @click="onStatCardClick('battery')">
            <div class="stat-header">电量告警</div>
            <div class="stat-value">{{ lowBatteryCount }}<span class="stat-unit">架</span></div>
            <div class="stat-meta">
              <span class="meta-label">低于20%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab切换区域 -->
      <div class="tabs-section">
        <AlertDetailPanel
          :visible="alertDetailVisible"
          :alert="currentAlert"
          :drones="drones"
          @close="onCloseAlertDetail"
          @create-dispatch="onCreateDispatch(currentAlertId || '')"
          @track="onTrackAlert"
          @close-alert="onOpenCloseAlertModal"
          @escalate="onEscalateAlert"
        />

        <a-tabs v-model:activeKey="activeTab" class="dcc-tabs">
          <!-- Tab 1: 预警与事件 -->
          <a-tab-pane key="alerts" tab="预警与事件">
            <div class="tab-content">
              <!-- 顶部筛选器 -->
              <div class="tab-filters">
                <div class="filter-row">
                  <a-radio-group v-model:value="alertFilter.type" size="small">
                    <a-radio-button value="all">全部</a-radio-button>
                    <a-radio-button value="alert">仅预警</a-radio-button>
                    <a-radio-button value="event">仅事件</a-radio-button>
                  </a-radio-group>

                  <a-select
                    v-model:value="alertFilter.status"
                    mode="multiple"
                    placeholder="状态筛选"
                    size="small"
                    style="width: 200px"
                  >
                    <a-select-option value="new">新建</a-select-option>
                    <a-select-option value="verifying">核实中</a-select-option>
                    <a-select-option value="tracking">持续跟踪中</a-select-option>
                    <a-select-option value="closed">已关闭</a-select-option>
                    <a-select-option value="escalated">已升级为事件</a-select-option>
                    <a-select-option value="pending">待响应（事件）</a-select-option>
                    <a-select-option value="handling">处置中（事件）</a-select-option>
                    <a-select-option value="handled">已处置（事件）</a-select-option>
                  </a-select>

                  <a-select
                    v-model:value="alertFilter.timeRange"
                    size="small"
                    style="width: 120px"
                  >
                    <a-select-option value="1h">最近1小时</a-select-option>
                    <a-select-option value="6h">最近6小时</a-select-option>
                    <a-select-option value="today">今日</a-select-option>
                    <a-select-option value="7d">最近7天</a-select-option>
                    <a-select-option value="custom">自定义</a-select-option>
                  </a-select>
                </div>
              </div>

              <!-- 列表区域 -->
              <div class="list-area">
                <!-- 预警列表 -->
                <div v-if="alertFilter.type === 'all' || alertFilter.type === 'alert'" class="list-section">
                  <AlertEventItem
                    v-for="alert in filteredAlerts"
                    :key="alert.id"
                    v-bind="alert"
                    :show-actions="true"
                    @detail="onAlertDetail(alert.id)"
                    @create-dispatch="onCreateDispatch(alert.id)"
                    @locate="onLocateAlert(alert.id)"
                  />
                </div>

                <!-- 事件列表 -->
                <div v-if="alertFilter.type === 'all' || alertFilter.type === 'event'" class="list-section">
                  <AlertEventItem
                    v-for="event in filteredEvents"
                    :key="event.id"
                    v-bind="event"
                    :show-actions="true"
                    @detail="onAlertDetail(event.id)"
                    @locate="onLocateAlert(event.id)"
                  />
                </div>

                <!-- 空状态 -->
                <div v-if="filteredAlerts.length === 0 && filteredEvents.length === 0" class="empty-state">
                  <InboxOutlined class="empty-icon" />
                  <p>暂无预警或事件</p>
                  <p class="empty-hint">新预警到达时会自动显示在此处</p>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- Tab 2: 无人机列表 -->
          <a-tab-pane key="drones" tab="无人机">
            <div class="tab-content">
              <!-- 顶部筛选器 -->
              <div class="tab-filters">
                <a-select v-model:value="filters.camps" mode="multiple" size="small" placeholder="营地" style="width: 120px">
                  <a-select-option value="Jaouro">Jaouro</a-select-option>
                  <a-select-option value="Koulele">Koulele</a-select-option>
                  <a-select-option value="Goumeri">Goumeri</a-select-option>
                  <a-select-option value="Sokor">Sokor</a-select-option>
                  <a-select-option value="Dibeilla">Dibeilla</a-select-option>
                </a-select>
                <a-select v-model:value="filters.uavType" size="small" style="width: 90px">
                  <a-select-option value="all">全部类型</a-select-option>
                  <a-select-option value="A">A类</a-select-option>
                  <a-select-option value="C">C类</a-select-option>
                </a-select>
                <a-select v-model:value="filters.uavStatus" size="small" style="width: 100px">
                  <a-select-option value="all">全部状态</a-select-option>
                  <a-select-option value="flying">在飞</a-select-option>
                  <a-select-option value="available">可用</a-select-option>
                  <a-select-option value="charging">充电中</a-select-option>
                  <a-select-option value="on_mission">任务中</a-select-option>
                  <a-select-option value="fault">故障</a-select-option>
                  <a-select-option value="offline">离线</a-select-option>
                </a-select>
                <a-select v-model:value="droneFilter.sort" size="small" style="width: 120px">
                  <a-select-option value="default">默认排序</a-select-option>
                  <a-select-option value="battery">按电量</a-select-option>
                  <a-select-option value="distance">按距离</a-select-option>
                </a-select>
              </div>

              <!-- 列表区域 -->
              <div class="list-area">
                <DroneCard
                  v-for="drone in filteredDrones"
                  :key="drone.id"
                  :name="drone.name"
                  :sn="drone.sn"
                  :uav-class="drone.uavClass"
                  :status="drone.status"
                  :battery="drone.telemetry.battery"
                  :task="drone.task"
                  :flight-time="drone.telemetry.flightTime ? `${drone.telemetry.flightTime}min` : undefined"
                  :remaining-distance="drone.telemetry.remainingDistance ? `${drone.telemetry.remainingDistance}km` : undefined"
                  :altitude="drone.telemetry.altitude"
                  :speed="drone.telemetry.speed"
                  :update-time="drone.telemetry.updateTime"
                  @locate="onDroneLocate(drone.id)"
                  @video="onDroneVideo(drone.id)"
                  @detail="onDroneDetail(drone.id)"
                />

                <!-- 空状态 -->
                <div v-if="filteredDrones.length === 0" class="empty-state">
                  <InboxOutlined class="empty-icon" />
                  <p>暂无无人机数据</p>
                  <p class="empty-hint">系统连接后将显示无人机列表</p>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- Tab 3: 视频墙 -->
          <a-tab-pane key="video" tab="视频墙">
            <VideoWallTab
              :drones="filteredDrones"
              @fullscreen="onVideoFullscreen"
            />
          </a-tab-pane>

          <!-- Tab 4: 历史回放 -->
          <a-tab-pane key="playback" tab="历史回放">
            <PlaybackTab
              :drones="drones"
              @start-playback="onStartPlayback"
              @stop-playback="onStopPlayback"
              @seek="onSeekPlayback"
              @speed-change="onSpeedChange"
            />
          </a-tab-pane>
        </a-tabs>
      </div>
    </aside>

    <!-- 调度卡片生成弹窗 -->
    <DispatchCardModal
      v-model:visible="dispatchModalVisible"
      :alert-id="currentAlertId"
      :alert-title="currentAlertTitle"
      @confirm="onConfirmDispatch"
    />

    <!-- 升级为事件弹窗 -->
    <EscalateToEventModal
      :visible="escalateModalVisible"
      :alert="currentAlertForEscalate"
      @confirm="onEscalateToEventConfirm"
      @cancel="escalateModalVisible = false"
    />

    <!-- 关闭预警确认弹窗 -->
    <CloseAlertModal
      v-model:visible="closeAlertModalVisible"
      :alert-title="currentAlertTitle"
      @confirm="onCloseAlertConfirm"
    />

    <!-- 无人机详情弹窗 -->
    <DroneDetailModal
      :visible="droneDetailVisible"
      :drone="currentDroneForDetail"
      @close="droneDetailVisible = false"
    />

    <!-- 视频播放器弹窗 -->
    <VideoPlayerModal
      :visible="videoPlayerVisible"
      :drone="currentDroneForVideo"
      @close="videoPlayerVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 无人机监控中心 —— PRD: 无人机监控中心 V1.0
 *
 * Phase 1-2: 基础布局与组件（已完成）
 * Phase 3.4: 数据绑定（精简版 - 真实现场数据）
 * - 9架现场真实无人机（A类4架 + C类5架）
 * - 5条预警 + 2条事件
 * - 组件内筛选逻辑（无 Pinia Store）
 */
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  AppstoreOutlined,
  DownOutlined,
  UpOutlined,
  InboxOutlined,
  VideoCameraOutlined,
  HistoryOutlined,
} from '@ant-design/icons-vue'
import AlertEventItem from './components/AlertEventItem.vue'
import DroneCard from './components/DroneCard.vue'
import AlertDetailPanel from './components/AlertDetailPanel.vue'
import DispatchCardModal from './components/DispatchCardModal.vue'
import MapSimulator from './components/MapSimulator.vue'
import EscalateToEventModal from './components/EscalateToEventModal.vue'
import DroneDetailModal from './components/DroneDetailModal.vue'
import VideoPlayerModal from './components/VideoPlayerModal.vue'
import CloseAlertModal from './components/CloseAlertModal.vue'
import VideoWallTab from './components/VideoWallTab.vue'
import PlaybackTab from './components/PlaybackTab.vue'

// 真实现场数据
import { REAL_DRONES, getDroneStats } from '@/data/realDrones'
import { REAL_ALERTS, REAL_EVENTS } from '@/data/realAlerts'
import { UavStatus, AlertStatus } from '@/types'
import { generateTextCard, generateImageCard, copyToClipboard, downloadImage } from '@/utils/dispatchCard'

// ========================= 数据源 =========================

const drones = ref(REAL_DRONES)
const alerts = ref(REAL_ALERTS)
const events = ref(REAL_EVENTS)

// ========================= 状态管理 =========================

// 面板折叠状态
const statsCollapsed = ref(false)
const layerPanelOpen = ref(false)

// 详情面板和弹窗状态
const alertDetailVisible = ref(false)
const dispatchModalVisible = ref(false)
const escalateModalVisible = ref(false)
const closeAlertModalVisible = ref(false)
const droneDetailVisible = ref(false)
const videoPlayerVisible = ref(false)
const currentAlertId = ref<string>()
const currentAlertTitle = ref<string>()
const currentAlert = ref<any>(null)
const currentAlertForEscalate = ref<any>(null)
const currentDroneForDetail = ref<any>(null)
const currentDroneForVideo = ref<any>(null)

// 脉冲效果状态
const pulsingAlertId = ref<string>()

// 筛选器状态
const filters = reactive({
  camps: [] as string[],
  uavType: 'all' as 'all' | 'A' | 'C',
  uavStatus: 'all' as 'all' | UavStatus | 'on_mission',
  eventFilters: ['pending'] as string[], // 默认选中"待处理项"
})

// 图层开关
const layers = reactive({
  sensitiveArea: true,
  uavPosition: true,
  trajectory: false,
  alertEvent: true,
  nest: true,
})

// MapSimulator组件引用
const mapSimulatorRef = ref<InstanceType<typeof MapSimulator>>()

// Tab状态
const activeTab = ref('alerts')

// Tab内筛选器
const alertFilter = reactive({
  type: 'all' as 'all' | 'alert' | 'event',
  status: [] as string[],
  timeRange: 'today' as 'today' | 'week' | 'month' | 'all',
})

const droneFilter = reactive({
  sort: 'default' as 'default' | 'battery' | 'distance',
})

// ========================= 计算属性 =========================

// 任务完成率（临时Mock数据，Phase 5 实现真实逻辑）
const completionRate = computed(() => 53)

// ========================= 筛选逻辑 =========================

/**
 * 状态翻译映射
 */
const alertStatusMap: Record<string, string> = {
  pending: '待处理',
  verifying: '核实中',
  tracking: '持续跟踪中',
  closed: '已关闭',
  escalated: '已升级为事件',
}

const eventStatusMap: Record<string, string> = {
  pending: '待响应',
  handling: '处置中',
  controlled: '已控制',
  resolved: '已处置',
  closed: '已关闭',
}

/**
 * 筛选后的无人机列表
 */
const filteredDrones = computed(() => {
  let result = drones.value

  // 营地筛选
  if (filters.camps.length > 0) {
    result = result.filter((drone) => filters.camps.includes(drone.camp || ''))
  }

  // 类型筛选
  if (filters.uavType !== 'all') {
    result = result.filter((drone) => drone.uavClass === filters.uavType)
  }

  // 状态筛选（任务中 = 伴飞中 + 告警响应中）
  if (filters.uavStatus !== 'all') {
    if (filters.uavStatus === 'on_mission') {
      result = result.filter((drone) => drone.status === 'escort' || drone.status === 'alert_response')
    } else {
      result = result.filter((drone) => drone.status === filters.uavStatus)
    }
  }

  // 排序
  if (droneFilter.sort === 'battery') {
    result = [...result].sort((a, b) => a.telemetry.battery - b.telemetry.battery)
  } else if (droneFilter.sort === 'distance') {
    result = [...result].sort((a, b) => {
      const distA = a.telemetry.remainingDistance ?? Infinity
      const distB = b.telemetry.remainingDistance ?? Infinity
      return distA - distB
    })
  }

  return result
})

/**
 * 筛选后的预警列表
 */
const filteredAlerts = computed(() => {
  let result = alerts.value

  // 类型筛选
  if (alertFilter.type === 'event') {
    return []
  }

  // 状态筛选
  if (alertFilter.status.length > 0) {
    result = result.filter((alert) => alertFilter.status.includes(alert.status))
  }

  // 时间范围筛选
  if (alertFilter.timeRange !== 'all') {
    const now = new Date()
    const cutoffTime = (() => {
      switch (alertFilter.timeRange) {
        case 'today':
          return new Date(now.getTime() - 24 * 60 * 60 * 1000)
        case 'week':
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        case 'month':
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        default:
          return new Date(0)
      }
    })()

    result = result.filter(
      (alert) => alert.createdAt && new Date(alert.createdAt) > cutoffTime
    )
  }

  // 快捷筛选（待处理项）
  if (filters.eventFilters.includes('pending')) {
    result = result.filter(
      (alert) =>
        alert.status === AlertStatus.Pending || alert.status === AlertStatus.Verifying
    )
  }

  // 翻译状态为中文
  return result.map(alert => ({
    ...alert,
    status: alertStatusMap[alert.status] || alert.status
  }))
})

/**
 * 筛选后的事件列表
 */
const filteredEvents = computed(() => {
  let result = events.value

  // 类型筛选
  if (alertFilter.type === 'alert') {
    return []
  }

  // 状态筛选
  if (alertFilter.status.length > 0) {
    result = result.filter((event) => alertFilter.status.includes(event.status))
  }

  // 时间范围筛选
  if (alertFilter.timeRange !== 'all') {
    const now = new Date()
    const cutoffTime = (() => {
      switch (alertFilter.timeRange) {
        case 'today':
          return new Date(now.getTime() - 24 * 60 * 60 * 1000)
        case 'week':
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        case 'month':
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        default:
          return new Date(0)
      }
    })()

    result = result.filter(
      (event) => event.createdAt && new Date(event.createdAt) > cutoffTime
    )
  }

  // 翻译状态为中文
  return result.map(event => ({
    ...event,
    status: eventStatusMap[event.status] || event.status
  }))
})

// ========================= 统计数据 =========================

/**
 * 无人机状态统计
 */
const droneStats = computed(() => getDroneStats())

/**
 * 今日告警响应数（跟踪中预警 + 升级预警 + 今日事件）
 */
const todayAlertResponseCount = computed(() => {
  const trackingAlerts = alerts.value.filter(
    (a) => a.status === AlertStatus.Tracking || a.status === AlertStatus.Escalated
  ).length
  const todayEvents = events.value.filter((e) => {
    if (!e.createdAt) return false
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return new Date(e.createdAt) > oneDayAgo
  }).length
  return trackingAlerts + todayEvents
})

/**
 * 低电量无人机数量（<20%）
 */
const lowBatteryCount = computed(() => {
  return drones.value.filter((d) => d.telemetry.battery < 20).length
})

// ========================= 方法 =========================

/**
 * Phase 5.1: 统计卡片点击联动
 */
function onStatCardClick(type: string) {
  switch (type) {
    case 'status':
      // 点击"无人机状态"卡片 → 切换到无人机Tab，显示全部状态
      activeTab.value = 'drones'
      filters.uavStatus = 'all'
      droneFilter.sort = 'default'
      break

    case 'escort':
      // 点击"调度任务"卡片 → 切换到无人机Tab，筛选伴飞中
      activeTab.value = 'drones'
      filters.uavStatus = UavStatus.Escort
      droneFilter.sort = 'default'
      break

    case 'response':
      // 点击"今日告警响应"卡片 → 切换到预警与事件Tab，筛选今日
      activeTab.value = 'alerts'
      alertFilter.type = 'all'
      alertFilter.timeRange = 'today'
      alertFilter.status = []
      break

    case 'battery':
      // 点击"电量告警"卡片 → 切换到无人机Tab，按电量排序
      activeTab.value = 'drones'
      filters.uavStatus = 'all'
      droneFilter.sort = 'battery'
      break

    case 'completion':
      // 点击"任务完成率"卡片 → 切换到预警与事件Tab，显示今日
      activeTab.value = 'alerts'
      alertFilter.timeRange = 'today'
      break

    case 'flight':
      // 点击"今日飞行"卡片 → 切换到无人机Tab，显示在飞中
      activeTab.value = 'drones'
      filters.uavStatus = UavStatus.Flying
      droneFilter.sort = 'default'
      break

    default:
      console.log('未知卡片类型:', type)
  }
}

function onAlertDetail(id: string) {
  console.log('查看预警详情:', id)
  currentAlertId.value = id
  // 从数组查找对应的预警/事件
  const alertItem = [...alerts.value, ...events.value].find((item) => item.id === id)
  if (alertItem) {
    currentAlertTitle.value = alertItem.title
    currentAlert.value = alertItem
  }
  alertDetailVisible.value = true
}

function onCreateDispatch(id: string) {
  console.log('生成调度卡片:', id)
  currentAlertId.value = id
  // 从数组查找对应的预警
  const alert = alerts.value.find((item) => item.id === id)
  if (alert) {
    currentAlertTitle.value = alert.title
  }
  dispatchModalVisible.value = true
}

function onCloseAlertDetail() {
  alertDetailVisible.value = false
}

/**
 * Phase 5.3: 确认生成调度卡片
 */
async function onConfirmDispatch(formats: string[], pilot?: string) {
  if (!currentAlertId.value) return

  const alertItem = alerts.value.find((a) => a.id === currentAlertId.value)
  if (!alertItem) return

  const results: string[] = []

  // 获取当前登录用户信息（指挥员）
  // TODO: 从用户Store获取，这里先Mock
  const commander = {
    name: '张三',
    phone: '+86 13812345678'
  }

  // 处理各种格式
  if (formats.includes('text')) {
    // 纯文本格式 → 生成并复制到剪贴板
    const textCard = generateTextCard(alertItem, drones.value, commander)
    const success = await copyToClipboard(textCard)
    if (success) {
      results.push('✓ 纯文本已复制到剪贴板')
    } else {
      results.push('✗ 纯文本复制失败')
    }
  }

  if (formats.includes('image')) {
    // 图片格式 → 生成Canvas并下载PNG
    try {
      const imageBlob = await generateImageCard(alertItem, drones.value, commander)
      const filename = `调度卡片-${alertItem.id}-${Date.now()}.png`
      downloadImage(imageBlob, filename)
      results.push('✓ 图片已下载')
    } catch (error) {
      console.error('图片生成失败:', error)
      results.push('✗ 图片生成失败')
    }
  }

  if (formats.includes('system')) {
    // 系统任务格式 → 推送到飞手App（Phase 6实现）
    results.push(`✓ 已推送到飞手 ${pilot || '未指定'}（Phase 6实现）`)
  }

  // 更新预警状态为"核实中"（已派单）
  alertItem.status = AlertStatus.Verifying

  // 使用Ant Design Vue的message提示
  message.success({
    content: results.join('\n'),
    duration: 3
  })

  dispatchModalVisible.value = false
}

/**
 * Phase 5.2: 持续跟踪预警
 */
function onTrackAlert() {
  if (!currentAlertId.value) return

  const alert = alerts.value.find((a) => a.id === currentAlertId.value)
  if (alert) {
    alert.status = AlertStatus.Tracking
    message.success('已设为持续跟踪')
  }

  alertDetailVisible.value = false
}

/**
 * Phase 5.2: 打开关闭预警弹窗
 */
function onOpenCloseAlertModal() {
  closeAlertModalVisible.value = true
}

/**
 * Phase 5.2: 确认关闭预警
 */
function onCloseAlertConfirm(reason: string) {
  if (!currentAlertId.value) return

  const alert = alerts.value.find((a) => a.id === currentAlertId.value)
  if (alert) {
    alert.status = AlertStatus.Closed
    // TODO: Phase 6 保存关闭原因到后端
    console.log('预警关闭原因:', reason)
    message.success(`预警已关闭：${reason}`)
  }

  alertDetailVisible.value = false
  closeAlertModalVisible.value = false
}

/**
 * Phase 5.2: 升级预警为事件
 */
function onEscalateAlert() {
  if (!currentAlertId.value) return

  const alertItem = alerts.value.find((a) => a.id === currentAlertId.value)
  if (!alertItem) return

  // 打开升级弹窗
  currentAlertForEscalate.value = alertItem
  escalateModalVisible.value = true
}

/**
 * 确认升级为事件
 */
/**
 * Phase 5.3: 定位预警/事件
 * 触发地图上的脉冲效果，持续5秒
 */
function onLocateAlert(alertId: string) {
  // 触发脉冲效果
  pulsingAlertId.value = alertId

  // 5秒后取消脉冲
  setTimeout(() => {
    if (pulsingAlertId.value === alertId) {
      pulsingAlertId.value = undefined
    }
  }, 5000)

  message.success('已定位到地图')
}

/**
 * Phase 5.2: 升级预警为事件（确认）
 */
function onEscalateToEventConfirm(eventData: { title: string; level: string; description: string }) {
  if (!currentAlertId.value) return

  const alertItem = alerts.value.find((a) => a.id === currentAlertId.value)
  if (!alertItem) return

  // 更新预警状态为"已升级为事件"
  alertItem.status = AlertStatus.Escalated

  // 创建新的事件记录
  const newEvent = {
    id: `EVENT-${Date.now()}`,
    type: 'event' as const,
    level: eventData.level as any,
    title: eventData.title,
    time: new Date().toLocaleString('zh-CN'),
    status: 'pending' as any,
    source: alertItem.source,
    location: alertItem.location,
    coords: alertItem.coords,
    description: eventData.description,
    createdAt: new Date().toISOString(),
  }

  events.value.unshift(newEvent)

  message.success('预警已成功升级为事件')
  alertDetailVisible.value = false
}

/**
 * Phase 5.4: 无人机操作 - 定位
 */
/**
 * Phase 5.4: 无人机操作 - 定位
 */
function onDroneLocate(id: string) {
  const drone = drones.value.find((d) => d.id === id)
  if (drone && mapSimulatorRef.value) {
    // 调用MapSimulator的方法进入地图主画面模式
    mapSimulatorRef.value.openMapMode(drone)
  } else {
    message.warning('无人机位置信息不可用')
  }
}

/**
 * Phase 5.4: 无人机操作 - 视频
 */
/**
 * Phase 5.4: 无人机操作 - 视频
 */
function onDroneVideo(id: string) {
  const drone = drones.value.find((d) => d.id === id)
  if (drone && mapSimulatorRef.value) {
    // 调用MapSimulator的方法进入视频流模式
    mapSimulatorRef.value.openVideoMode(drone)
  }
}

/**
 * Phase 5.4: 无人机操作 - 详情
 */
function onDroneDetail(id: string) {
  const drone = drones.value.find((d) => d.id === id)
  if (drone) {
    currentDroneForDetail.value = drone
    droneDetailVisible.value = true
  }
}

/**
 * Phase 6.1: 视频墙 - 全屏播放
 */
function onVideoFullscreen(droneId: string) {
  const drone = drones.value.find((d) => d.id === droneId)
  if (drone && mapSimulatorRef.value) {
    // 进入视频主画面模式
    mapSimulatorRef.value.openVideoMode(drone)
  }
}

/**
 * Phase 6.2: 历史回放控制
 */
function onStartPlayback(params: any) {
  if (mapSimulatorRef.value) {
    mapSimulatorRef.value.startPlayback(
      params.droneId,
      params.startTime,
      params.endTime,
      params.speed
    )
  }
}

function onStopPlayback() {
  if (mapSimulatorRef.value) {
    mapSimulatorRef.value.stopPlayback()
  }
}

function onSeekPlayback(progress: number) {
  if (mapSimulatorRef.value) {
    mapSimulatorRef.value.seekPlayback(progress)
  }
}

function onSpeedChange(speed: number) {
  if (mapSimulatorRef.value) {
    mapSimulatorRef.value.changePlaybackSpeed(speed)
  }
}

// 预警详情点击（从列表和地图统一入口）
</script>

<style scoped lang="scss">
// ========================= 整体布局（两栏） =========================

.drone-command-center {
  display: flex;
  height: calc(100vh - var(--of-layout-header-height));
  background: var(--of-bg-body);
  overflow: hidden;
}

// ========================= 中央地图区域 =========================

.dcc-map-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--of-bg-body);
  display: flex;
  flex-direction: column;

  // 顶部筛选栏
  .map-filter-bar {
    height: 56px; // 增加高度以容纳上下布局
    background: var(--of-bg-card);
    border-bottom: var(--of-border-width) solid var(--of-border-table);
    padding: 0 var(--of-spacing-4);
    display: flex;
    align-items: center;
    gap: var(--of-spacing-4); // 筛选器之间间距
    flex-shrink: 0;

    .filter-item {
      display: flex;
      flex-direction: column; // Label在上，Select在下
      gap: 4px; // Label和Select的间距
      align-items: flex-start;

      .filter-label {
        font-size: 11px; // 略小的字号
        line-height: 14px; // 紧凑的行高
        color: var(--of-text-secondary);
        white-space: nowrap;
      }

      :deep(.ant-select) {
        font-size: var(--of-font-size-xs);
      }
    }
  }

  .map-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .map-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0a0e1a 0%, #1a2332 100%);
    color: var(--of-text-tertiary);

    .map-icon {
      font-size: 64px;
      margin-bottom: var(--of-spacing-4);
      opacity: 0.3;
    }

    .map-text {
      font-size: var(--of-font-size-lg);
      margin-bottom: var(--of-spacing-2);
      opacity: 0.6;
    }

    .map-hint {
      font-size: var(--of-font-size-xs);
      opacity: 0.4;
    }
  }

  // 图层控制器
  .layer-control {
    position: absolute;
    top: var(--of-spacing-4);
    right: var(--of-spacing-4);
    z-index: 100;

    .layer-toggle-btn {
      width: 40px;
      height: 40px;
      background: rgba(0, 0, 0, 0.6);
      border: none;
      border-radius: var(--of-radius-base);
      color: var(--of-text-primary);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      &:hover {
        background: rgba(0, 0, 0, 0.8);
      }
    }

    .layer-panel {
      position: absolute;
      top: 48px;
      right: 0;
      background: rgba(0, 0, 0, 0.85);
      border-radius: var(--of-radius-base);
      padding: var(--of-spacing-3);
      min-width: 160px;
      backdrop-filter: blur(8px);

      .layer-item {
        margin-bottom: var(--of-spacing-2);

        &:last-child {
          margin-bottom: 0;
        }

        :deep(.ant-checkbox-wrapper) {
          color: var(--of-text-primary);
          margin: 0;
        }
      }
    }
  }
}

// ========================= 右侧面板（加宽） =========================

.dcc-right-panel {
  width: 550px;
  flex-shrink: 0;
  background: var(--of-bg-card);
  border-left: var(--of-border-width) solid var(--of-border-table);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  // 统计卡片区域
  .stats-section {
    flex-shrink: 0;
    border-bottom: var(--of-border-width) solid var(--of-border-table);

    &.collapsed {
      .stats-cards {
        display: none;
      }
    }

    .stats-header {
      height: 40px;
      padding: 0 var(--of-spacing-4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--of-bg-row-hover);
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;

      &:hover {
        background: var(--of-bg-btn-default);
      }

      .stats-title {
        font-size: var(--of-font-size-xs);
        font-weight: var(--of-font-weight-medium);
        color: var(--of-text-secondary);
      }

      .collapse-icon {
        background: none;
        border: none;
        color: var(--of-text-tertiary);
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
      }
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--of-spacing-3);
      padding: var(--of-spacing-4);
    }

    .stat-card {
      background: var(--of-bg-body);
      border: var(--of-border-width) solid var(--of-border-table);
      border-radius: var(--of-radius-base);
      padding: var(--of-spacing-3);
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--of-color-primary);
        box-shadow: 0 2px 8px rgba(20, 129, 166, 0.15);
      }

      &.warning {
        border-color: var(--of-color-error);

        .stat-value {
          color: var(--of-color-error);
        }
      }

      .stat-header {
        font-size: var(--of-font-size-sm);
        color: var(--of-text-secondary);
        margin-bottom: var(--of-spacing-2);
      }

      .stat-value {
        font-size: 28px;
        font-weight: var(--of-font-weight-bold);
        color: var(--of-color-link);
        line-height: 1.2;

        .stat-unit {
          font-size: var(--of-font-size-sm);
          font-weight: var(--of-font-weight-normal);
          margin-left: 2px;
        }
      }

      .stat-visual {
        margin-bottom: var(--of-spacing-2);

        .status-bars {
          display: flex;
          height: 6px;
          border-radius: 3px;
          overflow: hidden;

          .status-bar {
            transition: width 0.3s;

            &.flying {
              background: #00d97e;
            }

            &.available {
              background: #0095ff;
            }

            &.unavailable {
              background: #ff4757;
            }
          }
        }
      }

      .stat-legend {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .legend-item {
          font-size: 12px;
          color: var(--of-text-tertiary);
          display: flex;
          align-items: center;
          gap: 4px;

          .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
            flex-shrink: 0;

            &.flying {
              background: #00d97e;
            }

            &.available {
              background: #0095ff;
            }

            &.unavailable {
              background: #ff4757;
            }
          }
        }
      }

      .stat-meta {
        margin-top: var(--of-spacing-1);
        font-size: var(--of-font-size-xs);
        color: var(--of-text-tertiary);
        display: flex;
        align-items: center;
        gap: var(--of-spacing-1);

        .meta-label {
          flex: 1;
        }

        .trend-up {
          color: var(--of-color-error);
        }
      }

      .stat-progress {
        margin: var(--of-spacing-2) 0;

        .circular-chart {
          width: 60px;
          height: 60px;
          display: block;
          margin: 0 auto;

          .circle-bg {
            fill: none;
            stroke: var(--of-bg-row-hover);
            stroke-width: 2.8;
          }

          .circle {
            fill: none;
            stroke: var(--of-color-link);
            stroke-width: 2.8;
            stroke-linecap: round;
            animation: progress 1s ease-out forwards;
          }

          .percentage {
            fill: var(--of-text-primary);
            font-size: 8px;
            font-weight: var(--of-font-weight-bold);
            text-anchor: middle;
          }
        }

        @keyframes progress {
          0% {
            stroke-dasharray: 0 100;
          }
        }
      }
    }
  }

  // Tab区域
  .tabs-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    isolation: isolate; // 创建新的层叠上下文，避免子元素影响外部

    .dcc-tabs {
      height: 100%;
      display: flex;
      flex-direction: column;

      :deep(.ant-tabs-nav) {
        margin: 0;
        padding: 0;
        background: transparent;
        flex-shrink: 0;

        // 隐藏下划线指示器
        .ant-tabs-ink-bar {
          display: none;
        }

        // Tab导航容器撑满
        .ant-tabs-nav-wrap {
          width: 100%;
          flex-shrink: 0;
        }

        .ant-tabs-nav-list {
          width: 100%;
          display: flex;
          gap: 0;

          .ant-tabs-tab {
            flex: 1;
            margin: 0 !important;
            padding: 0 !important;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            border: none !important;
            color: rgba(255, 255, 255, 0.6);
            font-size: var(--of-font-size-base);
            transition: none; // 完全移除过渡，避免抖动
            will-change: auto;

            &:hover {
              background: rgba(255, 255, 255, 0.08);
              color: rgba(255, 255, 255, 0.8);
            }

            &.ant-tabs-tab-active {
              background: rgba(255, 255, 255, 0.12);
              color: rgba(255, 255, 255, 0.95);
            }

            .ant-tabs-tab-btn {
              width: 100%;
              text-align: center;
              color: inherit;
              padding: 0;
            }
          }
        }
      }

      :deep(.ant-tabs-content-holder) {
        overflow: hidden;
        flex: 1;
      }

      :deep(.ant-tabs-content) {
        height: 100%;
      }

      :deep(.ant-tabs-tabpane) {
        height: 100%;
      }
    }

    .tab-content {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .tab-filters {
        padding: var(--of-spacing-3) var(--of-spacing-4);
        border-bottom: var(--of-border-width) solid var(--of-border-table);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: var(--of-spacing-3);
        flex-wrap: wrap;

        .filter-row {
          display: flex;
          align-items: center;
          gap: var(--of-spacing-3);
          flex-wrap: wrap;
        }
      }

      .list-area {
        flex: 1;
        overflow-y: auto;
        padding: var(--of-spacing-4);

        .list-section {
          margin-bottom: var(--of-spacing-3);

          &:last-child {
            margin-bottom: 0;
          }
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--of-text-tertiary);
        text-align: center;

        .empty-icon {
          font-size: 48px;
          margin-bottom: var(--of-spacing-3);
          opacity: 0.3;
        }

        p {
          margin: 0 0 var(--of-spacing-1);
          font-size: var(--of-font-size-base);
        }

        .empty-hint {
          font-size: var(--of-font-size-xs);
          opacity: 0.6;
        }
      }
    }
  }
}

// ========================= 响应式适配 =========================

// 1600px - 1920px 断点（右侧面板窄一些）
@media (max-width: 1920px) and (min-width: 1600px) {
  .dcc-right-panel {
    width: 480px;

    .stats-cards {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

// 超宽屏 (>2560px) —— 防止过度拉伸
@media (min-width: 2560px) {
  .drone-command-center {
    max-width: 2560px;
    margin: 0 auto;
  }

  .dcc-right-panel {
    width: 600px;
  }
}
</style>
