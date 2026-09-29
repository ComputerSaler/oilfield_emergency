<script setup lang="ts">
/**
 * 视频墙Tab组件
 * Phase 6: 多路视频网格显示
 */
import { ref, computed, h } from 'vue'
import { FullscreenOutlined } from '@ant-design/icons-vue'
import type { UavDevice } from '@/types/drone'

interface Props {
  drones: UavDevice[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'fullscreen': [droneId: string]
}>()

// 网格布局模式
type GridMode = '1x1' | '2x2' | '2x3' | '2x4'
const gridMode = ref<GridMode>('2x2')

// 网格配置
const gridConfig = {
  '1x1': { rows: 1, cols: 1, total: 1 },
  '2x2': { rows: 2, cols: 2, total: 4 },
  '2x3': { rows: 3, cols: 2, total: 6 },
  '2x4': { rows: 4, cols: 2, total: 8 }
}

// 当前网格格子数量
const gridTotal = computed(() => gridConfig[gridMode.value].total)

// 视频槽位（每个槽位可选择一个无人机）
const videoSlots = ref<(string | null)[]>([])

// 初始化视频槽位（自动填充在飞的无人机）
function initVideoSlots() {
  const flyingDrones = props.drones
    .filter(d => d.status === 'flying' || d.status === 'escort' || d.status === 'alert_response')
    .slice(0, gridTotal.value)

  videoSlots.value = Array(gridTotal.value).fill(null)
  flyingDrones.forEach((drone, index) => {
    videoSlots.value[index] = drone.id
  })
}

// 监听网格模式变化
function onGridModeChange(mode: GridMode) {
  gridMode.value = mode
  initVideoSlots()
}

// 选择无人机
function onSelectDrone(slotIndex: number, value: any) {
  const droneId = typeof value === 'string' ? value : String(value)
  videoSlots.value[slotIndex] = droneId
}

// 全屏播放
function onFullscreen(slotIndex: number) {
  const droneId = videoSlots.value[slotIndex]
  if (droneId) {
    emit('fullscreen', droneId)
  }
}

// 获取选中的无人机
function getSelectedDrone(slotIndex: number) {
  const droneId = videoSlots.value[slotIndex]
  return props.drones.find(d => d.id === droneId)
}

// 初始化
initVideoSlots()
</script>

<template>
  <div class="video-wall-tab">
    <!-- 顶部控制栏 -->
    <div class="video-wall-header">
      <div class="grid-mode-selector">
        <span class="grid-mode-label">网格布局：</span>
        <a-radio-group v-model:value="gridMode" size="small" @change="onGridModeChange(gridMode)">
          <a-radio-button value="1x1">1×1</a-radio-button>
          <a-radio-button value="2x2">2×2</a-radio-button>
          <a-radio-button value="2x3">2×3</a-radio-button>
          <a-radio-button value="2x4">2×4</a-radio-button>
        </a-radio-group>
      </div>
    </div>

    <!-- 视频网格 -->
    <div class="video-grid" :class="`video-grid--${gridMode}`">
      <div
        v-for="(slotDroneId, index) in videoSlots"
        :key="index"
        class="video-cell"
      >
        <!-- 视频占位 -->
        <div class="video-placeholder">
          <div class="video-content">
            <div class="video-placeholder__icon">📹</div>
            <div class="video-placeholder__text">
              {{ getSelectedDrone(index)?.name || '未选择' }}
            </div>
          </div>
        </div>

        <!-- 控制栏 -->
        <div class="video-cell-controls">
          <!-- 无人机选择 -->
          <a-select
            :value="slotDroneId || undefined"
            placeholder="选择无人机"
            size="small"
            style="flex: 1"
            @change="(val) => onSelectDrone(index, val)"
          >
            <a-select-option
              v-for="drone in drones"
              :key="drone.id"
              :value="drone.id"
            >
              {{ drone.name }} ({{ drone.sn.slice(-6) }})
            </a-select-option>
          </a-select>

          <!-- 全屏按钮 -->
          <a-button
            v-if="slotDroneId"
            type="text"
            size="small"
            :icon="h(FullscreenOutlined)"
            @click="onFullscreen(index)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.video-wall-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.video-wall-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--of-border-color);
  background: var(--of-bg-card);
}

.grid-mode-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grid-mode-label {
  font-size: 13px;
  color: var(--of-text-secondary);
}

.video-grid {
  flex: 1;
  display: grid;
  gap: 0; /* 去掉间隙 */
  padding: 0; /* 去掉padding */
  overflow: auto;

  &--1x1 {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  &--2x2 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
  }

  &--2x3 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  &--2x4 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(4, 1fr);
  }
}

.video-cell {
  position: relative;
  background: var(--of-bg-elevated);
  border: 1px solid var(--of-border-color);
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.video-placeholder {
  flex: 0 0 auto; /* 不扩展，根据内容大小 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
  min-height: 0;
}

/* 4:3 比例的内容容器 */
.video-content {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: var(--of-text-secondary);
}

.video-placeholder__icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.video-placeholder__text {
  font-size: 13px;
}

.video-cell-controls {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: var(--of-bg-card);
  border-top: 1px solid var(--of-border-color);
  flex-shrink: 0;
}
</style>
