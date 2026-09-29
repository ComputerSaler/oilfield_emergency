<script setup lang="ts">
/**
 * 关闭预警确认弹窗
 * 需要填写关闭原因
 */
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  alertTitle?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [reason: string]
}>()

// 关闭原因
const closeReason = ref('')

// 常用原因选项
const commonReasons = [
  { value: 'false_alarm', label: '误报' },
  { value: 'persuaded', label: '已劝退' },
  { value: 'naturally_disappeared', label: '自然消失' },
  { value: 'other', label: '其他' }
]

// 监听弹窗打开，重置表单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    closeReason.value = ''
  }
})

function handleConfirm() {
  if (!closeReason.value.trim()) {
    return
  }
  emit('confirm', closeReason.value)
  emit('update:visible', false)
}

function handleCancel() {
  emit('update:visible', false)
}

function selectCommonReason(reason: string) {
  closeReason.value = reason
}
</script>

<template>
  <a-modal
    :open="visible"
    title="确认关闭预警"
    :width="500"
    @cancel="handleCancel"
  >
    <div class="close-alert-modal">
      <div class="alert-info">
        <span class="label">预警标题：</span>
        <span class="value">{{ alertTitle || '未知预警' }}</span>
      </div>

      <div class="reason-section">
        <div class="section-label">关闭原因<span class="required">*</span></div>

        <!-- 常用原因快捷选择 -->
        <div class="common-reasons">
          <a-button
            v-for="reason in commonReasons"
            :key="reason.value"
            size="small"
            :type="closeReason === reason.label ? 'primary' : 'default'"
            @click="selectCommonReason(reason.label)"
          >
            {{ reason.label }}
          </a-button>
        </div>

        <!-- 详细原因输入 -->
        <a-textarea
          v-model:value="closeReason"
          placeholder="请输入关闭原因（必填）"
          :rows="4"
          :maxlength="200"
          show-count
        />
      </div>

      <div class="warning-box">
        <span class="warning-icon">⚠️</span>
        <span>关闭后预警将从待处理列表移除，确认要关闭吗？</span>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" danger :disabled="!closeReason.trim()" @click="handleConfirm">
        确认关闭
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped lang="scss">
.close-alert-modal {
  .alert-info {
    display: flex;
    margin-bottom: var(--of-spacing-5);
    padding: var(--of-spacing-3);
    background: var(--of-bg-body);
    border-radius: var(--of-radius-base);
    font-size: var(--of-font-size-sm);

    .label {
      color: var(--of-text-tertiary);
      min-width: 80px;
    }

    .value {
      flex: 1;
      color: var(--of-text-primary);
      font-weight: var(--of-font-weight-medium);
    }
  }

  .reason-section {
    margin-bottom: var(--of-spacing-4);

    .section-label {
      font-size: var(--of-font-size-base);
      color: var(--of-text-primary);
      margin-bottom: var(--of-spacing-3);

      .required {
        color: #ff4757;
        margin-left: 2px;
      }
    }

    .common-reasons {
      display: flex;
      gap: var(--of-spacing-2);
      margin-bottom: var(--of-spacing-3);
      flex-wrap: wrap;
    }
  }

  .warning-box {
    display: flex;
    align-items: center;
    gap: var(--of-spacing-2);
    padding: var(--of-spacing-3);
    background: rgba(255, 193, 7, 0.1);
    border-left: 3px solid #ffc107;
    border-radius: var(--of-radius-base);
    font-size: var(--of-font-size-sm);
    color: var(--of-text-secondary);

    .warning-icon {
      font-size: 16px;
    }
  }
}
</style>
