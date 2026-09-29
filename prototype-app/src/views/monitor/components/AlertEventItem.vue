<script setup lang="ts">
/**
 * 预警/事件列表项组件
 * 支持两种类型：预警（黄色边框）/ 事件（红/橙/黄/蓝边框，按等级）
 */
import { EnvironmentOutlined, FileTextOutlined } from '@ant-design/icons-vue'

defineProps<{
  type: 'alert' | 'event'
  level: 'high' | 'medium' | 'low' | 'level_1' | 'level_2' | 'level_3' | 'level_4'
  title: string
  time: string
  status: string
  source: string
  location: string
  showActions?: boolean
}>()

const emit = defineEmits<{
  detail: []
  createDispatch: []
  locate: []
}>()
</script>

<template>
  <div class="alert-event-item" :class="[`type-${type}`, `level-${level}`]" @click="emit('detail')">
    <div class="item-header">
      <span class="item-icon">
        {{ type === 'alert' ? '🟡' : level === 'level_1' ? '🔴' : level === 'level_2' ? '🟠' : level === 'level_3' ? '🟡' : '🔵' }}
      </span>
      <span class="item-title">
        <span v-if="type === 'alert'" class="type-label">预警</span>
        <span v-else class="type-label">
          事件-{{ level === 'level_1' ? 'Ⅰ级' : level === 'level_2' ? 'Ⅱ级' : level === 'level_3' ? 'Ⅲ级' : 'Ⅳ级' }}
        </span>
        {{ title }}
      </span>

      <!-- 图标按钮组（右侧，横向排列） -->
      <div v-if="showActions" class="icon-actions" @click.stop>
        <a-tooltip title="定位">
          <a-button type="text" size="small" class="icon-btn" @click="emit('locate')">
            <template #icon><EnvironmentOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip v-if="type === 'alert'" title="生成调度卡片">
          <a-button type="text" size="small" class="icon-btn" @click="emit('createDispatch')">
            <template #icon><FileTextOutlined /></template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <div class="item-meta">
      <span class="meta-item">{{ time }}</span>
      <span class="meta-divider">|</span>
      <span class="meta-item">{{ status }}</span>
      <span class="meta-divider">|</span>
      <span class="meta-item" :class="`level-badge-${level}`">
        {{ type === 'alert' ? (level === 'high' ? '高危' : level === 'medium' ? '中危' : '低危') : '' }}
      </span>
    </div>

    <div class="item-info">
      <div class="info-row">
        <span class="info-label">来源：</span>
        <span class="info-value">{{ source }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">位置：</span>
        <span class="info-value">{{ location }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.alert-event-item {
  background: var(--of-bg-body);
  border-left: 3px solid transparent;
  border-radius: var(--of-radius-base);
  padding: var(--of-spacing-3);
  margin-bottom: var(--of-spacing-3);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--of-bg-row-hover);
  }

  /* 预警：黄色边框 */
  &.type-alert {
    border-left-color: #ffc107;
  }

  /* 事件：按等级分色 */
  &.type-event {
    &.level-level_1 {
      border-left-color: #ff4757; /* 红色 Ⅰ级 */
    }

    &.level-level_2 {
      border-left-color: #ff6b35; /* 橙色 Ⅱ级 */
    }

    &.level-level_3 {
      border-left-color: #ffc107; /* 黄色 Ⅲ级 */
    }

    &.level-level_4 {
      border-left-color: #0095ff; /* 蓝色 Ⅳ级 */
    }
  }

  .item-header {
    display: flex;
    align-items: center;
    gap: var(--of-spacing-2);
    margin-bottom: var(--of-spacing-2);

    .item-icon {
      font-size: 16px;
      line-height: 1;
      flex-shrink: 0;
    }

    .item-title {
      flex: 1;
      font-size: var(--of-font-size-base);
      font-weight: var(--of-font-weight-medium);
      color: var(--of-text-primary);
      min-width: 0;

      .type-label {
        display: inline-block;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        font-size: var(--of-font-size-xs);
        margin-right: var(--of-spacing-1);
      }
    }

    /* 图标按钮组 */
    .icon-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
      margin-left: auto;

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

  .item-meta {
    display: flex;
    align-items: center;
    gap: var(--of-spacing-2);
    margin-bottom: var(--of-spacing-2);
    font-size: var(--of-font-size-xs);
    color: var(--of-text-tertiary);

    .meta-divider {
      color: var(--of-border-table);
    }

    .level-badge-high {
      color: #ff4757;
      font-weight: var(--of-font-weight-medium);
    }

    .level-badge-medium {
      color: #ff6b35;
      font-weight: var(--of-font-weight-medium);
    }

    .level-badge-low {
      color: #ffc107;
      font-weight: var(--of-font-weight-medium);
    }
  }

  .item-info {
    .info-row {
      display: flex;
      font-size: var(--of-font-size-xs);
      line-height: 20px;
      color: var(--of-text-secondary);

      .info-label {
        color: var(--of-text-tertiary);
        min-width: 48px;
      }

      .info-value {
        flex: 1;
      }
    }
  }
}
</style>
