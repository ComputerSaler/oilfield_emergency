<script setup lang="ts">
/**
 * 视频监控 —— 实时监控中心 PC端
 * PRD: 实时监控中心 · 视频监控 V1.0
 *
 * 布局：左侧设备树（260px固定）+ 右侧视频宫格（flex:1）
 * 核心交互：
 *   - 设备树：5类设备，营地>设备类型>设备（CCTV额外有站点层）
 *   - 宫格位：1/4/9 切换，点击设备节点载入空位
 *   - 非飞行无人机：点击显示状态面板而非视频
 *   - WS 模拟：随机切换在线状态，模拟断线重连
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  CloseOutlined, ClearOutlined, SearchOutlined,
  VideoCameraOutlined, WarningOutlined,
  DisconnectOutlined, ReloadOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import {
  MOCK_VIDEO_DEVICES, DEVICE_TYPE_LABEL, STATUS_COLOR, STATUS_LABEL,
  type VideoDevice, type DeviceType, type DeviceOnlineStatus,
} from '@/mock/videoMonitor'

// ===================== 宫格模式 =====================

type GridMode = 1 | 4 | 9
const gridMode = ref<GridMode>(4)

function setGridMode(mode: GridMode) {
  if (mode < gridMode.value) {
    // 缩减：停止超出范围的 Slot
    for (let i = mode; i < gridMode.value; i++) {
      clearSlot(i)
    }
  }
  gridMode.value = mode
}

// ===================== 宫格位（Slots） =====================

type SlotState = 'empty' | 'loading' | 'playing' | 'failed' | 'offline' | 'grounded'

interface VideoSlot {
  state: SlotState
  deviceId?: string
  deviceType?: DeviceType
  deviceName?: string
  campName?: string
  failReason?: string
  loadTimer?: ReturnType<typeof setTimeout>
}

const MAX_SLOTS = 9
const slots = reactive<VideoSlot[]>(
  Array.from({ length: MAX_SLOTS }, () => ({ state: 'empty' }))
)

function clearSlot(index: number) {
  if (slots[index].loadTimer) clearTimeout(slots[index].loadTimer)
  slots[index] = { state: 'empty' }
}

function clearAllSlots() {
  for (let i = 0; i < MAX_SLOTS; i++) clearSlot(i)
  message.success('已清空全部监看画面')
}

function findFirstEmptySlot(): number {
  for (let i = 0; i < gridMode.value; i++) {
    if (slots[i].state === 'empty') return i
  }
  return gridMode.value - 1 // 无空位则替换最后一个
}

function loadDeviceToSlot(device: VideoDevice, slotIndex: number) {
  if (slots[slotIndex].loadTimer) clearTimeout(slots[slotIndex].loadTimer)
  slots[slotIndex] = {
    state: 'loading',
    deviceId: device.deviceId,
    deviceType: device.deviceType,
    deviceName: device.deviceName,
    campName: device.campName,
  }
  // 原型阶段：模拟视频加载（C类机巢 TBD-01 用占位）
  const delay = device.deviceType === 'nest' ? 0 : 1500 + Math.random() * 1000
  slots[slotIndex].loadTimer = setTimeout(() => {
    if (slots[slotIndex].deviceId === device.deviceId) {
      if (device.deviceType === 'nest') {
        // TBD-01：机巢舱内摄像头接口待确认，占位显示
        slots[slotIndex] = {
          state: 'failed',
          deviceId: device.deviceId,
          deviceType: device.deviceType,
          deviceName: device.deviceName,
          campName: device.campName,
          failReason: '视频流接口待接入（TBD-01）',
        }
      } else {
        slots[slotIndex].state = 'playing'
      }
    }
  }, delay)
}

function retrySlot(index: number) {
  const s = slots[index]
  if (!s.deviceId || !s.deviceType) return
  const device = deviceMap.value.get(s.deviceId)
  if (device) loadDeviceToSlot(device, index)
}

// ===================== 设备数据 + 状态 =====================

const devices = reactive<VideoDevice[]>([...MOCK_VIDEO_DEVICES])
const deviceMap = computed(() => new Map(devices.map(d => [d.deviceId, d])))

// ===================== 非飞行无人机状态面板 =====================

// 移除状态面板相关代码，改为和离线设备统一处理
// const statusPanelDevice = ref<VideoDevice | null>(null)
// const showStatusPanel = ref(false)

// ===================== 点击设备节点 =====================

function onDeviceClick(device: VideoDevice) {
  // 地面待机和离线设备：直接填入 Slot，显示占位态
  if (device.status === 'grounded' || device.status === 'offline') {
    const idx = findFirstEmptySlot()
    if (slots[idx].loadTimer) clearTimeout(slots[idx].loadTimer)
    slots[idx] = {
      state: device.status === 'grounded' ? 'grounded' : 'offline',
      deviceId: device.deviceId,
      deviceType: device.deviceType,
      deviceName: device.deviceName,
      campName: device.campName,
    }
    return
  }
  // 检查是否已在监看
  const existingIdx = slots.findIndex(s => s.deviceId === device.deviceId)
  if (existingIdx >= 0 && existingIdx < gridMode.value) {
    message.info(`「${device.deviceName}」已在监看中`)
    flashSlotIndex.value = existingIdx
    setTimeout(() => { flashSlotIndex.value = -1 }, 1000)
    return
  }
  const idx = findFirstEmptySlot()
  loadDeviceToSlot(device, idx)
}

const flashSlotIndex = ref(-1)

// ===================== 搜索过滤 =====================

const searchTerm = ref('')

// ===================== 设备树结构 =====================

type TreeGroupMode = 'by-camp' | 'by-type'
const treeGroupMode = ref<TreeGroupMode>('by-camp')

interface DeviceLeafNode {
  type: 'leaf'
  device: VideoDevice
}
interface SiteNode {
  type: 'site'
  siteName: string
  children: DeviceLeafNode[]
}
interface TypeNode {
  type: 'devtype'
  devType: DeviceType
  label: string
  children: (DeviceLeafNode | SiteNode)[]
}
interface CampNode {
  type: 'camp'
  campId: string
  campName: string
  children: TypeNode[]
}

// 按设备类型分类的节点结构
interface CampNodeInType {
  type: 'camp-in-type'
  campId: string
  campName: string
  children: (DeviceLeafNode | SiteNode)[]
}
interface TypeRootNode {
  type: 'type-root'
  devType: DeviceType
  label: string
  children: CampNodeInType[]
}

const expandedCamps = reactive<Set<string>>(new Set(['KOULELE', 'JAOURO', 'DIBEILLA']))
const expandedTypes = reactive<Set<string>>(new Set())
const expandedSites = reactive<Set<string>>(new Set())
const expandedCampsInType = reactive<Set<string>>(new Set()) // 按类型分组时的营地展开状态

function switchTreeGroupMode(mode: TreeGroupMode) {
  treeGroupMode.value = mode
  // 切换时重置展开状态
  expandedCamps.clear()
  expandedTypes.clear()
  expandedSites.clear()
  expandedCampsInType.clear()
}

function expandAll() {
  if (treeGroupMode.value === 'by-camp') {
    // 按营地分类：展开所有营地
    treeData.value.forEach(camp => {
      if (camp.type === 'camp') {
        expandedCamps.add(camp.campId)
        // 展开该营地下所有设备类型
        camp.children.forEach(typeNode => {
          expandedTypes.add(`${camp.campId}__${typeNode.devType}`)
          // 如果是CCTV，展开所有站点
          if (typeNode.devType === 'cctv') {
            typeNode.children.forEach(child => {
              if (child.type === 'site') {
                expandedSites.add(`${camp.campId}__${typeNode.devType}__${child.siteName}`)
              }
            })
          }
        })
      }
    })
  } else {
    // 按设备类型分类：展开所有类型
    treeData.value.forEach(typeRoot => {
      if (typeRoot.type === 'type-root') {
        expandedTypes.add(typeRoot.devType)
        // 展开该类型下所有营地
        typeRoot.children.forEach(campNode => {
          expandedCampsInType.add(`${typeRoot.devType}__${campNode.campId}`)
          // 如果是CCTV，展开所有站点
          if (typeRoot.devType === 'cctv') {
            campNode.children.forEach(child => {
              if (child.type === 'site') {
                expandedSites.add(`${typeRoot.devType}__${campNode.campId}__${child.siteName}`)
              }
            })
          }
        })
      }
    })
  }
}

function collapseAll() {
  expandedCamps.clear()
  expandedTypes.clear()
  expandedSites.clear()
  expandedCampsInType.clear()
}

function getTreeDataByCamp(): CampNode[] {
  const filteredDevices = searchTerm.value
    ? devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        d.campName.toLowerCase().includes(searchTerm.value.toLowerCase())
      )
    : devices

  const campMap = new Map<string, Map<DeviceType, VideoDevice[]>>()
  for (const d of filteredDevices) {
    if (!campMap.has(d.campId)) campMap.set(d.campId, new Map())
    const typeMap = campMap.get(d.campId)!
    if (!typeMap.has(d.deviceType)) typeMap.set(d.deviceType, [])
    typeMap.get(d.deviceType)!.push(d)
  }

  const TYPE_ORDER: DeviceType[] = ['camera', 'cctv', 'nest', 'cuav', 'auav']
  const result: CampNode[] = []
  for (const [campId, typeMap] of campMap) {
    const campName = filteredDevices.find(d => d.campId === campId)!.campName
    const typeNodes: TypeNode[] = []
    for (const devType of TYPE_ORDER) {
      if (!typeMap.has(devType)) continue
      const devs = typeMap.get(devType)!
      let children: (DeviceLeafNode | SiteNode)[]
      if (devType === 'cctv') {
        const siteMap = new Map<string, VideoDevice[]>()
        for (const d of devs) {
          const sn = d.siteName || '未分类'
          if (!siteMap.has(sn)) siteMap.set(sn, [])
          siteMap.get(sn)!.push(d)
        }
        children = [...siteMap.entries()].map(([siteName, siteDevs]) => ({
          type: 'site' as const, siteName,
          children: siteDevs.map(d => ({ type: 'leaf' as const, device: d })),
        }))
      } else {
        children = devs.map(d => ({ type: 'leaf' as const, device: d }))
      }
      typeNodes.push({ type: 'devtype', devType, label: DEVICE_TYPE_LABEL[devType], children })
    }
    result.push({ type: 'camp', campId, campName, children: typeNodes })
  }
  return result
}

function getTreeDataByType(): TypeRootNode[] {
  const filteredDevices = searchTerm.value
    ? devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        d.campName.toLowerCase().includes(searchTerm.value.toLowerCase())
      )
    : devices

  const typeMap = new Map<DeviceType, Map<string, VideoDevice[]>>()
  for (const d of filteredDevices) {
    if (!typeMap.has(d.deviceType)) typeMap.set(d.deviceType, new Map())
    const campMap = typeMap.get(d.deviceType)!
    if (!campMap.has(d.campId)) campMap.set(d.campId, [])
    campMap.get(d.campId)!.push(d)
  }

  const TYPE_ORDER: DeviceType[] = ['camera', 'cctv', 'nest', 'cuav', 'auav']
  const result: TypeRootNode[] = []
  for (const devType of TYPE_ORDER) {
    if (!typeMap.has(devType)) continue
    const campMap = typeMap.get(devType)!
    const campNodes: CampNodeInType[] = []
    for (const [campId, devs] of campMap) {
      const campName = devs[0].campName
      let children: (DeviceLeafNode | SiteNode)[]
      if (devType === 'cctv') {
        const siteMap = new Map<string, VideoDevice[]>()
        for (const d of devs) {
          const sn = d.siteName || '未分类'
          if (!siteMap.has(sn)) siteMap.set(sn, [])
          siteMap.get(sn)!.push(d)
        }
        children = [...siteMap.entries()].map(([siteName, siteDevs]) => ({
          type: 'site' as const, siteName,
          children: siteDevs.map(d => ({ type: 'leaf' as const, device: d })),
        }))
      } else {
        children = devs.map(d => ({ type: 'leaf' as const, device: d }))
      }
      campNodes.push({ type: 'camp-in-type', campId, campName, children })
    }
    result.push({ type: 'type-root', devType, label: DEVICE_TYPE_LABEL[devType], children: campNodes })
  }
  return result
}

const treeData = computed(() => {
  return treeGroupMode.value === 'by-camp' ? getTreeDataByCamp() : getTreeDataByType()
})

function toggleCamp(campId: string) {
  if (expandedCamps.has(campId)) expandedCamps.delete(campId)
  else expandedCamps.add(campId)
}
function toggleType(campIdOrType: string, devType?: DeviceType) {
  // 按营地分类时：campIdOrType是campId，devType必传
  // 按类型分类时：campIdOrType是devType，devType不传
  if (treeGroupMode.value === 'by-camp' && devType) {
    const key = `${campIdOrType}__${devType}`
    if (expandedTypes.has(key)) expandedTypes.delete(key)
    else expandedTypes.add(key)
  } else if (treeGroupMode.value === 'by-type') {
    const typeKey = campIdOrType as DeviceType
    if (expandedTypes.has(typeKey)) expandedTypes.delete(typeKey)
    else expandedTypes.add(typeKey)
  }
}
function isTypeExpanded(campIdOrType: string, devType?: DeviceType): boolean {
  if (treeGroupMode.value === 'by-camp' && devType) {
    return expandedTypes.has(`${campIdOrType}__${devType}`)
  } else if (treeGroupMode.value === 'by-type') {
    return expandedTypes.has(campIdOrType)
  }
  return false
}
function toggleCampInType(devType: DeviceType, campId: string) {
  const key = `${devType}__${campId}`
  if (expandedCampsInType.has(key)) expandedCampsInType.delete(key)
  else expandedCampsInType.add(key)
}
function isCampInTypeExpanded(devType: DeviceType, campId: string): boolean {
  return expandedCampsInType.has(`${devType}__${campId}`)
}
function toggleSite(parentKey: string, devType: DeviceType, siteName: string, campId?: string) {
  // 按营地分类时：parentKey是campId
  // 按类型分类时：parentKey是devType，需要campId
  let key: string
  if (treeGroupMode.value === 'by-camp') {
    key = `${parentKey}__${devType}__${siteName}`
  } else {
    key = `${parentKey}__${campId}__${siteName}`
  }
  if (expandedSites.has(key)) expandedSites.delete(key)
  else expandedSites.add(key)
}
function isSiteExpanded(parentKey: string, devType: DeviceType, siteName: string, campId?: string): boolean {
  if (treeGroupMode.value === 'by-camp') {
    return expandedSites.has(`${parentKey}__${devType}__${siteName}`)
  } else {
    return expandedSites.has(`${parentKey}__${campId}__${siteName}`)
  }
}

function leafCount(node: TypeNode | CampNodeInType): number {
  return node.children.reduce((s, c) => s + (c.type === 'leaf' ? 1 : c.children.length), 0)
}
function onlineCount(node: TypeNode | CampNodeInType): number {
  let count = 0
  for (const c of node.children) {
    const leaves = c.type === 'leaf' ? [c] : c.children
    for (const l of leaves) {
      if (l.device.status === 'online' || l.device.status === 'flying') count++
    }
  }
  return count
}
function campOnlineCount(campNode: CampNode): number {
  return campNode.children.reduce((s, t) => s + onlineCount(t), 0)
}
function campTotalCount(campNode: CampNode): number {
  return campNode.children.reduce((s, t) => s + leafCount(t), 0)
}
function typeRootOnlineCount(typeRoot: TypeRootNode): number {
  return typeRoot.children.reduce((s, c) => s + onlineCount(c), 0)
}
function typeRootTotalCount(typeRoot: TypeRootNode): number {
  return typeRoot.children.reduce((s, c) => s + leafCount(c), 0)
}

// ===================== WS 模拟 =====================

const wsConnected = ref(true)
const wsDisconnectTime = ref('')
let wsTimer: ReturnType<typeof setInterval> | null = null

function simulateWsUpdate() {
  if (!wsConnected.value) return
  const idx = Math.floor(Math.random() * devices.length)
  const d = devices[idx]
  const prev = d.status
  // 无人机只在 flying/grounded 之间切换；普通设备 online/offline 切换
  if (d.deviceType === 'cuav' || d.deviceType === 'auav') {
    d.status = d.status === 'flying' ? 'grounded' : 'flying'
  } else {
    d.status = d.status === 'online' ? 'offline' : 'online'
  }
  // 如果该设备在某 Slot 播放且变为 offline/grounded，更新 Slot 状态
  if (prev !== d.status) {
    const slotIdx = slots.findIndex(s => s.deviceId === d.deviceId)
    if (slotIdx >= 0 && slotIdx < gridMode.value) {
      if (d.status === 'offline' || d.status === 'grounded') {
        if (slots[slotIdx].loadTimer) clearTimeout(slots[slotIdx].loadTimer)
        slots[slotIdx].state = d.status === 'grounded' ? 'grounded' : 'offline'
      } else if (d.status === 'online' || d.status === 'flying') {
        // 自动重连
        loadDeviceToSlot(d, slotIdx)
      }
    }
  }
}

function simulateWsDisconnect() {
  wsConnected.value = false
  wsDisconnectTime.value = new Date().toLocaleString('zh-CN', { hour12: false })
  // WS 断线时保持设备最后已知状态，不改为 unknown
  setTimeout(() => {
    wsConnected.value = true
    wsDisconnectTime.value = ''
    // WS 重连后，实际会重拉全量快照覆盖状态，原型阶段状态保持不变即可
    message.success('实时同步已恢复', 2)
  }, 6000)
}

// ===================== 生命周期 =====================

onMounted(() => {
  // 原型静态化：移除自动状态切换和断线模拟
  // wsTimer = setInterval(simulateWsUpdate, 5000)
  // setTimeout(simulateWsDisconnect, 45000)
})

onBeforeUnmount(() => {
  if (wsTimer) clearInterval(wsTimer)
  // 清理所有 Slot 的加载定时器
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (slots[i].loadTimer) clearTimeout(slots[i].loadTimer)
  }
})

// ===================== 辅助 =====================

const hasAnySlotActive = computed(() =>
  slots.slice(0, gridMode.value).some(s => s.state !== 'empty')
)
</script>

<template>
  <PageContainer title="视频监控">
    <PanelCard :body-style="{ padding: 0, display: 'flex', overflow: 'hidden', flexDirection: 'column' }">
      <div class="vm-page-wrapper">

      <!-- WS 断线提示条 -->
      <div v-if="!wsConnected" class="ws-alert-bar">
        <WarningOutlined style="margin-right: 8px" />
        实时状态同步中断（最后同步于 {{ wsDisconnectTime }}），当前显示为最后已知状态，可能存在延迟，正在重连...
      </div>

      <!-- 主体：左侧设备树 + 右侧宫格 -->
      <div class="vm-layout">

        <!-- ===== 左侧：设备树 ===== -->
        <div class="vm-tree">
          <div class="vm-tree__search">
            <a-input
              v-model:value="searchTerm"
              placeholder="搜索设备..."
              :allow-clear="true"
              size="small"
            >
              <template #prefix><SearchOutlined style="color: #8c8c8c" /></template>
            </a-input>
            <div class="vm-tree__actions">
              <a @click="expandAll">展开所有</a>
              <span class="vm-tree__divider">|</span>
              <a @click="collapseAll">收起所有</a>
            </div>
          </div>

          <!-- 分组方式切换 -->
          <div class="vm-tree__tabs">
            <div
              class="vm-tree__tab"
              :class="{ 'is-active': treeGroupMode === 'by-camp' }"
              @click="switchTreeGroupMode('by-camp')"
            >
              按营地分类
            </div>
            <div
              class="vm-tree__tab"
              :class="{ 'is-active': treeGroupMode === 'by-type' }"
              @click="switchTreeGroupMode('by-type')"
            >
              按设备类型分类
            </div>
          </div>

          <div class="vm-tree__content">
            <div v-if="treeData.length === 0" class="vm-tree__empty">
              {{ searchTerm ? '未找到匹配设备' : '您没有可监看的设备' }}
            </div>

            <!-- 按营地分类 -->
            <template v-if="treeGroupMode === 'by-camp'">
              <template v-for="camp in treeData" :key="camp.campId">
                <!-- 营地节点 L1 -->
                <div class="vm-node vm-node--camp" @click="toggleCamp(camp.campId)">
                  <span class="vm-node__arrow" :class="{ 'is-expanded': expandedCamps.has(camp.campId) }">▶</span>
                  <span class="vm-node__label">{{ camp.campName }}</span>
                  <span class="vm-node__badge">{{ campOnlineCount(camp) }}/{{ campTotalCount(camp) }}</span>
                </div>

                <template v-if="expandedCamps.has(camp.campId)">
                  <template v-for="typeNode in camp.children" :key="`${camp.campId}__${typeNode.devType}`">
                    <!-- 设备类型节点 L2 -->
                    <div class="vm-node vm-node--type" @click="toggleType(camp.campId, typeNode.devType)">
                      <span class="vm-node__arrow" :class="{ 'is-expanded': isTypeExpanded(camp.campId, typeNode.devType) }">▶</span>
                      <span class="vm-node__label">{{ typeNode.label }}</span>
                      <span class="vm-node__count">({{ onlineCount(typeNode) }}/{{ leafCount(typeNode) }})</span>
                    </div>

                    <template v-if="isTypeExpanded(camp.campId, typeNode.devType)">
                      <template v-for="child in typeNode.children" :key="child.type === 'leaf' ? child.device.deviceId : child.siteName">

                        <!-- 普通设备节点 L3（非CCTV） -->
                        <template v-if="child.type === 'leaf'">
                          <div
                            class="vm-node vm-node--device"
                            :class="{
                              'is-grounded': child.device.status === 'grounded',
                              'is-offline': child.device.status === 'offline',
                            }"
                            :style="{ opacity: searchTerm && !child.device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ? 0.3 : 1 }"
                            @click="onDeviceClick(child.device)"
                          >
                            <span
                              class="vm-node__dot"
                              :style="{ background: STATUS_COLOR[child.device.status] }"
                            />
                            <span class="vm-node__label" :title="child.device.deviceName">{{ child.device.deviceName }}</span>
                            <span class="vm-node__status-text">{{ STATUS_LABEL[child.device.status] }}</span>
                          </div>
                        </template>

                        <!-- CCTV 站点节点 L3 -->
                        <template v-else>
                          <div class="vm-node vm-node--site" @click="toggleSite(camp.campId, typeNode.devType, child.siteName)">
                            <span class="vm-node__arrow" :class="{ 'is-expanded': isSiteExpanded(camp.campId, typeNode.devType, child.siteName) }">▶</span>
                            <span class="vm-node__label">{{ child.siteName }}</span>
                            <span class="vm-node__count">({{ child.children.length }})</span>
                          </div>
                          <!-- CCTV 设备节点 L4 -->
                          <template v-if="isSiteExpanded(camp.campId, typeNode.devType, child.siteName)">
                            <div
                              v-for="leaf in child.children"
                              :key="leaf.device.deviceId"
                              class="vm-node vm-node--device vm-node--device-l4"
                              :class="{
                                'is-offline': leaf.device.status === 'offline',
                                'is-grounded': leaf.device.status === 'grounded',
                              }"
                              @click="onDeviceClick(leaf.device)"
                            >
                              <span class="vm-node__dot" :style="{ background: STATUS_COLOR[leaf.device.status] }" />
                              <span class="vm-node__label" :title="leaf.device.deviceName">{{ leaf.device.deviceName }}</span>
                              <span class="vm-node__status-text">{{ STATUS_LABEL[leaf.device.status] }}</span>
                            </div>
                          </template>
                        </template>

                      </template>
                    </template>
                  </template>
                </template>
              </template>
            </template>

            <!-- 按设备类型分类 -->
            <template v-else>
              <template v-for="typeRoot in treeData" :key="typeRoot.devType">
                <!-- 设备类型节点 L1 -->
                <div class="vm-node vm-node--camp" @click="toggleType(typeRoot.devType)">
                  <span class="vm-node__arrow" :class="{ 'is-expanded': isTypeExpanded(typeRoot.devType) }">▶</span>
                  <span class="vm-node__label">{{ typeRoot.label }}</span>
                  <span class="vm-node__badge">{{ typeRootOnlineCount(typeRoot) }}/{{ typeRootTotalCount(typeRoot) }}</span>
                </div>

                <template v-if="isTypeExpanded(typeRoot.devType)">
                  <template v-for="campNode in typeRoot.children" :key="`${typeRoot.devType}__${campNode.campId}`">
                    <!-- 营地节点 L2 -->
                    <div class="vm-node vm-node--type" @click="toggleCampInType(typeRoot.devType, campNode.campId)">
                      <span class="vm-node__arrow" :class="{ 'is-expanded': isCampInTypeExpanded(typeRoot.devType, campNode.campId) }">▶</span>
                      <span class="vm-node__label">{{ campNode.campName }}</span>
                      <span class="vm-node__count">({{ onlineCount(campNode) }}/{{ leafCount(campNode) }})</span>
                    </div>

                    <template v-if="isCampInTypeExpanded(typeRoot.devType, campNode.campId)">
                      <template v-for="child in campNode.children" :key="child.type === 'leaf' ? child.device.deviceId : child.siteName">

                        <!-- 普通设备节点 L3（非CCTV） -->
                        <template v-if="child.type === 'leaf'">
                          <div
                            class="vm-node vm-node--device"
                            :class="{
                              'is-grounded': child.device.status === 'grounded',
                              'is-offline': child.device.status === 'offline',
                            }"
                            :style="{ opacity: searchTerm && !child.device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ? 0.3 : 1 }"
                            @click="onDeviceClick(child.device)"
                          >
                            <span
                              class="vm-node__dot"
                              :style="{ background: STATUS_COLOR[child.device.status] }"
                            />
                            <span class="vm-node__label" :title="child.device.deviceName">{{ child.device.deviceName }}</span>
                            <span class="vm-node__status-text">{{ STATUS_LABEL[child.device.status] }}</span>
                          </div>
                        </template>

                        <!-- CCTV 站点节点 L3 -->
                        <template v-else>
                          <div class="vm-node vm-node--site" @click="toggleSite(typeRoot.devType, typeRoot.devType, child.siteName, campNode.campId)">
                            <span class="vm-node__arrow" :class="{ 'is-expanded': isSiteExpanded(typeRoot.devType, typeRoot.devType, child.siteName, campNode.campId) }">▶</span>
                            <span class="vm-node__label">{{ child.siteName }}</span>
                            <span class="vm-node__count">({{ child.children.length }})</span>
                          </div>
                          <!-- CCTV 设备节点 L4 -->
                          <template v-if="isSiteExpanded(typeRoot.devType, typeRoot.devType, child.siteName, campNode.campId)">
                            <div
                              v-for="leaf in child.children"
                              :key="leaf.device.deviceId"
                              class="vm-node vm-node--device vm-node--device-l4"
                              :class="{
                                'is-offline': leaf.device.status === 'offline',
                                'is-grounded': leaf.device.status === 'grounded',
                              }"
                              @click="onDeviceClick(leaf.device)"
                            >
                              <span class="vm-node__dot" :style="{ background: STATUS_COLOR[leaf.device.status] }" />
                              <span class="vm-node__label" :title="leaf.device.deviceName">{{ leaf.device.deviceName }}</span>
                              <span class="vm-node__status-text">{{ STATUS_LABEL[leaf.device.status] }}</span>
                            </div>
                          </template>
                        </template>

                      </template>
                    </template>
                  </template>
                </template>
              </template>
            </template>
          </div>
        </div>

        <!-- ===== 右侧：工具栏 + 视频区 ===== -->
        <div class="vm-right">
          <div class="vm-toolbar">
            <div class="vm-toolbar__grid-btns">
              <button class="vm-grid-btn" :class="{ active: gridMode === 1 }" @click="setGridMode(1)" title="1宫格">
                <span class="vm-grid-icon">■</span>
                <span class="vm-grid-label">1</span>
              </button>
              <button class="vm-grid-btn" :class="{ active: gridMode === 4 }" @click="setGridMode(4)" title="4宫格">
                <span class="vm-grid-icon vm-grid-icon--4">
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                </span>
                <span class="vm-grid-label">4</span>
              </button>
              <button class="vm-grid-btn" :class="{ active: gridMode === 9 }" @click="setGridMode(9)" title="9宫格">
                <span class="vm-grid-icon vm-grid-icon--9">
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                  <span class="vm-grid-dot"></span>
                </span>
                <span class="vm-grid-label">9</span>
              </button>
            </div>
            <button v-if="hasAnySlotActive" class="vm-clear-btn" @click="clearAllSlots">
              <ClearOutlined /> 清空
            </button>
          </div>

          <!-- 视频宫格 -->
          <div class="vm-grid" :class="`vm-grid--${gridMode}`">
            <div
              v-for="i in gridMode"
              :key="i"
              class="vm-slot"
              :class="[`vm-slot--${slots[i-1].state}`, { 'vm-slot--flash': flashSlotIndex === i - 1 }]"
            >
              <!-- 空位 -->
              <template v-if="slots[i-1].state === 'empty'">
                <div class="vm-slot__center">
                  <VideoCameraOutlined style="font-size: 28px; color: #434343; margin-bottom: 8px" />
                  <span style="color: #595959; font-size: 12px">点击左侧设备开始监看</span>
                </div>
              </template>

              <!-- 加载中 -->
              <template v-else-if="slots[i-1].state === 'loading'">
                <div class="vm-slot__center">
                  <a-spin size="large" />
                  <div class="vm-slot__device-name">{{ slots[i-1].deviceName }}</div>
                </div>
                <button class="vm-slot__close" @click="clearSlot(i-1)"><CloseOutlined /></button>
              </template>

              <!-- 播放中（原型占位） -->
              <template v-else-if="slots[i-1].state === 'playing'">
                <div class="vm-slot__playing-bg">
                  <div class="vm-slot__center">
                    <VideoCameraOutlined style="font-size: 32px; color: #434343" />
                    <div style="color: #595959; font-size: 12px; margin-top: 8px">视频流播放中</div>
                    <div style="color: #3d3d3d; font-size: 11px; margin-top: 4px">（原型占位，实际接入后显示画面）</div>
                  </div>
                </div>
                <div class="vm-slot__label-bar">{{ slots[i-1].deviceName }}</div>
                <button class="vm-slot__close vm-slot__close--on-hover"><CloseOutlined /></button>
              </template>

              <!-- 加载失败 -->
              <template v-else-if="slots[i-1].state === 'failed'">
                <div class="vm-slot__center">
                  <DisconnectOutlined style="font-size: 28px; color: #ff4d4f; margin-bottom: 8px" />
                  <div class="vm-slot__device-name">{{ slots[i-1].deviceName }}</div>
                  <div style="color: #ff4d4f; font-size: 12px; margin: 4px 0 12px">{{ slots[i-1].failReason || '加载失败' }}</div>
                  <a-button size="small" @click="retrySlot(i-1)"><ReloadOutlined /> 重试</a-button>
                </div>
                <button class="vm-slot__close" @click="clearSlot(i-1)"><CloseOutlined /></button>
              </template>

              <!-- 设备离线 -->
              <template v-else-if="slots[i-1].state === 'offline'">
                <div class="vm-slot__center">
                  <DisconnectOutlined style="font-size: 28px; color: #8c8c8c; margin-bottom: 8px" />
                  <div class="vm-slot__device-name">{{ slots[i-1].deviceName }}</div>
                  <div style="color: #8c8c8c; font-size: 12px">设备已离线</div>
                </div>
                <button class="vm-slot__close" @click="clearSlot(i-1)"><CloseOutlined /></button>
              </template>

              <!-- 地面待机 -->
              <template v-else-if="slots[i-1].state === 'grounded'">
                <div class="vm-slot__center">
                  <DisconnectOutlined style="font-size: 28px; color: #8c8c8c; margin-bottom: 8px" />
                  <div class="vm-slot__device-name">{{ slots[i-1].deviceName }}</div>
                  <div style="color: #8c8c8c; font-size: 12px">地面待机，无视频信号</div>
                </div>
                <button class="vm-slot__close" @click="clearSlot(i-1)"><CloseOutlined /></button>
              </template>

            </div>
          </div>
        </div>

      </div>
      </div>
    </PanelCard>
  </PageContainer>
</template>

<style scoped lang="scss">
.vm-page-wrapper {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ws-alert-bar {
  padding: 8px 16px;
  background: rgba(250, 173, 20, 0.15);
  border-bottom: 1px solid #d48806;
  color: #faad14;
  font-size: 13px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.vm-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0; /* 关键：防止 flex 子元素撑开父容器 */
  align-items: stretch; /* 确保子元素拉伸填充高度 */
}

/* ===== 设备树 ===== */
.vm-tree {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #1f1f1f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-self: stretch; /* 关键：确保占满父容器高度 */
}

.vm-tree__search {
  padding: 8px;
  border-bottom: 1px solid #1f1f1f;
  flex-shrink: 0;
}

.vm-tree__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;

  a {
    color: #1677ff;
    cursor: pointer;
    transition: color 0.15s;
    &:hover { color: #4096ff; }
  }
}

.vm-tree__divider {
  color: #434343;
  user-select: none;
}

.vm-tree__tabs {
  display: flex;
  padding: 8px 8px 0;
  gap: 4px;
  flex-shrink: 0;
}

.vm-tree__tab {
  flex: 1;
  padding: 6px 12px;
  text-align: center;
  font-size: 12px;
  color: #8c8c8c;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px 4px 0 0;
  user-select: none;
  background: transparent;

  &:hover {
    color: #d9d9d9;
  }

  &.is-active {
    color: #1677ff;
    background: rgba(22, 119, 255, 0.08);
    font-weight: 500;
  }
}

.vm-tree__content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.vm-tree__empty {
  padding: 24px 12px;
  color: #595959;
  font-size: 12px;
  text-align: center;
}

/* 树节点通用 */
.vm-node {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
  gap: 4px;
  transition: background 0.15s;

  &:hover { background: rgba(255, 255, 255, 0.05); }
}

.vm-node__arrow {
  display: inline-block;
  width: 12px;
  font-size: 9px;
  color: #595959;
  transition: transform 0.2s;
  flex-shrink: 0;

  &.is-expanded { transform: rotate(90deg); }
}

.vm-node__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vm-node__badge {
  font-size: 11px;
  color: #52c41a;
  margin-left: 4px;
  flex-shrink: 0;
}

.vm-node__count {
  font-size: 11px;
  color: #595959;
  flex-shrink: 0;
}

.vm-node__status-text {
  font-size: 10px;
  color: #595959;
  flex-shrink: 0;
  min-width: 44px;
  text-align: right;
}

.vm-node--camp { font-weight: 500; color: #d9d9d9; padding-left: 8px; }
.vm-node--type { color: #d9d9d9; padding-left: 20px; }
.vm-node--site { color: #d9d9d9; padding-left: 32px; }
.vm-node--device { padding-left: 32px; color: #d9d9d9; }
.vm-node--device-l4 { padding-left: 44px; }

.vm-node--device.is-grounded,
.vm-node--device.is-offline {
  color: #595959;
  cursor: default;
}

.vm-node__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
  // 移除飞行中的呼吸动效
}

/* ===== 右侧区域 ===== */
.vm-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-self: stretch; /* 确保占满父容器高度 */
}

.vm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #1f1f1f;
  flex-shrink: 0;
  background: #141414;
}

.vm-toolbar__grid-btns {
  display: flex;
  gap: 4px;
}

.vm-grid-btn {
  min-width: 42px;
  height: 30px;
  padding: 0 8px;
  background: #1f1f1f;
  border: 1px solid #303030;
  color: #8c8c8c;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  &:hover { border-color: #1677ff; color: #1677ff; }
  &.active { background: #1677ff; color: #fff; border-color: #1677ff; }
}

.vm-grid-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;

  &--4 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2px;
    width: 12px;
    height: 12px;
  }

  &--9 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5px;
    width: 14px;
    height: 14px;
  }
}

.vm-grid-dot {
  width: 100%;
  height: 100%;
  background: currentColor;
  border-radius: 1px;
}

.vm-grid-label {
  font-size: 12px;
  font-weight: 500;
}

.vm-clear-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #303030;
  color: #8c8c8c;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.15s;

  &:hover { border-color: #ff4d4f; color: #ff4d4f; }
}

/* ===== 视频宫格 ===== */
.vm-grid {
  flex: 1;
  display: grid;
  gap: 2px;
  padding: 2px;
  background: #0d0d0d;
  overflow: hidden;

  &--1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
  &--4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  &--9 { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; }
}

/* 宫格位 */
.vm-slot {
  position: relative;
  background: #141414;
  overflow: hidden;
  border: 1px solid #1f1f1f;
  transition: border-color 0.2s;

  &:hover { border-color: #303030; }

  &--flash { border-color: #1677ff !important; animation: slot-flash 1s ease; }
}

@keyframes slot-flash {
  0%, 100% { border-color: #1f1f1f; }
  50%       { border-color: #1677ff; box-shadow: 0 0 8px #1677ff66; }
}

.vm-slot__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px;
}

.vm-slot__playing-bg {
  position: absolute;
  inset: 0;
  background: #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vm-slot__label-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #d9d9d9;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vm-slot__device-name {
  color: #d9d9d9;
  font-size: 13px;
  font-weight: 500;
  margin-top: 8px;
}

.vm-slot__close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #303030;
  color: #8c8c8c;
  cursor: pointer;
  border-radius: 3px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  z-index: 10;

  &:hover { background: #ff4d4f22; border-color: #ff4d4f; color: #ff4d4f; }

  &--on-hover {
    opacity: 0;
    .vm-slot:hover & { opacity: 1; }
  }
}
</style>
