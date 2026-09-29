<script setup lang="ts">
/**
 * 调度卡片生成弹窗
 * 支持三种导出格式：纯文本 / 图片 / 系统任务
 * Phase 5: 集成飞手数据，重置状态
 */
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  alertId?: string
  alertTitle?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [formats: string[], pilot?: string]
}>()

// 选中的导出格式
const selectedFormats = ref<string[]>(['text'])

// 选中的飞手领队
const selectedPilot = ref<string>()

// 飞手领队列表（Mock - Phase 5 原型阶段）
// TODO: Phase 6 从人员管理模块加载真实飞手数据
const pilots = [
  { value: 'pilot1', label: '张三（A类飞手）', status: 'online' },
  { value: 'pilot2', label: '李四（A类飞手）', status: 'online' },
  { value: 'pilot3', label: '王五（C类飞手）', status: 'offline' },
  { value: 'pilot4', label: '赵六（A类飞手）', status: 'online' },
]

// 是否选中了"系统任务"
const hasSystemTask = computed(() => selectedFormats.value.includes('system'))

// 监听弹窗打开，重置状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 弹窗打开时重置为默认状态
    selectedFormats.value = ['text']
    selectedPilot.value = undefined
  }
})

function handleConfirm() {
  // 获取飞手名称（用于显示）
  const pilotName = selectedPilot.value
    ? pilots.find(p => p.value === selectedPilot.value)?.label
    : undefined

  emit('confirm', selectedFormats.value, pilotName)
  emit('update:visible', false)
}

function handleCancel() {
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :open="visible"
    title="生成调度卡片"
    :width="500"
    @cancel="handleCancel"
  >
    <div class="dispatch-modal-content">
      <div class="format-section">
        <div class="section-label">请选择导出格式：</div>
        <a-checkbox-group v-model:value="selectedFormats" class="format-checkboxes">
          <a-checkbox value="text">
            <div class="checkbox-content">
              <div class="checkbox-title">纯文本</div>
              <div class="checkbox-desc">复制到剪贴板</div>
            </div>
          </a-checkbox>
          <a-checkbox value="image">
            <div class="checkbox-content">
              <div class="checkbox-title">图片</div>
              <div class="checkbox-desc">PNG，750x1200px</div>
            </div>
          </a-checkbox>
          <a-checkbox value="system">
            <div class="checkbox-content">
              <div class="checkbox-title">系统任务</div>
              <div class="checkbox-desc">推送到飞手领队App</div>
            </div>
          </a-checkbox>
        </a-checkbox-group>
      </div>

      <div v-if="hasSystemTask" class="pilot-section">
        <div class="section-label">飞手领队：</div>
        <a-select
          v-model:value="selectedPilot"
          placeholder="请选择飞手领队"
          style="width: 100%"
        >
          <a-select-option v-for="pilot in pilots" :key="pilot.value" :value="pilot.value">
            <span>{{ pilot.label }}</span>
            <span class="pilot-status" :class="pilot.status">
              （{{ pilot.status === 'online' ? '在线' : '离线' }}）
            </span>
          </a-select-option>
        </a-select>
      </div>

      <div class="preview-section">
        <div class="section-label">预览信息：</div>
        <div class="preview-box">
          <div class="preview-item">
            <span class="preview-label">预警ID：</span>
            <span class="preview-value">{{ alertId || '#20260822-0037' }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">预警标题：</span>
            <span class="preview-value">{{ alertTitle || '东围界人员入侵' }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">导出格式：</span>
            <span class="preview-value">
              {{ selectedFormats.length > 0 ? selectedFormats.map(f => {
                return f === 'text' ? '纯文本' : f === 'image' ? '图片' : '系统任务'
              }).join('、') : '未选择' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="selectedFormats.length === 0" @click="handleConfirm">
        确认生成
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped lang="scss">
.dispatch-modal-content {
  .format-section,
  .pilot-section,
  .preview-section {
    margin-bottom: var(--of-spacing-5);

    &:last-child {
      margin-bottom: 0;
    }

    .section-label {
      font-size: var(--of-font-size-base);
      color: var(--of-text-primary);
      margin-bottom: var(--of-spacing-3);
    }
  }

  .format-checkboxes {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-3);

    :deep(.ant-checkbox-wrapper) {
      margin: 0;
      padding: var(--of-spacing-3);
      background: var(--of-bg-body);
      border: var(--of-border-width) solid var(--of-border-table);
      border-radius: var(--of-radius-base);
      transition: all 0.2s;

      &:hover {
        border-color: var(--of-color-primary);
        background: var(--of-bg-row-hover);
      }

      &.ant-checkbox-wrapper-checked {
        border-color: var(--of-color-primary);
        background: rgba(20, 129, 166, 0.1);
      }
    }

    .checkbox-content {
      margin-left: var(--of-spacing-2);

      .checkbox-title {
        font-size: var(--of-font-size-base);
        color: var(--of-text-primary);
        margin-bottom: 2px;
      }

      .checkbox-desc {
        font-size: var(--of-font-size-xs);
        color: var(--of-text-tertiary);
      }
    }
  }

  .pilot-section {
    .pilot-status {
      margin-left: var(--of-spacing-1);
      font-size: var(--of-font-size-xs);

      &.online {
        color: var(--of-color-success);
      }

      &.offline {
        color: var(--of-text-tertiary);
      }
    }
  }

  .preview-section {
    .preview-box {
      background: var(--of-bg-body);
      border-radius: var(--of-radius-base);
      padding: var(--of-spacing-3);

      .preview-item {
        display: flex;
        font-size: var(--of-font-size-xs);
        line-height: 20px;
        margin-bottom: var(--of-spacing-2);

        &:last-child {
          margin-bottom: 0;
        }

        .preview-label {
          color: var(--of-text-tertiary);
          min-width: 80px;
          flex-shrink: 0;
        }

        .preview-value {
          flex: 1;
          color: var(--of-text-secondary);
        }
      }
    }
  }
}
</style>
