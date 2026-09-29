<script setup lang="ts">
/**
 * 待确认徽标 —— 标记 PRD 8.x 尚未获业主/金信答复、原型按假定值实现的取值
 * 橙色标签样式，用于标识需要客户决策确认的问题项
 */
import { PENDING_QUESTIONS } from '@/mock/aUav'

const props = defineProps<{ q: string; compact?: boolean }>()
const info = PENDING_QUESTIONS[props.q]
</script>

<template>
  <a-tooltip>
    <template #title>
      <div class="of-pending__tip">
        <b>{{ q }} {{ info?.title }}</b>
        <div>原型假定：{{ info?.assume }}</div>
        <div class="of-pending__tip-note">需业主/金信确认后方可定稿</div>
      </div>
    </template>
    <span class="of-pending">{{ compact ? q : `待确认 ${q}` }}</span>
  </a-tooltip>
</template>

<style scoped lang="scss">
.of-pending {
  display: inline-block;
  flex-shrink: 0;
  padding: 0 6px;
  font-size: var(--of-font-size-xs);
  line-height: 18px;
  color: var(--of-color-warning);
  white-space: nowrap;
  cursor: help;
  background: rgba(250, 173, 20, 0.12);
  border: var(--of-border-width) solid rgba(250, 173, 20, 0.45);
  border-radius: var(--of-radius-sm);

  &__tip {
    font-size: var(--of-font-size-xs);
    line-height: 18px;

    &-note {
      margin-top: 2px;
      color: var(--of-color-warning);
    }
  }
}
</style>
