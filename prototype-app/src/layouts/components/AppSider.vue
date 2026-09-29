<script setup lang="ts">
/** 侧栏 256px / 折叠 48px —— 背景色 #1C2630、菜单项 40px、选中底 #166582 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { MenuNode } from '@/config/navigation'

const props = defineProps<{
  menu: MenuNode[]
  selectedKeys: string[]
  collapsed: boolean
}>()
const emit = defineEmits<{ 'update:collapsed': [v: boolean] }>()

const router = useRouter()
const openKeys = ref<string[]>(props.menu.map((m) => m.key))

const isCollapsed = computed({
  get: () => props.collapsed,
  set: (v: boolean) => emit('update:collapsed', v),
})

function onSelect({ key }: { key: string | number }) {
  router.push({ name: String(key) })
}
</script>

<template>
  <a-layout-sider
    v-model:collapsed="isCollapsed"
    class="of-sider"
    :width="256"
    :collapsed-width="48"
    :trigger="null"
    theme="dark"
  >
    <a-menu
      v-model:open-keys="openKeys"
      class="of-sider__menu"
      mode="inline"
      theme="dark"
      :selected-keys="selectedKeys"
      :inline-collapsed="isCollapsed"
      @select="onSelect"
    >
      <template v-for="group in menu" :key="group.key">
        <a-sub-menu v-if="group.children?.length" :key="group.key">
          <template #icon>
            <component :is="group.icon" v-if="group.icon" />
          </template>
          <template #title>{{ group.label }}</template>
          <a-menu-item v-for="child in group.children" :key="child.key">
            {{ child.label }}
          </a-menu-item>
        </a-sub-menu>

        <a-menu-item v-else :key="group.key">
          <template #icon>
            <component :is="group.icon" v-if="group.icon" />
          </template>
          {{ group.label }}
        </a-menu-item>
      </template>
    </a-menu>

    <button class="of-sider__trigger" type="button" @click="isCollapsed = !isCollapsed">
      <DoubleLeftOutlined v-if="!isCollapsed" />
      <DoubleRightOutlined v-else />
    </button>
  </a-layout-sider>
</template>

<style scoped lang="scss">
.of-sider {
  position: relative;
  background: var(--of-bg-sider);

  &__menu {
    background: transparent;
    border-inline-end: none;
  }

  // 折叠开关：位于侧栏左下角
  &__trigger {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    color: var(--of-text-tertiary);
    cursor: pointer;
    background: transparent;
    border: none;
    transition: color var(--of-transition-base);

    &:hover {
      color: var(--of-text-primary);
    }
  }
}
</style>
