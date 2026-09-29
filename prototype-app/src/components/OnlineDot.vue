<script setup lang="ts">
/**
 * 在线状态圆点 —— 列表列 5 与详情基础信息区共用
 * ● 在线（绿）/ ○ 离线（灰）/ ◐ 未知（灰），文字 + 图形双编码（B-08）
 *
 * 平台超时判定的离线加虚线下划线并悬浮说明，与源系统推送的离线视觉区分（E-35）
 */
import { computed } from 'vue'
import type { OnlineSource, OnlineStatus } from '@/mock/aUav'

const props = withDefaults(
  defineProps<{
    status: OnlineStatus
    source?: OnlineSource
    /** WS 断开时整列附「非实时」提示（E-33） */
    notRealtime?: boolean
  }>(),
  { source: 'SOURCE_PUSH' },
)

const label = computed(
  () => ({ ONLINE: '在线', OFFLINE: '离线', UNKNOWN: '未知' })[props.status],
)
const glyph = computed(() => ({ ONLINE: '●', OFFLINE: '○', UNKNOWN: '◐' })[props.status])
</script>

<template>
  <span class="of-online">
    <span class="of-online__body" :class="`of-online--${status}`">
      <span class="of-online__dot">{{ glyph }}</span>{{ label }}
    </span>

    <a-tooltip v-if="notRealtime" title="实时更新已断开，该状态为静态快照">
      <span class="of-online__stale">非实时</span>
    </a-tooltip>
  </span>
</template>

<style scoped lang="scss">
.of-online {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;

  &__body {
    display: inline-flex;
    gap: 4px;
    align-items: center;

    // 平台超时判定：虚线下划线，与源系统推送的离线区分
    &--timeout {
      text-decoration: underline dashed currentcolor;
      text-underline-offset: 3px;
      cursor: help;
    }
  }

  &__dot {
    font-size: 12px;
    line-height: 1;
  }

  &--ONLINE {
    color: var(--of-color-success);
  }

  &--OFFLINE,
  &--UNKNOWN {
    color: var(--of-text-quaternary);
  }

  &__stale {
    padding: 0 4px;
    font-size: var(--of-font-size-xs);
    line-height: 16px;
    color: var(--of-text-quaternary);
    cursor: help;
    background: rgba(255, 255, 255, 0.06);
    border-radius: var(--of-radius-sm);
  }
}
</style>
