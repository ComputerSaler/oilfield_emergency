<script setup lang="ts">
/** 占位页 —— 菜单已规划、原型未实现时的空态，避免点击白屏 */
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <PageContainer :title="String(route.params.name ?? '待实现')">
    <PanelCard>
      <a-empty description="此页面原型尚未实现" />
    </PanelCard>
  </PageContainer>
</template>
