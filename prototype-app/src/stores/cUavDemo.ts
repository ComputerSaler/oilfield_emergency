/**
 * C类无人机 Demo Store
 * 用于演示控制台的状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEVICES, INIT_TELEMETRY, type CDevice, type CTelemetry, type AccessStatus } from '@/mock/cUav'

export const useCUavDemoStore = defineStore('cUavDemo', () => {
  // 设备列表
  const devices = ref<CDevice[]>(DEVICES)

  // 接入状态映射（按设备ID）
  const accessStatusById = ref<Record<string, AccessStatus>>({})

  // 遥测数据映射（按设备ID）
  const telemetryById = ref<Record<string, CTelemetry>>({})

  // 最后更新时间映射（按设备ID）
  const lastUpdatedById = ref<Record<string, string>>({})

  // WebSocket 状态
  const wsState = ref<'CONNECTED' | 'DISCONNECTED' | 'UNAVAILABLE'>('CONNECTED')

  // 中台平台状态
  const midPlatformOk = ref(true)

  // 列表变化消息
  const listChangedMsg = ref<string | null>(null)

  // 初始化接入状态和遥测数据
  devices.value.forEach((device) => {
    accessStatusById.value[device.device_id] = device.access_status
    telemetryById.value[device.device_id] = INIT_TELEMETRY[device.device_id] || null
    lastUpdatedById.value[device.device_id] = new Date().toISOString()
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
