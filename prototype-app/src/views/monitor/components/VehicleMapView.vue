<script setup lang="ts">
/**
 * 车辆地图视图组件
 * 简化版地图：卫星图底图 + 车辆标记 + 定位模式
 */
import { ref, computed } from 'vue'
import { CarOutlined, CloseOutlined } from '@ant-design/icons-vue'

interface VehicleMarker {
  id: string
  name: string
  status: 'online' | 'offline'
  position: { lat: number; lng: number } | null
}

interface Props {
  vehicles: VehicleMarker[]
  focusedVehicle?: VehicleMarker | null
}

const props = withDefaults(defineProps<Props>(), {
  focusedVehicle: null,
})

const emit = defineEmits<{
  'exit-focus': []
}>()

// 地图模式
const isMapMode = computed(() => !!props.focusedVehicle)

// 车辆位置映射（像素坐标，简化处理）
const vehiclePositions = computed(() => {
  return props.vehicles
    .filter(v => v.status === 'online' && v.position)
    .map(vehicle => {
      // 将经纬度转换为像素坐标（简化映射）
      const lat = vehicle.position!.lat
      const lng = vehicle.position!.lng

      // 尼日尔油田区域大致范围：lat 13-14, lng 2-3
      // 映射到地图容器 1200x800
      const x = ((lng - 2) / 1) * 1200
      const y = ((14 - lat) / 1) * 800

      return {
        ...vehicle,
        x: Math.max(0, Math.min(1200, x)),
        y: Math.max(0, Math.min(800, y)),
      }
    })
})

// 聚焦车辆位置
const focusedPosition = computed(() => {
  if (!props.focusedVehicle || !props.focusedVehicle.position) return null

  const lat = props.focusedVehicle.position.lat
  const lng = props.focusedVehicle.position.lng

  const x = ((lng - 2) / 1) * 1200
  const y = ((14 - lat) / 1) * 800

  return {
    x: Math.max(0, Math.min(1200, x)),
    y: Math.max(0, Math.min(800, y)),
  }
})

function handleExitFocus() {
  emit('exit-focus')
}
</script>

<template>
  <div class="vehicle-map-view">
    <!-- 卫星地图底图 -->
    <img src="/map-satellite.jpg" alt="地图" class="map-image" />

    <!-- 车辆标记 -->
    <div
      v-for="vehicle in vehiclePositions"
      :key="vehicle.id"
      class="vehicle-marker"
      :class="{
        'vehicle-marker--focused': focusedVehicle?.id === vehicle.id,
        'vehicle-marker--dimmed': isMapMode && focusedVehicle?.id !== vehicle.id
      }"
      :style="{
        left: `${vehicle.x}px`,
        top: `${vehicle.y}px`,
      }"
    >
      <div class="vehicle-marker__icon">
        <CarOutlined />
      </div>
      <div v-if="!isMapMode || focusedVehicle?.id === vehicle.id" class="vehicle-marker__label">
        {{ vehicle.name }}
      </div>
    </div>

    <!-- 地图模式：聚焦信息面板 -->
    <div v-if="isMapMode && focusedVehicle" class="focus-panel">
      <div class="focus-panel__header">
        <div class="focus-panel__title">
          <CarOutlined class="focus-panel__icon" />
          <span>{{ focusedVehicle.name }}</span>
        </div>
        <div class="focus-panel__close" @click="handleExitFocus">
          <CloseOutlined />
        </div>
      </div>
      <div class="focus-panel__body">
        <div class="focus-info">
          <span class="focus-info__label">状态</span>
          <span class="focus-info__value">
            <span class="online-dot"></span>
            在线
          </span>
        </div>
        <div v-if="focusedVehicle.position" class="focus-info">
          <span class="focus-info__label">位置</span>
          <span class="focus-info__value">
            {{ focusedVehicle.position.lat.toFixed(4) }}°N, {{ focusedVehicle.position.lng.toFixed(4) }}°E
          </span>
        </div>
      </div>
      <div class="focus-panel__footer">
        <a-button type="primary" size="small" @click="handleExitFocus">
          退出定位
        </a-button>
      </div>
    </div>

    <!-- 聚焦指示器（脉冲圆圈） -->
    <div
      v-if="isMapMode && focusedPosition"
      class="focus-indicator"
      :style="{
        left: `${focusedPosition.x}px`,
        top: `${focusedPosition.y}px`,
      }"
    >
      <div class="focus-indicator__pulse"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.vehicle-map-view {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a0d12;
}

.map-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

// ==================== 车辆标记 ====================

.vehicle-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 5;
  transition: all 0.3s ease;

  &--focused {
    z-index: 15;

    .vehicle-marker__icon {
      background: var(--of-color-primary);
      border-color: var(--of-color-primary);
      color: #fff;
      transform: scale(1.3);
    }

    .vehicle-marker__label {
      background: var(--of-color-primary);
      color: #fff;
      font-weight: 600;
    }
  }

  &--dimmed {
    opacity: 0.3;

    .vehicle-marker__label {
      display: none;
    }
  }
}

.vehicle-marker__icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--of-color-primary);
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);

  &:hover {
    background: var(--of-color-primary-hover);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }
}

.vehicle-marker__label {
  padding: 2px 8px;
  background: rgba(10, 13, 18, 0.8);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 11px;
  color: var(--of-text-primary);
  white-space: nowrap;
  pointer-events: none;
}

// ==================== 聚焦指示器 ====================

.focus-indicator {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  pointer-events: none;
  z-index: 10;
}

.focus-indicator__pulse {
  width: 100%;
  height: 100%;
  border: 2px solid var(--of-color-primary);
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

// ==================== 聚焦信息面板 ====================

.focus-panel {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  background: rgba(10, 13, 18, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 20;
  overflow: hidden;
}

.focus-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.focus-panel__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--of-text-primary);
}

.focus-panel__icon {
  font-size: 18px;
  color: var(--of-color-primary);
}

.focus-panel__close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--of-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--of-text-primary);
  }
}

.focus-panel__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.focus-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.focus-info__label {
  font-size: 13px;
  color: var(--of-text-secondary);
}

.focus-info__value {
  font-size: 14px;
  color: var(--of-text-primary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--of-color-success);
}

.focus-panel__footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  justify-content: center;
}
</style>
