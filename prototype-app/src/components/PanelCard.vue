<script setup lang="ts">
/** 卡片容器 —— 规格 bg #18222B / padding 16px / 无圆角无阴影 */
withDefaults(defineProps<{ padding?: string }>(), { padding: '' })
</script>

<template>
  <section class="of-card" :style="padding ? { padding } : undefined">
    <slot />
  </section>
</template>

<style scoped lang="scss">
.of-card {
  width: 100%;
  padding: var(--of-spacing-4);
  background: var(--of-bg-card);
  border-radius: var(--of-radius-none);
}
</style>
