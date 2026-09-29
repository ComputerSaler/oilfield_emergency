<template>
  <a-modal
    :open="visible"
    title="升级为事件"
    width="600px"
    :maskClosable="false"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <a-form :model="formData" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
      <!-- 原始预警信息（只读） -->
      <a-form-item label="原预警">
        <div class="alert-info">
          <div class="info-row">
            <span class="label">标题：</span>
            <span class="value">{{ alert?.title || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">位置：</span>
            <span class="value">{{ alert?.location || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">时间：</span>
            <span class="value">{{ alert?.time || '-' }}</span>
          </div>
        </div>
      </a-form-item>

      <a-divider style="margin: 12px 0" />

      <!-- 事件标题 -->
      <a-form-item label="事件标题" required>
        <a-input
          v-model:value="formData.title"
          placeholder="请输入事件标题"
          :maxlength="100"
          show-count
        />
      </a-form-item>

      <!-- 事件等级（下拉选择） -->
      <a-form-item label="事件等级" required>
        <a-select v-model:value="formData.level" placeholder="请选择事件等级">
          <a-select-option value="critical">重大事件</a-select-option>
          <a-select-option value="major">较大事件</a-select-option>
          <a-select-option value="general">一般事件</a-select-option>
        </a-select>
      </a-form-item>

      <!-- 事件描述 -->
      <a-form-item label="事件描述" required>
        <a-textarea
          v-model:value="formData.description"
          placeholder="请详细描述事件情况、影响范围、应对措施等"
          :rows="6"
          :maxlength="500"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps<{
  visible: boolean
  alert: any
}>()

const emit = defineEmits<{
  confirm: [data: { title: string; level: string; description: string }]
  cancel: []
}>()

const formData = ref({
  title: '',
  level: '',
  description: '',
})

// 当弹窗打开时，预填充标题
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.alert) {
      formData.value.title = `【升级】${props.alert.title}`
      formData.value.level = ''
      formData.value.description = ''
    }
  },
)

function handleConfirm() {
  // 表单验证
  if (!formData.value.title.trim()) {
    message.warning('请输入事件标题')
    return
  }
  if (!formData.value.level) {
    message.warning('请选择事件等级')
    return
  }
  if (!formData.value.description.trim()) {
    message.warning('请输入事件描述')
    return
  }

  emit('confirm', {
    title: formData.value.title.trim(),
    level: formData.value.level,
    description: formData.value.description.trim(),
  })
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped lang="scss">
.alert-info {
  padding: 12px;
  background: var(--of-bg-card);
  border-radius: 4px;
  border: 1px solid var(--of-border-base);

  .info-row {
    display: flex;
    margin-bottom: 8px;
    font-size: 13px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      flex-shrink: 0;
      width: 70px;
      color: var(--of-text-tertiary);
    }

    .value {
      flex: 1;
      color: var(--of-text-primary);
    }
  }
}
</style>
