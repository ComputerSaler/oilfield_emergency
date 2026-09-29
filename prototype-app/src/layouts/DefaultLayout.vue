<script setup lang="ts">
/**
 * 主框架布局 —— 标准两栏布局
 * 顶栏 52px（Logo + 平台名 + 一级模块 + 时钟 + 语言 + 用户）
 * 侧栏 256px（可折叠至 48px）+ 内容区全流式自适应
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppSider from './components/AppSider.vue'
import { PRIMARY_NAV, SIDE_MENUS } from '@/config/navigation'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)

/** 当前一级模块 key，由路由 meta.module 决定 */
const activeModule = computed(() => (route.meta.module as string) ?? PRIMARY_NAV[0].key)

/** 当前模块对应的侧栏菜单 */
const sideMenu = computed(() => SIDE_MENUS[activeModule.value] ?? [])

/**
 * 侧栏选中项 = 当前路由 name；
 * 详情页等无独立菜单项的路由用 meta.activeMenu 指回父级菜单
 */
const selectedKeys = computed(() => [
  (route.meta.activeMenu as string) ?? (route.name as string),
])

function onModuleChange(key: string) {
  const nav = PRIMARY_NAV.find((n) => n.key === key)
  if (nav?.defaultRoute) router.push({ name: nav.defaultRoute })
}
</script>

<template>
  <a-layout class="of-layout">
    <AppHeader
      :nav="PRIMARY_NAV"
      :active="activeModule"
      @change="onModuleChange"
    />

    <a-layout class="of-layout__body">
      <AppSider
        v-if="sideMenu.length"
        v-model:collapsed="collapsed"
        :menu="sideMenu"
        :selected-keys="selectedKeys"
      />

      <a-layout-content class="of-layout__content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped lang="scss">
.of-layout {
  min-height: 100vh;
  background: var(--of-bg-body);

  &__body {
    background: var(--of-bg-body);
  }

  // 全流式自适应：内容区吃满剩余宽度，不设 max-width
  &__content {
    padding: var(--of-layout-content-padding);
    overflow: auto;
  }
}
</style>
