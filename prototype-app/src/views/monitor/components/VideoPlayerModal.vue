<template>
  <a-modal
    :open="visible"
    :title="`无人机视频 - ${drone?.name || ''}`"
    width="900px"
    :footer="null"
    @cancel="handleClose"
  >
    <div v-if="drone" class="video-player">
      <!-- 视频播放区域 -->
      <div class="video-container">
        <div v-if="drone.status === 'flying'" class="video-placeholder playing">
          <div class="video-overlay">
            <VideoCameraOutlined class="video-icon" />
            <p class="video-text">视频流播放中...</p>
            <p class="video-hint">（原型阶段占位）</p>
          </div>
        </div>
        <div v-else-if="drone.status === 'offline'" class="video-placeholder offline">
          <div class="video-overlay">
            <DisconnectOutlined class="status-icon" />
            <p class="status-text">设备离线</p>
            <p class="status-hint">无法获取视频流</p>
          </div>
        </div>
        <div v-else class="video-placeholder grounded">
          <div class="video-overlay">
            <WarningOutlined class="status-icon" />
            <p class="status-text">设备未飞行</p>
            <p class="status-hint">{{ getStatusText(drone.status) }}，无视频流</p>
          </div>
        </div>
      </div>

      <!-- 视频信息栏 -->
      <div class="video-info">
        <div class="info-row">
          <span class="label">设备编号：</span>
          <span class="value">{{ drone.id }}</span>
        </div>
        <div class="info-row">
          <span class="label">所属营地：</span>
          <span class="value">{{ drone.camp }}</span>
        </div>
        <div class="info-row">
          <span class="label">当前状态：</span>
          <span class="value">
            <a-tag :color="getStatusColor(drone.status)">
              {{ getStatusText(drone.status) }}
            </a-tag>
          </span>
        </div>
        <div class="info-row">
          <span class="label">电池电量：</span>
          <span class="value" :class="getBatteryClass(drone.telemetry.battery)">
            {{ drone.telemetry.battery }}%
          </span>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { VideoCameraOutlined, DisconnectOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { UavStatus } from '@/types'

defineProps<{
  visible: boolean
  drone: any
}>()

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}

function getStatusColor(status: UavStatus) {
  const colorMap = {
    [UavStatus.Flying]: 'processing',
    [UavStatus.Available]: 'success',
    [UavStatus.Charging]: 'warning',
    [UavStatus.Fault]: 'error',
    [UavStatus.Offline]: 'default',
  }
  return colorMap[status] || 'default'
}

function getStatusText(status: UavStatus) {
  const textMap = {
    [UavStatus.Flying]: '飞行中',
    [UavStatus.Available]: '可用',
    [UavStatus.Charging]: '充电中',
    [UavStatus.Fault]: '故障',
    [UavStatus.Offline]: '离线',
  }
  return textMap[status] || status
}

function getBatteryClass(battery: number) {
  if (battery <= 20) return 'battery-low'
  if (battery <= 40) return 'battery-medium'
  return 'battery-high'
}
</script>

<style scoped lang="scss">
.video-player {
  .video-container {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 16px;

    .video-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &.playing {
        background: linear-gradient(135deg, #0a0d12 0%, #161d2b 100%);
      }

      &.offline {
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      }

      &.grounded {
        background: linear-gradient(135deg, #1f1f1f 0%, #2d2d2d 100%);
      }

      .video-overlay {
        text-align: center;

        .video-icon,
        .status-icon {
          font-size: 48px;
          color: rgba(255, 255, 255, 0.3);
          margin-bottom: 16px;
        }

        .video-text,
        .status-text {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
        }

        .video-hint,
        .status-hint {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
        }
      }
    }
  }

  .video-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;
    padding: 12px;
    background: var(--of-bg-card);
    border-radius: 4px;
    border: 1px solid var(--of-border-base);

    .info-row {
      display: flex;
      align-items: baseline;
      font-size: 13px;

      .label {
        flex-shrink: 0;
        color: var(--of-text-tertiary);
      }

      .value {
        flex: 1;
        color: var(--of-text-primary);
        font-weight: 500;

        &.battery-low {
          color: #ff4d4f;
        }

        &.battery-medium {
          color: #faad14;
        }

        &.battery-high {
          color: #52c41a;
        }
      }
    }
  }
}
</style>
