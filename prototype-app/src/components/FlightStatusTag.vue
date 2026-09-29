<script setup lang="ts">
/**
 * 飞行状态标签 —— 按字典映射为彩色文字标签（文字+颜色双编码）
 *
 * 未映射的源编码显示「未知（源值：xxx）」并触发字典治理提醒，
 * 禁止归入任何已知状态（E-19 / D-06）。
 * 已确认枚举：飞行中 / 未飞行
 */
import { computed } from 'vue'
import { flightStatusOf } from '@/mock/aUavNormalize'

const props = defineProps<{
  code: string | null
}>()

const dict = computed(() => flightStatusOf(props.code))
const tone = computed(() => {
  const t = dict.value?.tone
  if (t === 'flying') return 'ok'
  if (t === 'not_flying') return 'info'
  return 'mute'
})
</script>

<template>
  <span class="of-fs">
    <StatusTag :tone="tone">
      <template v-if="dict">{{ dict.label }}</template>
      <!-- 字典未映射：原样带出源值，不猜测语义 -->
      <template v-else-if="code">未知（源值：{{ code }}）</template>
      <template v-else>未知</template>
    </StatusTag>

    <a-tooltip v-if="!dict && code" title="该源编码未在飞行状态字典中配置，已触发字典治理提醒">
      <ExclamationCircleOutlined class="of-fs__dict-warn" />
    </a-tooltip>
  </span>
</template>

<style scoped lang="scss">
.of-fs {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;

  &__dict-warn {
    color: var(--of-color-error);
    cursor: help;
  }
}
</style>
