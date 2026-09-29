<script setup lang="ts">
/**
 * 无人机列表卡片组件
 * 展示无人机实时状态、电量、任务信息
 */
import { EnvironmentOutlined, VideoCameraOutlined } from '@ant-design/icons-vue'

defineProps<{
  name: string
  sn: string
  uavClass: 'A' | 'C'
  status: 'flying' | 'available' | 'charging' | 'fault' | 'offline' | 'escort' | 'alert_response'
  battery: number
  task?: string
  flightTime?: string
  remainingDistance?: string
  altitude?: number
  speed?: number
  updateTime?: string
}>()

const emit = defineEmits<{
  locate: []
  video: []
  detail: []
}>()

// 状态颜色映射
const statusColorMap: Record<string, string> = {
  flying: '#0095ff', // 蓝色（在飞）
  available: '#00d97e', // 绿色（可用）
  charging: '#6dd2e8', // 青色
  fault: '#ff4757', // 红色
  offline: '#6c757d', // 灰色
  escort: '#ff6b35', // 橙色（任务中）
  alert_response: '#ff6b35', // 橙色（任务中）
  on_mission: '#ff6b35', // 橙色（任务中-统一状态）
}

// 状态文字映射
const statusTextMap: Record<string, string> = {
  flying: '在飞',
  available: '可用',
  charging: '充电中',
  fault: '故障',
  offline: '离线',
  escort: '任务中',
  alert_response: '任务中',
  on_mission: '任务中',
}
</script>

<template>
  <div class="drone-card" :class="`status-${status}`" @click="emit('detail')">
    <div class="card-header">
      <span class="drone-name">{{ name }}</span>
      <span class="drone-sn">{{ sn }}</span>
      <span class="class-badge">{{ uavClass }}类</span>
      <span class="status-badge" :style="{ backgroundColor: statusColorMap[status] }">
        {{ statusTextMap[status] }}
      </span>

      <!-- 图标按钮组（右侧） -->
      <div class="icon-actions" @click.stop>
        <a-tooltip title="定位">
          <a-button type="text" size="small" class="icon-btn" @click="emit('locate')">
            <template #icon><EnvironmentOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="视频">
          <a-button type="text" size="small" class="icon-btn" @click="emit('video')">
            <template #icon><VideoCameraOutlined /></template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <div class="card-body">
      <!-- 电量进度条 -->
      <div class="battery-row">
        <span class="battery-label">电量：{{ battery }}%</span>
        <div class="battery-bar" :class="{ low: battery < 20, medium: battery >= 20 && battery < 50 }">
          <div class="battery-fill" :style="{ width: `${battery}%` }"></div>
        </div>
      </div>

      <!-- 任务信息 -->
      <div v-if="task" class="info-row">
        <span class="info-label">任务：</span>
        <span class="info-value">{{ task }}</span>
      </div>

      <!-- 飞行数据 -->
      <div v-if="flightTime || remainingDistance" class="info-row">
        <span v-if="flightTime" class="info-item">已飞行：{{ flightTime }}</span>
        <span v-if="remainingDistance" class="info-divider">|</span>
        <span v-if="remainingDistance" class="info-item">剩余：{{ remainingDistance }}</span>
      </div>

      <!-- 遥测数据 -->
      <div v-if="altitude || speed" class="info-row">
        <span v-if="altitude" class="info-item">高度：{{ altitude }}m</span>
        <span v-if="speed" class="info-divider">|</span>
        <span v-if="speed" class="info-item">速度：{{ speed }}m/s</span>
      </div>

      <!-- 更新时间 -->
      <div v-if="updateTime" class="info-row update-time">
        <span class="info-label">更新：</span>
        <span class="info-value">{{ updateTime }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.drone-card {
  background: var(--of-bg-body);
  border: var(--of-border-width) solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  padding: var(--of-spacing-3);
  margin-bottom: var(--of-spacing-3);
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: var(--of-bg-row-hover);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--of-spacing-2);
    margin-bottom: var(--of-spacing-3);
    flex-wrap: wrap;

    .drone-name {
      font-size: var(--of-font-size-base);
      font-weight: var(--of-font-weight-medium);
      color: var(--of-text-primary);
    }

    .drone-sn {
      font-size: var(--of-font-size-xs);
      color: var(--of-text-tertiary);
      font-family: var(--of-font-family);
    }

    .class-badge {
      padding: 2px 6px;
      background: rgba(20, 129, 166, 0.2);
      color: var(--of-color-link);
      border-radius: 2px;
      font-size: 10px;
      font-weight: var(--of-font-weight-medium);
    }

    .status-badge {
      padding: 2px 6px;
      border-radius: 2px;
      font-size: 10px;
      font-weight: var(--of-font-weight-medium);
      color: #fff;
    }

    // 图标按钮组
    .icon-actions {
      margin-left: auto;
      display: flex;
      gap: 4px;

      .icon-btn {
        width: 28px;
        height: 28px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--of-text-secondary);
        transition: all 0.2s;

        &:hover {
          color: var(--of-color-link);
          background: var(--of-bg-row-hover);
        }

        :deep(.anticon) {
          font-size: 16px;
        }
      }
    }
  }

  .card-body {
    margin-bottom: var(--of-spacing-3);

    .battery-row {
      margin-bottom: var(--of-spacing-2);

      .battery-label {
        display: block;
        font-size: var(--of-font-size-xs);
        color: var(--of-text-secondary);
        margin-bottom: 4px;
      }

      .battery-bar {
        height: 6px;
        background: var(--of-bg-row-hover);
        border-radius: 3px;
        overflow: hidden;

        .battery-fill {
          height: 100%;
          background: linear-gradient(90deg, #00d97e, #52c41a);
          transition: width 0.3s;
        }

        &.medium .battery-fill {
          background: linear-gradient(90deg, #ffc107, #faad14);
        }

        &.low .battery-fill {
          background: linear-gradient(90deg, #ff4757, #ff6b6b);
        }
      }
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: var(--of-spacing-1);
      font-size: var(--of-font-size-xs);
      color: var(--of-text-secondary);
      line-height: 20px;
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      .info-label {
        color: var(--of-text-tertiary);
      }

      .info-value {
        flex: 1;
      }

      .info-item {
        white-space: nowrap;
      }

      .info-divider {
        color: var(--of-border-table);
      }

      &.update-time {
        margin-top: var(--of-spacing-2);
        padding-top: var(--of-spacing-2);
        border-top: var(--of-border-width) solid var(--of-border-table);
      }
    }
  }
}

// 呼吸动画（伴飞中）
@keyframes breathe {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

// 脉冲动画（告警响应中）
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}
</style>
