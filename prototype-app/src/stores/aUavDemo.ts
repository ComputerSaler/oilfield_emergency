/**
 * A类无人机 Demo Store
 * 用于演示控制台的状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ManagementStatus, OnlineStatus, OnlineSource, UavExtension } from '@/mock/aUavNormalize'

export const useAUavDemoStore = defineStore('aUavDemo', () => {
  // WebSocket 状态
  const wsState = ref<'CONNECTED' | 'DISCONNECTED' | 'UNAVAILABLE'>('CONNECTED')
  const wsSimEnabled = ref(true)

  // 列表加载状态
  const listLoadState = ref<'OK' | 'FAILED' | 'EMPTY_SOURCE'>('OK')

  // 管理状态映射（按序列号）
  const managementStatusBySn = ref<Record<string, ManagementStatus>>({})

  // 停用信息映射
  const disableInfoBySn = ref<Record<string, { reason: string; by: string; at: string }>>({})

  // 归档信息映射
  const archiveInfoBySn = ref<Record<string, { by: string; at: string }>>({})

  // 在线状态覆盖
  const onlineOverrideBySn = ref<Record<string, { status: OnlineStatus; source: OnlineSource }>>({})

  // 扩展覆盖
  const extOverrideBySn = ref<Record<string, Partial<UavExtension>>>({})

  // 过期筛选序列号列表
  const staleFilterSns = ref<string[]>([])

  // 权限
  const perms = ref({
    equipAdmin: true,
    accessAdmin: true,
    archive: true,
    detail: true,
    editExt: true,
    disable: true,
    monitorCenter: true,
    video: true,
  })

  // 角色信息
  const role = ref({
    label: '系统管理员',
    name: 'admin',
  })

  // 视频状态
  const videoState = ref<'AVAILABLE' | 'PREPARING' | 'INTERRUPTED' | 'UNAVAILABLE' | 'PROTOCOL_UNSUPPORTED'>('AVAILABLE')

  // 位置故障模拟
  const positionFault = ref<'NO_COORD' | 'UNKNOWN_CRS' | null>(null)

  // 方法
  function restoreUav(sn: string) {
    console.log('恢复无人机:', sn)
  }

  function wsReconnect() {
    console.log('重连 WebSocket')
    wsState.value = 'CONNECTED'
  }

  function disableUav(sn: string, reason: string) {
    console.log('停用无人机:', sn, '原因:', reason)
    managementStatusBySn.value[sn] = 'DISABLED'
    disableInfoBySn.value[sn] = {
      reason,
      by: role.value.label,
      at: new Date().toISOString(),
    }
  }

  function enableUav(sn: string) {
    console.log('启用无人机:', sn)
    managementStatusBySn.value[sn] = 'NORMAL'
    delete disableInfoBySn.value[sn]
  }

  function archiveUav(sn: string) {
    console.log('归档无人机:', sn)
    managementStatusBySn.value[sn] = 'ARCHIVED'
    archiveInfoBySn.value[sn] = {
      by: role.value.label,
      at: new Date().toISOString(),
    }
  }

  function saveExtension(sn: string, patch: Partial<UavExtension>, changedFields: string[]) {
    console.log('保存扩展信息:', sn, '字段:', changedFields)
    extOverrideBySn.value[sn] = {
      ...extOverrideBySn.value[sn],
      ...patch,
    }
  }

  function audit(action: string, target: string, detail: string) {
    console.log('审计日志:', { action, target, detail })
  }

  return {
    wsState,
    wsSimEnabled,
    listLoadState,
    managementStatusBySn,
    disableInfoBySn,
    archiveInfoBySn,
    onlineOverrideBySn,
    extOverrideBySn,
    staleFilterSns,
    perms,
    role,
    videoState,
    positionFault,
    restoreUav,
    wsReconnect,
    disableUav,
    enableUav,
    archiveUav,
    saveExtension,
    audit,
  }
})
