<template>
  <div
    v-if="visible"
    ref="floatWindowRef"
    class="of-video-float"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <!-- 标题栏（可拖动） -->
    <div class="of-video-float__header" @mousedown="startDrag">
      <div class="of-video-float__title">
        <VideoCameraOutlined class="of-video-float__icon" />
        <span>{{ device?.name || '视频监控' }}</span>
      </div>
      <CloseOutlined class="of-video-float__close" @click.stop="handleClose" />
    </div>

    <!-- 视频区域 -->
    <div class="of-video-float__body">
      <!-- 加载中 -->
      <div v-if="videoState === 'loading'" class="of-video-float__placeholder loading">
        <LoadingOutlined class="of-video-float__state-icon" spin />
        <p class="of-video-float__state-text">视频加载中...</p>
      </div>

      <!-- 播放中 -->
      <div v-else-if="videoState === 'playing'" class="of-video-float__placeholder playing">
        <div class="of-video-float__overlay">
          <VideoCameraOutlined class="of-video-float__state-icon" />
          <p class="of-video-float__state-text">视频流播放中...</p>
          <p class="of-video-float__state-hint">（原型阶段占位）</p>
        </div>
      </div>

      <!-- 设备离线 -->
      <div v-else-if="videoState === 'offline'" class="of-video-float__placeholder offline">
        <DisconnectOutlined class="of-video-float__state-icon" />
        <p class="of-video-float__state-text">设备已离线</p>
        <p class="of-video-float__state-hint">无法获取视频流</p>
      </div>

      <!-- 加载失败 -->
      <div v-else-if="videoState === 'failed'" class="of-video-float__placeholder failed">
        <WarningOutlined class="of-video-float__state-icon" />
        <p class="of-video-float__state-text">视频加载失败</p>
        <p class="of-video-float__state-hint">请检查网络或稍后重试</p>
      </div>
    </div>

    <!-- 信息栏 -->
    <div class="of-video-float__info">
      <div class="of-video-float__info-row">
        <span class="label">设备名称：</span>
        <span class="value">{{ device?.name || '--' }}</span>
      </div>
      <div class="of-video-float__info-row">
        <span class="label">所属营地：</span>
        <span class="value">{{ device?.campName || '--' }}</span>
      </div>
      <div class="of-video-float__info-row">
        <span class="label">站点：</span>
        <span class="value">{{ device?.siteName || '--' }}</span>
      </div>
      <div class="of-video-float__info-row">
        <span class="label">服务器：</span>
        <span class="value">{{ device?.serverName || '--' }}</span>
      </div>
      <div class="of-video-float__info-row">
        <span class="label">IP地址：</span>
        <span class="value">{{ device?.ipAddress || '--' }}</span>
      </div>
      <div class="of-video-float__info-row">
        <span class="label">在线状态：</span>
        <span class="value">
          <a-tag :color="device?.online ? '#52c41a' : '#ff4d4f'">
            {{ device?.online ? '在线' : '离线' }}
          </a-tag>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  VideoCameraOutlined,
  CloseOutlined,
  LoadingOutlined,
  DisconnectOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue'

type VideoState = 'loading' | 'playing' | 'offline' | 'failed'

interface DeviceVideoFloatWindowProps {
  visible: boolean
  device?: {
    id: string
    name: string
    campName: string
    siteName: string
    serverName: string
    ipAddress: string
    online: boolean
  }
}

const props = defineProps<DeviceVideoFloatWindowProps>()

const emit = defineEmits<{
  close: []
}>()

// ========== 浮窗位置与拖动 ==========

const floatWindowRef = ref<HTMLElement>()
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStartPos = ref({ x: 0, y: 0 })

onMounted(() => {
  // 初始位置：右上角距边缘 24px
  position.value = {
    x: window.innerWidth - 480 - 24,
    y: 24,
  }
})

function startDrag(e: MouseEvent) {
  isDragging.value = true
  dragStartPos.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  position.value = {
    x: e.clientX - dragStartPos.value.x,
    y: e.clientY - dragStartPos.value.y,
  }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// ========== 视频状态机 ==========

const videoState = ref<VideoState>('loading')

watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible && props.device) {
      // 打开时根据设备在线状态初始化
      if (!props.device.online) {
        videoState.value = 'offline'
      } else {
        videoState.value = 'loading'
        // 模拟视频加载：1秒后进入播放态
        setTimeout(() => {
          if (props.visible && videoState.value === 'loading') {
            videoState.value = 'playing'
          }
        }, 1000)
      }
    }
  },
  { immediate: true }
)

// 监听设备在线状态变化（WS 推送）
watch(
  () => props.device?.online,
  (newOnline, oldOnline) => {
    if (oldOnline === undefined || newOnline === oldOnline) return

    if (!newOnline) {
      // 设备掉线
      videoState.value = 'offline'
    } else {
      // 设备恢复在线，自动重新加载
      videoState.value = 'loading'
      setTimeout(() => {
        if (props.visible && videoState.value === 'loading') {
          videoState.value = 'playing'
        }
      }, 1000)
    }
  }
)

function handleClose() {
  emit('close')
}
</script>

<style scoped lang="scss">
.of-video-float {
  position: fixed;
  width: 480px;
  background: var(--of-bg-primary);
  border: 1px solid var(--of-border-color);
  border-radius: var(--of-radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--of-bg-secondary);
    border-bottom: 1px solid var(--of-border-color);
    cursor: move;
    user-select: none;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--of-font-size-base);
    font-weight: 500;
    color: var(--of-text-primary);
  }

  &__icon {
    font-size: 16px;
    color: var(--of-color-primary);
  }

  &__close {
    font-size: 14px;
    color: var(--of-text-tertiary);
    cursor: pointer;
    padding: 4px;

    &:hover {
      color: var(--of-text-primary);
    }
  }

  &__body {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    position: relative;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;

    &.loading {
      background: #1a1a1a;
    }

    &.playing {
      background: #0a0a0a;
    }

    &.offline {
      background: #141414;
    }

    &.failed {
      background: #1a1a1a;
    }
  }

  &__overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  &__state-icon {
    font-size: 48px;
    color: rgba(255, 255, 255, 0.6);

    .loading & {
      color: var(--of-color-primary);
    }

    .offline & {
      color: #ff4d4f;
    }

    .failed & {
      color: #faad14;
    }
  }

  &__state-text {
    font-size: var(--of-font-size-lg);
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
  }

  &__state-hint {
    font-size: var(--of-font-size-sm);
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
  }

  &__info {
    padding: 12px 16px;
    background: var(--of-bg-secondary);
    border-top: 1px solid var(--of-border-color);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__info-row {
    display: flex;
    font-size: var(--of-font-size-sm);

    .label {
      color: var(--of-text-tertiary);
      width: 80px;
      flex-shrink: 0;
    }

    .value {
      color: var(--of-text-primary);
      flex: 1;
      word-break: break-all;
    }
  }
}
</style>
