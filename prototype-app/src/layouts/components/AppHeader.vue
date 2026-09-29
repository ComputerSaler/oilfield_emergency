<script setup lang="ts">
/** 顶栏 52px —— 背景色 #1E262F / padding 0 17px / Logo 38px / 标题 20px */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import type { NavItem } from '@/config/navigation'

defineProps<{ nav: NavItem[]; active: string }>()
const emit = defineEmits<{ change: [key: string] }>()

const now = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }, 1000)
})
onBeforeUnmount(() => timer && window.clearInterval(timer))

function onSelect(info: { key: string | number }) {
  emit('change', String(info.key))
}
</script>

<template>
  <a-layout-header class="of-header">
    <div class="of-header__brand">
      <img class="of-header__logo" src="/logo.svg" alt="logo" />
      <span class="of-header__title">数智应急指挥平台</span>
    </div>

    <a-menu
      class="of-header__nav"
      mode="horizontal"
      theme="dark"
      :selected-keys="[active]"
      @select="onSelect"
    >
      <a-menu-item v-for="item in nav" :key="item.key">
        <component :is="item.icon" v-if="item.icon" />
        <span>{{ item.label }}</span>
      </a-menu-item>
    </a-menu>

    <div class="of-header__extra">
      <span class="of-header__clock">{{ now }}</span>
      <a-select
        class="of-header__lang"
        value="CH"
        :options="[
          { value: 'CH', label: 'CH' },
          { value: 'EN', label: 'EN' },
        ]"
        size="small"
      />
      <a-avatar size="small">
        <template #icon><UserOutlined /></template>
      </a-avatar>
    </div>
  </a-layout-header>
</template>

<style scoped lang="scss">
.of-header {
  display: flex;
  align-items: center;
  height: var(--of-layout-header-height);
  padding: 0 var(--of-layout-header-padding-x);
  line-height: var(--of-layout-header-height);
  background: var(--of-bg-header);

  &__brand {
    display: flex;
    flex-shrink: 0;
    gap: var(--of-spacing-3);
    align-items: center;
  }

  &__logo {
    width: var(--of-layout-logo-size);
    height: var(--of-layout-logo-size);
  }

  &__title {
    font-family: var(--of-font-family-brand);
    font-size: var(--of-font-size-xl);
    color: var(--of-text-brand);
    white-space: nowrap;
  }

  // 全流式：导航区吃满中间剩余空间
  &__nav {
    flex: 1;
    min-width: 0;
    margin-left: var(--of-spacing-6);
    background: transparent;
    border-bottom: none;
  }

  &__extra {
    display: flex;
    flex-shrink: 0;
    gap: var(--of-spacing-4);
    align-items: center;
  }

  &__clock {
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-primary);
    white-space: nowrap;
  }

  &__lang {
    width: 72px;
  }
}
</style>
