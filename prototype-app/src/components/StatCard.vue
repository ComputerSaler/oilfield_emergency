<script setup lang="ts">
/**
 * 统计卡片 —— 业务页右侧面板规格：
 * 标签 12px/#FFF、数值 28px/700/#D4F8FF、卡片 padding 10px、3 列网格
 */
import type { StatItem } from '@/types/ui'

withDefaults(defineProps<{ items: StatItem[]; columns?: number }>(), { columns: 3 })
</script>

<template>
  <div
    class="of-stat"
    :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
  >
    <div v-for="item in items" :key="item.label" class="of-stat__cell">
      <div class="of-stat__label">{{ item.label }}</div>
      <div class="of-stat__value" :class="`of-stat__value--${item.tone ?? 'ice'}`">
        {{ item.value }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.of-stat {
  display: grid;
  gap: var(--of-spacing-2);
  width: 100%;
  padding: 10px;

  &__label {
    font-size: var(--of-font-size-xs);
    line-height: var(--of-line-height-xs);
    color: var(--of-text-primary);
  }

  &__value {
    font-size: var(--of-font-size-stat);
    font-weight: var(--of-font-weight-bold);
    line-height: var(--of-line-height-stat);

    &--ice {
      color: var(--of-color-accent-ice);
    }

    &--error {
      color: var(--of-color-error);
    }

    &--link {
      color: var(--of-color-link);
    }
  }
}
</style>
