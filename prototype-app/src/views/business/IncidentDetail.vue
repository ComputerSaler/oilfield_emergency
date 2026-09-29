<script setup lang="ts">
/**
 * 事件详情页（PC 路由壳）—— 对应 PRD-事件管理-工作台 V1.0 §5.2–5.5
 * 页面内容与大屏事件覆盖层共用 IncidentDetailPanel（PRD-大屏-事件感知处置-事件 §2）
 */
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import IncidentDetailPanel from '@/components/incident/IncidentDetailPanel.vue'

const router = useRouter()
const route = useRoute()

const incidentId = computed(() => route.params.id as string)

function goBack() {
  router.push({ name: 'IncidentWorkbench' })
}

function goToAlert(alertId: string) {
  router.push({ name: 'AlertInvestigation', params: { id: alertId } })
}
</script>

<template>
  <IncidentDetailPanel
    :incident-id="incidentId"
    mode="page"
    @back="goBack"
    @open-alert="goToAlert"
  />
</template>
