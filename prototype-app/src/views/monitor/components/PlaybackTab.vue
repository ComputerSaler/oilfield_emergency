<script setup lang="ts">
/**
 * 历史回放Tab组件
 * Phase 6: 轨迹回放控制
 */
import { ref, computed, h } from 'vue'
import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons-vue'
import type { UavDevice } from '@/types/drone'
import type { Dayjs } from 'dayjs'

interface Props {
  drones: UavDevice[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'start-playback': [params: PlaybackParams]
  'stop-playback': []
  'seek': [progress: number]
  'speed-change': [speed: number]
}>()

interface PlaybackParams {
  droneId: string
  startTime: string
  endTime: string
  speed: number
}

// 选中的无人机
const selectedDroneId = ref<string>('')

// 当前选中的无人机数据
const selectedDrone = computed(() => {
  if (!selectedDroneId.value) return null
  return props.drones.find(d => d.id === selectedDroneId.value)
})

// 时间范围（默认过去1小时）
const timeRange = ref<[Dayjs, Dayjs] | undefined>(undefined)

// 快捷时间选项
const quickTimeOptions = [
  { label: '过去1小时', value: '1h' },
  { label: '过去6小时', value: '6h' },
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' }
]

// 播放状态
const isPlaying = ref(false)

// 播放进度（0-100）
const playbackProgress = ref(0)

// 播放速度
const playbackSpeed = ref(1)
const speedOptions = [
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 }
]

// 当前时间显示
const currentTime = ref('--:--:--')

// 是否可以开始播放
const canPlay = computed(() => {
  return selectedDroneId.value && timeRange.value
})

// 开始播放
function startPlayback() {
  if (!canPlay.value) return

  const drone = props.drones.find(d => d.id === selectedDroneId.value)
  if (!drone || !timeRange.value) return

  isPlaying.value = true

  emit('start-playback', {
    droneId: selectedDroneId.value,
    startTime: timeRange.value[0].toISOString(),
    endTime: timeRange.value[1].toISOString(),
    speed: playbackSpeed.value
  })
}

// 停止播放
function stopPlayback() {
  isPlaying.value = false
  playbackProgress.value = 0
  currentTime.value = '--:--:--'
  emit('stop-playback')
}

// 播放/暂停切换
function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    startPlayback()
  }
}

// 进度条拖动
function onProgressChange(value: number | number[]) {
  const progress = Array.isArray(value) ? value[0] : value
  playbackProgress.value = progress
  emit('seek', progress)
}

// 速度变化
function onSpeedChange(value: any) {
  const speed = typeof value === 'number' ? value : Number(value)
  playbackSpeed.value = speed
  emit('speed-change', speed)
}

// 快捷时间选择
function onQuickTime(option: string) {
  // 这里简化处理，实际应该根据option计算时间范围
  // TODO: 实现快捷时间计算逻辑
  console.log('Quick time selected:', option)
}
</script>

<template>
  <div class="playback-tab">
    <!-- 控制面板 -->
    <div class="playback-controls">
      <!-- 无人机选择 -->
      <div class="control-row">
        <label class="control-label">无人机：</label>
        <a-select
          v-model:value="selectedDroneId"
          placeholder="选择无人机"
          size="small"
          style="width: 200px"
        >
          <a-select-option
            v-for="drone in drones"
            :key="drone.id"
            :value="drone.id"
          >
            {{ drone.name }} ({{ drone.sn.slice(-6) }})
          </a-select-option>
        </a-select>
      </div>

      <!-- 时间段选择 -->
      <div class="control-row">
        <label class="control-label">时间段：</label>
        <a-range-picker
          v-model:value="timeRange"
          show-time
          size="small"
          style="width: 300px"
        />
      </div>

      <!-- 快捷时间按钮 -->
      <div class="control-row">
        <label class="control-label"></label>
        <a-space>
          <a-button
            v-for="opt in quickTimeOptions"
            :key="opt.value"
            size="small"
            @click="onQuickTime(opt.value)"
          >
            {{ opt.label }}
          </a-button>
        </a-space>
      </div>

      <!-- 播放控制条 -->
      <div class="playback-bar">
        <!-- 播放/暂停按钮 -->
        <a-button
          type="text"
          :disabled="!canPlay"
          @click="togglePlayback"
        >
          <component :is="isPlaying ? PauseOutlined : CaretRightOutlined" />
        </a-button>

        <!-- 速度选择 -->
        <a-select
          v-model:value="playbackSpeed"
          size="small"
          style="width: 70px"
          @change="onSpeedChange"
        >
          <a-select-option
            v-for="opt in speedOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <!-- 进度条 -->
        <a-slider
          v-model:value="playbackProgress"
          :disabled="!isPlaying"
          style="flex: 1; margin: 0 12px"
          @change="onProgressChange"
        />

        <!-- 当前时间 -->
        <span class="current-time">{{ currentTime }}</span>
      </div>

      <!-- 提示信息 -->
      <div v-if="!selectedDroneId" class="playback-hint">
        <p>请选择无人机和时间段后开始回放</p>
      </div>
    </div>

    <!-- 遥测数据显示（播放时显示） -->
    <div v-if="isPlaying && selectedDrone" class="playback-telemetry">
      <div class="telemetry-row">
        <div class="telemetry-group">
          <span class="telemetry-label">序列号：</span>
          <span class="telemetry-value">{{ selectedDrone.sn }}</span>
        </div>
        <div class="telemetry-group">
          <span class="telemetry-label">类型：</span>
          <span class="telemetry-value">{{ selectedDrone.uavClass }}类</span>
        </div>
      </div>
      <div class="telemetry-row">
        <div class="telemetry-group">
          <span class="telemetry-label">高度：</span>
          <span class="telemetry-value">{{ selectedDrone.telemetry.altitude }} m</span>
        </div>
        <div class="telemetry-group">
          <span class="telemetry-label">速度：</span>
          <span class="telemetry-value">{{ selectedDrone.telemetry.speed }} m/s</span>
        </div>
      </div>
      <div class="telemetry-row">
        <div class="telemetry-group">
          <span class="telemetry-label">电量：</span>
          <span class="telemetry-value">{{ selectedDrone.telemetry.battery }} %</span>
        </div>
        <div class="telemetry-group">
          <span class="telemetry-label">航向：</span>
          <span class="telemetry-value">{{ selectedDrone.telemetry.heading }}°</span>
        </div>
      </div>
      <div class="telemetry-row">
        <div class="telemetry-group">
          <span class="telemetry-label">飞行时长：</span>
          <span class="telemetry-value">{{ selectedDrone.telemetry.flightTime }} min</span>
        </div>
        <div class="telemetry-group">
          <span class="telemetry-label">信号强度：</span>
          <span class="telemetry-value">{{ selectedDrone.telemetry.signal }} %</span>
        </div>
      </div>
      <div class="telemetry-row">
        <div class="telemetry-group">
          <span class="telemetry-label">GPS卫星：</span>
          <span class="telemetry-value">{{ selectedDrone.telemetry.gps }}</span>
        </div>
        <div class="telemetry-group">
          <span class="telemetry-label">所属营地：</span>
          <span class="telemetry-value">{{ selectedDrone.camp }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.playback-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.playback-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  min-width: 60px;
  font-size: 13px;
  color: var(--of-text-secondary);
  text-align: right;
}

.playback-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--of-bg-elevated);
  border-radius: 4px;
  margin-top: 8px;
}

.current-time {
  font-size: 12px;
  color: var(--of-text-secondary);
  font-family: 'Consolas', 'Monaco', monospace;
  min-width: 70px;
  text-align: right;
}

.playback-hint {
  padding: 24px;
  text-align: center;
  color: var(--of-text-secondary);
  font-size: 13px;
}

.playback-telemetry {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--of-bg-elevated);
  border-radius: 4px;
  margin-top: 12px;
}

.telemetry-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.telemetry-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.telemetry-label {
  color: var(--of-text-secondary);
  min-width: 70px;
}

.telemetry-value {
  color: var(--of-text-primary);
  font-weight: 500;
  font-family: 'Consolas', 'Monaco', monospace;
}


.telemetry-value {
  font-size: 13px;
  color: var(--of-text-primary);
  font-weight: 500;
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
