<script setup lang="ts">
/**
 * 表单弹窗 —— 规格：宽 600px、面板 rgba(30,38,47,.85)、标题栏 #182028 16px/500
 * body padding 24px、表单项间距 24px、页脚 10px 16px + 上分割线 #2F4852
 * 页脚按钮顺序：取消(次级) → 确定(主)
 */
const props = defineProps<{
  open: boolean
  title: string
  confirmLoading?: boolean
  width?: number
}>()
const emit = defineEmits<{ 'update:open': [v: boolean]; ok: []; cancel: [] }>()

function onCancel() {
  emit('update:open', false)
  emit('cancel')
}
</script>

<template>
  <a-modal
    class="of-modal"
    :open="props.open"
    :title="title"
    :width="width ?? 600"
    :confirm-loading="confirmLoading"
    :mask-closable="false"
    centered
    @cancel="onCancel"
  >
    <a-form :label-col="{ style: { width: '92px' } }" label-align="right">
      <slot />
    </a-form>

    <template #footer>
      <a-button class="of-modal__btn of-modal__btn--default" @click="onCancel">
        取消
      </a-button>
      <a-button
        class="of-modal__btn"
        type="primary"
        :loading="confirmLoading"
        @click="emit('ok')"
      >
        确定
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped lang="scss">
.of-modal {
  &__btn {
    width: var(--of-btn-width);
    border-radius: var(--of-radius-none);

    &--default {
      color: var(--of-text-primary);
      background: var(--of-bg-btn-default);
      border-color: transparent;

      &:hover {
        color: var(--of-text-primary);
        background: var(--of-bg-btn-default-hover);
        border-color: transparent;
      }
    }
  }
}
</style>
