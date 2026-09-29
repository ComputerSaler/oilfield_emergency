<script setup lang="ts">
/**
 * GPS 实时监控 —— 复刻现有系统 业务应用 页
 * 结构：地图铺满 + 右侧 368px 面板（Tab 切换 / 3列统计 / 终端列表）
 * 全流式自适应：地图吃满剩余宽度，面板定宽
 */
import { computed, ref } from 'vue'
import { TERMINALS } from '@/mock/terminals'
import type { StatItem } from '@/types/ui'

const activeTab = ref<'overview' | 'alarm'>('overview')
const keyword = ref('')
const showOnline = ref(true)
const showOffline = ref(true)

const stats: StatItem[] = [
  { label: '终端总数', value: 79 },
  { label: '当前在线数', value: 0 },
  { label: '当前离线数', value: 79 },
  { label: '当前告警', value: 0, tone: 'error' },
  { label: '当前SOS', value: 0, tone: 'error' },
  { label: '今日告警', value: 0, tone: 'error' },
]

const list = computed(() =>
  TERMINALS.filter((t) => {
    if (keyword.value && !t.name.toLowerCase().includes(keyword.value.toLowerCase())) return false
    if (!showOnline.value && t.online) return false
    if (!showOffline.value && !t.online) return false
    return true
  }),
)
</script>

<template>
  <div class="of-gps">
    <div class="of-gps__map">
      <div class="of-gps__map-hint">地图容器（接入 GIS 后替换）</div>
    </div>

    <aside class="of-gps__panel">
      <div class="of-gps__tabs">
        <button
          class="of-gps__tab"
          :class="{ 'of-gps__tab--active': activeTab === 'overview' }"
          type="button"
          @click="activeTab = 'overview'"
        >
          总览
        </button>
        <button
          class="of-gps__tab"
          :class="{ 'of-gps__tab--active': activeTab === 'alarm' }"
          type="button"
          @click="activeTab = 'alarm'"
        >
          告警
        </button>
      </div>

      <StatCard :items="stats" :columns="3" />

      <div class="of-gps__filter">
        <span class="of-gps__filter-label">终端</span>
        <a-input v-model:value="keyword" placeholder="请输入" size="small" />
        <a-checkbox v-model:checked="showOnline">在线</a-checkbox>
        <a-checkbox v-model:checked="showOffline">离线</a-checkbox>
      </div>

      <ul class="of-gps__list">
        <li v-for="item in list" :key="item.id" class="of-gps__item">
          <div class="of-gps__item-row">
            <span class="of-gps__dot" :class="{ 'of-gps__dot--on': item.online }" />
            <span class="of-gps__item-name of-text-ellipsis">{{ item.name }}</span>
            <span class="of-gps__item-time">{{ item.time }}</span>
          </div>
          <div class="of-gps__item-row of-gps__item-row--sub">
            <span>联系人</span>
            <a class="of-gps__item-link">详情</a>
          </div>
        </li>
      </ul>
    </aside>
  </div>
</template>

<style scoped lang="scss">
.of-gps {
  display: flex;
  gap: 0;
  height: calc(100vh - var(--of-layout-header-height) - var(--of-spacing-4) * 2);

  // 地图吃满剩余宽度
  &__map {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-width: 0;
    background: var(--of-bg-card);
  }

  &__map-hint {
    color: var(--of-text-quaternary);
  }

  &__panel {
    display: flex;
    flex: 0 0 var(--of-layout-panel-width);
    flex-direction: column;
    overflow: hidden;
    background: var(--of-bg-header);
  }

  &__tabs {
    display: flex;
  }

  // Tab 高 31px、16px 字、未选中 #87AAB2
  &__tab {
    flex: 1;
    height: 31px;
    font-size: var(--of-font-size-lg);
    color: var(--of-text-tab-inactive);
    cursor: pointer;
    background: rgba(30, 38, 47, 0.5);
    border: var(--of-border-width) solid rgba(109, 210, 232, 0.3);

    &--active {
      color: var(--of-text-primary);
      background: rgba(224, 252, 255, 0.4);
      border-color: rgba(109, 210, 232, 0.2);
    }
  }

  &__filter {
    display: flex;
    gap: var(--of-spacing-2);
    align-items: center;
    padding: 0 10px var(--of-spacing-2);
    font-size: var(--of-font-size-xs);
  }

  &__filter-label {
    flex-shrink: 0;
  }

  // 复选框文字不换行（标准为单行）
  &__filter :deep(.ant-checkbox-wrapper) {
    flex-shrink: 0;
    margin-inline-start: 0;
    font-size: var(--of-font-size-xs);
    white-space: nowrap;
  }

  &__list {
    flex: 1;
    padding: 0 10px;
    margin: 0;
    overflow-y: auto;
    list-style: none;
  }

  &__item {
    padding: var(--of-spacing-2) 0;
    border-bottom: var(--of-border-width) solid var(--of-border-table);
  }

  &__item-row {
    display: flex;
    gap: var(--of-spacing-2);
    align-items: center;
    font-size: var(--of-font-size-xs);
    line-height: 19px;

    &--sub {
      justify-content: space-between;
      color: var(--of-text-tertiary);
    }
  }

  &__dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    background: var(--of-color-error);
    border-radius: 50%;

    &--on {
      background: var(--of-color-success);
    }
  }

  &__item-name {
    flex: 1;
    min-width: 0;
  }

  &__item-time {
    flex-shrink: 0;
    color: var(--of-text-tertiary);
  }

  &__item-link {
    color: var(--of-color-link);
    cursor: pointer;
  }
}
</style>
