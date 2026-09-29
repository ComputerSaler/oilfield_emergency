<script setup lang="ts">
/**
 * 预警详情面板组件
 * 滑入式侧边面板，展示预警完整信息
 * Phase 5.2: 集成推荐无人机算法，完善交互
 */
import { computed } from 'vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import type { Alert } from '@/types/alert'
import type { UavDevice } from '@/types/drone'
import { AlertLevel, AlertStatus } from '@/types/alert'
import { UavClass } from '@/types/drone'
import { recommendDrones } from '@/utils/dispatchCard'

const props = defineProps<{
  visible: boolean
  alert?: Alert
  drones: UavDevice[]
}>()

const emit = defineEmits<{
  close: []
  createDispatch: []
  track: []
  closeAlert: []
  escalate: []
}>()

// 计算推荐无人机列表
const recommendedDronesList = computed(() => {
  if (!props.alert || !props.alert.coords) return []

  const results = recommendDrones(props.alert, props.drones)
  return results
    .filter(r => r.recommended)
    .slice(0, 3)
    .map(item => ({
      id: item.drone.id,
      name: item.drone.name,
      distance: `${item.distance.toFixed(1)}km`,
      arrivalTime: `${item.arrivalTime}分钟`,
      battery: item.drone.telemetry.battery,
      status: getStatusText(item.drone.status),
      uavClass: item.drone.uavClass === UavClass.ClassA ? 'A类' : 'C类',
    }))
})

// 获取等级显示
const levelDisplay = computed(() => {
  if (!props.alert) return { text: '未知', class: 'medium' }

  switch (props.alert.level) {
    case AlertLevel.High:
      return { text: '高危', class: 'high' }
    case AlertLevel.Medium:
      return { text: '中危', class: 'medium' }
    case AlertLevel.Low:
      return { text: '低危', class: 'low' }
    default:
      return { text: '未知', class: 'medium' }
  }
})

// 获取状态文本
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    available: '待命中',
    flying: '在飞中',
    charging: '充电中',
    fault: '故障',
    offline: '离线',
    escort: '伴飞中',
    alert_response: '告警响应中',
  }
  return statusMap[status] || status
}

// Mock时间线数据（TODO: Phase 6 对接真实数据）
const mockTimeline = computed(() => {
  if (!props.alert) return []

  const timeline = []
  const createdTime = new Date(props.alert.createdAt || Date.now())

  timeline.push({
    time: createdTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    action: '预警创建'
  })

  if (props.alert.status === AlertStatus.Verifying) {
    const dispatchTime = new Date(createdTime.getTime() + 2 * 60 * 1000)
    timeline.push({
      time: dispatchTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      action: '已生成调度卡片'
    })
  }

  if (props.alert.status === AlertStatus.Tracking) {
    const trackTime = new Date(createdTime.getTime() + 5 * 60 * 1000)
    timeline.push({
      time: trackTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      action: '已设为持续跟踪'
    })
  }

  if (props.alert.status === AlertStatus.Escalated) {
    const escalateTime = new Date(createdTime.getTime() + 10 * 60 * 1000)
    timeline.push({
      time: escalateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      action: '已升级为事件'
    })
  }

  if (props.alert.status === AlertStatus.Closed) {
    const closeTime = new Date(createdTime.getTime() + 15 * 60 * 1000)
    timeline.push({
      time: closeTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      action: '预警已关闭'
    })
  }

  return timeline
})

// 格式化坐标
const coordsText = computed(() => {
  if (!props.alert?.coords) return '无'
  return `${props.alert.coords.lat.toFixed(6)}°N, ${props.alert.coords.lng.toFixed(6)}°E`
})

// 格式化时间
const timeText = computed(() => {
  if (!props.alert?.createdAt) return props.alert?.time || '未知'
  return new Date(props.alert.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
})
</script>

<template>
  <div class="alert-detail-panel" :class="{ visible }">
    <div class="panel-header">
      <a-button type="text" size="small" @click="emit('close')">
        <template #icon><ArrowLeftOutlined /></template>
        返回列表
      </a-button>
    </div>

    <div v-if="alert" class="panel-body">
      <!-- 基本信息 -->
      <div class="section">
        <div class="alert-title">
          <span>{{ alert.title }}</span>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="label">预警ID：</span>
            <span class="value">{{ alert.id }}</span>
          </div>
          <div class="info-item">
            <span class="label">时间：</span>
            <span class="value">{{ timeText }}</span>
          </div>
          <div class="info-item">
            <span class="label">等级：</span>
            <span class="value level-badge" :class="`level-${levelDisplay.class}`">
              {{ levelDisplay.text }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">来源：</span>
            <span class="value">{{ alert.source }}</span>
          </div>
          <div class="info-item full-width">
            <span class="label">位置：</span>
            <span class="value">{{ alert.location }}</span>
          </div>
          <div class="info-item full-width">
            <span class="label">坐标：</span>
            <span class="value coords">{{ coordsText }}</span>
          </div>
        </div>
      </div>

      <!-- 现场情况 -->
      <div v-if="alert.description" class="section">
        <div class="section-title">现场情况</div>
        <div class="description-box">
          {{ alert.description }}
        </div>
      </div>

      <!-- 现场截图 -->
      <div v-if="alert.imageUrl" class="section">
        <div class="section-title">现场截图</div>
        <div class="screenshot-box">
          <img :src="alert.imageUrl" alt="现场截图" />
        </div>
      </div>

      <!-- 推荐无人机 -->
      <div class="section">
        <div class="section-title">推荐无人机</div>
        <div v-if="recommendedDronesList.length > 0" class="drone-list">
          <div
            v-for="drone in recommendedDronesList"
            :key="drone.id"
            class="drone-item"
          >
            <span class="drone-check">✅</span>
            <div class="drone-info">
              <div class="drone-name">{{ drone.name }} ({{ drone.uavClass }})</div>
              <div class="drone-meta">
                距离{{ drone.distance }} | 预计{{ drone.arrivalTime }}到达 | 电量{{ drone.battery }}% | {{ drone.status }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-drones">
          <span>⚠️</span>
          <span>当前无可用无人机</span>
        </div>
      </div>

      <!-- 处置记录 -->
      <div class="section">
        <div class="section-title">处置记录</div>
        <div class="timeline">
          <div
            v-for="(record, index) in mockTimeline"
            :key="index"
            class="timeline-item"
          >
            <div class="timeline-time">{{ record.time }}</div>
            <div class="timeline-content">{{ record.action }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="alert" class="panel-footer">
      <a-button type="primary" @click="emit('createDispatch')">生成调度卡片</a-button>
      <a-button @click="emit('track')">持续跟踪</a-button>
      <a-button danger @click="emit('closeAlert')">关闭预警</a-button>
      <a-button type="primary" danger @click="emit('escalate')">升级为事件</a-button>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'AlertDetailPanel'
}
</script>

<style scoped lang="scss">
.alert-detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  background: var(--of-bg-card);
  transform: translateX(100%);
  transition: transform 0.3s var(--of-transition-base);
  display: flex;
  flex-direction: column;
  z-index: 10;

  &.visible {
    transform: translateX(0);
  }

  .panel-header {
    height: 48px;
    padding: 0 var(--of-spacing-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: var(--of-border-width) solid var(--of-border-table);
    flex-shrink: 0;

    .close-btn {
      margin-left: auto;
    }
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--of-spacing-4);

    .section {
      margin-bottom: var(--of-spacing-5);

      &:last-child {
        margin-bottom: 0;
      }

      .section-title {
        font-size: var(--of-font-size-base);
        font-weight: var(--of-font-weight-medium);
        color: var(--of-text-primary);
        margin-bottom: var(--of-spacing-3);
      }
    }

    .alert-title {
      display: flex;
      align-items: center;
      gap: var(--of-spacing-2);
      font-size: var(--of-font-size-lg);
      font-weight: var(--of-font-weight-medium);
      color: var(--of-text-primary);
      margin-bottom: var(--of-spacing-4);

      .alert-icon {
        font-size: 20px;
      }
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--of-spacing-3) var(--of-spacing-4);

      .info-item {
        display: flex;
        font-size: var(--of-font-size-xs);

        &.full-width {
          grid-column: 1 / -1;
        }

        .label {
          color: var(--of-text-tertiary);
          min-width: 48px;
          flex-shrink: 0;
        }

        .value {
          flex: 1;
          color: var(--of-text-secondary);

          &.coords {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 11px;
          }

          &.level-badge {
            font-weight: var(--of-font-weight-medium);

            &.level-high {
              color: #ff4757;
            }

            &.level-medium {
              color: #ff6b35;
            }

            &.level-low {
              color: #ffc107;
            }
          }
        }
      }
    }

    .screenshot-box {
      width: 100%;
      height: 200px;
      background: var(--of-bg-body);
      border-radius: var(--of-radius-base);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .screenshot-placeholder {
        color: var(--of-text-tertiary);
        font-size: var(--of-font-size-xs);
      }
    }

    .description-box {
      padding: var(--of-spacing-3);
      background: rgba(255, 193, 7, 0.1);
      border-left: 3px solid #ffc107;
      border-radius: var(--of-radius-base);
      font-size: var(--of-font-size-sm);
      color: var(--of-text-primary);
      line-height: 1.6;
    }

    .drone-list {
      display: flex;
      flex-direction: column;
      gap: var(--of-spacing-2);

      .drone-item {
        display: flex;
        align-items: flex-start;
        gap: var(--of-spacing-2);
        padding: var(--of-spacing-2);
        background: var(--of-bg-body);
        border-radius: var(--of-radius-base);

        .drone-check {
          font-size: 14px;
          line-height: 20px;
        }

        .drone-info {
          flex: 1;

          .drone-name {
            font-size: var(--of-font-size-xs);
            font-weight: var(--of-font-weight-medium);
            color: var(--of-text-primary);
            margin-bottom: 2px;
          }

          .drone-meta {
            font-size: 11px;
            color: var(--of-text-tertiary);
          }
        }
      }
    }

    .no-drones {
      display: flex;
      align-items: center;
      gap: var(--of-spacing-2);
      padding: var(--of-spacing-3);
      background: rgba(255, 71, 87, 0.1);
      border-radius: var(--of-radius-base);
      color: #ff4757;
      font-size: var(--of-font-size-sm);
    }

    .timeline {
      position: relative;
      padding-left: var(--of-spacing-4);

      &::before {
        content: '';
        position: absolute;
        left: 6px;
        top: 8px;
        bottom: 8px;
        width: 1px;
        background: var(--of-border-table);
      }

      .timeline-item {
        position: relative;
        margin-bottom: var(--of-spacing-3);

        &:last-child {
          margin-bottom: 0;
        }

        &::before {
          content: '';
          position: absolute;
          left: -18px;
          top: 6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--of-color-link);
        }

        .timeline-time {
          font-size: 11px;
          color: var(--of-text-tertiary);
          margin-bottom: 2px;
        }

        .timeline-content {
          font-size: var(--of-font-size-xs);
          color: var(--of-text-secondary);
        }
      }
    }
  }

  .panel-footer {
    padding: var(--of-spacing-4);
    border-top: var(--of-border-width) solid var(--of-border-table);
    display: flex;
    gap: var(--of-spacing-2);
    flex-shrink: 0;
    flex-wrap: wrap;

    :deep(.ant-btn) {
      flex: 1;
      min-width: 0;
    }
  }
}
</style>
