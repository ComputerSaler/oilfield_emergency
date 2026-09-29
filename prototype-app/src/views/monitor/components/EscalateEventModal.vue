<script setup lang="ts">
/**
 * 升级为事件弹窗
 * 替换 window.prompt()，提供完整的表单输入界面
 */
import { ref, watch } from 'vue'
import { Modal, Form, Input, Select, message } from 'ant-design-vue'
import type { Alert } from '@/types/alert'
import { EventLevel, AlertLevel } from '@/types/alert'

interface Props {
  visible: boolean
  alert: Alert | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [eventData: { title: string; level: string; description: string }]
}>()

// 表单数据
const formState = ref({
  title: '',
  level: EventLevel.Level3,
  description: ''
})

// 监听弹窗打开，初始化表单
watch(() => props.visible, (visible) => {
  if (visible && props.alert) {
    // 根据预警信息预填表单
    const titlePrefix = props.alert.title || '异常事件'
    const levelMapping = {
      [AlertLevel.High]: EventLevel.Level2,
      [AlertLevel.Medium]: EventLevel.Level3,
      [AlertLevel.Low]: EventLevel.Level4
    }

    formState.value = {
      title: `${titlePrefix} - ${props.alert.location}`,
      level: levelMapping[props.alert.level] || EventLevel.Level3,
      description: `预警来源：${props.alert.id}\n预警等级：${props.alert.level}\n位置：${props.alert.location}\n时间：${props.alert.time}`
    }
  }
})

// 事件等级选项（根据PRD应急响应分级）
const levelOptions = [
  { value: EventLevel.Level1, label: 'Ⅰ级事件（特别重大）', color: '#ff4d4f' },
  { value: EventLevel.Level2, label: 'Ⅱ级事件（重大）', color: '#ff7a45' },
  { value: EventLevel.Level3, label: 'Ⅲ级事件（较大）', color: '#ffa940' },
  { value: EventLevel.Level4, label: 'Ⅳ级事件（一般）', color: '#ffc53d' }
]

function handleCancel() {
  emit('update:visible', false)
}

function handleOk() {
  // 表单验证
  if (!formState.value.title.trim()) {
    message.warning('请输入事件标题')
    return
  }
  if (!formState.value.description.trim()) {
    message.warning('请输入事件描述')
    return
  }

  emit('confirm', {
    title: formState.value.title.trim(),
    level: formState.value.level,
    description: formState.value.description.trim()
  })
  emit('update:visible', false)
}
</script>

<template>
  <Modal
    :open="visible"
    title="升级为事件"
    ok-text="确认升级"
    cancel-text="取消"
    width="520px"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="escalate-modal">
      <div class="escalate-modal__tip">
        将预警 <strong>{{ alert?.id }}</strong> 升级为事件后，系统将自动创建事件记录并归档，预警状态更新为"已升级"。
      </div>

      <Form layout="vertical" :model="formState" style="margin-top: 20px">
        <Form.Item label="事件标题" required>
          <Input
            v-model:value="formState.title"
            placeholder="请输入事件标题"
            :maxlength="100"
            show-count
          />
        </Form.Item>

        <Form.Item label="事件等级" required>
          <Select v-model:value="formState.level" style="width: 100%">
            <Select.Option
              v-for="opt in levelOptions"
              :key="opt.value"
              :value="opt.value"
            >
              <span :style="{ color: opt.color, fontWeight: 500 }">{{ opt.label }}</span>
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="事件描述" required>
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入事件描述，包括发生地点、时间、涉及人员/设备等关键信息"
            :rows="5"
            :maxlength="500"
            show-count
          />
        </Form.Item>
      </Form>
    </div>
  </Modal>
</template>

<style scoped>
.escalate-modal__tip {
  padding: 12px;
  background: var(--of-card-bg);
  border-left: 3px solid var(--of-warning);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--of-text-secondary);
}

.escalate-modal__tip strong {
  color: var(--of-text-primary);
  font-weight: 600;
}
</style>
