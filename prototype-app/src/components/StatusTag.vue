<script setup lang="ts">
/**
 * 状态标签 —— 文字 + 颜色双编码（非功能项 B-08：不允许仅靠颜色表达状态）
 * tone 语义：info 中性 / ok 正常 / warn 延迟 / danger 中断 / mute 停用归档
 */
withDefaults(
  defineProps<{
    tone?: 'info' | 'ok' | 'warn' | 'danger' | 'mute' | 'pending'
    /** solid = 实心（已停用）；默认描边 */
    variant?: 'outline' | 'solid'
  }>(),
  { tone: 'info', variant: 'outline' },
)
</script>

<template>
  <span class="of-tag" :class="[`of-tag--${tone}`, `of-tag--${variant}`]">
    <slot />
  </span>
</template>

<style scoped lang="scss">
.of-tag {
  display: inline-flex;
  flex-shrink: 0;
  gap: 4px;
  align-items: center;
  padding: 0 7px;
  font-size: var(--of-font-size-xs);
  line-height: 20px;
  white-space: nowrap;
  border: var(--of-border-width) solid transparent;
  border-radius: var(--of-radius-sm);

  &--info {
    color: var(--of-color-accent-ice);
    background: rgba(20, 129, 166, 0.22);
    border-color: var(--of-color-primary-border);
  }

  &--ok {
    color: var(--of-color-success);
    background: rgba(82, 196, 26, 0.14);
    border-color: rgba(82, 196, 26, 0.45);
  }

  &--warn {
    color: var(--of-color-warning);
    background: rgba(250, 173, 20, 0.12);
    border-color: rgba(250, 173, 20, 0.45);
  }

  &--danger {
    color: var(--of-color-error);
    background: rgba(255, 102, 102, 0.12);
    border-color: rgba(255, 102, 102, 0.45);
  }

  &--mute {
    color: var(--of-text-quaternary);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.18);
  }

  &--pending {
    color: var(--of-color-accent-cyan);
    background: rgba(109, 210, 232, 0.12);
    border-color: rgba(109, 210, 232, 0.4);
  }

  // 实心变体：已停用行标签，与描边态区分
  &--solid.of-tag--mute {
    color: var(--of-text-secondary);
    background: rgba(255, 255, 255, 0.14);
    border-color: transparent;
  }
}
</style>
