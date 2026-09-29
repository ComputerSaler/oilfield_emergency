<template>
  <PageContainer>
    <PanelCard mode="no-padding">
      <!-- WS 断线提示条 -->
      <div v-if="!wsConnected" class="ws-warning-bar" :class="{ severe: wsDisconnectDuration > 60 }">
        <WarningOutlined />
        <span v-if="wsDisconnectDuration <= 60">实时数据同步中断</span>
        <span v-else>与无人机系统连接中断，实时数据不可信</span>
        <span class="duration">已断开 {{ wsDisconnectDuration }}s</span>
      </div>

      <!-- 主体：左侧地图 + 右侧面板 -->
      <div class="monitor-container">
        <!-- 左侧：地图区域 -->
        <div class="map-area" :class="{ 'video-mode': videoMode }">
          <!-- 标准地图模式 -->
          <div v-show="!videoMode" class="map-wrapper">
            <div class="mock-map">
              <!-- 背景卫星图 -->
              <img src="/map-bg.png" class="map-bg" alt="地图底图" />

              <!-- 地理围栏图层 -->
              <template v-if="layerVisible.fence">
                <div
                  v-for="fence in mockFences"
                  :key="fence.id"
                  class="fence-overlay"
                  :style="fenceStyle(fence)"
                >
                  <div class="fence-label">{{ fence.name }}</div>
                </div>
              </template>

              <!-- 无人机图标 -->
              <template v-for="device in visibleDevices" :key="device.id">
                <div
                  class="uav-marker"
                  :class="[
                    `class-${device.uavClass}`,
                    `status-${device.flightStatus}`,
                    { highlight: highlightedDevices.includes(device.id) }
                  ]"
                  :style="markerStyle(device)"
                  @click="onMapMarkerClick(device)"
                >
                  <!-- 图标：使用真实无人机图片 -->
                  <div class="marker-icon" :style="{ transform: `rotate(${device.heading}deg)` }">
                    <img
                      src="/drone-icon.png"
                      alt="UAV"
                      class="drone-image"
                      :class="{
                        'flying': device.flightStatus === 'flying',
                        'standby': device.flightStatus === 'standby',
                        'offline': device.flightStatus === 'offline'
                      }"
                    />
                  </div>
                  <!-- 高亮呼吸灯效果 -->
                  <div v-if="highlightedDevices.includes(device.id)" class="marker-pulse"></div>
                </div>
              </template>

              <!-- 航迹线 -->
              <svg class="trail-layer" width="100%" height="100%">
                <polyline
                  v-for="(trail, deviceId) in trails"
                  :key="deviceId"
                  :points="trailPoints(trail)"
                  :stroke="getDevice(deviceId)?.uavClass === 'C' ? '#1677ff' : '#fa8c16'"
                  stroke-width="2"
                  fill="none"
                  opacity="0.5"
                />
              </svg>
            </div>

            <!-- 图层控制面板 -->
            <div class="layer-control" :class="{ expanded: layerPanelOpen }">
              <div class="layer-toggle-btn" @click="layerPanelOpen = !layerPanelOpen">
                <AppstoreOutlined />
              </div>
              <div v-show="layerPanelOpen" class="layer-panel">
                <div class="layer-item">
                  <a-checkbox v-model:checked="layerVisible.c">C类无人机</a-checkbox>
                </div>
                <div class="layer-item">
                  <a-checkbox v-model:checked="layerVisible.a">A类无人机</a-checkbox>
                </div>
                <div class="layer-item">
                  <a-checkbox v-model:checked="layerVisible.fence">地理围栏</a-checkbox>
                </div>
              </div>
            </div>
          </div>

          <!-- 全屏视频模式 -->
          <div v-show="videoMode" class="video-wrapper">
            <div class="video-container">
              <video
                ref="videoPlayer"
                class="video-player"
                :src="currentVideoUrl"
                autoplay
                controls
              ></video>
              <div v-if="videoError" class="video-error">
                <WarningOutlined />
                <p>{{ videoErrorMsg }}</p>
                <a-button @click="retryVideo">重试</a-button>
              </div>
            </div>

            <!-- 右上角小窗地图 -->
            <div class="mini-map">
              <div class="mock-map-mini">
                <img src="/map-bg.png" class="map-bg" alt="地图底图" />
                <div
                  v-for="device in visibleDevices"
                  :key="device.id"
                  class="uav-marker-mini"
                  :class="`class-${device.uavClass}`"
                  :style="markerStyle(device)"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：数据面板 -->
        <div class="data-panel">
          <a-tabs v-model:activeKey="activeTab" class="panel-tabs">
            <!-- Tab 1: 总览 -->
            <a-tab-pane key="overview" tab="总览">
              <div class="tab-content">
                <!-- A. 统计卡片区 -->
                <div class="stats-cards">
                  <div class="stat-card">
                    <div class="stat-value">{{ todayFlights }}</div>
                    <div class="stat-label">今日总架次</div>
                    <div class="stat-unit">架</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">{{ todayMileage.toFixed(1) }}</div>
                    <div class="stat-label">今日总里程</div>
                    <div class="stat-unit">km</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">{{ completionRate }}%</div>
                    <div class="stat-label">任务完成率</div>
                  </div>
                </div>

                <!-- B. 实时数据行 -->
                <div class="realtime-cards">
                  <div class="rt-card">
                    <div class="rt-label">在线设备</div>
                    <div class="rt-value">{{ onlineCount }}</div>
                  </div>
                  <div class="rt-card">
                    <div class="rt-label">飞行中</div>
                    <div class="rt-value flying">{{ flyingCount }}</div>
                  </div>
                  <div class="rt-card">
                    <div class="rt-label">今日告警</div>
                    <div class="rt-value alarm">{{ todayAlarms }}</div>
                  </div>
                </div>

                <!-- C. 当前任务列表 -->
                <div class="section">
                  <div class="section-header">
                    <span>当前任务 ({{ currentTasks.length }})</span>
                  </div>
                  <div class="task-list">
                    <div
                      v-for="task in currentTasks"
                      :key="task.id"
                      class="task-card"
                      @click="onTaskCardClick(task)"
                    >
                      <div class="task-header">
                        <span class="task-id">{{ task.taskId }}</span>
                        <a-button type="link" size="small">查看详情 ›</a-button>
                      </div>
                      <div class="task-row">
                        <span>无人机：{{ task.uavName }}</span>
                        <span class="task-progress">{{ task.progress }}%</span>
                      </div>
                      <div class="task-row">
                        <span class="task-label">计划时间：</span>
                        <span>{{ task.planTime }}</span>
                      </div>
                      <div class="task-row">
                        <span class="task-label">计划里程：</span>
                        <span>{{ task.planMileage }}km</span>
                        <span class="task-label">预计：</span>
                        <span>{{ task.estimatedDuration }}min</span>
                      </div>
                      <div class="task-row">
                        <span class="task-label">实际时间：</span>
                        <span>{{ task.actualTime }}</span>
                      </div>
                      <div class="task-row">
                        <span class="task-label">实际里程：</span>
                        <span>{{ task.actualMileage }}km</span>
                        <span class="task-label">实际：</span>
                        <span>{{ task.actualDuration }}min</span>
                      </div>
                    </div>
                    <div v-if="currentTasks.length === 0" class="empty-state">暂无执行中任务</div>
                  </div>
                </div>

                <!-- D. 任务执行趋势 -->
                <div class="section collapsible">
                  <div class="section-header">
                    <span>任务执行趋势</span>
                    <a-select v-model:value="trendRange" size="small" style="width: 100px">
                      <a-select-option value="7d">过去7天</a-select-option>
                      <a-select-option value="30d">过去30天</a-select-option>
                    </a-select>
                  </div>
                  <div class="chart-container">
                    <div class="mock-chart">
                      <svg width="100%" height="150" viewBox="0 0 300 150">
                        <polyline
                          :points="trendChartPoints"
                          fill="none"
                          stroke="#1677ff"
                          stroke-width="2"
                        />
                        <text v-for="(v, i) in mockTrendData" :key="i"
                          :x="i * 42 + 10" :y="145" font-size="10" fill="#999">
                          {{ v.date }}
                        </text>
                      </svg>
                    </div>
                  </div>
                </div>

                <!-- E. 飞行架次排名 -->
                <div class="section collapsible">
                  <div class="section-header">
                    <span>飞行架次排名</span>
                    <a-select v-model:value="rankRange" size="small" style="width: 100px">
                      <a-select-option value="7d">过去7天</a-select-option>
                      <a-select-option value="30d">过去30天</a-select-option>
                    </a-select>
                  </div>
                  <div class="ranking-table">
                    <div v-for="(item, index) in mockRankingData" :key="index" class="rank-row">
                      <span class="rank-num">{{ index + 1 }}</span>
                      <span class="rank-name">{{ item.uavName }}</span>
                      <span class="rank-count">{{ item.flightCount }}次</span>
                    </div>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <!-- Tab 2: 无人机 -->
            <a-tab-pane key="uav" tab="无人机">
              <div class="tab-content">
                <!-- 选中设备预览卡 -->
                <div v-if="selectedDevice" class="device-preview">
                  <div class="preview-icon">
                    <component :is="selectedDevice.uavClass === 'C' ? 'drone-c-icon' : 'drone-a-icon'" />
                  </div>
                  <div class="preview-info">
                    <div class="preview-name">
                      <span class="status-dot" :class="`status-${selectedDevice.flightStatus}`"></span>
                      {{ selectedDevice.name }}
                    </div>
                    <div class="preview-battery">电量 {{ selectedDevice.battery }}%</div>
                    <div v-if="selectedDevice.currentTask" class="preview-task">
                      <div class="task-name">任务：{{ selectedDevice.currentTask }}</div>
                      <div class="task-progress-bar">
                        <div class="progress-fill" :style="{ width: `${selectedDevice.taskProgress || 0}%` }"></div>
                      </div>
                      <div class="task-progress-text">进度：{{ selectedDevice.taskProgress || 0 }}%</div>
                    </div>
                  </div>
                </div>

                <!-- 搜索框 -->
                <div class="device-search">
                  <a-input
                    v-model:value="deviceSearchTerm"
                    placeholder="搜索设备名称或 SN"
                    :prefix="h(SearchOutlined)"
                  />
                </div>

                <!-- 设备列表 -->
                <div class="device-list">
                  <!-- C类无人机组 -->
                  <div class="device-group">
                    <div class="group-header" @click="groupExpanded.c = !groupExpanded.c">
                      <span>{{ groupExpanded.c ? '▼' : '▶' }} C类无人机</span>
                      <span class="group-badge">{{ cFlyingCount }}/{{ cTotal }}</span>
                    </div>
                    <div v-show="groupExpanded.c" class="group-content">
                      <div
                        v-for="device in filteredCDevices"
                        :key="device.id"
                        class="device-item"
                        :class="{ active: selectedDevice?.id === device.id }"
                        @click="onDeviceItemClick(device)"
                      >
                        <span class="status-dot" :class="`status-${device.flightStatus}`"></span>
                        <span class="device-name">{{ device.name }}</span>
                        <span class="device-sn">{{ device.sn }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- A类无人机组 -->
                  <div class="device-group">
                    <div class="group-header" @click="groupExpanded.a = !groupExpanded.a">
                      <span>{{ groupExpanded.a ? '▼' : '▶' }} A类无人机</span>
                      <span class="group-badge">{{ aFlyingCount }}/{{ aTotal }}</span>
                    </div>
                    <div v-show="groupExpanded.a" class="group-content">
                      <div
                        v-for="device in filteredADevices"
                        :key="device.id"
                        class="device-item"
                        :class="{ active: selectedDevice?.id === device.id }"
                        @click="onDeviceItemClick(device)"
                      >
                        <span class="status-dot" :class="`status-${device.flightStatus}`"></span>
                        <span class="device-name">{{ device.name }}</span>
                        <span class="device-sn">{{ device.sn }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <!-- Tab 3: 告警 -->
            <a-tab-pane key="alarm" tab="告警">
              <div class="tab-content">
                <!-- 告警统计可视化 -->
                <div class="alarm-charts">
                  <!-- 告警级别饼图 -->
                  <div class="chart-box">
                    <div class="chart-title">告警级别分布</div>
                    <svg width="150" height="150" viewBox="0 0 150 150">
                      <circle cx="75" cy="75" r="60" fill="#52c41a" opacity="0.3" />
                      <circle cx="75" cy="75" r="40" fill="#faad14" opacity="0.3" />
                      <circle cx="75" cy="75" r="20" fill="#ff4d4f" opacity="0.3" />
                    </svg>
                    <div class="chart-legend">
                      <div class="legend-item"><span class="dot low"></span>低 (12)</div>
                      <div class="legend-item"><span class="dot medium"></span>中 (5)</div>
                      <div class="legend-item"><span class="dot high"></span>高 (2)</div>
                    </div>
                  </div>

                  <!-- 告警类型柱图 -->
                  <div class="chart-box">
                    <div class="chart-title">告警类型统计</div>
                    <svg width="150" height="120" viewBox="0 0 150 120">
                      <rect x="20" y="40" width="50" height="80" fill="#1677ff" opacity="0.6" />
                      <rect x="80" y="60" width="50" height="60" fill="#1677ff" opacity="0.6" />
                      <text x="45" y="135" font-size="12" fill="#666" text-anchor="middle">标记</text>
                      <text x="105" y="135" font-size="12" fill="#666" text-anchor="middle">探测</text>
                    </svg>
                  </div>
                </div>

                <!-- 告警列表 -->
                <div class="alarm-list">
                  <div v-for="alarm in mockAlarms" :key="alarm.id" class="alarm-item" @click="onAlarmClick(alarm)">
                    <div class="alarm-icon" :class="`level-${alarm.level}`">
                      <WarningOutlined />
                    </div>
                    <div class="alarm-content">
                      <div class="alarm-header">
                        <span class="alarm-uav">{{ alarm.uavSn }}</span>
                        <span class="alarm-type">{{ alarm.eventType }}</span>
                        <span class="alarm-time">{{ alarm.time }}</span>
                      </div>
                      <div class="alarm-desc">{{ alarm.desc }}</div>
                      <div class="alarm-target">目标：{{ alarm.targetType }}</div>
                    </div>
                  </div>
                  <div v-if="mockAlarms.length === 0" class="empty-state">暂无告警记录</div>
                </div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>

      <!-- Tooltip 弹窗 -->
      <div
        v-if="tooltipDevice"
        class="uav-tooltip"
        :style="tooltipStyle"
      >
        <div class="tooltip-header">
          <span>{{ tooltipDevice.name }}</span>
          <CloseOutlined class="tooltip-close" @click="closeTooltip" />
        </div>
        <div class="tooltip-body">
          <div v-if="tooltipDevice.flightStatus === 'flying'" class="tooltip-fields">
            <div class="tooltip-row">
              <span class="label">开始飞行：</span>
              <span class="value">{{ tooltipDevice.startTime || '--' }}</span>
            </div>
            <div class="tooltip-row">
              <span class="label">已飞时长：</span>
              <span class="value">{{ formatFlightDuration(tooltipDevice) }}</span>
            </div>
            <div class="tooltip-row">
              <span class="label">GPS高度：</span>
              <span class="value">{{ tooltipDevice.altitude }} m</span>
            </div>
            <div class="tooltip-row">
              <span class="label">已飞里程：</span>
              <span class="value">{{ tooltipDevice.mileage || 0 }} km</span>
            </div>
            <div v-if="tooltipDevice.d2d" class="tooltip-row">
              <span class="label">剩余距离：</span>
              <span class="value">{{ tooltipDevice.d2d }} km</span>
            </div>
            <div class="tooltip-row">
              <span class="label">剩余电量：</span>
              <span class="value">
                {{ tooltipDevice.battery }}%
                <div class="battery-bar" :class="{ low: tooltipDevice.battery <= 20 }">
                  <div class="battery-fill" :style="{ width: `${tooltipDevice.battery}%` }"></div>
                </div>
              </span>
            </div>
            <div class="tooltip-row">
              <span class="label">更新时间：</span>
              <span class="value">{{ tooltipDevice.lastUpdate || '--' }}</span>
            </div>
          </div>
          <div v-else class="tooltip-status">
            <div class="status-badge">{{ tooltipDevice.flightStatus === 'offline' ? '离线' : '地面待机' }}</div>
            <p>设备{{ tooltipDevice.flightStatus === 'offline' ? '已离线' : '未飞行' }}</p>
          </div>
        </div>
        <div class="tooltip-actions">
          <a-button
            size="small"
            :disabled="tooltipDevice.flightStatus !== 'flying'"
            @click="enterVideoMode(tooltipDevice)"
          >
            全屏视频
          </a-button>
          <a-button size="small" :disabled="!tooltipDevice.hasRoute">
            查询航线
          </a-button>
        </div>
      </div>

      <!-- 全屏视频模式：返回按钮 -->
      <div v-if="videoMode" class="video-controls">
        <a-button size="large" @click="exitVideoMode">
          ← 返回地图视图
        </a-button>
      </div>
    </PanelCard>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 无人机实时监控 V2.0 —— 实时监控中心 PC端
 * PRD: 实时监控中心 · 无人机实时监控 V2.0
 *
 * 核心转变：从"设备列表 + 单设备详情" → "任务态势感知 + 多维度统计"
 * 布局：地图占满左侧 + 右侧 3Tab 数据面板（360px 固定）
 * WS 模拟：飞行中无人机每 1s 更新位置 + 航迹线延展
 */
import { computed, h, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  CloseOutlined,
  SearchOutlined,
  WarningOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue'

// ========================= 类型定义 =========================

interface UavDevice {
  id: string
  name: string
  sn: string
  uavClass: 'C' | 'A'
  flightStatus: 'flying' | 'standby' | 'offline'
  lat: number
  lng: number
  altitude: number
  speed: number
  heading: number // 0-360度
  battery: number // 0-100
  mileage?: number // 已飞里程 km
  d2d?: number // 剩余距离 km (仅A类)
  startTime?: string
  lastUpdate?: string
  currentTask?: string
  taskProgress?: number
  hasRoute?: boolean
}

interface Task {
  id: string
  taskId: string
  uavName: string
  progress: number
  planTime: string
  planMileage: number
  estimatedDuration: number
  actualTime: string
  actualMileage: number
  actualDuration: number
  uavIds: string[] // 关联的无人机ID
}

interface Alarm {
  id: string
  level: 'low' | 'medium' | 'high'
  uavSn: string
  eventType: string
  name: string
  desc: string
  time: string
  targetType: string
  latitude: number
  longitude: number
}

interface Fence {
  id: string
  name: string
  type: 'camp' | 'restricted'
  latMin: number
  latMax: number
  lngMin: number
  lngMax: number
}

// ========================= Mock 数据 =========================

const mockDevices = reactive<UavDevice[]>([
  {
    id: 'c1',
    name: 'DJI-01',
    sn: 'PS01D1',
    uavClass: 'C',
    flightStatus: 'flying',
    lat: 16.95,
    lng: 13.65,
    altitude: 120,
    speed: 15,
    heading: 45,
    battery: 85,
    mileage: 35.894,
    startTime: '2026-08-18 08:30:00',
    lastUpdate: '2026-08-18 10:45:32',
    currentTask: 'Task-#71',
    taskProgress: 14,
    hasRoute: true,
  },
  {
    id: 'c2',
    name: 'DJI-02',
    sn: 'PS02D1',
    uavClass: 'C',
    flightStatus: 'standby',
    lat: 16.88,
    lng: 13.58,
    altitude: 0,
    speed: 0,
    heading: 0,
    battery: 100,
    hasRoute: false,
  },
  {
    id: 'c3',
    name: 'DJI-03',
    sn: 'PS03D1',
    uavClass: 'C',
    flightStatus: 'flying',
    lat: 17.05,
    lng: 13.75,
    altitude: 95,
    speed: 12,
    heading: 120,
    battery: 62,
    mileage: 48.256,
    startTime: '2026-08-18 07:15:00',
    lastUpdate: '2026-08-18 10:45:31',
    currentTask: 'Task-#92',
    taskProgress: 28,
    hasRoute: true,
  },
  {
    id: 'a1',
    name: 'UAV-01',
    sn: 'P506D1',
    uavClass: 'A',
    flightStatus: 'flying',
    lat: 17.15,
    lng: 13.50,
    altitude: 450,
    speed: 25,
    heading: 280,
    battery: 79,
    mileage: 158.807,
    d2d: 150.2,
    startTime: '2026-08-18 06:00:00',
    lastUpdate: '2026-08-18 10:45:33',
    currentTask: 'P506D1-Task-1982',
    taskProgress: 13,
    hasRoute: true,
  },
  {
    id: 'a2',
    name: 'UAV-02',
    sn: 'P507D1',
    uavClass: 'A',
    flightStatus: 'standby',
    lat: 16.92,
    lng: 13.62,
    altitude: 0,
    speed: 0,
    heading: 0,
    battery: 95,
    hasRoute: false,
  },
  {
    id: 'c4',
    name: 'DJI-04',
    sn: 'PS04D1',
    uavClass: 'C',
    flightStatus: 'offline',
    lat: 16.85,
    lng: 13.55,
    altitude: 0,
    speed: 0,
    heading: 0,
    battery: 45,
    hasRoute: false,
  },
])

const mockTasks = reactive<Task[]>([
  {
    id: 't1',
    taskId: 'Task-#71',
    uavName: 'PS01D1',
    progress: 14,
    planTime: '07-22 00:29',
    planMileage: 219.546,
    estimatedDuration: 152.22,
    actualTime: '07-22 00:29',
    actualMileage: 158.807,
    actualDuration: 99.80,
    uavIds: ['c1'],
  },
  {
    id: 't2',
    taskId: 'Task-#92',
    uavName: 'PS03D1',
    progress: 28,
    planTime: '08-18 07:00',
    planMileage: 185.234,
    estimatedDuration: 120.5,
    actualTime: '08-18 07:15',
    actualMileage: 48.256,
    actualDuration: 45.3,
    uavIds: ['c3'],
  },
  {
    id: 't3',
    taskId: 'P506D1-Task-1982',
    uavName: 'P506D1',
    progress: 13,
    planTime: '08-18 06:00',
    planMileage: 309.0,
    estimatedDuration: 240.0,
    actualTime: '08-18 06:00',
    actualMileage: 158.807,
    actualDuration: 285.0,
    uavIds: ['a1'],
  },
])

const mockAlarms = reactive<Alarm[]>([
  {
    id: 'a1',
    level: 'high',
    uavSn: 'PS01D1',
    eventType: '探测',
    name: '可疑目标',
    desc: '发现未识别车辆靠近油井',
    time: '08-18 10:32',
    targetType: '未知',
    latitude: 16.95,
    longitude: 13.65,
  },
  {
    id: 'a2',
    level: 'medium',
    uavSn: 'P506D1',
    eventType: '标记',
    name: '标记点',
    desc: '标记疑似管道泄漏点',
    time: '08-18 09:15',
    targetType: '普通',
    latitude: 17.15,
    longitude: 13.50,
  },
])

const mockFences: Fence[] = [
  {
    id: 'f1',
    name: 'Agadem 营地',
    type: 'camp',
    latMin: 16.85,
    latMax: 16.95,
    lngMin: 13.55,
    lngMax: 13.68,
  },
  {
    id: 'f2',
    name: '禁飞区 A',
    type: 'restricted',
    latMin: 17.10,
    latMax: 17.20,
    lngMin: 13.45,
    lngMax: 13.55,
  },
]

const mockTrendData = [
  { date: '08-12', flights: 28 },
  { date: '08-13', flights: 35 },
  { date: '08-14', flights: 32 },
  { date: '08-15', flights: 40 },
  { date: '08-16', flights: 38 },
  { date: '08-17', flights: 25 },
  { date: '08-18', flights: 30 },
]

const mockRankingData = [
  { uavName: 'PS01D1', flightCount: 40 },
  { uavName: 'P506D1', flightCount: 38 },
  { uavName: 'PS03D1', flightCount: 35 },
  { uavName: 'PS02D1', flightCount: 28 },
  { uavName: 'P507D1', flightCount: 25 },
  { uavName: 'PS04D1', flightCount: 22 },
  { uavName: 'PS05D1', flightCount: 20 },
  { uavName: 'PS06D1', flightCount: 18 },
]

// ========================= 状态管理 =========================

const activeTab = ref('overview')
const layerVisible = reactive({ c: true, a: true, fence: true })
const layerPanelOpen = ref(false)
const deviceSearchTerm = ref('')
const groupExpanded = reactive({ c: true, a: true })
const trendRange = ref('7d')
const rankRange = ref('7d')

// 选中设备
const selectedDevice = ref<UavDevice | null>(mockDevices.find(d => d.flightStatus === 'flying') || mockDevices[0])

// Tooltip
const tooltipDevice = ref<UavDevice | null>(null)
const tooltipPosition = reactive({ x: 0, y: 0 })

// 高亮设备列表（任务卡片点击后）
const highlightedDevices = ref<string[]>([])

// 全屏视频模式
const videoMode = ref(false)
const currentVideoUrl = ref('')
const videoError = ref(false)
const videoErrorMsg = ref('')
const videoPlayer = ref<HTMLVideoElement | null>(null)

// WS 连接状态
const wsConnected = ref(true)
const wsDisconnectDuration = ref(0)

// 航迹线
const trails = reactive<Map<string, [number, number][]>>(new Map())

// ========================= 计算属性 =========================

const visibleDevices = computed(() => {
  return mockDevices.filter(d => {
    if (d.uavClass === 'C' && !layerVisible.c) return false
    if (d.uavClass === 'A' && !layerVisible.a) return false
    return true
  })
})

const filteredCDevices = computed(() => {
  return mockDevices.filter(d =>
    d.uavClass === 'C' &&
    (d.name.toLowerCase().includes(deviceSearchTerm.value.toLowerCase()) ||
      d.sn.toLowerCase().includes(deviceSearchTerm.value.toLowerCase()))
  )
})

const filteredADevices = computed(() => {
  return mockDevices.filter(d =>
    d.uavClass === 'A' &&
    (d.name.toLowerCase().includes(deviceSearchTerm.value.toLowerCase()) ||
      d.sn.toLowerCase().includes(deviceSearchTerm.value.toLowerCase()))
  )
})

const cFlyingCount = computed(() => mockDevices.filter(d => d.uavClass === 'C' && d.flightStatus === 'flying').length)
const aFlyingCount = computed(() => mockDevices.filter(d => d.uavClass === 'A' && d.flightStatus === 'flying').length)
const cTotal = computed(() => mockDevices.filter(d => d.uavClass === 'C').length)
const aTotal = computed(() => mockDevices.filter(d => d.uavClass === 'A').length)

const currentTasks = computed(() => mockTasks.filter(t => t.progress < 100))

// 统计卡片数据
const todayFlights = computed(() => mockTasks.length + 7) // Mock
const todayMileage = computed(() => mockTasks.reduce((sum, t) => sum + t.actualMileage, 0) + 142.5) // Mock
const completionRate = computed(() => {
  const completed = mockTasks.filter(t => t.progress === 100).length
  return mockTasks.length > 0 ? Math.round((completed / mockTasks.length) * 100) : 100
})

const onlineCount = computed(() => mockDevices.filter(d => d.flightStatus !== 'offline').length)
const flyingCount = computed(() => mockDevices.filter(d => d.flightStatus === 'flying').length)
const todayAlarms = computed(() => mockAlarms.length + 17) // Mock

const tooltipStyle = computed(() => {
  if (!tooltipDevice.value) return {}
  return {
    left: `${tooltipPosition.x}px`,
    top: `${tooltipPosition.y}px`,
  }
})

const trendChartPoints = computed(() => {
  return mockTrendData.map((d, i) => {
    const x = i * 42 + 10
    const y = 120 - (d.flights / 40) * 100
    return `${x},${y}`
  }).join(' ')
})

// ========================= 方法 =========================

function getDevice(id: string): UavDevice | undefined {
  return mockDevices.find(d => d.id === id)
}

// 地图坐标转换
const MAP_BOUNDS = { latMin: 16.60, latMax: 17.40, lngMin: 13.32, lngMax: 14.10 }

function toMapXY(lat: number, lng: number) {
  const x = ((lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)) * 100
  const y = (1 - (lat - MAP_BOUNDS.latMin) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * 100
  return { x, y }
}

function markerStyle(device: UavDevice) {
  const { x, y } = toMapXY(device.lat, device.lng)
  return {
    left: `${x}%`,
    top: `${y}%`,
  }
}

function fenceStyle(fence: Fence) {
  const topLeft = toMapXY(fence.latMax, fence.lngMin)
  const bottomRight = toMapXY(fence.latMin, fence.lngMax)
  return {
    left: `${topLeft.x}%`,
    top: `${topLeft.y}%`,
    width: `${bottomRight.x - topLeft.x}%`,
    height: `${bottomRight.y - topLeft.y}%`,
  }
}

function trailPoints(trail: [number, number][]) {
  return trail.map(([lat, lng]) => {
    const { x, y } = toMapXY(lat, lng)
    return `${x},${y}`
  }).join(' ')
}

// 交互事件
function onMapMarkerClick(device: UavDevice) {
  const { x, y } = toMapXY(device.lat, device.lng)
  tooltipPosition.x = (x / 100) * window.innerWidth
  tooltipPosition.y = (y / 100) * window.innerHeight - 50
  tooltipDevice.value = device
  selectedDevice.value = device
}

function closeTooltip() {
  tooltipDevice.value = null
}

function onDeviceItemClick(device: UavDevice) {
  selectedDevice.value = device
  onMapMarkerClick(device)
  activeTab.value = 'uav'
}

function onTaskCardClick(task: Task) {
  highlightedDevices.value = task.uavIds
  activeTab.value = 'uav'
  setTimeout(() => {
    highlightedDevices.value = []
  }, 3000)
}

function onAlarmClick(alarm: Alarm) {
  // 定位到告警坐标
  const device = mockDevices.find(d => d.sn === alarm.uavSn)
  if (device) {
    onMapMarkerClick(device)
  }
}

function enterVideoMode(device: UavDevice) {
  currentVideoUrl.value = `https://mock-video-stream.com/${device.sn}.m3u8`
  videoMode.value = true
  closeTooltip()
}

function exitVideoMode() {
  videoMode.value = false
  videoError.value = false
  currentVideoUrl.value = ''
}

function retryVideo() {
  videoError.value = false
  if (videoPlayer.value) {
    videoPlayer.value.load()
  }
}

function formatFlightDuration(device: UavDevice) {
  if (!device.startTime) return '--'
  const start = new Date(device.startTime).getTime()
  const now = Date.now()
  const diffMs = now - start
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  const seconds = Math.floor((diffMs % 60000) / 1000)
  return `${hours}h ${minutes}m ${seconds}s`
}

// 航迹线管理
function addTrailPoint(id: string, lat: number, lng: number) {
  if (!trails.has(id)) trails.set(id, [])
  const pts = trails.get(id)!
  pts.push([lat, lng])
  if (pts.length > 50) pts.shift()
}

// 初始化飞行中设备航迹
mockDevices.filter(d => d.flightStatus === 'flying').forEach(d => {
  trails.set(d.id, [[d.lat, d.lng]])
})

// ========================= WS 模拟 =========================

let wsTimer: ReturnType<typeof setInterval> | null = null
let wsDisconnectTimer: ReturnType<typeof setInterval> | null = null

function simulateWsTick() {
  if (!wsConnected.value) return

  mockDevices.forEach(d => {
    if (d.flightStatus !== 'flying') return

    // 位置微移
    const dlat = (Math.random() - 0.5) * 0.002
    const dlng = (Math.random() - 0.5) * 0.002
    d.lat = Math.round((d.lat + dlat) * 1e6) / 1e6
    d.lng = Math.round((d.lng + dlng) * 1e6) / 1e6

    // 航向偏转
    d.heading = (d.heading + Math.round((Math.random() - 0.5) * 10) + 360) % 360

    // 电量消耗
    if (d.battery > 1) d.battery = Math.max(0, d.battery - 0.1)

    // 高度/速度波动
    d.altitude = Math.max(50, d.altitude + Math.round((Math.random() - 0.5) * 5))
    d.speed = Math.max(3, Math.min(30, d.speed + Math.round((Math.random() - 0.5) * 2)))

    // 航迹点
    addTrailPoint(d.id, d.lat, d.lng)

    // 更新时间
    d.lastUpdate = new Date().toLocaleString('zh-CN', { hour12: false })

    // 任务进度
    if (d.taskProgress !== undefined && d.taskProgress < 100) {
      if (Math.random() < 0.05) d.taskProgress = Math.min(100, d.taskProgress + 1)
    }
  })
}

function startWsSimulation() {
  wsTimer = setInterval(simulateWsTick, 1000)
}

function stopWsSimulation() {
  if (wsTimer) clearInterval(wsTimer)
}

// ========================= 生命周期 =========================

onMounted(() => {
  startWsSimulation()
})

onBeforeUnmount(() => {
  stopWsSimulation()
  if (wsDisconnectTimer) clearInterval(wsDisconnectTimer)
})
</script>

<style scoped lang="less">
// ========================= 基础布局 =========================

.ws-warning-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fffbe6;
  border-bottom: 1px solid #ffe58f;
  color: #faad14;
  font-size: 14px;

  &.severe {
    background: #fff1f0;
    border-bottom-color: #ffa39e;
    color: #ff4d4f;
  }

  .duration {
    margin-left: auto;
    font-size: 12px;
    opacity: 0.8;
  }
}

.monitor-container {
  display: flex;
  height: calc(100vh - 112px);
  background: var(--of-panel-bg);
}

// ========================= 左侧地图区域 =========================

.map-area {
  flex: 1;
  position: relative;
  overflow: hidden;

  &.video-mode {
    display: flex;
    flex-direction: column;
  }
}

.map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.mock-map {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

// 地理围栏
.fence-overlay {
  position: absolute;
  border: 2px dashed rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
  pointer-events: none;

  .fence-label {
    position: absolute;
    top: 4px;
    left: 8px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 2px;
  }
}

// 无人机图标
.uav-marker {
  position: absolute;
  width: 48px;
  height: 48px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
    z-index: 20;
  }

  &.highlight {
    z-index: 15;
  }

  .marker-icon {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;

    .drone-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      transition: all 0.3s ease;

      &.flying {
        opacity: 1;
        filter: drop-shadow(0 2px 8px rgba(22, 119, 255, 0.6));
      }

      &.standby {
        opacity: 0.6;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)) grayscale(0.5);
      }

      &.offline {
        opacity: 0.3;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)) grayscale(1);
      }
    }
  }
}

.marker-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #1677ff;
  transform: translate(-50%, -50%);
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
}

// 航迹线
.trail-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 5;
}

// 图层控制
.layer-control {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
}

.layer-toggle-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
}

.layer-panel {
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  padding: 12px;
  min-width: 140px;

  .layer-item {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    :deep(.ant-checkbox-wrapper) {
      color: #fff;
    }
  }
}

// ========================= 全屏视频模式 =========================

.video-wrapper {
  flex: 1;
  position: relative;
  display: flex;
}

.video-container {
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-error {
  text-align: center;
  color: #fff;

  p {
    margin: 16px 0;
  }
}

.mini-map {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 200px;
  height: 150px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
  background: #000;
  z-index: 10;
}

.mock-map-mini {
  width: 100%;
  height: 100%;
  position: relative;

  .map-bg {
    opacity: 0.6;
  }
}

.uav-marker-mini {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);

  &.class-C {
    background: #1677ff;
  }

  &.class-A {
    background: #fa8c16;
  }
}

.video-controls {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

// ========================= 右侧数据面板 =========================

.data-panel {
  width: 360px;
  flex-shrink: 0;
  border-left: 1px solid var(--of-border);
  background: var(--of-card-bg);
  display: flex;
  flex-direction: column;
}

.panel-tabs {
  height: 100%;

  :deep(.ant-tabs-nav) {
    margin: 0;
    padding: 0 16px;
    background: var(--of-panel-bg);
  }

  :deep(.ant-tabs-content) {
    height: calc(100% - 46px);
  }

  :deep(.ant-tabs-tabpane) {
    height: 100%;
  }
}

.tab-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
}

// ========================= Tab1: 总览 =========================

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--of-panel-bg);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--of-border);

  .stat-value {
    font-size: 28px;
    font-weight: 600;
    color: var(--of-text-primary);
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: var(--of-text-secondary);
    margin-bottom: 2px;
  }

  .stat-unit {
    font-size: 12px;
    color: var(--of-text-tertiary);
  }
}

.realtime-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.rt-card {
  background: var(--of-panel-bg);
  padding: 12px;
  border-radius: 4px;
  border: 1px solid var(--of-border);

  .rt-label {
    font-size: 12px;
    color: var(--of-text-secondary);
    margin-bottom: 4px;
  }

  .rt-value {
    font-size: 20px;
    font-weight: 600;
    color: var(--of-text-primary);

    &.flying {
      color: #1677ff;
    }

    &.alarm {
      color: #ff4d4f;
    }
  }
}

// 区块
.section {
  margin-bottom: 16px;
  background: var(--of-panel-bg);
  border: 1px solid var(--of-border);
  border-radius: 4px;
  overflow: hidden;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--of-row-bg);
    border-bottom: 1px solid var(--of-border);
    font-weight: 500;
    font-size: 14px;
    color: var(--of-text-primary);
  }
}

// 任务列表
.task-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
}

.task-card {
  background: var(--of-card-bg);
  border: 1px solid var(--of-border);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--of-primary);
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.1);
  }

  &:last-child {
    margin-bottom: 0;
  }

  .task-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .task-id {
      font-weight: 500;
      color: var(--of-text-primary);
    }
  }

  .task-row {
    font-size: 12px;
    color: var(--of-text-secondary);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .task-label {
      color: var(--of-text-tertiary);
    }

    .task-progress {
      margin-left: auto;
      color: var(--of-primary);
      font-weight: 500;
    }
  }
}

// 图表容器
.chart-container {
  padding: 12px;
}

.mock-chart {
  width: 100%;
}

.ranking-table {
  padding: 12px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-bottom: 1px solid var(--of-border);

  &:last-child {
    border-bottom: none;
  }

  .rank-num {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--of-primary);
    color: #fff;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .rank-name {
    flex: 1;
    font-size: 13px;
    color: var(--of-text-primary);
  }

  .rank-count {
    font-size: 13px;
    font-weight: 500;
    color: var(--of-text-secondary);
  }
}

// ========================= Tab2: 无人机 =========================

.device-preview {
  background: var(--of-panel-bg);
  border: 1px solid var(--of-border);
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 16px;

  .preview-icon {
    width: 60px;
    height: 60px;
    background: var(--of-row-bg);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .preview-info {
    flex: 1;
  }

  .preview-name {
    font-size: 16px;
    font-weight: 500;
    color: var(--of-text-primary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-battery {
    font-size: 13px;
    color: var(--of-text-secondary);
    margin-bottom: 8px;
  }

  .preview-task {
    .task-name {
      font-size: 12px;
      color: var(--of-text-secondary);
      margin-bottom: 4px;
    }

    .task-progress-bar {
      width: 100%;
      height: 6px;
      background: var(--of-border);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 4px;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #1677ff, #52c41a);
        transition: width 0.3s;
      }
    }

    .task-progress-text {
      font-size: 12px;
      color: var(--of-text-tertiary);
    }
  }
}

.device-search {
  margin-bottom: 12px;
}

.device-list {
  .device-group {
    margin-bottom: 12px;

    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--of-row-bg);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--of-text-primary);
      user-select: none;

      &:hover {
        background: var(--of-row-hover);
      }

      .group-badge {
        background: var(--of-primary);
        color: #fff;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
      }
    }

    .group-content {
      margin-top: 4px;
    }

    .device-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: var(--of-row-hover);
      }

      &.active {
        background: rgba(22, 119, 255, 0.1);
        border-left: 3px solid var(--of-primary);
        padding-left: 9px;
      }

      .device-name {
        font-size: 13px;
        color: var(--of-text-primary);
      }

      .device-sn {
        margin-left: auto;
        font-size: 12px;
        color: var(--of-text-tertiary);
      }
    }
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;

  &.status-flying {
    background: #1677ff;
    box-shadow: 0 0 6px #1677ff;
  }

  &.status-standby {
    background: #d9d9d9;
  }

  &.status-offline {
    background: #ff4d4f;
  }
}

// ========================= Tab3: 告警 =========================

.alarm-charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.chart-box {
  background: var(--of-panel-bg);
  border: 1px solid var(--of-border);
  border-radius: 4px;
  padding: 12px;

  .chart-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--of-text-primary);
    margin-bottom: 8px;
  }

  .chart-legend {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--of-text-secondary);

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;

        &.low {
          background: #52c41a;
        }

        &.medium {
          background: #faad14;
        }

        &.high {
          background: #ff4d4f;
        }
      }
    }
  }
}

.alarm-list {
  max-height: calc(100vh - 500px);
  overflow-y: auto;
}

.alarm-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--of-border);
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--of-row-hover);
  }

  &:last-child {
    border-bottom: none;
  }

  .alarm-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.level-low {
      background: rgba(82, 196, 26, 0.1);
      color: #52c41a;
    }

    &.level-medium {
      background: rgba(250, 173, 20, 0.1);
      color: #faad14;
    }

    &.level-high {
      background: rgba(255, 77, 79, 0.1);
      color: #ff4d4f;
    }
  }

  .alarm-content {
    flex: 1;
  }

  .alarm-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    .alarm-uav {
      font-size: 13px;
      font-weight: 500;
      color: var(--of-text-primary);
    }

    .alarm-type {
      font-size: 12px;
      color: var(--of-text-tertiary);
      padding: 2px 6px;
      background: var(--of-row-bg);
      border-radius: 2px;
    }

    .alarm-time {
      margin-left: auto;
      font-size: 12px;
      color: var(--of-text-tertiary);
    }
  }

  .alarm-desc {
    font-size: 13px;
    color: var(--of-text-secondary);
    margin-bottom: 4px;
  }

  .alarm-target {
    font-size: 12px;
    color: var(--of-text-tertiary);
  }
}

// ========================= Tooltip =========================

.uav-tooltip {
  position: fixed;
  width: 320px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
  color: #fff;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transform: translateY(-100%);
  margin-top: -16px;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid rgba(0, 0, 0, 0.9);
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 16px;
    font-weight: 500;

    .tooltip-close {
      cursor: pointer;
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }
  }

  .tooltip-body {
    margin-bottom: 12px;
  }

  .tooltip-fields {
    .tooltip-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        color: rgba(255, 255, 255, 0.6);
        min-width: 80px;
      }

      .value {
        flex: 1;
        color: #fff;
      }
    }

    .battery-bar {
      width: 100px;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
      margin-left: 8px;

      &.low {
        .battery-fill {
          background: #ff4d4f;
        }
      }

      .battery-fill {
        height: 100%;
        background: #52c41a;
        transition: width 0.3s;
      }
    }
  }

  .tooltip-status {
    text-align: center;
    padding: 16px 0;

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      margin-bottom: 8px;
    }

    p {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }
  }

  .tooltip-actions {
    display: flex;
    gap: 8px;

    :deep(.ant-btn) {
      flex: 1;
    }
  }
}

// ========================= 空状态 =========================

.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--of-text-tertiary);
  font-size: 13px;
}
</style>
