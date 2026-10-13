<script setup lang="ts">
/**
 * 预警研判页 —— 对应 PRD-预警管理-预警工作台 V1.0 §5.3
 * 架构：全屏工作区，左侧待办队列（可折叠）+ 中央地图+视频区 + 右侧 4 Tab 详情栏 + 底部操作栏
 */
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  EnvironmentOutlined,
  VideoCameraOutlined,
  RadarChartOutlined,
  HistoryOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  SendOutlined,
  FileAddOutlined,
  RocketOutlined,
  LinkOutlined,
  PlusOutlined,
  SoundOutlined,
  PauseOutlined,
  MergeCellsOutlined,
  ReloadOutlined,
  EditOutlined,
  CameraOutlined,
  CarOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons-vue'
import {
  ALERT_RECORDS,
  ALERT_TIMELINES,
  SOURCE_LABEL,
  STATUS_LABEL,
  NEARBY_CAMERAS,
  NEARBY_DRONES,
  NEARBY_NESTS,
  NEARBY_ANTI_UAV,
  NEARBY_VEHICLES,
  calcDistance,
  type AlertRecord,
  type AlertStatus,
  type CameraDevice,
  type DroneDevice,
  type TimelineItem,
} from '@/mock/alertWorkbench'
import { message } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()

// ==================== 当前预警 ====================

const currentId = ref(route.params.id as string)

const current = computed<AlertRecord | undefined>(() =>
  ALERT_RECORDS.find(r => r.alert_id === currentId.value)
)

const timeline = computed(() => ALERT_TIMELINES[currentId.value] ?? [])

// 待办队列：待核实 + 待决策，最多显示 20 条
const allPendingList = computed(() =>
  ALERT_RECORDS.filter(r =>
    ['pending_verify', 'pending_decision'].includes(r.status)
  ).filter(r => r.alert_id !== currentId.value)
)
const pendingList = computed(() => allPendingList.value.slice(0, 20))
const pendingOverflow = computed(() => allPendingList.value.length > 20)

// ==================== UI 状态 ====================

const queueCollapsed = ref(false)
const activeRightTab = ref<'overview' | 'evidence' | 'timeline' | 'related'>('overview')

// 图层开关
const layers = ref({
  cameras: true,
  drones: true,
  antiUav: true,
  vehicles: false,
  history: false,
  sensitiveZone: true,
  historyAlerts: false,
})
const layerPanelOpen = ref(false)

// 研判半径（单位：米）
const judgementRadius = ref(1000)
const radiusOptions = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
  { label: '5km', value: 5000 },
]

// 周边资源数据
const nearbyCameras = computed(() => {
  const alertId = current.value?.alert_id
  if (!alertId) return []
  const all = NEARBY_CAMERAS[alertId] || []
  // 简化：不实际按半径筛选，全部显示
  return all
})

const nearbyDrones = computed(() => {
  const alertId = current.value?.alert_id
  if (!alertId) return []
  return NEARBY_DRONES[alertId] || []
})

const nearbyNests = computed(() => {
  const alertId = current.value?.alert_id
  if (!alertId) return []
  return NEARBY_NESTS[alertId] || []
})

const nearbyAntiUav = computed(() => {
  const alertId = current.value?.alert_id
  if (!alertId) return []
  return NEARBY_ANTI_UAV[alertId] || []
})

const nearbyVehicles = computed(() => {
  const alertId = current.value?.alert_id
  if (!alertId) return []
  return NEARBY_VEHICLES[alertId] || []
})

// 地图选点
const pickingLocation = ref(false)
const locationModalVisible = ref(false)
const editableLocation = ref({ lat: 0, lng: 0 })

function startPickLocation() {
  if (!current.value) return
  pickingLocation.value = true
}

function cancelPickLocation() {
  pickingLocation.value = false
}

function handleMapClick(e: MouseEvent) {
  if (!pickingLocation.value || !current.value) return

  // 模拟：点击地图获取坐标（实际应从地图组件获取）
  // 这里简化为固定坐标
  editableLocation.value = {
    lat: 13.5150 + (Math.random() - 0.5) * 0.01,
    lng: 2.1110 + (Math.random() - 0.5) * 0.01,
  }
  locationModalVisible.value = true
  pickingLocation.value = false
}

function confirmLocation() {
  if (!current.value) return

  // 更新预警位置
  current.value.location_lat = editableLocation.value.lat
  current.value.location_lng = editableLocation.value.lng
  current.value.location_source = 'manual_pick'

  // 追加时间线
  appendTimeline('verify', '补充预警位置', `补充预警位置为 [${editableLocation.value.lng.toFixed(6)}, ${editableLocation.value.lat.toFixed(6)}]`)

  locationModalVisible.value = false
  message.success('预警位置已更新')

  // 自动打开图层面板
  layerPanelOpen.value = true
}

function openLocationInput() {
  if (!current.value) return
  editableLocation.value = {
    lat: current.value.location_lat || 13.5150,
    lng: current.value.location_lng || 2.1110,
  }
  locationModalVisible.value = true
}

// 调整研判半径
function setRadius(value: number) {
  judgementRadius.value = value
  message.success(`研判半径已调整为 ${value >= 1000 ? value / 1000 + ' km' : value + ' m'}`)
  appendTimeline('verify', '调整研判半径', `调整研判半径为 ${value >= 1000 ? value / 1000 + ' km' : value + ' m'}`)
}

// 视频区
const videoSlots = ref<(string | null)[]>([null, null, null, null])
const videoAreaCollapsed = ref(false)

// 摄像头气泡
const activeCameraPopup = ref<string | null>(null)
const cameraPopupPosition = ref({ top: 0, left: 0 })

function showCameraPopup(camera: CameraDevice, event: MouseEvent) {
  activeCameraPopup.value = camera.id
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  cameraPopupPosition.value = {
    top: rect.top - 10,
    left: rect.left + rect.width / 2,
  }
}

function hideCameraPopup() {
  activeCameraPopup.value = null
}

function addCameraToVideo(camera: CameraDevice) {
  const empty = videoSlots.value.findIndex(s => s === null)
  if (empty >= 0) {
    videoSlots.value[empty] = camera.name
    videoAreaCollapsed.value = false
    hideCameraPopup()
    message.success(`已添加 ${camera.name}`)
    appendTimeline('verify', '查看摄像头', `查看 ${camera.name} 摄像头画面`)
  }
}

// 无人机/机巢气泡
const activeDronePopup = ref<string | null>(null)
const dronePopupPosition = ref({ top: 0, left: 0 })

function showDronePopup(drone: DroneDevice, event: MouseEvent) {
  activeDronePopup.value = drone.id
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  dronePopupPosition.value = {
    top: rect.top - 10,
    left: rect.left + rect.width / 2,
  }
}

function hideDronePopup() {
  activeDronePopup.value = null
}

function goToDroneDispatch(drone: DroneDevice) {
  hideDronePopup()
  appendTimeline('verify', '生成调度卡片', `生成调度卡片（跳转至无人机监控中心）`)
  router.push({ name: 'DroneMonitoring' })
}

// 截图功能
function captureVideo(slotIndex: number) {
  const cameraName = videoSlots.value[slotIndex]
  if (!cameraName) return

  message.success(`已截图 ${cameraName} 画面`)
  appendTimeline('verify', '截图', `截图 ${cameraName} 摄像头画面`)

  // 实际应该在证据 Tab 追加一条记录，这里简化
}

// 时间线追加
function appendTimeline(category: 'system' | 'verify' | 'decision' | 'external', action: string, content: string) {
  if (!currentId.value) return

  const newItem: TimelineItem = {
    id: 't' + Date.now(),
    time: new Date().toISOString(),
    category,
    action,
    content,
    operator: category === 'verify' ? '张志远' : category === 'decision' ? '张志远' : undefined,
  }

  if (!ALERT_TIMELINES[currentId.value]) {
    ALERT_TIMELINES[currentId.value] = []
  }
  ALERT_TIMELINES[currentId.value].unshift(newItem)
}

// 时间线筛选
const tlFilter = ref<'all' | 'system' | 'verify' | 'decision' | 'external'>('all')
const filteredTimeline = computed(() => {
  const tl = [...timeline.value].reverse()
  if (tlFilter.value === 'all') return tl
  return tl.filter(i => i.category === tlFilter.value)
})

// 脏状态（有未提交操作时切换待办需确认）
const isDirty = ref(false)
const pendingSwitch = ref<string | null>(null)
const switchConfirmVisible = ref(false)

function switchTo(id: string) {
  if (isDirty.value) {
    pendingSwitch.value = id
    switchConfirmVisible.value = true
  } else {
    doSwitch(id)
  }
}
function doSwitch(id: string) {
  currentId.value = id
  activeRightTab.value = 'overview'
  isDirty.value = false
}
function confirmSwitch() {
  if (pendingSwitch.value) doSwitch(pendingSwitch.value)
  switchConfirmVisible.value = false
  pendingSwitch.value = null
}

// ==================== 操作弹窗可见性 ====================

const falseAlarmVisible    = ref(false)
const mergeVisible         = ref(false)   // 并入其他预警
const verifyVisible        = ref(false)   // 提交核实结论
const decideVisible        = ref(false)   // 解除/跟踪/升级
const taskVisible          = ref(false)   // 下发核实任务
const supplementVisible    = ref(false)   // PC 补录
const droneVisible         = ref(false)   // 调度无人机
const modifyTypeVisible    = ref(false)   // 修正类型
const modifyUrgencyVisible = ref(false)   // 修正紧急程度
const mergeEscalateVisible = ref(false)   // 合并升级为事件
const relateEventVisible   = ref(false)   // 关联到已有事件
const trackAppendVisible   = ref(false)   // 追加跟踪记录

// ==================== 表单 ====================

const falseAlarmForm = ref({ reason: '', remark: '' })
const mergeForm      = ref({ targetNo: '', note: '' })
const verifyForm     = ref({ result: '' as 'real' | 'unconfirmed' | '', note: '' })
const decideForm     = ref({
  action: '' as 'resolve' | 'track' | 'escalate' | '',
  note: '',
  resolveReason: '',
})
const taskForm       = ref({ receiver: '', requirement: '', deadline: null as any })
const supplementForm = ref({ content: '' })
const modifyTypeForm = ref({ categoryPaths: [] as string[][] })
const modifyUrgencyForm = ref({ urgency: '' })
const mergeEscalateForm = ref({ selectedIds: [] as string[], note: '' })
const relateEventForm   = ref({ eventNo: '', note: '' })
const trackAppendForm   = ref({ content: '' })

// 并入预警候选（待核实且非当前，非终态）
const mergeTargets = computed(() =>
  ALERT_RECORDS.filter(r =>
    r.alert_id !== currentId.value &&
    r.status === 'pending_verify'
  )
)

// 合并升级候选（待决策或跟踪中）
const mergeEscalateTargets = computed(() =>
  ALERT_RECORDS.filter(r =>
    r.alert_id !== currentId.value &&
    ['pending_decision', 'tracking'].includes(r.status)
  )
)

// ==================== 类型级联数据 ====================

const CATEGORY_CASCADER = [
  {
    value: '入侵', label: '入侵',
    children: [
      { value: 'area_intrusion', label: '区域入侵' },
      { value: 'fence_breach', label: '越界侦测' },
      { value: 'perimeter_loiter', label: '周界徘徊' },
    ],
  },
  {
    value: '无人机威胁', label: '无人机威胁',
    children: [
      { value: 'uav_intrusion', label: '无人机入侵' },
      { value: 'uav_recon', label: '无人机侦察' },
    ],
  },
  {
    value: '设备告警', label: '设备告警',
    children: [{ value: 'device_offline', label: '设备离线' }],
  },
  { value: '人员求助', label: '人员求助', children: [] },
  { value: '车辆异常', label: '车辆异常', children: [] },
  { value: '自然灾害', label: '自然灾害', children: [] },
  {
    value: '治安事件', label: '治安事件',
    children: [{ value: 'suspicious_person', label: '可疑人员' }],
  },
]

// ==================== 辅助函数 ====================

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// 计算地图标注位置（简化：固定分布）
function getDotPosition(lat: number, lng: number) {
  if (!current.value?.location_lat || !current.value?.location_lng) return {}

  // 简化计算：根据经纬度差值映射到百分比位置
  const centerLat = current.value.location_lat
  const centerLng = current.value.location_lng

  const offsetLat = (lat - centerLat) * 8000  // 放大系数
  const offsetLng = (lng - centerLng) * 8000

  return {
    top: `calc(50% - ${offsetLat}px)`,
    left: `calc(50% + ${offsetLng}px)`,
  }
}

// 研判半径圈尺寸（简化：固定像素映射）
const radiusCircleSize = computed(() => {
  const baseSize = 300  // 1km对应300px
  return (judgementRadius.value / 1000) * baseSize
})

// 无人机状态标签
function getDroneStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    standby: '待命',
    charging: '充电',
    mission: '任务中',
    alert_response: '告警响应',
    fault: '故障',
    offline: '离线',
  }
  return labels[status] || status
}

// 反无目标 Tooltip
function getAntiUavTooltip(target: any): string {
  if (target.type === 'unknown') {
    return `未知目标 · 高度 ${target.altitude}m · 速度 ${target.speed} km/h`
  }
  if (target.type === 'whitelist') {
    return `白名单 · 已授权 · 授权编号 ${target.authCode} · 备注：${target.authNote}`
  }
  if (target.type === 'suspected_ours') {
    return `与 ${target.nearbyDrone} 相距 ${target.distance}m，${target.timeDiff} 秒前 · 仅供参考，不参与自动判定`
  }
  return ''
}

function addVideoSlot(label: string) {
  const empty = videoSlots.value.findIndex(s => s === null)
  if (empty >= 0) {
    videoSlots.value[empty] = label
    videoAreaCollapsed.value = false
    appendTimeline('verify', '查看摄像头', `查看 ${label} 摄像头画面`)
  } else {
    message.warning('视频区已满（最多 4 路），请先移除一路')
  }
}

// ==================== 弹窗提交处理函数 ====================

// 提交标记误报
function submitFalseAlarm() {
  if (!falseAlarmForm.value.reason) {
    message.error('请选择误报原因')
    return
  }
  if (falseAlarmForm.value.reason === '其他' && !falseAlarmForm.value.remark) {
    message.error('请填写误报说明')
    return
  }
  if (!current.value) return

  current.value.status = 'false_alarm'
  current.value.false_alarm_reason = falseAlarmForm.value.reason + (falseAlarmForm.value.remark ? ': ' + falseAlarmForm.value.remark : '')
  appendTimeline('verify', '标记误报', `标记为误报，原因：${current.value.false_alarm_reason}`)

  falseAlarmVisible.value = false
  message.success('已标记为误报')
}

// 提交并入其他预警
function submitMerge() {
  if (!mergeForm.value.targetNo) {
    message.error('请选择目标预警')
    return
  }
  if (!current.value) return

  current.value.status = 'merged'
  current.value.merged_into_alert_id = mergeForm.value.targetNo
  appendTimeline('verify', '并入其他预警', `并入 ${mergeForm.value.targetNo}${mergeForm.value.note ? '，说明：' + mergeForm.value.note : ''}`)

  mergeVisible.value = false
  message.success('预警已合并')
}

// 提交核实结论
function submitVerify() {
  if (!verifyForm.value.result) {
    message.error('请选择核实结论')
    return
  }
  if (!current.value) return

  current.value.status = 'pending_decision'
  current.value.verification_result = verifyForm.value.result
  current.value.verification_at = new Date().toISOString()
  current.value.verified_by = '张志远'

  const resultLabel = verifyForm.value.result === 'real' ? '真实威胁' : '无法确认'
  appendTimeline('verify', '提交核实结论', `核实结论：${resultLabel}${verifyForm.value.note ? '，说明：' + verifyForm.value.note : ''}`)

  verifyVisible.value = false
  message.success('核实结论已提交')
}

// 提交决策（解除/跟踪/升级）
function submitDecide() {
  if (!decideForm.value.action) {
    message.error('请选择操作')
    return
  }
  if (decideForm.value.action === 'resolve' && !decideForm.value.resolveReason) {
    message.error('请选择解除原因')
    return
  }
  if (decideForm.value.action === 'escalate' && !decideForm.value.note) {
    message.error('请填写升级说明')
    return
  }
  if (!current.value) return

  if (decideForm.value.action === 'resolve') {
    current.value.status = 'resolved'
    current.value.resolution_reason = decideForm.value.resolveReason
    appendTimeline('decision', '解除预警', `解除原因：${decideForm.value.resolveReason}${decideForm.value.note ? '，说明：' + decideForm.value.note : ''}`)
    message.success('预警已解除')
  } else if (decideForm.value.action === 'track') {
    current.value.status = 'tracking'
    current.value.last_review_at = new Date().toISOString()
    appendTimeline('decision', '持续跟踪', `初始跟踪说明：${decideForm.value.note || '持续关注'}`)
    message.success('已进入持续跟踪')
  } else if (decideForm.value.action === 'escalate') {
    current.value.status = 'escalated'
    current.value.escalated_event_id = 'SJ-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-0001'
    appendTimeline('decision', '升级为事件', `升级说明：${decideForm.value.note}`)
    message.success('已升级为事件：' + current.value.escalated_event_id)
  }

  decideVisible.value = false
}

// 提交下发核实任务
function submitTask() {
  if (!taskForm.value.receiver) {
    message.error('请选择接收人')
    return
  }
  if (!taskForm.value.requirement) {
    message.error('请填写核实要求')
    return
  }

  appendTimeline('verify', '下发核实任务', `向 ${taskForm.value.receiver} 下发核实任务：${taskForm.value.requirement}`)
  taskVisible.value = false
  message.success('核实任务已下发')
}

// 提交PC补录
function submitSupplement() {
  if (!supplementForm.value.content) {
    message.error('请填写补录内容')
    return
  }

  appendTimeline('verify', 'PC补录', supplementForm.value.content)
  supplementVisible.value = false
  supplementForm.value.content = ''
  message.success('补录成功')
}

// 提交修正类型
function submitModifyType() {
  if (!modifyTypeForm.value.categoryPaths || modifyTypeForm.value.categoryPaths.length === 0) {
    message.error('请选择新类型')
    return
  }
  if (!current.value) return

  const oldType = current.value.alert_type_name
  const newType = modifyTypeForm.value.categoryPaths[0][1] || modifyTypeForm.value.categoryPaths[0][0]
  current.value.alert_type_name = newType

  appendTimeline('verify', '修正预警类型', `修正预警类型：${oldType} → ${newType}`)
  modifyTypeVisible.value = false
  message.success('预警类型已修正')
}

// 提交修正紧急程度
function submitModifyUrgency() {
  if (!modifyUrgencyForm.value.urgency) {
    message.error('请选择紧急程度')
    return
  }
  if (!current.value) return

  const oldUrgency = current.value.urgency === 'urgent' ? '紧急' : '一般'
  const newUrgency = modifyUrgencyForm.value.urgency === 'urgent' ? '紧急' : '一般'
  current.value.urgency = modifyUrgencyForm.value.urgency as 'urgent' | 'normal'

  appendTimeline('verify', '修正紧急程度', `修正紧急程度：${oldUrgency} → ${newUrgency}`)
  modifyUrgencyVisible.value = false
  message.success('紧急程度已修正')
}

// 提交合并升级
function submitMergeEscalate() {
  if (!mergeEscalateForm.value.selectedIds || mergeEscalateForm.value.selectedIds.length === 0) {
    message.error('请选择关联预警')
    return
  }
  if (!mergeEscalateForm.value.note) {
    message.error('请填写升级说明')
    return
  }
  if (!current.value) return

  const eventId = 'SJ-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-0001'
  current.value.status = 'escalated'
  current.value.escalated_event_id = eventId

  appendTimeline('decision', '合并升级为事件', `与 ${mergeEscalateForm.value.selectedIds.length} 条预警合并升级为事件：${eventId}，说明：${mergeEscalateForm.value.note}`)
  mergeEscalateVisible.value = false
  message.success('已合并升级为事件：' + eventId)
}

// 提交关联已有事件
function submitRelateEvent() {
  if (!relateEventForm.value.eventNo) {
    message.error('请输入事件编号')
    return
  }
  if (!current.value) return

  current.value.status = 'escalated'
  current.value.escalated_event_id = relateEventForm.value.eventNo

  appendTimeline('decision', '关联到已有事件', `关联到事件 ${relateEventForm.value.eventNo}${relateEventForm.value.note ? '，说明：' + relateEventForm.value.note : ''}`)
  relateEventVisible.value = false
  message.success('已关联到事件：' + relateEventForm.value.eventNo)
}

// 提交追加跟踪记录
function submitTrackAppend() {
  if (!trackAppendForm.value.content) {
    message.error('请填写跟踪记录')
    return
  }

  appendTimeline('decision', '追加跟踪记录', trackAppendForm.value.content)
  trackAppendVisible.value = false
  trackAppendForm.value.content = ''
  message.success('跟踪记录已追加')
}

// ==================== 按钮显隐计算属性 ====================

const isTerminal = computed(() =>
  ['false_alarm', 'merged', 'resolved', 'escalated'].includes(current.value?.status ?? '')
)
const showFalseAlarm = computed(() => current.value?.status === 'pending_verify')
const showMerge      = computed(() => current.value?.status === 'pending_verify')
const showVerify     = computed(() => current.value?.status === 'pending_verify')
const showTask       = computed(() =>
  ['pending_verify', 'pending_decision'].includes(current.value?.status ?? '')
)
const showDrone      = computed(() => !isTerminal.value)
const showDecide     = computed(() =>
  ['pending_decision', 'tracking'].includes(current.value?.status ?? '')
)
const showTrackAppend = computed(() => current.value?.status === 'tracking')

// ==================== 状态颜色 ====================

const statusColor: Record<AlertStatus, string> = {
  pending_verify:  'var(--of-color-primary)',
  pending_decision:'#faad14',
  tracking:        '#9b7cff',
  false_alarm:     'var(--of-text-tertiary)',
  merged:          'var(--of-text-tertiary)',
  resolved:        'var(--of-color-success)',
  escalated:       'var(--of-color-error)',
}

const timelineCategoryColor: Record<string, string> = {
  system:   'var(--of-text-tertiary)',
  verify:   'var(--of-color-link)',
  decision: '#9b7cff',
  external: '#52c41a',
}
</script>

<template>
  <div class="ai-root" v-if="current">

    <!-- ═══ 顶栏 ═══════════════════════════════════════════════════════ -->
    <div class="ai-topbar">
      <button class="btn-back" @click="router.push({ name: 'AlertWorkbench' })">
        <ArrowLeftOutlined />
        <span>返回工作台</span>
      </button>

      <div class="topbar-meta">
        <span class="alert-no-tag">{{ current.alert_no }}</span>
        <span class="alert-name">{{ current.alert_type_name }} · {{ current.camp_name }}营地</span>
        <span
          class="urgency-badge"
          :class="current.urgency === 'urgent' ? 'badge-urgent' : 'badge-normal'"
        >
          {{ current.urgency === 'urgent' ? '🔴 紧急' : '⚪ 一般' }}
        </span>
      </div>

      <div class="topbar-right">
        <span
          class="status-chip"
          :style="{ borderColor: statusColor[current.status], color: statusColor[current.status] }"
        >
          {{ STATUS_LABEL[current.status] }}
        </span>
      </div>
    </div>

    <!-- ═══ 主体三栏 ═══════════════════════════════════════════════════ -->
    <div class="ai-body">

      <!-- ── 左：待办队列 ────────────────────────────────────────────── -->
      <aside class="ai-queue" :class="{ collapsed: queueCollapsed }">
        <div class="queue-header">
          <span v-show="!queueCollapsed" class="queue-title">
            待处理
            <span class="queue-count">{{ pendingList.length }}</span>
          </span>
          <button class="queue-collapse-btn" @click="queueCollapsed = !queueCollapsed">
            <MenuFoldOutlined v-if="!queueCollapsed" />
            <MenuUnfoldOutlined v-else />
          </button>
        </div>

        <div v-show="!queueCollapsed" class="queue-list">
          <div
            v-for="item in pendingList"
            :key="item.alert_id"
            class="queue-item"
            @click="switchTo(item.alert_id)"
          >
            <span class="item-dot" :class="item.urgency === 'urgent' ? 'dot-urgent' : 'dot-normal'" />
            <div class="item-info">
              <div class="item-name">{{ item.alert_type_name }}</div>
              <div class="item-meta">
                <span>{{ STATUS_LABEL[item.status] }}</span>
              </div>
            </div>
          </div>

          <div v-if="pendingOverflow" class="queue-overflow">
            还有更多，<a-button type="link" size="small" style="padding:0" @click="router.push({ name: 'AlertWorkbench' })">查看全部</a-button>
          </div>

          <div v-if="pendingList.length === 0" class="queue-empty">
            <CheckCircleOutlined />
            <span>无其他待处理</span>
          </div>
        </div>
      </aside>

      <!-- ── 中：地图 + 视频区 ──────────────────────────────────────── -->
      <main class="ai-center">

        <!-- 地图区 -->
        <div class="ai-map">

          <!-- 模拟地图底图 -->
          <div class="map-bg" @click="handleMapClick">
            <div class="map-grid" />

            <!-- 研判半径圈 -->
            <div v-if="current.location_lat && current.location_lng" class="judgement-radius-circle"
              :style="{ width: radiusCircleSize + 'px', height: radiusCircleSize + 'px' }">
              <div class="radius-label">研判半径 {{ judgementRadius >= 1000 ? (judgementRadius / 1000).toFixed(1) + ' km' : judgementRadius + ' m' }}</div>
            </div>

            <!-- 预警点脉冲 -->
            <div
              v-if="current.location_lat"
              class="map-alert-point"
              :class="current.urgency === 'urgent' ? 'point-urgent' : 'point-normal'"
            >
              <div class="point-pulse" />
              <div class="point-core">
                <EnvironmentOutlined />
              </div>
              <div class="point-label">{{ current.alert_type_name }}</div>
            </div>

            <!-- 选点模式提示 -->
            <div v-if="pickingLocation" class="picking-hint">
              <span>点击地图选择预警位置</span>
              <a-button size="small" @click.stop="cancelPickLocation">取消选点</a-button>
            </div>

            <!-- 待定位提示 -->
            <div v-if="!current.location_lat && !pickingLocation" class="map-no-location">
              <ExclamationCircleOutlined />
              <span>该预警暂无位置信息，请在地图上选点后启用图层</span>
              <a-space>
                <a-button type="primary" size="small" ghost @click="startPickLocation">在地图上选点</a-button>
                <a-button size="small" ghost @click="openLocationInput">输入经纬度</a-button>
              </a-space>
            </div>

            <!-- 图层① 周边摄像头 -->
            <div v-if="layers.cameras && current.location_lat" class="layer-demo layer-cameras">
              <div
                v-for="cam in nearbyCameras"
                :key="cam.id"
                class="layer-dot"
                :class="{
                  'cam-aimed': cam.type === 'high_point' && cam.aimed,
                  'cam-need-turn': cam.type === 'high_point' && !cam.aimed,
                  'cam-cctv': cam.type === 'cctv',
                  'cam-offline': !cam.online
                }"
                :style="getDotPosition(cam.lat, cam.lng)"
                @click.stop="cam.online ? showCameraPopup(cam, $event) : null"
              >
                <VideoCameraOutlined />
                <!-- 高点摄像头视野扇形 -->
                <div v-if="cam.type === 'high_point' && cam.online" class="cam-fov"
                  :class="{ 'fov-aimed': cam.aimed, 'fov-turn': !cam.aimed }"
                  :style="{ transform: `rotate(${(cam.azimuth || 0) - 30}deg)` }" />
              </div>
            </div>

            <!-- 图层② 我方无人机和机巢 -->
            <div v-if="layers.drones && current.location_lat" class="layer-demo layer-drones">
              <!-- C类无人机 -->
              <div
                v-for="drone in nearbyDrones.filter(d => d.type === 'c_class' && d.lat)"
                :key="drone.id"
                class="layer-dot drone-dot"
                :style="getDotPosition(drone.lat!, drone.lng!)"
                @click.stop="showDronePopup(drone, $event)"
              >
                <img src="/drone-icon.png" class="drone-icon c-class" />
                <div class="drone-status-badge" :class="'status-' + drone.status">
                  {{ getDroneStatusLabel(drone.status) }}
                </div>
                <div class="drone-battery-badge" :class="{ 'battery-low': drone.battery < 20 }">
                  {{ drone.battery }}%
                </div>
              </div>

              <!-- A类无人机 -->
              <div
                v-for="drone in nearbyDrones.filter(d => d.type === 'a_class' && d.lat)"
                :key="drone.id"
                class="layer-dot drone-dot"
                :style="getDotPosition(drone.lat!, drone.lng!)"
                @click.stop="showDronePopup(drone, $event)"
              >
                <img src="/plane-icon.png" class="drone-icon a-class" />
                <div class="drone-status-badge" :class="'status-' + drone.status">
                  {{ getDroneStatusLabel(drone.status) }}
                </div>
                <div class="drone-battery-badge" :class="{ 'battery-low': drone.battery < 20 }">
                  {{ drone.battery }}%
                </div>
              </div>

              <!-- 机巢 -->
              <div
                v-for="nest in nearbyNests"
                :key="nest.id"
                class="layer-dot nest-dot"
                :style="getDotPosition(nest.lat, nest.lng)"
                :title="nest.name + (nest.online ? ' · 在线' : ' · 离线')"
              >
                <div class="nest-icon" :class="{ 'nest-offline': !nest.online }">
                  <div class="nest-hatch" :class="{ 'hatch-open': nest.hatchOpen }" />
                </div>
              </div>
            </div>

            <!-- 图层③ 反无实时目标 -->
            <div v-if="layers.antiUav && current.location_lat" class="layer-demo layer-anti-uav">
              <div
                v-for="target in nearbyAntiUav"
                :key="target.id"
                class="layer-dot anti-dot"
                :class="{
                  'anti-unknown': target.type === 'unknown',
                  'anti-whitelist': target.type === 'whitelist',
                  'anti-suspected': target.type === 'suspected_ours'
                }"
                :style="getDotPosition(target.lat, target.lng)"
                :title="getAntiUavTooltip(target)"
              >
                <RadarChartOutlined />
                <div v-if="target.type === 'suspected_ours'" class="suspected-badge">疑似己方</div>
              </div>
            </div>

            <!-- 图层⑦ 周边车辆 -->
            <div v-if="layers.vehicles && current.location_lat" class="layer-demo layer-vehicles">
              <div
                v-for="veh in nearbyVehicles"
                :key="veh.id"
                class="layer-dot vehicle-dot"
                :style="getDotPosition(veh.lat, veh.lng)"
                :title="`${veh.plate} · ${veh.status} · 速度 ${veh.speed} km/h`"
              >
                <CarOutlined :style="{ transform: `rotate(${veh.heading}deg)` }" />
              </div>
            </div>
          </div>

          <!-- 图层控制（右上角） -->
          <div class="layer-control">
            <button class="layer-toggle" @click="layerPanelOpen = !layerPanelOpen">
              <ApartmentOutlined />
              <span>图层</span>
            </button>
            <div v-show="layerPanelOpen" class="layer-panel">
              <div class="layer-group-title">研判图层</div>
              <label class="layer-item"><a-checkbox v-model:checked="layers.cameras" />周边摄像头</label>
              <label class="layer-item"><a-checkbox v-model:checked="layers.drones" />我方无人机</label>
              <label class="layer-item"><a-checkbox v-model:checked="layers.antiUav" />反无实时目标</label>
              <label class="layer-item"><a-checkbox v-model:checked="layers.vehicles" />周边车辆/手持机</label>
              <div class="layer-group-title" style="margin-top:8px">分析图层</div>
              <label class="layer-item"><a-checkbox v-model:checked="layers.history" />历史时间回溯</label>
              <label class="layer-item"><a-checkbox v-model:checked="layers.sensitiveZone" />敏感区域</label>
              <label class="layer-item"><a-checkbox v-model:checked="layers.historyAlerts" />历史同区域预警</label>
            </div>
          </div>

          <!-- 地图图例 -->
          <div class="map-legend">
            <span class="legend-item"><span class="ld cam-aimed-ld" />高点·已对准</span>
            <span class="legend-item"><span class="ld cam-turn-ld" />高点·需转向</span>
            <span class="legend-item"><span class="ld cctv-ld" />CCTV</span>
            <span class="legend-item"><span class="ld drone-ld" />我方无人机</span>
            <span class="legend-item"><span class="ld unknown-ld" />未知目标</span>
          </div>

          <!-- 周边资源快照 + 半径调整器 -->
          <div class="resource-snapshot">
            <span class="snap-item" :class="{ 'snap-ok': current.resource_snapshot.high_cam_aimed }">
              <VideoCameraOutlined />
              摄像头 {{ current.resource_snapshot.cameras_online }} 台在线
              <span v-if="current.resource_snapshot.high_cam_aimed" class="snap-badge">已对准</span>
            </span>
            <span class="snap-sep" />
            <span class="snap-item" :class="{ 'snap-warn': current.resource_snapshot.drones_available === 0 }">
              <RocketOutlined />
              可调度无人机 {{ current.resource_snapshot.drones_available }} 架
            </span>
            <span class="snap-sep" />
            <span class="snap-item radius-adjuster">
              <span style="margin-right: 8px">研判半径</span>
              <a-space :size="4">
                <a-button
                  v-for="opt in radiusOptions"
                  :key="opt.value"
                  size="small"
                  :type="judgementRadius === opt.value ? 'primary' : 'default'"
                  @click="setRadius(opt.value)"
                >{{ opt.label }}</a-button>
              </a-space>
            </span>
          </div>
        </div>

        <!-- 视频多屏区 -->
        <div class="ai-video" :class="{ collapsed: videoAreaCollapsed }">
          <div class="video-header">
            <span class="video-title">
              <VideoCameraOutlined />
              实时画面（最多 4 路）
            </span>
            <div class="video-header-actions">
              <a-button size="small" ghost @click="addVideoSlot('高点-Jaouro-东南')">
                <template #icon><PlusOutlined /></template>添加摄像头
              </a-button>
              <button class="collapse-btn" @click="videoAreaCollapsed = !videoAreaCollapsed">
                <span v-if="!videoAreaCollapsed">折叠</span>
                <span v-else>展开</span>
              </button>
            </div>
          </div>

          <div v-show="!videoAreaCollapsed" class="video-grid">
            <div
              v-for="(slot, idx) in videoSlots"
              :key="idx"
              class="video-slot"
              :class="{ 'slot-active': slot !== null }"
            >
              <template v-if="slot">
                <div class="video-mock">
                  <div class="video-scan-line" />
                  <div class="video-label">{{ slot }}</div>
                  <div class="video-live-badge">LIVE</div>
                  <button class="video-capture" @click.stop="captureVideo(idx)" title="截图">
                    <CameraOutlined />
                  </button>
                  <button class="video-remove" @click.stop="videoSlots[idx] = null">✕</button>
                </div>
              </template>
              <template v-else>
                <div class="video-empty">
                  <VideoCameraOutlined />
                  <span>从地图摄像头图层添加</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </main>

      <!-- 摄像头气泡 -->
      <div v-if="activeCameraPopup" class="camera-popup"
        :style="{ top: cameraPopupPosition.top + 'px', left: cameraPopupPosition.left + 'px' }"
        @click.stop>
        <div class="popup-header">
          {{ nearbyCameras.find(c => c.id === activeCameraPopup)?.name }}
          <button class="popup-close" @click="hideCameraPopup">✕</button>
        </div>
        <div class="popup-body">
          <template v-if="nearbyCameras.find(c => c.id === activeCameraPopup)?.type === 'high_point'">
            <div class="popup-row">
              <span class="popup-label">通道：</span>
              <a-space :size="4">
                <a-tag color="blue">可见光</a-tag>
                <a-tag color="orange">热成像</a-tag>
              </a-space>
            </div>
          </template>
          <div class="popup-row">
            <span class="popup-label">距离预警点：</span>
            <span>{{ Math.round(Math.random() * 500 + 100) }}m</span>
          </div>
          <div class="popup-row" v-if="nearbyCameras.find(c => c.id === activeCameraPopup)?.type === 'high_point'">
            <span class="popup-label">状态：</span>
            <span :style="{ color: nearbyCameras.find(c => c.id === activeCameraPopup)?.aimed ? '#52c41a' : '#faad14' }">
              {{ nearbyCameras.find(c => c.id === activeCameraPopup)?.aimed ? '✅ 已对准' : '🔄 需转向' }}
            </span>
          </div>
        </div>
        <div class="popup-footer">
          <a-button
            type="primary"
            size="small"
            block
            :disabled="videoSlots.every(s => s !== null)"
            @click="addCameraToVideo(nearbyCameras.find(c => c.id === activeCameraPopup)!)"
          >
            {{ videoSlots.every(s => s !== null) ? '视频区已满' : '添加到视频区' }}
          </a-button>
        </div>
      </div>

      <!-- 无人机气泡 -->
      <div v-if="activeDronePopup" class="camera-popup"
        :style="{ top: dronePopupPosition.top + 'px', left: dronePopupPosition.left + 'px' }"
        @click.stop>
        <div class="popup-header">
          {{ nearbyDrones.find(d => d.id === activeDronePopup)?.name }}
          <button class="popup-close" @click="hideDronePopup">✕</button>
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <span class="popup-label">状态：</span>
            <span>{{ getDroneStatusLabel(nearbyDrones.find(d => d.id === activeDronePopup)?.status || '') }}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">电量：</span>
            <span :style="{ color: (nearbyDrones.find(d => d.id === activeDronePopup)?.battery || 0) < 20 ? '#ff4d4f' : '#52c41a' }">
              {{ nearbyDrones.find(d => d.id === activeDronePopup)?.battery }}%
            </span>
          </div>
          <div class="popup-row">
            <span class="popup-label">位置：</span>
            <span>{{ nearbyDrones.find(d => d.id === activeDronePopup)?.lat ? '实时位置' : '驻地（' + nearbyDrones.find(d => d.id === activeDronePopup)?.camp + ' 营地）' }}</span>
          </div>
        </div>
        <div class="popup-footer">
          <a-button
            type="primary"
            size="small"
            block
            @click="goToDroneDispatch(nearbyDrones.find(d => d.id === activeDronePopup)!)"
          >
            生成调度卡片
          </a-button>
        </div>
      </div>

      <!-- 位置设置弹窗 -->
      <a-modal
        v-model:open="locationModalVisible"
        title="补充预警位置"
        width="600px"
        ok-text="确认位置"
        cancel-text="取消"
        @ok="confirmLocation"
      >
        <div style="padding: 16px 0">
          <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px">
            <span style="color: #8c8c8c; width: 60px">经度：</span>
            <a-input-number
              v-model:value="editableLocation.lng"
              :min="-180"
              :max="180"
              :precision="6"
              :step="0.000001"
              style="flex: 1"
              placeholder="请输入经度"
            />
          </div>
          <div style="display: flex; gap: 16px; align-items: center">
            <span style="color: #8c8c8c; width: 60px">纬度：</span>
            <a-input-number
              v-model:value="editableLocation.lat"
              :min="-90"
              :max="90"
              :precision="6"
              :step="0.000001"
              style="flex: 1"
              placeholder="请输入纬度"
            />
          </div>
          <div style="margin-top: 12px; padding: 8px; background: rgba(24, 144, 255, 0.1); border-radius: 4px; font-size: 12px; color: #8c8c8c">
            提示：也可以在地图上直接点击选点
          </div>
        </div>
      </a-modal>

      <!-- ── 右：详情 Tab 区 ─────────────────────────────────────────── -->
      <aside class="ai-detail">
        <div class="detail-tabs">
          <button
            v-for="tab in [
              { key: 'overview',  label: '概要' },
              { key: 'evidence',  label: '证据' },
              { key: 'timeline',  label: '时间线' },
            ]"
            :key="tab.key"
            class="detail-tab"
            :class="{ active: activeRightTab === tab.key }"
            @click="activeRightTab = tab.key as any"
          >{{ tab.label }}</button>
        </div>

        <div class="detail-body">

          <!-- 概要 Tab ───────────────────────────────────────── -->
          <div v-if="activeRightTab === 'overview'" class="tab-content">
            <section class="info-section">
              <div class="section-title">基础信息</div>
              <div class="info-grid">
                <div class="info-row">
                  <span class="info-key">编号</span>
                  <span class="info-val mono">{{ current.alert_no }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">类型</span>
                  <span class="info-val">
                    <span class="category-badge">{{ current.alert_category }}</span>
                    {{ current.alert_type_name }}
                    <a-button type="link" size="small" style="padding: 0 4px; font-size: 11px;" @click="modifyTypeVisible = true">修正</a-button>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-key">紧急程度</span>
                  <span class="info-val">
                    <span :class="current.urgency === 'urgent' ? 'text-urgent' : 'text-muted'">
                      {{ current.urgency === 'urgent' ? '🔴 紧急' : '⚪ 一般' }}
                    </span>
                    <a-button type="link" size="small" style="padding: 0 4px; font-size: 11px;" @click="modifyUrgencyVisible = true">修正</a-button>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-key">来源</span>
                  <span class="info-val">
                    {{ SOURCE_LABEL[current.source_type] }}
                    <span class="info-device">{{ current.source_device_name }}</span>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-key">营地归属</span>
                  <span class="info-val">
                    {{ current.camp_name }}
                    <span v-if="current.camp_outside_meters" class="outside-tag">
                      营地外 {{ current.camp_outside_meters }}m
                    </span>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-key">触发次数</span>
                  <span class="info-val">
                    {{ current.trigger_count }} 次
                    <span v-if="current.trigger_count > 1" class="text-muted" style="font-size:11px">
                      （最后触发 {{ relativeTime(current.last_trigger_at) }}）
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <section v-if="current.verification_result" class="info-section">
              <div class="section-title">核实结论</div>
              <div class="verify-result">
                <CheckCircleOutlined
                  :style="{ color: current.verification_result === 'real' ? 'var(--of-color-error)' : '#faad14' }"
                />
                <span>{{ current.verification_result === 'real' ? '真实威胁' : '无法确认' }}</span>
                <span class="text-muted">· {{ current.verified_by }} · {{ current.verification_at ? relativeTime(current.verification_at) : '' }}</span>
              </div>
            </section>

            <!-- 自动合并信息 -->
            <section v-if="current.trigger_count > 1" class="info-section">
              <div class="section-title">自动合并</div>
              <div class="merge-info">
                本预警由 <strong>{{ current.trigger_count }}</strong> 条原始告警合并而来，最后触发时间：{{ relativeTime(current.last_trigger_at) }}
              </div>
            </section>
          </div>

          <!-- 证据 Tab ───────────────────────────────────────── -->
          <div v-if="activeRightTab === 'evidence'" class="tab-content">
            <!-- 自动采集证据 -->
            <div class="evidence-group">
              <div class="evidence-group-title">自动采集证据</div>
              <div class="evidence-item">
                <div class="evidence-thumb mock-image"><HistoryOutlined /></div>
                <div class="evidence-info">
                  <div class="evidence-label">{{ current.source_device_name }} 告警截图</div>
                  <div class="evidence-meta">{{ relativeTime(current.created_at) }}</div>
                </div>
              </div>
            </div>

            <!-- 核实任务回填 -->
            <div class="evidence-group">
              <div class="evidence-group-title">核实任务回填</div>
              <div class="evidence-empty">
                <TeamOutlined />
                <span>暂无 App 回填记录</span>
              </div>
            </div>

            <!-- PC 补录 -->
            <div class="evidence-group">
              <div class="evidence-group-title">PC 补录</div>
              <div class="evidence-empty">
                <FileAddOutlined />
                <span>暂无补录记录</span>
              </div>
            </div>
          </div>

          <!-- 时间线 Tab ─────────────────────────────────────── -->
          <div v-if="activeRightTab === 'timeline'" class="tab-content timeline-content">
            <!-- 类型筛选 -->
            <div class="tl-filter-bar">
              <a-radio-group v-model:value="tlFilter" size="small" button-style="solid">
                <a-radio-button value="all">全部</a-radio-button>
                <a-radio-button value="system">系统</a-radio-button>
                <a-radio-button value="verify">值班员</a-radio-button>
                <a-radio-button value="decision">负责人</a-radio-button>
                <a-radio-button value="external">外部回填</a-radio-button>
              </a-radio-group>
            </div>

            <div class="timeline-list">
              <div
                v-for="item in filteredTimeline"
                :key="item.id"
                class="tl-item"
              >
                <div class="tl-left">
                  <div class="tl-dot" :style="{ background: timelineCategoryColor[item.category] }" />
                  <div class="tl-line" />
                </div>
                <div class="tl-body">
                  <div class="tl-header">
                    <span class="tl-action">{{ item.action }}</span>
                    <span v-if="item.operator" class="tl-operator">{{ item.operator }}</span>
                    <span class="tl-time">{{ relativeTime(item.time) }}</span>
                  </div>
                  <div class="tl-content">{{ item.content }}</div>
                </div>
              </div>

              <div v-if="filteredTimeline.length === 0" class="tl-empty">
                <span>暂无符合条件的记录</span>
              </div>
            </div>

            <div class="tl-add">
              <a-button type="dashed" size="small" block @click="supplementVisible = true">
                <template #icon><FileAddOutlined /></template>
                PC 补录现场核实
              </a-button>
            </div>
          </div>

        </div>
      </aside>
    </div>

    <!-- ═══ 底部操作栏 ════════════════════════════════════════════════ -->
    <div class="ai-actionbar" v-if="!isTerminal">
      <div class="action-left">
        <!-- 左侧：辅助操作 -->
        <a-button v-if="showTask" size="small" @click="taskVisible = true">
          <template #icon><TeamOutlined /></template>下发核实任务
        </a-button>
        <a-button size="small" @click="supplementVisible = true">
          <template #icon><FileAddOutlined /></template>PC 补录
        </a-button>
        <a-button v-if="showTrackAppend" size="small" @click="trackAppendVisible = true">
          <template #icon><EditOutlined /></template>追加跟踪记录
        </a-button>
        <a-button v-if="showDrone" size="small" @click="droneVisible = true">
          <template #icon><RocketOutlined /></template>调度无人机
        </a-button>
      </div>

      <div class="action-right">
        <!-- 待核实：标记误报 / 并入 / 提交结论 -->
        <template v-if="showFalseAlarm">
          <a-button size="small" danger @click="falseAlarmVisible = true">
            <template #icon><CloseCircleOutlined /></template>标记误报
          </a-button>
        </template>
        <template v-if="showMerge">
          <a-button size="small" @click="mergeVisible = true">
            <template #icon><MergeCellsOutlined /></template>并入其他预警
          </a-button>
        </template>
        <template v-if="showVerify">
          <a-button type="primary" size="small" @click="verifyVisible = true">
            提交核实结论 →
          </a-button>
        </template>

        <!-- 待决策：解除 / 持续跟踪 / 升级 / 合并升级 / 关联已有事件 -->
        <template v-if="showDecide && current.status === 'pending_decision'">
          <a-button size="small" @click="decideForm.action = 'resolve'; decideVisible = true">
            <template #icon><CheckCircleOutlined /></template>解除预警
          </a-button>
          <a-button size="small" @click="decideForm.action = 'track'; decideVisible = true">
            持续跟踪
          </a-button>
          <a-button size="small" @click="mergeEscalateVisible = true">
            <template #icon><MergeCellsOutlined /></template>合并升级
          </a-button>
          <a-button size="small" @click="relateEventVisible = true">
            <template #icon><LinkOutlined /></template>关联已有事件
          </a-button>
          <a-button type="primary" size="small" danger @click="decideForm.action = 'escalate'; decideVisible = true">
            <template #icon><ExclamationCircleOutlined /></template>升级为事件
          </a-button>
        </template>

        <!-- 持续跟踪中：解除 / 升级 -->
        <template v-if="showDecide && current.status === 'tracking'">
          <a-button size="small" @click="decideForm.action = 'resolve'; decideVisible = true">
            <template #icon><CheckCircleOutlined /></template>解除预警
          </a-button>
          <a-button size="small" @click="relateEventVisible = true">
            <template #icon><LinkOutlined /></template>关联已有事件
          </a-button>
          <a-button type="primary" size="small" danger @click="decideForm.action = 'escalate'; decideVisible = true">
            <template #icon><ExclamationCircleOutlined /></template>升级为事件
          </a-button>
        </template>
      </div>
    </div>

    <!-- 终态提示栏 -->
    <div class="ai-terminal-bar" v-if="isTerminal">
      <CheckCircleOutlined style="color: var(--of-color-success)" />
      <span>该预警已进入终态：{{ STATUS_LABEL[current.status] }}，不可再操作</span>
      <a-button size="small" @click="router.push({ name: 'AlertWorkbench' })">返回工作台</a-button>
    </div>

    <!-- ═══ 弹窗：标记误报 ══════════════════════════════════════════ -->
    <a-modal v-model:open="falseAlarmVisible" title="标记误报" :width="480"
      ok-text="确认误报" ok-type="danger" :mask-closable="false" @ok="submitFalseAlarm">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">误报原因 <span class="required">*</span></label>
          <a-select v-model:value="falseAlarmForm.reason" placeholder="请选择" style="width:100%">
            <a-select-option value="设备误识别">设备误识别</a-select-option>
            <a-select-option value="己方目标">己方目标</a-select-option>
            <a-select-option value="白名单目标">白名单目标</a-select-option>
            <a-select-option value="动物或天气干扰">动物或天气干扰</a-select-option>
            <a-select-option value="其他">其他（必填说明）</a-select-option>
          </a-select>
        </div>
        <div class="form-item" v-if="falseAlarmForm.reason === '其他'">
          <label class="form-label">说明 <span class="required">*</span></label>
          <a-textarea v-model:value="falseAlarmForm.remark" :rows="3" placeholder="请说明误报原因" />
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：并入其他预警 ════════════════════════════════════════ -->
    <a-modal v-model:open="mergeVisible" title="并入其他预警" :width="520"
      ok-text="确认并入" ok-type="danger" :mask-closable="false" @ok="submitMerge">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">目标预警 <span class="required">*</span></label>
          <a-select v-model:value="mergeForm.targetNo" placeholder="搜索或选择目标预警编号"
            show-search style="width:100%">
            <a-select-option
              v-for="r in mergeTargets" :key="r.alert_id" :value="r.alert_no">
              <span class="mono">{{ r.alert_no }}</span>
              <span style="color:var(--of-text-tertiary);margin-left:8px;font-size:12px">{{ r.alert_name }}</span>
            </a-select-option>
          </a-select>
          <div class="form-hint">当前预警将被并入目标预警，证据将复制过去，本条进入「已合并」终态</div>
        </div>
        <div class="form-item">
          <label class="form-label">说明</label>
          <a-textarea v-model:value="mergeForm.note" :rows="2" placeholder="可选，描述合并原因" />
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：提交核实结论 ════════════════════════════════════════ -->
    <a-modal v-model:open="verifyVisible" title="提交核实结论" :width="480"
      ok-text="提交结论" :mask-closable="false" @ok="submitVerify">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">核实结论 <span class="required">*</span></label>
          <a-radio-group v-model:value="verifyForm.result" style="display:flex;flex-direction:column;gap:8px">
            <a-radio value="real">
              <span style="color:var(--of-color-error)">✦ 真实威胁</span>
              <span class="radio-hint">确认存在安防威胁</span>
            </a-radio>
            <a-radio value="unconfirmed">
              <span style="color:#faad14">◆ 无法确认</span>
              <span class="radio-hint">目标消失/视角受限，暂时无法判断</span>
            </a-radio>
          </a-radio-group>
        </div>
        <div class="form-item">
          <label class="form-label">核实说明</label>
          <a-textarea v-model:value="verifyForm.note" :rows="3" placeholder="描述现场情况、佐证材料等" />
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：解除 / 持续跟踪 / 升级 ══════════════════════════════ -->
    <a-modal v-model:open="decideVisible"
      :title="decideForm.action === 'resolve' ? '解除预警' : decideForm.action === 'track' ? '持续跟踪' : '升级为事件'"
      :width="480"
      :ok-text="decideForm.action === 'resolve' ? '确认解除' : decideForm.action === 'track' ? '确认跟踪' : '确认升级'"
      :ok-type="decideForm.action === 'escalate' ? 'danger' : 'primary'"
      :mask-closable="false"
      @ok="submitDecide">
      <div class="modal-form">
        <div v-if="decideForm.action === 'resolve'" class="form-item">
          <label class="form-label">解除原因 <span class="required">*</span></label>
          <a-select v-model:value="decideForm.resolveReason" placeholder="请选择" style="width:100%">
            <a-select-option value="已劝离">已劝离</a-select-option>
            <a-select-option value="自然消失">自然消失</a-select-option>
            <a-select-option value="风险已消除">风险已消除</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </div>
        <div class="form-item">
          <label class="form-label">
            {{ decideForm.action === 'escalate' ? '升级说明' : '处置说明' }}
            <span v-if="decideForm.action === 'escalate'" class="required">*</span>
          </label>
          <a-textarea v-model:value="decideForm.note" :rows="4"
            :placeholder="decideForm.action === 'resolve' ? '描述解除经过' : decideForm.action === 'track' ? '描述持续关注的理由和初始观察' : '描述升级的依据和严重程度'" />
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：下发核实任务 ══════════════════════════════════════════ -->
    <a-modal v-model:open="taskVisible" title="下发核实任务" :width="500"
      ok-text="下发任务" :mask-closable="false" @ok="submitTask">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">接收人 <span class="required">*</span></label>
          <a-select v-model:value="taskForm.receiver" placeholder="选择接收人" style="width:100%" show-search>
            <a-select-option value="张志远">张志远（值班员）</a-select-option>
            <a-select-option value="王力">王力（值班员）</a-select-option>
            <a-select-option value="李华">李华（巡逻员）</a-select-option>
          </a-select>
        </div>
        <div class="form-item">
          <label class="form-label">核实要求 <span class="required">*</span></label>
          <a-textarea v-model:value="taskForm.requirement" :rows="3"
            placeholder="描述需要现场核实的内容，例如：前往围界 E-03 确认是否有可疑人员" />
        </div>
        <div class="form-item">
          <label class="form-label">期限</label>
          <a-date-picker v-model:value="(taskForm.deadline as any)" show-time
            placeholder="选择截止时间" style="width:100%" />
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：PC 补录 ═══════════════════════════════════════════════ -->
    <a-modal v-model:open="supplementVisible" title="PC 补录现场核实" :width="480"
      ok-text="提交补录" :mask-closable="false" @ok="submitSupplement">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">补录内容 <span class="required">*</span></label>
          <a-textarea v-model:value="supplementForm.content" :rows="4"
            placeholder="例：手台联系李某某，确认目视到1名男性，已撤离" :maxlength="500" show-count />
        </div>
        <div class="form-item">
          <label class="form-label">附件（可选）</label>
          <a-upload list-type="picture" :before-upload="() => false" accept="image/*,video/*">
            <a-button size="small"><template #icon><PlusOutlined /></template>上传附件</a-button>
          </a-upload>
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：调度无人机 ════════════════════════════════════════════ -->
    <a-modal v-model:open="droneVisible" title="调度无人机" :width="480"
      ok-text="前往调度中心" :mask-closable="false">
      <div style="padding:16px 0;text-align:center;color:var(--of-text-secondary)">
        <RocketOutlined style="font-size:32px;color:var(--of-color-link);margin-bottom:12px;display:block" />
        <p style="margin:0 0 8px">将跳转至无人机监控中心，使用调度卡片功能向飞手推送任务</p>
        <p style="margin:0;font-size:12px;color:var(--of-text-tertiary)">预警位置和威胁描述将自动填入调度卡片</p>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：修正类型 ══════════════════════════════════════════════ -->
    <a-modal v-model:open="modifyTypeVisible" title="修正预警类型" :width="440"
      ok-text="确认修正" :mask-closable="false" @ok="submitModifyType">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">新类型 <span class="required">*</span></label>
          <a-cascader v-model:value="(modifyTypeForm.categoryPaths as any)"
            :options="CATEGORY_CASCADER" placeholder="请选择类型" style="width:100%" />
          <div class="form-hint">修正前后值均会记入时间线</div>
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：修正紧急程度 ════════════════════════════════════════ -->
    <a-modal v-model:open="modifyUrgencyVisible" title="修正紧急程度" :width="400"
      ok-text="确认修正" :mask-closable="false" @ok="submitModifyUrgency">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">紧急程度 <span class="required">*</span></label>
          <a-radio-group v-model:value="modifyUrgencyForm.urgency" style="display:flex;flex-direction:column;gap:8px">
            <a-radio value="urgent"><span style="color:var(--of-color-error)">🔴 紧急</span><span class="radio-hint">需立即处理</span></a-radio>
            <a-radio value="normal"><span>⚪ 一般</span><span class="radio-hint">需关注，无需立即处理</span></a-radio>
          </a-radio-group>
          <div class="form-hint">修正前后值均会记入时间线</div>
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：合并升级为事件 ══════════════════════════════════════ -->
    <a-modal v-model:open="mergeEscalateVisible" title="合并升级为事件" :width="540"
      ok-text="确认合并升级" ok-type="danger" :mask-closable="false" @ok="submitMergeEscalate">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">选择关联预警（全部一起升级） <span class="required">*</span></label>
          <a-select v-model:value="mergeEscalateForm.selectedIds" mode="multiple"
            placeholder="选择待决策或跟踪中的预警" style="width:100%" :max-tag-count="3">
            <a-select-option v-for="r in mergeEscalateTargets" :key="r.alert_id" :value="r.alert_id">
              <span class="mono" style="font-size:11px">{{ r.alert_no }}</span>
              <span style="color:var(--of-text-tertiary);margin-left:6px;font-size:11px">{{ r.alert_name }}</span>
            </a-select-option>
          </a-select>
          <div class="form-hint">所选预警与当前预警将全部进入「已升级」终态，共用同一新事件</div>
        </div>
        <div class="form-item">
          <label class="form-label">升级说明 <span class="required">*</span></label>
          <a-textarea v-model:value="mergeEscalateForm.note" :rows="3" placeholder="描述升级依据和威胁综合研判" />
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：关联到已有事件 ══════════════════════════════════════ -->
    <a-modal v-model:open="relateEventVisible" title="关联到已有事件" :width="480"
      ok-text="确认关联" :mask-closable="false" @ok="submitRelateEvent">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">目标事件编号 <span class="required">*</span></label>
          <a-input v-model:value="relateEventForm.eventNo" placeholder="输入事件编号，如 SJ-20260926-0001" allow-clear />
          <div class="form-hint">只能关联到未关闭的事件；关联后本预警进入「已升级」终态</div>
        </div>
        <div class="form-item">
          <label class="form-label">说明</label>
          <a-textarea v-model:value="relateEventForm.note" :rows="2" placeholder="可选，描述关联理由" />
        </div>
      </div>
    </a-modal>

    <!-- ═══ 弹窗：追加跟踪记录 ════════════════════════════════════════ -->
    <a-modal v-model:open="trackAppendVisible" title="追加跟踪记录" :width="460"
      ok-text="提交记录" :mask-closable="false" @ok="submitTrackAppend">
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">跟踪记录 <span class="required">*</span></label>
          <a-textarea v-model:value="trackAppendForm.content" :rows="4"
            placeholder="描述最新跟踪情况" :maxlength="500" show-count />
          <div class="form-hint">记录后不改变预警状态，自动写入时间线</div>
        </div>
      </div>
    </a-modal>


    <!-- ═══ 弹窗：待办切换确认 ════════════════════════════════════════ -->
    <a-modal v-model:open="switchConfirmVisible" title="确认切换" :width="400"
      ok-text="放弃并切换" ok-type="danger" :mask-closable="false" @ok="confirmSwitch">
      <p style="margin:0;color:var(--of-text-secondary)">
        当前有未提交的操作，切换到其他预警后这些内容将丢失。确认要切换吗？
      </p>
    </a-modal>


  </div>

  <!-- 404 状态 -->
  <div v-else class="ai-not-found">
    <ExclamationCircleOutlined />
    <p>预警记录不存在或已被删除</p>
    <a-button type="primary" @click="router.push({ name: 'AlertWorkbench' })">返回工作台</a-button>
  </div>
</template>

<style scoped lang="scss">
// ── 根布局 ─────────────────────────────────────────────────────
.ai-root {
  position: fixed;
  inset: var(--of-layout-header-height) 0 0 var(--of-layout-sider-width);
  display: flex;
  flex-direction: column;
  background: var(--of-bg-body);
  overflow: hidden;
}

// ── 顶栏 ─────────────────────────────────────────────────────
.ai-topbar {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--of-spacing-4);
  padding: 0 var(--of-spacing-4);
  background: var(--of-bg-header);
  border-bottom: 1px solid var(--of-border-table);
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 var(--of-spacing-3);
  height: 28px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--of-radius-base);
  color: var(--of-text-secondary);
  font-size: var(--of-font-size-xs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: rgba(255,255,255,0.06); color: var(--of-text-primary); }
}

.topbar-meta {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
  flex: 1;
  min-width: 0;
}

.alert-no-tag {
  font-size: 11px;
  font-family: monospace;
  color: var(--of-color-link);
  white-space: nowrap;
  background: rgba(20,129,166,0.1);
  padding: 2px 6px;
  border-radius: 3px;
}

.alert-name {
  font-size: var(--of-font-size-base);
  font-weight: var(--of-font-weight-medium);
  color: var(--of-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.urgency-badge {
  font-size: var(--of-font-size-xs);
  white-space: nowrap;

  &.badge-urgent { color: var(--of-color-error); }
  &.badge-normal { color: var(--of-text-tertiary); }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
  margin-left: auto;
}

.status-chip {
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid;
  border-radius: 3px;
  white-space: nowrap;
}

.deadline-tag {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  font-variant-numeric: tabular-nums;

  &.deadline-overdue { color: var(--of-color-error); font-weight: var(--of-font-weight-medium); }
}

// ── 主体三栏 ─────────────────────────────────────────────────
.ai-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

// ── 待办队列 ─────────────────────────────────────────────────
.ai-queue {
  width: 240px;
  flex-shrink: 0;
  background: var(--of-bg-sider);
  border-right: 1px solid var(--of-border-table);
  display: flex;
  flex-direction: column;
  transition: width 0.2s;
  overflow: hidden;

  &.collapsed { width: 40px; }
}

.queue-header {
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--of-border-table);
}

.queue-title {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;

  .queue-count {
    font-size: 11px;
    padding: 0 5px;
    background: rgba(255,102,102,0.18);
    color: var(--of-color-error);
    border-radius: 8px;
    font-variant-numeric: tabular-nums;
  }
}

.queue-collapse-btn {
  background: transparent;
  border: none;
  color: var(--of-text-tertiary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  margin-left: auto;

  &:hover { color: var(--of-text-primary); }
}

.queue-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--of-spacing-2) 0;
}

.queue-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: var(--of-bg-row-hover); }
  &.item-overdue { background: rgba(255,102,102,0.04); }
}

.item-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;

  &.dot-urgent { background: var(--of-color-error); }
  &.dot-normal { background: var(--of-text-quaternary); }
}

.item-info {
  min-width: 0;
  flex: 1;
}

.item-name {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 18px;
}

.item-meta {
  font-size: 11px;
  color: var(--of-text-tertiary);
  display: flex;
  gap: 4px;
  margin-top: 2px;

  .dot-sep { color: var(--of-text-quaternary); }
  .text-overdue { color: var(--of-color-error); }
}

.queue-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 12px;
  color: var(--of-text-tertiary);
  font-size: var(--of-font-size-xs);
}

// ── 中央区域 ─────────────────────────────────────────────────
.ai-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-map {
  flex: 1;
  min-height: 0;
  position: relative;
  background: #0d1920;
  overflow: hidden;
}

.map-bg {
  width: 100%;
  height: 100%;
  position: relative;
}

.map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(20,129,166,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20,129,166,0.06) 1px, transparent 1px);
  background-size: 40px 40px;
}

.map-alert-point {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;

  .point-core {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    z-index: 2;
    position: relative;
  }

  .point-pulse {
    position: absolute;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    z-index: 1;
  }

  .point-label {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-primary);
    background: rgba(0,0,0,0.6);
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;
  }

  &.point-urgent .point-core {
    background: rgba(255,102,102,0.2);
    border: 2px solid var(--of-color-error);
    color: var(--of-color-error);
  }
  &.point-urgent .point-pulse {
    background: rgba(255,102,102,0.1);
    animation: map-pulse 2s infinite;
  }
  &.point-normal .point-core {
    background: rgba(20,129,166,0.2);
    border: 2px solid var(--of-color-primary);
    color: var(--of-color-link);
  }
}

@keyframes map-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  70% { transform: scale(2.5); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
}

.map-no-location {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--of-text-tertiary);
  font-size: var(--of-font-size-base);

  .anticon { font-size: 24px; color: #faad14; }
}

.layer-demo { position: absolute; inset: 0; }

.layer-dot {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.15s;

  &:hover { transform: scale(1.2); }

  &.cam-aimed   { background: rgba(82,196,26,0.2); border: 1px solid #52c41a; color: #52c41a; }
  &.cam-need-turn { background: rgba(250,173,20,0.2); border: 1px solid #faad14; color: #faad14; }
  &.cam-cctv    { background: rgba(20,129,166,0.2); border: 1px solid var(--of-color-primary); color: var(--of-color-link); }
  &.drone-standby { background: rgba(155,124,255,0.2); border: 1px solid #9b7cff; color: #9b7cff; }
  &.anti-unknown { background: rgba(255,102,102,0.2); border: 1px solid var(--of-color-error); color: var(--of-color-error);
    animation: blink 1.5s infinite; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.layer-control {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;

  .layer-toggle {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: rgba(24,34,43,0.9);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: var(--of-radius-base);
    color: var(--of-text-secondary);
    font-size: var(--of-font-size-xs);
    cursor: pointer;
    backdrop-filter: blur(4px);

    &:hover { color: var(--of-text-primary); }
  }

  .layer-panel {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    width: 160px;
    background: rgba(24,34,43,0.95);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: var(--of-radius-base);
    padding: var(--of-spacing-3);
    backdrop-filter: blur(8px);

    .layer-group-title {
      font-size: 11px;
      color: var(--of-text-tertiary);
      margin-bottom: 6px;
    }

    .layer-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--of-font-size-xs);
      color: var(--of-text-secondary);
      padding: 3px 0;
      cursor: pointer;

      &:hover { color: var(--of-text-primary); }
    }
  }
}

.map-legend {
  position: absolute;
  bottom: 8px;
  left: 12px;
  display: flex;
  gap: 12px;
  background: rgba(24,34,43,0.8);
  border-radius: var(--of-radius-base);
  padding: 4px 10px;
  backdrop-filter: blur(4px);

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--of-text-tertiary);
  }

  .ld {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.cam-aimed-ld   { background: #52c41a; }
    &.cam-turn-ld    { background: #faad14; }
    &.cctv-ld        { background: var(--of-color-primary); }
    &.drone-ld       { background: #9b7cff; }
    &.unknown-ld     { background: var(--of-color-error); }
  }
}

.resource-snapshot {
  position: absolute;
  bottom: 8px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(24,34,43,0.85);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--of-radius-base);
  padding: 5px 12px;
  font-size: 11px;
  backdrop-filter: blur(4px);

  .snap-item {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--of-text-tertiary);

    .anticon { font-size: 12px; }

    &.snap-ok .anticon { color: #52c41a; }
    &.snap-warn { color: #faad14; }

    .snap-badge {
      background: rgba(82,196,26,0.15);
      color: #52c41a;
      padding: 1px 5px;
      border-radius: 3px;
    }
  }

  .snap-sep {
    width: 1px;
    height: 12px;
    background: rgba(255,255,255,0.1);
  }
}

// ── 视频区 ───────────────────────────────────────────────────
.ai-video {
  flex-shrink: 0;
  background: var(--of-bg-card);
  border-top: 1px solid var(--of-border-table);
  max-height: 200px;
  transition: max-height 0.25s;

  &.collapsed { max-height: 40px; }
}

.video-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--of-spacing-4);
  border-bottom: 1px solid var(--of-border-table);

  .video-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-secondary);
  }

  .video-header-actions {
    display: flex;
    align-items: center;
    gap: var(--of-spacing-2);
  }
}

.collapse-btn {
  background: transparent;
  border: none;
  color: var(--of-text-tertiary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;

  &:hover { color: var(--of-text-primary); }
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  height: calc(200px - 40px);
  background: var(--of-border-table);
}

.video-slot {
  background: var(--of-bg-body);
  position: relative;
  overflow: hidden;
}

.video-mock {
  width: 100%;
  height: 100%;
  background: #0a1520;
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 6px;

  .video-scan-line {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(20,129,166,0.6), transparent);
    animation: scan 3s linear infinite;
  }

  .video-label {
    font-size: 10px;
    color: rgba(255,255,255,0.7);
    background: rgba(0,0,0,0.5);
    padding: 1px 5px;
    border-radius: 2px;
  }

  .video-live-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    font-size: 9px;
    font-weight: bold;
    color: #fff;
    background: var(--of-color-error);
    padding: 1px 4px;
    border-radius: 2px;
    letter-spacing: 0.05em;
  }

  .video-remove {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    border: none;
    color: rgba(255,255,255,0.6);
    font-size: 9px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { background: rgba(255,102,102,0.4); color: #fff; }
  }
}

@keyframes scan {
  from { top: 0%; }
  to { top: 100%; }
}

.video-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255,255,255,0.12);
  font-size: 11px;

  .anticon { font-size: 18px; }
}

// ── 右侧详情 ─────────────────────────────────────────────────
.ai-detail {
  width: 360px;
  flex-shrink: 0;
  background: var(--of-bg-card);
  border-left: 1px solid var(--of-border-table);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-tabs {
  display: flex;
  border-bottom: 1px solid var(--of-border-table);
  flex-shrink: 0;

  .detail-tab {
    flex: 1;
    height: 40px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--of-text-tab-inactive);
    font-size: var(--of-font-size-xs);
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;

    &:hover { color: var(--of-text-secondary); }
    &.active { color: var(--of-color-link); border-bottom-color: var(--of-color-primary); }
  }
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--of-spacing-4);
}

.tab-content { display: flex; flex-direction: column; gap: var(--of-spacing-4); }

// 概要 Tab
.info-section {
  .section-title {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-tertiary);
    margin-bottom: var(--of-spacing-2);
    display: flex;
    align-items: center;
    gap: 6px;

    .section-hint {
      font-size: 10px;
      color: var(--of-text-quaternary);
      background: rgba(255,255,255,0.04);
      padding: 1px 5px;
      border-radius: 3px;
    }
  }
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: var(--of-spacing-3);
  font-size: var(--of-font-size-xs);

  .info-key {
    flex-shrink: 0;
    width: 64px;
    color: var(--of-text-tertiary);
    padding-top: 1px;
  }

  .info-val {
    flex: 1;
    color: var(--of-text-primary);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
  }

  .info-device {
    font-size: 11px;
    color: var(--of-text-tertiary);
  }
}

.category-badge {
  font-size: 10px;
  padding: 1px 5px;
  background: rgba(20,129,166,0.12);
  color: var(--of-color-link);
  border-radius: 3px;
}

.outside-tag {
  font-size: 10px;
  color: #faad14;
}

.text-urgent { color: var(--of-color-error); }
.text-muted { color: var(--of-text-tertiary); }
.mono { font-family: monospace; }

.verify-result {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--of-font-size-xs);
  color: var(--of-text-primary);
}

.deadline-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.03);
  border-radius: var(--of-radius-base);
  border: 1px solid rgba(255,255,255,0.06);

  .anticon { color: var(--of-text-tertiary); }
  .deadline-main { font-size: var(--of-font-size-base); color: var(--of-text-primary); font-variant-numeric: tabular-nums; }
  .deadline-sub { font-size: 11px; color: var(--of-text-tertiary); margin-left: auto; }

  &.block-overdue {
    border-color: rgba(255,102,102,0.25);
    background: rgba(255,102,102,0.05);
    .anticon { color: var(--of-color-error); }
    .deadline-main { color: var(--of-color-error); }
  }
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--of-spacing-2);

  .snap-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--of-radius-base);
    padding: 8px;
    text-align: center;

    .snap-num {
      font-size: 20px;
      font-weight: var(--of-font-weight-bold);
      color: var(--of-text-secondary);
      font-variant-numeric: tabular-nums;
      line-height: 1;

      &.num-ok  { color: #52c41a; }
      &.num-warn { color: #faad14; }
    }

    .snap-label {
      font-size: 10px;
      color: var(--of-text-tertiary);
      margin-top: 4px;
    }
  }
}

// 证据 Tab
.evidence-group { margin-bottom: var(--of-spacing-3); }
.evidence-group-title {
  font-size: 11px;
  color: var(--of-text-tertiary);
  margin-bottom: var(--of-spacing-2);
}

.evidence-item {
  display: flex;
  gap: var(--of-spacing-3);
  padding: var(--of-spacing-2);
  background: rgba(255,255,255,0.03);
  border-radius: var(--of-radius-base);

  .evidence-thumb {
    width: 56px;
    height: 42px;
    border-radius: var(--of-radius-base);
    overflow: hidden;
    flex-shrink: 0;

    &.mock-image {
      background: #0a1520;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--of-text-quaternary);
      font-size: 18px;
    }
  }

  .evidence-info {
    flex: 1;
    min-width: 0;
    .evidence-label { font-size: var(--of-font-size-xs); color: var(--of-text-primary); }
    .evidence-meta  { font-size: 11px; color: var(--of-text-tertiary); margin-top: 3px; }
  }
}

.evidence-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: var(--of-text-quaternary);
  font-size: var(--of-font-size-xs);
}

// 时间线 Tab
.timeline-content { gap: var(--of-spacing-3); }

.timeline-list { display: flex; flex-direction: column; }

.tl-item {
  display: flex;
  gap: 10px;
  position: relative;

  &:last-child .tl-line { display: none; }
}

.tl-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 12px;
  padding-top: 3px;

  .tl-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .tl-line {
    width: 1px;
    flex: 1;
    min-height: 8px;
    background: rgba(255,255,255,0.08);
    margin-top: 3px;
  }
}

.tl-body {
  padding-bottom: 14px;
  flex: 1;
  min-width: 0;
}

.tl-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  .tl-action   { font-size: var(--of-font-size-xs); color: var(--of-text-primary); font-weight: var(--of-font-weight-medium); }
  .tl-operator { font-size: 11px; color: var(--of-color-link); }
  .tl-time     { font-size: 11px; color: var(--of-text-quaternary); margin-left: auto; white-space: nowrap; }
}

.tl-content {
  font-size: 11px;
  color: var(--of-text-tertiary);
  margin-top: 3px;
  line-height: 1.5;
}

.tl-empty {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-quaternary);
  padding: 16px 0;
}

.tl-add { margin-top: var(--of-spacing-2); }

// 关联 Tab
.related-section { margin-bottom: var(--of-spacing-4); }

.related-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  margin-bottom: var(--of-spacing-2);
}

.related-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--of-spacing-3);
  padding: 6px 8px;
  background: rgba(250,173,20,0.06);
  border: 1px solid rgba(250,173,20,0.15);
  border-radius: var(--of-radius-base);
  margin-bottom: var(--of-spacing-2);

  .related-item-info {
    min-width: 0;
    flex: 1;
    .related-no   { font-size: 11px; color: var(--of-color-link); display: block; }
    .related-name { font-size: 11px; color: var(--of-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
  }
}

.related-empty {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-quaternary);
  padding: 8px 0;
}

// ── 操作栏 ───────────────────────────────────────────────────
.ai-actionbar {
  flex-shrink: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--of-spacing-4);
  background: var(--of-bg-header);
  border-top: 1px solid var(--of-border-table);

  .action-left, .action-right {
    display: flex;
    align-items: center;
    gap: var(--of-spacing-2);
  }
}

.ai-terminal-bar {
  flex-shrink: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--of-spacing-2);
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  background: rgba(82,196,26,0.06);
  border-top: 1px solid rgba(82,196,26,0.15);
}

// ── 弹窗内表单 ───────────────────────────────────────────────
.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-4);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .form-label {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-secondary);
    .required { color: var(--of-color-error); }
  }
}

.radio-hint {
  font-size: 11px;
  color: var(--of-text-tertiary);
  margin-left: 4px;
}

// ── 404 ─────────────────────────────────────────────────────
.ai-not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--of-spacing-4);
  color: var(--of-text-tertiary);

  .anticon { font-size: 48px; opacity: 0.3; }
  p { margin: 0; font-size: var(--of-font-size-base); }
}

// ── 研判半径圈 ──────────────────────────────────────────────
.judgement-radius-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px dashed rgba(20, 129, 166, 0.5);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;

  .radius-label {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: var(--of-color-link);
    background: rgba(0, 0, 0, 0.6);
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;
  }
}

// ── 选点模式提示 ────────────────────────────────────────────
.picking-hint {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(24, 144, 255, 0.9);
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: var(--of-font-size-xs);
  backdrop-filter: blur(4px);
}

// ── 无人机图标 ──────────────────────────────────────────────
.drone-dot {
  width: 40px !important;
  height: 40px !important;
  position: relative;
  cursor: pointer;

  .drone-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;

    &.c-class {
      filter: brightness(0) saturate(100%) invert(79%) sepia(65%) saturate(1327%) hue-rotate(359deg) brightness(103%) contrast(103%);
    }

    &.a-class {
      filter: brightness(0) saturate(100%) invert(79%) sepia(65%) saturate(1327%) hue-rotate(359deg) brightness(103%) contrast(103%);
    }
  }

  .drone-status-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    white-space: nowrap;
    line-height: 1.2;

    &.status-standby { background: #52c41a; }
    &.status-charging { background: #1890ff; }
    &.status-mission { background: #faad14; }
    &.status-alert_response { background: #ff4d4f; }
    &.status-fault { background: #8c8c8c; }
    &.status-offline { background: #434343; }
  }

  .drone-battery-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(82, 196, 26, 0.9);
    color: #fff;
    line-height: 1.2;

    &.battery-low {
      background: rgba(255, 77, 79, 0.9);
    }
  }
}

// ── 机巢图标 ────────────────────────────────────────────────
.nest-dot {
  width: 32px !important;
  height: 32px !important;
  background: transparent !important;
  border: none !important;

  .nest-icon {
    width: 100%;
    height: 100%;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: 4px;
      background: rgba(155, 124, 255, 0.3);
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
      border: 2px solid #9b7cff;
    }

    &.nest-offline::before {
      background: rgba(140, 140, 140, 0.3);
      border-color: #8c8c8c;
    }
  }

  .nest-hatch {
    position: absolute;
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 16px;
    height: 8px;
    border: 1px solid #9b7cff;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    background: rgba(0, 0, 0, 0.5);
    transition: transform 0.3s;

    &.hatch-open {
      transform: translateX(-50%) rotateX(60deg);
      opacity: 0.5;
    }
  }
}

// ── 高点摄像头视野扇形 ──────────────────────────────────────
.cam-fov {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 40px solid transparent;
  border-right: 40px solid transparent;
  border-bottom: 80px solid rgba(82, 196, 26, 0.15);
  transform-origin: 50% 0%;
  pointer-events: none;
  z-index: -1;

  &.fov-aimed {
    border-bottom-color: rgba(82, 196, 26, 0.15);
  }

  &.fov-turn {
    border-bottom-color: rgba(250, 173, 20, 0.15);
  }
}

// ── 摄像头离线 ──────────────────────────────────────────────
.cam-offline {
  opacity: 0.3;
  cursor: not-allowed !important;
}

// ── 反无目标样式 ────────────────────────────────────────────
.anti-dot {
  position: relative;

  &.anti-whitelist {
    background: rgba(140, 140, 140, 0.2) !important;
    border-color: #8c8c8c !important;
    color: #8c8c8c !important;
    animation: none !important;
  }

  &.anti-suspected {
    background: rgba(250, 173, 20, 0.2) !important;
    border: 2px dashed #faad14 !important;
    color: #faad14 !important;
    animation: none !important;
  }

  .suspected-badge {
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    background: rgba(250, 173, 20, 0.9);
    color: #fff;
    padding: 1px 4px;
    border-radius: 3px;
    white-space: nowrap;
  }
}

// ── 车辆图标 ────────────────────────────────────────────────
.vehicle-dot {
  background: rgba(82, 196, 26, 0.2) !important;
  border-color: #52c41a !important;
  color: #52c41a !important;

  .anticon {
    transition: transform 0.3s;
  }
}

// ── 摄像头/无人机气泡 ──────────────────────────────────────
.camera-popup {
  position: fixed;
  width: 280px;
  background: rgba(24, 34, 43, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  backdrop-filter: blur(8px);
  z-index: 1000;
  transform: translate(-50%, -100%) translateY(-10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);

  .popup-header {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: var(--of-font-size-xs);
    color: var(--of-text-primary);
    font-weight: var(--of-font-weight-medium);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .popup-close {
    background: transparent;
    border: none;
    color: var(--of-text-tertiary);
    cursor: pointer;
    padding: 2px 4px;
    font-size: 12px;

    &:hover {
      color: var(--of-text-primary);
    }
  }

  .popup-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .popup-row {
    display: flex;
    align-items: center;
    font-size: 12px;
    gap: 6px;
  }

  .popup-label {
    color: var(--of-text-tertiary);
    flex-shrink: 0;
  }

  .popup-footer {
    padding: 8px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
}

// ── 半径调整器 ──────────────────────────────────────────────
.radius-adjuster {
  display: flex;
  align-items: center;
}

// ── 视频截图按钮 ────────────────────────────────────────────
.video-capture {
  position: absolute;
  top: 6px;
  right: 28px;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(24, 144, 255, 0.6);
    color: #fff;
  }
}
</style>
