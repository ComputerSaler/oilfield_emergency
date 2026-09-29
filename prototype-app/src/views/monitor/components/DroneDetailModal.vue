<template>
  <a-modal
    :open="visible"
    :title="`无人机详情 - ${drone?.name || ''}`"
    width="700px"
    :footer="null"
    @cancel="handleClose"
  >
    <div v-if="drone" class="drone-detail">
      <!-- 基本信息 -->
      <section class="detail-section">
        <h4 class="section-title">基本信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">设备编号</span>
            <span class="value">{{ drone.id }}</span>
          </div>
          <div class="info-item">
            <span class="label">设备名称</span>
            <span class="value">{{ drone.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">无人机类型</span>
            <span class="value">{{ drone.uavClass }}类</span>
          </div>
          <div class="info-item">
            <span class="label">所属营地</span>
            <span class="value">{{ drone.camp }}</span>
          </div>
          <div class="info-item">
            <span class="label">当前状态</span>
            <span class="value">
              <a-tag :color="getStatusColor(drone.status)">
                {{ getStatusText(drone.status) }}
              </a-tag>
            </span>
          </div>
          <div class="info-item">
            <span class="label">电池电量</span>
            <span class="value" :class="getBatteryClass(drone.telemetry.battery)">
              {{ drone.telemetry.battery }}%
            </span>
          </div>
        </div>
      </section>

      <!-- 遥测数据 -->
      <section class="detail-section">
        <h4 class="section-title">遥测数据</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">经度</span>
            <span class="value">{{ drone.telemetry.position?.lng?.toFixed(6) || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">纬度</span>
            <span class="value">{{ drone.telemetry.position?.lat?.toFixed(6) || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">相对起飞点高度</span>
            <span class="value">{{ drone.telemetry.altitude || 0 }} m</span>
          </div>
          <div class="info-item">
            <span class="label">海拔高度</span>
            <span class="value">{{ drone.telemetry.position?.altitude || 0 }} m</span>
          </div>
          <div class="info-item">
            <span class="label">水平速度</span>
            <span class="value">{{ drone.telemetry.speed || 0 }} m/s</span>
          </div>
          <div class="info-item">
            <span class="label">垂直速度</span>
            <span class="value">{{ drone.telemetry.verticalSpeed || 0 }} m/s</span>
          </div>
          <div class="info-item">
            <span class="label">云台俯仰角</span>
            <span class="value">{{ drone.telemetry.gimbalPitch || 0 }}°</span>
          </div>
          <div class="info-item">
            <span class="label">云台横滚角</span>
            <span class="value">{{ drone.telemetry.gimbalRoll || 0 }}°</span>
          </div>
          <div class="info-item">
            <span class="label">云台航向角</span>
            <span class="value">{{ drone.telemetry.gimbalYaw || 0 }}°</span>
          </div>
          <!-- A类无人机额外显示吊舱经纬度 -->
          <template v-if="drone.uavClass === 'A'">
            <div class="info-item">
              <span class="label">吊舱经度</span>
              <span class="value">{{ calculateGimbalLng(drone).toFixed(6) }}°</span>
            </div>
            <div class="info-item">
              <span class="label">吊舱纬度</span>
              <span class="value">{{ calculateGimbalLat(drone).toFixed(6) }}°</span>
            </div>
          </template>
        </div>
      </section>

      <!-- 当前任务（仅伴飞任务显示） -->
      <section v-if="drone.escortTask" class="detail-section">
        <h4 class="section-title">当前任务</h4>
        <div class="task-card">
          <div class="task-row">
            <span class="label">任务编号</span>
            <span class="value">{{ drone.escortTask.id }}</span>
          </div>
          <div class="task-row">
            <span class="label">车辆编号</span>
            <span class="value">{{ drone.escortTask.vehicleId }}</span>
          </div>
          <div class="task-row">
            <span class="label">任务状态</span>
            <span class="value">
              <a-tag color="processing">{{ drone.escortTask.status }}</a-tag>
            </span>
          </div>
        </div>
      </section>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
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

// 计算吊舱经度（模拟）
function calculateGimbalLng(drone: any): number {
  if (!drone.telemetry?.position?.lng || !drone.telemetry?.gimbalPitch) {
    return drone.telemetry?.position?.lng || 0
  }

  const pitch = Math.abs(drone.telemetry.gimbalPitch)
  const altitude = drone.telemetry.altitude || 1000
  const yaw = drone.telemetry.gimbalYaw || 0

  const distance = altitude * Math.tan((pitch * Math.PI) / 180) * 0.15
  const offsetX = distance * Math.sin((yaw * Math.PI) / 180)

  return drone.telemetry.position.lng + offsetX * 0.0001
}

// 计算吊舱纬度（模拟）
function calculateGimbalLat(drone: any): number {
  if (!drone.telemetry?.position?.lat || !drone.telemetry?.gimbalPitch) {
    return drone.telemetry?.position?.lat || 0
  }

  const pitch = Math.abs(drone.telemetry.gimbalPitch)
  const altitude = drone.telemetry.altitude || 1000
  const yaw = drone.telemetry.gimbalYaw || 0

  const distance = altitude * Math.tan((pitch * Math.PI) / 180) * 0.15
  const offsetY = -distance * Math.cos((yaw * Math.PI) / 180)

  return drone.telemetry.position.lat + offsetY * 0.0001
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
.drone-detail {
  .detail-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--of-text-primary);
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;

    .info-item {
      display: flex;
      align-items: baseline;
      font-size: 13px;

      .label {
        flex-shrink: 0;
        width: 90px;
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

  .task-card {
    padding: 12px;
    background: var(--of-bg-card);
    border-radius: 4px;
    border: 1px solid var(--of-border-base);

    .task-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 13px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        flex-shrink: 0;
        width: 90px;
        color: var(--of-text-tertiary);
      }

      .value {
        flex: 1;
        color: var(--of-text-primary);
      }
    }
  }
}
</style>
