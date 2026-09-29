<script setup lang="ts">
/**
 * 页面容器 —— 复刻现有系统内容区结构
 * 面包屑标题条（40px 行高）+ 若干卡片区块，全流式自适应
 */
defineProps<{ title: string }>()
</script>

<template>
  <div class="of-page">
    <div class="of-page__title">{{ title }}</div>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.of-page {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-4);
  width: 100%;

  &__title {
    height: var(--of-control-height-menu);
    font-size: var(--of-font-size-base);
    line-height: var(--of-control-height-menu);
    color: var(--of-text-primary);
  }
}
</style>
