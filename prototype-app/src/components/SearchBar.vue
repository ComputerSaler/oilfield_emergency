<script setup lang="ts">
/**
 * 查询栏 —— 规格：卡片底 #18222B / padding 16px / 高 64px
 * 按钮定宽 76x32，顺序为 重置(次级) → 查询(主) → 新增(主)
 * 全流式自适应：条件区 flex-wrap，按钮组右对齐
 */
defineProps<{ loading?: boolean; showCreate?: boolean }>()
const emit = defineEmits<{ search: []; reset: []; create: [] }>()
</script>

<template>
  <PanelCard class="of-search">
    <div class="of-search__fields">
      <slot />
    </div>

    <div class="of-search__actions">
      <a-button class="of-search__btn of-search__btn--default" @click="emit('reset')">
        重置
      </a-button>
      <a-button
        class="of-search__btn"
        type="primary"
        :loading="loading"
        @click="emit('search')"
      >
        查询
      </a-button>
      <a-button
        v-if="showCreate"
        class="of-search__btn"
        type="primary"
        @click="emit('create')"
      >
        新增
      </a-button>
    </div>
  </PanelCard>
</template>

<style scoped lang="scss">
.of-search {
  display: flex;
  flex-wrap: wrap;
  gap: var(--of-spacing-4);
  align-items: center;
  // 规格：按钮组紧随条件区左对齐（非右对齐），条件过多时整行换行
  justify-content: flex-start;

  &__fields {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-4) var(--of-spacing-5);
    align-items: center;
    min-width: 0;
  }

  // 按钮间距 8px
  &__actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--of-spacing-2);
  }

  // 标准宽度 76px、无圆角
  &__btn {
    width: var(--of-btn-width);
    border-radius: var(--of-radius-none);

    &--default {
      color: var(--of-text-primary);
      background: var(--of-bg-btn-default);
      border-color: transparent;

      &:hover {
        color: var(--of-text-primary);
        // [推导] 现有系统自绘按钮无 hover 态，按 antd 提亮规则补
        background: var(--of-bg-btn-default-hover);
        border-color: transparent;
      }
    }
  }
}
</style>
