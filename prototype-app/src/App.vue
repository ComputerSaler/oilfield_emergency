<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { antdThemeConfig } from './theme'
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="antdThemeConfig">
    <a-app>
      <router-view />
    </a-app>
  </a-config-provider>
</template>
