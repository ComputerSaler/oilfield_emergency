/**
 * C类机巢 Demo Store
 * 用于演示控制台的状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { NEST_DEVICES, INIT_TELEMETRY, type CNestDevice, type CNestTelemetry, type AccessStatus } from '@/mock/cNest'

export const useCNestDemoStore = defineStore('cNestDemo', () => {
  // 设备列表（机巢）
  const devices = ref<CNestDevice[]>(NEST_DEVICES)

  // 接入状态映射（按机巢ID）
  const accessStatusById = ref<Record<string, AccessStatus>>({})

  // 遥测数据映射（按机巢ID）
  const telemetryById = ref<Record<string, CNestTelemetry>>({})

  // 最后更新时间映射（按机巢ID）
  const lastUpdatedById = ref<Record<string, string>>({})

  // WebSocket 状态
  const wsState = ref<'CONNECTED' | 'DISCONNECTED' | 'UNAVAILABLE'>('CONNECTED')

  // 中台平台状态
  const midPlatformOk = ref(true)

  // 列表变化消息
  const listChangedMsg = ref<string | null>(null)

  // 初始化接入状态和遥测数据
  devices.value.forEach((device) => {
    accessStatusById.value[device.nest_id] = device.access_status
    telemetryById.value[device.nest_id] = INIT_TELEMETRY[device.nest_id] || null
    lastUpdatedById.value[device.nest_id] = device.last_sync_at
  })

  // 方法
  function wsReconnect() {
    console.log('重连 WebSocket')
    wsState.value = 'CONNECTED'
  }

  return {
    devices,
    accessStatusById,
    telemetryById,
    lastUpdatedById,
    wsState,
    midPlatformOk,
    listChangedMsg,
    wsReconnect,
  }
})
