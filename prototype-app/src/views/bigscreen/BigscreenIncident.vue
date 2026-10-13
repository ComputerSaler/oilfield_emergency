<script setup lang="ts">
/**
 * 大屏 — 事件感知处置（平时模式）
 * PRD: prototype/PRD-大屏-事件感知处置-预警.md V1.0
 * 布局：左侧预警区 360px | 中央态势地图 flex | 右侧事件占位 360px
 * 研判面板：全屏覆盖层，复用工作台研判数据和操作逻辑
 */
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeftOutlined,
  SoundOutlined,
  UserOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  VideoCameraOutlined,
  ApartmentOutlined,
  GlobalOutlined,
  HistoryOutlined,
  RadarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RocketOutlined,
  CloseCircleOutlined,
  SendOutlined,
  FileAddOutlined,
  MergeCellsOutlined,
  EditOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import {
  ALERT_RECORDS,
  ALERT_TIMELINES,
  SOURCE_LABEL,
  STATUS_LABEL,
  type AlertRecord,
  type AlertStatus,
} from '@/mock/alertWorkbench'
import {
  INCIDENT_RECORDS,
  getLevelDeadlineInfo,
  getTaskProgress,
  getTaskSummary,
  getPendingProposal,
  TERMINAL_STATUSES,
  STATUS_LABEL as INC_STATUS_LABEL,
  STATUS_COLOR as INC_STATUS_COLOR,
  LEVEL_COLOR,
  type IncidentRecord,
} from '@/mock/incidentWorkbench'
import IncidentDetailPanel from '@/components/incident/IncidentDetailPanel.vue'

// ==================== 路由导航 ====================

const router = useRouter()

const NAV_ITEMS = [
  { label: '安防态势',    route: { name: 'Placeholder', params: { name: '安防态势' } } },
  { label: '安防建设总览', route: { name: 'Placeholder', params: { name: '安防建设总览' } } },
  { label: '实时监控中心', route: { name: 'Placeholder', params: { name: '实时监控中心' } } },
  { label: '事件感知处置', route: null },
  { label: '业务应用',    route: { name: 'AlertWorkbench' } },
  { label: '系统管理',    route: { name: 'RegionList' } },
]

function navTo(item: typeof NAV_ITEMS[number]) {
  if (item.route) router.push(item.route)
}

// ==================== 时钟 ====================

const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>
onMounted(() => { clockTimer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(clockTimer))

const clockStr = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))
const dateStr  = computed(() => now.value.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }))

// ==================== KPI ====================

const today = new Date(); today.setHours(0, 0, 0, 0)
const todayMs = today.getTime()

const kpi = computed(() => {
  const pending = ALERT_RECORDS.filter(r =>
    ['pending_verify', 'pending_decision', 'tracking'].includes(r.status)
  ).length
  const tracking = ALERT_RECORDS.filter(r => r.status === 'tracking').length
  const todayNew = ALERT_RECORDS.filter(r => new Date(r.created_at).getTime() >= todayMs).length
  const todayFalseAlarm = ALERT_RECORDS.filter(r =>
    r.status === 'false_alarm' && new Date(r.created_at).getTime() >= todayMs
  ).length
  return { pending, tracking, todayNew, todayFalseAlarm }
})

// ==================== 漏斗数据 ====================

const funnel = computed(() => ({
  pendingVerify:  ALERT_RECORDS.filter(r => r.status === 'pending_verify').length,
  pendingDecision: ALERT_RECORDS.filter(r => r.status === 'pending_decision').length,
  tracking:       ALERT_RECORDS.filter(r => r.status === 'tracking').length,
  todayResolved:  ALERT_RECORDS.filter(r => r.status === 'resolved'   && new Date(r.created_at).getTime() >= todayMs).length,
  todayEscalated: ALERT_RECORDS.filter(r => r.status === 'escalated'  && new Date(r.created_at).getTime() >= todayMs).length,
  todayFalseAlarm:ALERT_RECORDS.filter(r => r.status === 'false_alarm'&& new Date(r.created_at).getTime() >= todayMs).length,
  todayMerged:    ALERT_RECORDS.filter(r => r.status === 'merged'     && new Date(r.created_at).getTime() >= todayMs).length,
}))

// 平均停留时长（mock 固定值，实际应由后端统计）
const avgDwell = { pendingVerify: '3.2分', pendingDecision: '8.7分' }

// ==================== 列表 Tab ====================

const listTab = ref<'pending' | 'tracking' | 'ended'>('pending')

const listRecords = computed(() => {
  let list: AlertRecord[]
  switch (listTab.value) {
    case 'pending':
      list = ALERT_RECORDS.filter(r =>
        ['pending_verify', 'pending_decision', 'tracking'].includes(r.status)
      )
      break
    case 'tracking':
      list = ALERT_RECORDS.filter(r => r.status === 'tracking')
      break
    case 'ended':
      list = ALERT_RECORDS.filter(r =>
        ['false_alarm', 'merged', 'resolved', 'escalated'].includes(r.status) &&
        new Date(r.created_at).getTime() >= todayMs
      )
      break
    default: list = []
  }
  // 排序：紧急 > 时间倒序
  return [...list].sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency === 'urgent' ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

const listTabCounts = computed(() => ({
  pending: ALERT_RECORDS.filter(r =>
    ['pending_verify', 'pending_decision', 'tracking'].includes(r.status)
  ).length,
  tracking: ALERT_RECORDS.filter(r => r.status === 'tracking').length,
  ended: ALERT_RECORDS.filter(r =>
    ['false_alarm', 'merged', 'resolved', 'escalated'].includes(r.status) &&
    new Date(r.created_at).getTime() >= todayMs
  ).length,
}))

// ==================== 地图图层 ====================

const mapLayers = ref({ antiUav: true, drones: true, vehicles: false })
const layerPanelOpen = ref(false)

// 有坐标的活跃预警点（不含待定位和终态）
const mapAlertPoints = computed(() =>
  ALERT_RECORDS.filter(r =>
    !['false_alarm', 'merged', 'resolved', 'escalated'].includes(r.status) &&
    r.location_lat !== null && r.location_lng !== null
  )
)

// 营地中心坐标（mock）
const CAMPS = [
  { name: 'Jaouro',    lat: 13.3148, lng: 2.6352 },
  { name: 'Koulele',   lat: 13.3155, lng: 2.6344 },
  { name: 'Dibeilla',  lat: 13.5122, lng: 2.1124 },
  { name: 'Goumeri',   lat: 13.6428, lng: 2.3753 },
  { name: 'Sokor',     lat: 13.7210, lng: 2.5011 },
]

// ==================== 事件区（PRD-大屏-事件 §3） ====================

/** 事件结束时间：mock 无独立字段，已转应急取移交时间，其余终态取 updated_at */
function incEndTime(r: IncidentRecord): number {
  return new Date(r.status === 'transferred' ? r.transferred_to_emergency_at! : r.updated_at).getTime()
}
const isIncTerminal = (r: IncidentRecord) => TERMINAL_STATUSES.includes(r.status)
const isIncEndedToday = (r: IncidentRecord) => isIncTerminal(r) && incEndTime(r) >= todayMs
const isIncLevelOverdue = (r: IncidentRecord) => r.status === 'pending_level' && getLevelDeadlineInfo(r).overdue

const incKpi = computed(() => ({
  pendingLevel: INCIDENT_RECORDS.filter(r => r.status === 'pending_level').length,
  ongoing:      INCIDENT_RECORDS.filter(r => ['active', 'in_progress'].includes(r.status)).length,
  todayNew:     INCIDENT_RECORDS.filter(r => new Date(r.created_at).getTime() >= todayMs).length,
  todayClosed:  INCIDENT_RECORDS.filter(r => ['closed', 'cancelled'].includes(r.status) && isIncEndedToday(r)).length,
  overdue:      INCIDENT_RECORDS.filter(isIncLevelOverdue).length,
}))

const incFunnel = computed(() => {
  const inProgress = INCIDENT_RECORDS.filter(r => r.status === 'in_progress')
  const taskSum = inProgress.reduce((acc, r) => {
    const p = getTaskProgress(r.incident_id)
    return { approved: acc.approved + p.approved, total: acc.total + p.total }
  }, { approved: 0, total: 0 })
  return {
    pendingLevel: INCIDENT_RECORDS.filter(r => r.status === 'pending_level').length,
    active:       INCIDENT_RECORDS.filter(r => r.status === 'active').length,
    inProgress:   inProgress.length,
    taskSum,
    todayClosed:      INCIDENT_RECORDS.filter(r => r.status === 'closed'      && isIncEndedToday(r)).length,
    todayTransferred: INCIDENT_RECORDS.filter(r => r.status === 'transferred' && isIncEndedToday(r)).length,
    todayCancelled:   INCIDENT_RECORDS.filter(r => r.status === 'cancelled'   && isIncEndedToday(r)).length,
  }
})

// 中位停留时长（mock 固定值，实际由后端按过去 24h 统计）
const incMedianDwell = { pendingLevel: '12 分钟', active: '26 分钟' }

const LEVEL_SHORT: Record<string, string> = { I: 'Ⅰ', II: 'Ⅱ', III: 'Ⅲ', IV: 'Ⅳ' }
const LEVEL_RANK: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 }
const UNLEVELED_COLOR = '#8c8c8c'
const incLevelColor = (r: IncidentRecord) => r.level ? LEVEL_COLOR[r.level] : UNLEVELED_COLOR

const incTab = ref<'pending' | 'ongoing' | 'ended'>('pending')

const incLists = computed(() => ({
  // 待处理：待评级，超时置顶，创建时间倒序
  pending: INCIDENT_RECORDS.filter(r => r.status === 'pending_level').sort((a, b) => {
    const oa = isIncLevelOverdue(a), ob = isIncLevelOverdue(b)
    if (oa !== ob) return oa ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }),
  // 进行中：事件生效 / 处置中，等级降序（Ⅰ优先）
  ongoing: INCIDENT_RECORDS.filter(r => ['active', 'in_progress'].includes(r.status)).sort((a, b) =>
    (LEVEL_RANK[a.level ?? ''] ?? 9) - (LEVEL_RANK[b.level ?? ''] ?? 9) ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ),
  // 今日已结束：结束时间倒序
  ended: INCIDENT_RECORDS.filter(isIncEndedToday).sort((a, b) => incEndTime(b) - incEndTime(a)),
}))
const incListRecords = computed(() => incLists.value[incTab.value])

/** 列表第二行辅助信息 */
function incAuxInfo(r: IncidentRecord): string {
  if (r.status === 'pending_level') return getLevelDeadlineInfo(r).label
  if (r.status === 'in_progress') return getTaskSummary(r.incident_id)
  if (r.status === 'active' && getPendingProposal(r)) return '应急建议待审批'
  return ''
}
function incSourceText(r: IncidentRecord): string {
  return r.source_alert_nos.length ? `来自预警 ${r.source_alert_nos[0]}` : '手工录入'
}

// ==================== 事件图层（PRD-大屏-事件 §5） ====================

const INC_LAYER_KEY = 'bs-incident-layers'
function loadIncLayers(): { ongoing: boolean; ended: boolean } {
  const def = { ongoing: true, ended: false }
  try {
    const raw = localStorage.getItem(INC_LAYER_KEY)
    return raw ? { ...def, ...JSON.parse(raw) } : def
  } catch { return def }
}
const incLayers = ref(loadIncLayers())
watch(incLayers, v => {
  try { localStorage.setItem(INC_LAYER_KEY, JSON.stringify(v)) } catch { /* 存储不可用时仅本页生效 */ }
}, { deep: true })

/** 地图事件菱形：无坐标不显示；与预警点重叠时偏移 8，事件互相重叠时横向错开（聚合方案见 TBD-BIG-INC-02） */
const mapIncidentPoints = computed(() => {
  const list = INCIDENT_RECORDS.filter(r =>
    r.location_lat !== null && r.location_lng !== null &&
    (isIncTerminal(r) ? incLayers.value.ended && isIncEndedToday(r) : incLayers.value.ongoing)
  )
  const placed: { x: number; y: number }[] = []
  return list.map(r => {
    let x = toMapX(r.location_lng!, 800)
    let y = toMapY(r.location_lat!, 560)
    const nearAlert = mapAlertPoints.value.some(a =>
      Math.hypot(toMapX(a.location_lng!, 800) - x, toMapY(a.location_lat!, 560) - y) < 12)
    if (nearAlert) { x += 8; y -= 8 }
    while (placed.some(p => Math.hypot(p.x - x, p.y - y) < 14)) x += 16
    placed.push({ x, y })
    return { rec: r, x, y, ended: isIncTerminal(r) }
  })
})

// ==================== 事件详情覆盖层（PRD-大屏-事件 §4） ====================

const incOverlayId = ref<string | null>(null)
const incOverlayRecord = computed(() => INCIDENT_RECORDS.find(r => r.incident_id === incOverlayId.value))

function openIncident(id: string) {
  panelVisible.value = false   // 事件覆盖层与预警研判面板互斥（叠层除外）
  panelStackedFrom.value = null
  incOverlayId.value = id
}
function closeIncident() {
  incOverlayId.value = null
}
/** 覆盖层内点击来源预警：在事件覆盖层之上叠只读预警面板（最多两层） */
function openAlertFromIncident(alertId: string) {
  panelCurrentId.value = alertId
  panelActiveRightTab.value = 'overview'
  isDirty.value = false
  panelStackedFrom.value = incOverlayId.value
  panelVisible.value = true
}

// ==================== 研判面板（覆盖层） ====================

const panelVisible   = ref(false)
const panelCurrentId = ref<string>('')
/** 叠层来源事件 id：非空时为只读叠层模式（PRD-大屏-事件 §4.2） */
const panelStackedFrom = ref<string | null>(null)
const panelReadonly = computed(() => panelStackedFrom.value !== null)
const panelStackedIncidentNo = computed(() =>
  INCIDENT_RECORDS.find(r => r.incident_id === panelStackedFrom.value)?.incident_no ?? '')

const panelCurrent = computed<AlertRecord | undefined>(() =>
  ALERT_RECORDS.find(r => r.alert_id === panelCurrentId.value)
)
const panelTimeline = computed(() => ALERT_TIMELINES[panelCurrentId.value] ?? [])

// 脏状态：有未提交内容时切换预警弹二次确认（PRD §4）
const isDirty              = ref(false)
const switchConfirmVisible = ref(false)
const pendingSwitch        = ref<string | null>(null)

function openPanel(id: string) {
  incOverlayId.value = null      // 从驾驶舱直接打开：与事件覆盖层互斥
  panelStackedFrom.value = null
  panelCurrentId.value = id
  panelVisible.value = true
  isDirty.value = false
  panelActiveRightTab.value = 'overview'
}
/** 关闭预警面板；叠层模式下回到事件覆盖层（事件覆盖层保持挂载，Tab 与滚动位置不丢） */
function closePanel() {
  panelVisible.value = false
  panelStackedFrom.value = null
  isDirty.value = false
}
function switchPanel(id: string) {
  if (isDirty.value) {
    pendingSwitch.value = id
    switchConfirmVisible.value = true
  } else {
    openPanel(id)
  }
}
function confirmSwitch() {
  if (pendingSwitch.value) openPanel(pendingSwitch.value)
  switchConfirmVisible.value = false
  pendingSwitch.value = null
}

// 面板内待办队列
const panelPendingList = computed(() =>
  ALERT_RECORDS.filter(r =>
    ['pending_verify', 'pending_decision', 'tracking'].includes(r.status) &&
    r.alert_id !== panelCurrentId.value
  ).slice(0, 20)
)

const panelQueueCollapsed  = ref(false)
const panelActiveRightTab  = ref<'overview' | 'evidence' | 'timeline' | 'related'>('overview')
const panelVideoSlots      = ref<(string | null)[]>([null, null, null, null])
const panelVideoCollapsed  = ref(false)
const panelTlFilter        = ref<'all' | 'system' | 'verify' | 'decision' | 'external'>('all')

const panelFilteredTimeline = computed(() => {
  const tl = [...panelTimeline.value].reverse()
  return panelTlFilter.value === 'all' ? tl : tl.filter(i => i.category === panelTlFilter.value)
})

// 面板操作弹窗
const pFalseAlarmVisible = ref(false)
const pMergeVisible      = ref(false)
const pVerifyVisible     = ref(false)
const pDecideVisible     = ref(false)
const pTaskVisible       = ref(false)
const pSupplementVisible = ref(false)
const pTrackAppendVisible= ref(false)

const pVerifyForm  = ref({ result: '' as 'real' | 'unconfirmed' | '', note: '' })
const pDecideForm  = ref({ action: '' as 'resolve' | 'track' | 'escalate' | '', note: '', resolveReason: '' })
const pFalseAlarmForm = ref({ reason: '', remark: '' })
const pMergeForm      = ref({ targetNo: '', note: '' })
const pTaskForm       = ref({ receiver: '', requirement: '', deadline: null as any })
const pSupplementForm = ref({ content: '' })
const pTrackAppendForm= ref({ content: '' })

// 并入预警候选：待核实且非当前
const pMergeTargets = computed(() =>
  ALERT_RECORDS.filter(r =>
    r.alert_id !== panelCurrentId.value && r.status === 'pending_verify'
  )
)

const panelIsTerminal = computed(() =>
  ['false_alarm', 'merged', 'resolved', 'escalated'].includes(panelCurrent.value?.status ?? '')
)

// 状态颜色映射
const statusColor: Record<AlertStatus, string> = {
  pending_verify:   'var(--of-color-primary)',
  pending_decision: 'var(--of-color-warning)',
  tracking:         '#9b7cff',
  false_alarm:      'var(--of-text-tertiary)',
  merged:           'var(--of-text-tertiary)',
  resolved:         'var(--of-color-success)',
  escalated:        'var(--of-color-error)',
}

const timelineCategoryColor: Record<string, string> = {
  system:   'var(--of-text-tertiary)',
  verify:   'var(--of-color-link)',
  decision: '#9b7cff',
  external: '#52c41a',
}

// ==================== WS 断线模拟 ====================

const wsDisconnected = ref(false)
const wsLastUpdate   = ref(new Date().toLocaleTimeString('zh-CN', { hour12: false }))

// ==================== 实时弹窗（缺口 #5） ====================
// mock：挑一条待核实预警作为"新到达"演示，3 秒后自动弹出
const toastVisible = ref(false)
const toastRecord  = ref<AlertRecord | null>(null)

onMounted(() => {
  const urgentNew = ALERT_RECORDS.find(r => r.status === 'pending_verify' && r.urgency === 'urgent')
  if (urgentNew) {
    setTimeout(() => {
      toastRecord.value = urgentNew
      toastVisible.value = true
      // 一般消息 3 秒自动关闭；紧急消息须手动关闭
      if (urgentNew.urgency !== 'urgent') {
        setTimeout(() => { toastVisible.value = false }, 3000)
      }
    }, 3000)
  }
})

// ==================== 声音 ====================
const soundOn = ref(true)

// ==================== 辅助 ====================

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

// 将 lat/lng 映射为地图 SVG 坐标（五个营地包围矩形外扩留白；
// SVG 为 slice 裁切，贴边的营地/预警/事件点会被裁出可视区）
const MAP_LAT_MIN = 13.26, MAP_LAT_MAX = 13.78
const MAP_LNG_MIN = 1.98,  MAP_LNG_MAX = 2.78

function toMapX(lng: number, w: number) {
  return ((lng - MAP_LNG_MIN) / (MAP_LNG_MAX - MAP_LNG_MIN)) * w
}
function toMapY(lat: number, h: number) {
  return (1 - (lat - MAP_LAT_MIN) / (MAP_LAT_MAX - MAP_LAT_MIN)) * h
}
</script>

<template>
  <div class="bs-root">

    <!-- ═══ 顶栏 ════════════════════════════════════════════════════════ -->
    <header class="bs-topbar">
      <div class="topbar-left">
        <span class="topbar-logo">🛡</span>
        <span class="topbar-title">数智安防应急指挥中心</span>
      </div>
      <nav class="topbar-nav">
        <span
          v-for="item in NAV_ITEMS"
          :key="item.label"
          class="nav-item"
          :class="{ active: !item.route }"
          @click="navTo(item)"
        >{{ item.label }}</span>
      </nav>
      <div class="topbar-right">
        <span v-if="wsDisconnected" class="ws-badge ws-warn">数据连接中断</span>
        <button class="icon-btn" :class="{ 'sound-off': !soundOn }" @click="soundOn = !soundOn">
          <SoundOutlined />
        </button>
        <span class="topbar-clock">{{ clockStr }}</span>
        <span class="topbar-date">{{ dateStr }}</span>
        <span class="topbar-user"><UserOutlined /> 值班员</span>
      </div>
    </header>

    <!-- ═══ 主体三栏 ═════════════════════════════════════════════════════ -->
    <div class="bs-body">

      <!-- ── 左：预警区 ─────────────────────────────────────────────── -->
      <aside class="bs-left">

        <!-- KPI 看板 -->
        <div class="kpi-panel">
          <div class="kpi-card" :class="{ 'kpi-danger': kpi.pending > 0 }">
            <div class="kpi-value">{{ kpi.pending }}</div>
            <div class="kpi-label">待处理</div>
          </div>
          <div class="kpi-card kpi-purple">
            <div class="kpi-value">{{ kpi.tracking }}</div>
            <div class="kpi-label">持续跟踪中</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">{{ kpi.todayNew }}</div>
            <div class="kpi-label">今日新增</div>
          </div>
          <div class="kpi-card kpi-muted">
            <div class="kpi-value">{{ kpi.todayFalseAlarm }}</div>
            <div class="kpi-label">今日误报</div>
          </div>
        </div>

        <!-- 处置漏斗 -->
        <div class="funnel-panel">
          <div class="funnel-title">处置漏斗</div>
          <div class="funnel-body">
            <div class="funnel-node">
              <span class="fn-label">待核实</span>
              <span class="fn-count fn-primary">{{ funnel.pendingVerify }}</span>
            </div>
            <div class="funnel-arrow">↓ <span class="fn-dwell">平均 {{ avgDwell.pendingVerify }}</span></div>
            <div class="funnel-node">
              <span class="fn-label">待决策</span>
              <span class="fn-count fn-warn">{{ funnel.pendingDecision }}</span>
            </div>
            <div class="funnel-arrow">↓ <span class="fn-dwell">平均 {{ avgDwell.pendingDecision }}</span></div>
            <div class="funnel-node">
              <span class="fn-label">持续跟踪中</span>
              <span class="fn-count fn-purple">{{ funnel.tracking }}</span>
            </div>
            <div class="funnel-terminals">
              <div class="ft-item">
                <div class="ft-val ft-success">{{ funnel.todayResolved }}</div>
                <div class="ft-lab">已解除</div>
              </div>
              <div class="ft-item">
                <div class="ft-val ft-error">{{ funnel.todayEscalated }}</div>
                <div class="ft-lab">已升级</div>
              </div>
              <div class="ft-item">
                <div class="ft-val ft-muted">{{ funnel.todayFalseAlarm }}</div>
                <div class="ft-lab">误报</div>
              </div>
              <div class="ft-item">
                <div class="ft-val ft-muted">{{ funnel.todayMerged }}</div>
                <div class="ft-lab">已合并</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 预警列表 -->
        <div class="alert-list-panel">
          <div class="al-tabs">
            <div
              v-for="t in [
                { key: 'pending',  label: '待处理',  count: listTabCounts.pending  },
                { key: 'tracking', label: '持续跟踪', count: listTabCounts.tracking },
                { key: 'ended',    label: '今日已结束', count: listTabCounts.ended  },
              ]"
              :key="t.key"
              class="al-tab"
              :class="{ active: listTab === t.key }"
              @click="listTab = t.key as any"
            >
              {{ t.label }}
              <span class="al-badge" :class="{ 'badge-danger': t.key === 'pending' && t.count > 0 }">
                {{ t.count }}
              </span>
            </div>
          </div>

          <div class="al-rows">
            <div
              v-for="rec in listRecords.slice(0, 50)"
              :key="rec.alert_id"
              class="al-row"
              :class="{
                'row-urgent': rec.urgency === 'urgent',
                'row-ended': ['false_alarm','merged','resolved','escalated'].includes(rec.status),
              }"
              @click="openPanel(rec.alert_id)"
            >
              <span class="al-dot" :class="rec.urgency === 'urgent' ? 'dot-urgent' : 'dot-normal'" />
              <div class="al-info">
                <div class="al-name">{{ rec.camp_name }} · {{ rec.alert_type_name }}</div>
                <div class="al-meta">{{ rec.alert_no }} · {{ SOURCE_LABEL[rec.source_type] }} · {{ relativeTime(rec.created_at) }}</div>
              </div>
              <button class="al-btn" @click.stop="openPanel(rec.alert_id)">研判</button>
            </div>
            <div v-if="listRecords.length > 50" class="al-overflow">
              还有 {{ listRecords.length - 50 }} 条，请切换到 PC 端工作台处理
            </div>
            <div v-if="listRecords.length === 0" class="al-empty">
              当前无待处理预警，系统运行正常
            </div>
          </div>
        </div>

      </aside>

      <!-- ── 中：态势地图 ──────────────────────────────────────────── -->
      <main class="bs-map">
        <div class="map-toolbar">
          <span class="map-label">态势地图</span>
          <button class="layer-btn" @click="layerPanelOpen = !layerPanelOpen">
            <ApartmentOutlined /> 图层
          </button>
          <div v-if="layerPanelOpen" class="layer-dropdown">
            <label><input type="checkbox" v-model="mapLayers.antiUav" /> 反无实时目标</label>
            <label><input type="checkbox" v-model="mapLayers.drones" /> 我方无人机</label>
            <label><input type="checkbox" v-model="mapLayers.vehicles" /> 在线车辆</label>
            <label><input type="checkbox" v-model="incLayers.ongoing" /> 事件位置（进行中）</label>
            <label><input type="checkbox" v-model="incLayers.ended" /> 事件位置（已结束）</label>
          </div>
        </div>

        <!-- SVG 模拟地图 -->
        <svg class="map-svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice">
          <!-- 背景 -->
          <rect width="800" height="560" fill="#0e1a24" />
          <!-- 地形纹理线 -->
          <path d="M0 200 Q200 180 400 210 Q600 240 800 200" fill="none" stroke="#1b3640" stroke-width="1" opacity="0.5"/>
          <path d="M0 350 Q250 330 500 360 Q650 370 800 340" fill="none" stroke="#1b3640" stroke-width="1" opacity="0.4"/>

          <!-- 营地边界 -->
          <g v-for="camp in CAMPS" :key="camp.name">
            <circle
              :cx="toMapX(camp.lng, 800)"
              :cy="toMapY(camp.lat, 560)"
              r="28"
              fill="none"
              stroke="rgba(20,129,166,0.4)"
              stroke-width="1.5"
              stroke-dasharray="4 3"
            />
            <circle
              :cx="toMapX(camp.lng, 800)"
              :cy="toMapY(camp.lat, 560)"
              r="6"
              fill="rgba(20,129,166,0.6)"
            />
            <text
              :x="toMapX(camp.lng, 800)"
              :y="toMapY(camp.lat, 560) + 42"
              text-anchor="middle"
              fill="rgba(255,255,255,0.6)"
              font-size="11"
            >{{ camp.name }}</text>
          </g>

          <!-- 预警点 -->
          <g v-for="rec in mapAlertPoints" :key="rec.alert_id" @click="openPanel(rec.alert_id)" style="cursor:pointer">
            <circle
              :cx="toMapX(rec.location_lng!, 800)"
              :cy="toMapY(rec.location_lat!, 560)"
              r="14"
              :fill="rec.urgency === 'urgent' ? 'rgba(255,102,102,0.15)' : 'rgba(250,173,20,0.12)'"
              class="alert-pulse"
            />
            <circle
              :cx="toMapX(rec.location_lng!, 800)"
              :cy="toMapY(rec.location_lat!, 560)"
              r="7"
              :fill="rec.urgency === 'urgent' ? '#ff6666' : '#faad14'"
            />
            <circle
              :cx="toMapX(rec.location_lng!, 800)"
              :cy="toMapY(rec.location_lat!, 560)"
              r="7"
              fill="none"
              :stroke="rec.urgency === 'urgent' ? '#ff6666' : '#faad14'"
              stroke-width="1"
              opacity="0.5"
              class="alert-ring"
            />
          </g>

          <!-- 事件菱形（PRD-大屏-事件 §5.1：20px、按等级着色、进行中脉冲、已结束 40% 透明，位于预警点上层） -->
          <g
            v-for="p in mapIncidentPoints"
            :key="p.rec.incident_id"
            class="inc-marker"
            :opacity="p.ended ? 0.4 : 1"
            style="cursor:pointer"
            @click="openIncident(p.rec.incident_id)"
          >
            <title>{{ p.rec.incident_no }} {{ p.rec.title }} · {{ INC_STATUS_LABEL[p.rec.status] }}</title>
            <rect
              v-if="!p.ended"
              :x="p.x - 10" :y="p.y - 10" width="20" height="20"
              :transform="`rotate(45 ${p.x} ${p.y})`"
              fill="none" :stroke="incLevelColor(p.rec)" stroke-width="1.5"
              class="inc-pulse" :style="{ transformOrigin: `${p.x}px ${p.y}px` }"
            />
            <rect
              :x="p.x - 7" :y="p.y - 7" width="14" height="14"
              :transform="`rotate(45 ${p.x} ${p.y})`"
              :fill="incLevelColor(p.rec)" stroke="#0e1a24" stroke-width="1.5"
            />
          </g>
        </svg>

        <div class="map-legend">
          <span><i class="lg-dot" /> 预警</span>
          <span><i class="lg-diamond" /> 事件</span>
          <span class="lg-count">事件标记 {{ mapIncidentPoints.length }}</span>
        </div>

        <!-- 网络断线提示 -->
        <div v-if="wsDisconnected" class="ws-banner">
          <ExclamationCircleOutlined /> 数据连接中断，最后更新：{{ wsLastUpdate }}
        </div>
      </main>

      <!-- ── 右：事件区占位 ─────────────────────────────────────────── -->
      <aside class="bs-right">
        <!-- 事件 KPI 看板（PRD-大屏-事件 §3.1） -->
        <div class="inc-kpi">
          <div class="inc-kpi-card" :class="{ 'kpi-warn': incKpi.pendingLevel > 0 }">
            <div class="kpi-value">{{ incKpi.pendingLevel }}</div>
            <div class="kpi-label">待评级</div>
          </div>
          <div class="inc-kpi-card">
            <div class="kpi-value">{{ incKpi.ongoing }}</div>
            <div class="kpi-label">进行中</div>
          </div>
          <div class="inc-kpi-card">
            <div class="kpi-value">{{ incKpi.todayNew }}</div>
            <div class="kpi-label">今日新增</div>
          </div>
          <div class="inc-kpi-card kpi-muted">
            <div class="kpi-value">{{ incKpi.todayClosed }}</div>
            <div class="kpi-label">今日关闭</div>
          </div>
          <div class="inc-kpi-card" :class="{ 'kpi-danger': incKpi.overdue > 0 }">
            <div class="kpi-value">{{ incKpi.overdue }}</div>
            <div class="kpi-label">超时</div>
          </div>
        </div>

        <!-- 事件状态漏斗（§3.2） -->
        <div class="funnel-panel">
          <div class="funnel-title">事件状态漏斗</div>
          <div class="inc-funnel-row">
            <div class="inc-fn-node">
              <div class="fn-count" style="color: #faad14">{{ incFunnel.pendingLevel }}</div>
              <div class="fn-label">待评级</div>
            </div>
            <div class="inc-fn-arrow">→<span class="fn-dwell">中位</span><span class="fn-dwell">{{ incMedianDwell.pendingLevel }}</span></div>
            <div class="inc-fn-node">
              <div class="fn-count fn-primary">{{ incFunnel.active }}</div>
              <div class="fn-label">事件生效</div>
            </div>
            <div class="inc-fn-arrow">→<span class="fn-dwell">中位</span><span class="fn-dwell">{{ incMedianDwell.active }}</span></div>
            <div class="inc-fn-node">
              <div class="fn-count" style="color: #fa8c16">{{ incFunnel.inProgress }}</div>
              <div class="fn-label">处置中</div>
            </div>
          </div>
          <div class="inc-fn-tasks">处置中任务：已通过 {{ incFunnel.taskSum.approved }} / 共 {{ incFunnel.taskSum.total }}</div>
          <div class="funnel-terminals inc-terminals">
            <div class="ft-item">
              <div class="ft-val ft-muted">{{ incFunnel.todayClosed }}</div>
              <div class="ft-lab">今日已关闭</div>
            </div>
            <div class="ft-item">
              <div class="ft-val ft-error">{{ incFunnel.todayTransferred }}</div>
              <div class="ft-lab">今日已转应急</div>
            </div>
            <div class="ft-item">
              <div class="ft-val ft-muted">{{ incFunnel.todayCancelled }}</div>
              <div class="ft-lab">今日已撤销</div>
            </div>
          </div>
        </div>

        <!-- 事件列表（§3.3） -->
        <div class="alert-list-panel">
          <div class="al-tabs">
            <div
              v-for="t in [
                { key: 'pending', label: '待处理',     count: incLists.pending.length },
                { key: 'ongoing', label: '进行中',     count: incLists.ongoing.length },
                { key: 'ended',   label: '今日已结束', count: incLists.ended.length },
              ]"
              :key="t.key"
              class="al-tab"
              :class="{ active: incTab === t.key }"
              @click="incTab = t.key as any"
            >
              {{ t.label }}
              <span class="al-badge" :class="{ 'badge-danger': t.key === 'pending' && t.count > 0 }">{{ t.count }}</span>
            </div>
          </div>

          <div class="al-rows">
            <TransitionGroup name="inc-row">
              <div
                v-for="rec in incListRecords.slice(0, 50)"
                :key="rec.incident_id"
                class="al-row inc-row"
                :class="{
                  'row-overdue': isIncLevelOverdue(rec),
                  'row-ended': isIncTerminal(rec),
                }"
                @click="openIncident(rec.incident_id)"
              >
                <span class="inc-level" :style="{ background: incLevelColor(rec) }">
                  {{ rec.level ? LEVEL_SHORT[rec.level] : '—' }}
                </span>
                <div class="al-info">
                  <div class="al-name">
                    <span class="inc-no">{{ rec.incident_no }}</span>
                    {{ rec.title }}
                    <span class="al-dot inc-dot" :class="rec.urgency === 'urgent' ? 'dot-urgent' : 'dot-normal'" />
                  </div>
                  <div class="al-meta inc-meta">
                    <span class="inc-meta-src" :title="`${rec.camp_name} · ${incSourceText(rec)} · ${relativeTime(rec.created_at)}`">
                      {{ rec.camp_name }} · {{ incSourceText(rec) }} · {{ relativeTime(rec.created_at) }}
                    </span>
                    <span class="inc-status" :style="{ color: INC_STATUS_COLOR[rec.status] }">{{ INC_STATUS_LABEL[rec.status] }}</span>
                    <span v-if="incAuxInfo(rec)" class="inc-aux" :class="{ 'dl-overdue': isIncLevelOverdue(rec) }">{{ incAuxInfo(rec) }}</span>
                  </div>
                </div>
              </div>
            </TransitionGroup>
            <div v-if="incListRecords.length > 50" class="al-overflow">
              还有 {{ incListRecords.length - 50 }} 条，请切换到 PC 端工作台查看
            </div>
            <div v-if="INCIDENT_RECORDS.length === 0" class="al-empty inc-empty">
              <WarningOutlined class="placeholder-icon" />暂无事件
            </div>
            <div v-else-if="incListRecords.length === 0" class="al-empty">当前分类下无事件</div>
          </div>
        </div>
      </aside>

    </div><!-- /bs-body -->

    <!-- ═══ 研判面板（全屏覆盖层） ═══════════════════════════════════ -->
    <!-- ═══ 事件详情覆盖层（PRD-大屏-事件 §4，与 PC 详情页共用组件） ═══ -->
    <Teleport to="body">
      <div v-if="incOverlayId" class="inc-overlay">
        <div v-if="incOverlayRecord && isIncTerminal(incOverlayRecord)" class="inc-terminal-bar">
          <ExclamationCircleOutlined />
          {{ incOverlayRecord.status === 'transferred' ? '事件已转应急' : incOverlayRecord.status === 'cancelled' ? '事件已撤销' : '事件已关闭' }}，不可再操作
        </div>
        <IncidentDetailPanel
          :incident-id="incOverlayId"
          mode="bigscreen"
          @back="closeIncident"
          @open-alert="openAlertFromIncident"
        />
      </div>
    </Teleport>

    <div v-if="panelVisible && panelCurrent" class="panel-overlay" :class="{ 'panel-stacked': panelReadonly }">

      <!-- 顶栏 -->
      <div class="panel-topbar">
        <button class="panel-back" @click="closePanel">
          <ArrowLeftOutlined /> {{ panelReadonly ? `返回事件 ${panelStackedIncidentNo}` : '返回驾驶舱' }}
        </button>
        <div class="panel-meta">
          <span class="panel-no">{{ panelCurrent.alert_no }}</span>
          <span class="panel-name">{{ panelCurrent.alert_type_name }} · {{ panelCurrent.camp_name }}营地</span>
          <span class="panel-urgency" :class="panelCurrent.urgency === 'urgent' ? 'badge-urgent' : 'badge-normal'">
            {{ panelCurrent.urgency === 'urgent' ? '🔴 紧急' : '⚪ 一般' }}
          </span>
        </div>
        <div class="panel-right">
          <span class="panel-status" :style="{ borderColor: statusColor[panelCurrent.status], color: statusColor[panelCurrent.status] }">
            {{ STATUS_LABEL[panelCurrent.status] }}
          </span>
        </div>
      </div>

      <!-- 主体三栏 -->
      <div class="panel-body">

        <!-- 左：待办队列 -->
        <aside class="panel-queue" :class="{ collapsed: panelQueueCollapsed }">
          <div class="pq-header">
            <span v-show="!panelQueueCollapsed" class="pq-title">
              待处理 <span class="pq-count">{{ panelPendingList.length }}</span>
            </span>
            <button class="pq-collapse" @click="panelQueueCollapsed = !panelQueueCollapsed">
              <MenuFoldOutlined v-if="!panelQueueCollapsed" />
              <MenuUnfoldOutlined v-else />
            </button>
          </div>
          <div v-show="!panelQueueCollapsed" class="pq-list">
            <div
              v-for="item in panelPendingList"
              :key="item.alert_id"
              class="pq-item"
              @click="switchPanel(item.alert_id)"
            >
              <span class="pq-dot" :class="item.urgency === 'urgent' ? 'dot-urgent' : 'dot-normal'" />
              <div class="pq-info">
                <div class="pq-name">{{ item.alert_type_name }}</div>
                <div class="pq-camp">{{ item.camp_name }}</div>
              </div>
            </div>
          </div>
        </aside>

        <!-- 中：地图+视频 -->
        <div class="panel-center">
          <div class="panel-map">
            <!-- 图层控制 -->
            <div class="pm-layers">
              <button class="pm-layer-btn" :class="{ active: true }"><EnvironmentOutlined /> 摄像头</button>
              <button class="pm-layer-btn" :class="{ active: true }"><RocketOutlined /> 无人机</button>
              <button class="pm-layer-btn"><RadarChartOutlined /> 反无目标</button>
              <button class="pm-layer-btn"><HistoryOutlined /> 历史轨迹</button>
              <button class="pm-layer-btn"><GlobalOutlined /> 敏感区域</button>
            </div>
            <!-- 地图占位 -->
            <div class="pm-map-area">
              <svg width="100%" height="100%" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice">
                <rect width="600" height="360" fill="#0e1a24"/>
                <circle :cx="300" :cy="180" r="40" fill="none" stroke="rgba(20,129,166,0.5)" stroke-width="1.5" stroke-dasharray="5 4"/>
                <circle :cx="300" :cy="180" r="8"
                  :fill="panelCurrent.urgency === 'urgent' ? '#ff6666' : '#faad14'"
                  class="alert-pulse"
                />
                <text x="300" y="240" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="12">
                  {{ panelCurrent.camp_name }} 营地 · {{ panelCurrent.alert_type_name }}
                </text>
              </svg>
            </div>
          </div>

          <!-- 视频区（可折叠） -->
          <div class="panel-video" :class="{ collapsed: panelVideoCollapsed }">
            <div class="pv-header">
              <span>视频多屏</span>
              <button class="pv-toggle" @click="panelVideoCollapsed = !panelVideoCollapsed">
                {{ panelVideoCollapsed ? '展开' : '折叠' }}
              </button>
            </div>
            <div v-show="!panelVideoCollapsed" class="pv-slots">
              <div v-for="(slot, i) in panelVideoSlots" :key="i" class="pv-slot">
                <span v-if="slot">{{ slot }}</span>
                <span v-else class="pv-empty"><VideoCameraOutlined /></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右：Tab 详情 -->
        <aside class="panel-detail">
          <div class="pd-tabs">
            <div v-for="t in ['overview','evidence','timeline','related']" :key="t"
              class="pd-tab" :class="{ active: panelActiveRightTab === t }"
              @click="panelActiveRightTab = t as any"
            >
              {{ { overview:'概要', evidence:'证据', timeline:'时间线', related:'关联' }[t] }}
            </div>
          </div>

          <!-- 概要 -->
          <div v-if="panelActiveRightTab === 'overview'" class="pd-content">
            <div class="pd-field"><span class="pd-key">预警编号</span><span class="pd-val mono">{{ panelCurrent.alert_no }}</span></div>
            <div class="pd-field"><span class="pd-key">类型</span><span class="pd-val">{{ panelCurrent.alert_type_name }}</span></div>
            <div class="pd-field"><span class="pd-key">来源</span><span class="pd-val">{{ SOURCE_LABEL[panelCurrent.source_type] }} · {{ panelCurrent.source_device_name }}</span></div>
            <div class="pd-field"><span class="pd-key">营地</span><span class="pd-val">{{ panelCurrent.camp_name }}{{ panelCurrent.camp_outside_meters ? `（围界外 ${panelCurrent.camp_outside_meters}m）` : '' }}</span></div>
            <div class="pd-field"><span class="pd-key">生成时间</span><span class="pd-val">{{ formatDateTime(panelCurrent.created_at) }}</span></div>
            <div class="pd-field"><span class="pd-key">触发次数</span><span class="pd-val">{{ panelCurrent.trigger_count }}</span></div>
            <div v-if="panelCurrent.verification_result" class="pd-field">
              <span class="pd-key">核实结论</span>
              <span class="pd-val">{{ panelCurrent.verification_result === 'real' ? '✅ 真实' : '❓ 无法确认' }}</span>
            </div>
            <div class="pd-field"><span class="pd-key">资源快照</span>
              <span class="pd-val">摄像头 {{ panelCurrent.resource_snapshot.cameras_online }} 路在线，无人机 {{ panelCurrent.resource_snapshot.drones_available }} 架可调</span>
            </div>
          </div>

          <!-- 时间线 -->
          <div v-else-if="panelActiveRightTab === 'timeline'" class="pd-content">
            <div class="tl-filter">
              <span v-for="f in ['all','system','verify','decision','external']" :key="f"
                class="tl-chip" :class="{ active: panelTlFilter === f }"
                @click="panelTlFilter = f as any"
              >{{ { all:'全部', system:'系统', verify:'核实', decision:'决策', external:'补录' }[f] }}</span>
            </div>
            <div v-for="item in panelFilteredTimeline" :key="item.id" class="tl-item">
              <div class="tl-dot" :style="{ background: timelineCategoryColor[item.category] }" />
              <div class="tl-body">
                <div class="tl-action">{{ item.action }}<span v-if="item.operator" class="tl-op"> · {{ item.operator }}</span></div>
                <div class="tl-content">{{ item.content }}</div>
                <div class="tl-time">{{ formatDateTime(item.time) }}</div>
              </div>
            </div>
            <div v-if="panelFilteredTimeline.length === 0" class="tl-empty">暂无记录</div>
          </div>

          <!-- 关联：叠层只读模式下显示来源事件链接，点击关闭预警面板回到事件覆盖层（§4.2） -->
          <div v-else-if="panelActiveRightTab === 'related' && panelReadonly" class="pd-content">
            <div class="pd-field">
              <span class="pd-key">关联事件</span>
              <a class="pd-val mono pd-link" @click="closePanel">{{ panelStackedIncidentNo }}</a>
            </div>
          </div>

          <!-- 证据 / 关联占位 -->
          <div v-else class="pd-content pd-placeholder">
            <span>暂无{{ panelActiveRightTab === 'evidence' ? '证据' : '关联预警' }}</span>
          </div>
        </aside>

      </div><!-- /panel-body -->

      <!-- 操作栏 -->
      <div class="panel-actions" v-if="!panelIsTerminal && !panelReadonly">
        <template v-if="panelCurrent.status === 'pending_verify'">
          <a-button size="large" class="act-btn" @click="pFalseAlarmVisible = true">
            <template #icon><CloseCircleOutlined /></template>标记误报
          </a-button>
          <a-button size="large" class="act-btn" @click="pMergeVisible = true">
            <template #icon><MergeCellsOutlined /></template>并入预警
          </a-button>
          <a-button size="large" class="act-btn" @click="pTaskVisible = true">
            <template #icon><TeamOutlined /></template>下发核实任务
          </a-button>
          <a-button size="large" class="act-btn" @click="pSupplementVisible = true">
            <template #icon><FileAddOutlined /></template>PC补录
          </a-button>
          <a-button size="large" type="primary" class="act-btn act-primary" @click="pVerifyVisible = true">
            <template #icon><CheckCircleOutlined /></template>提交核实结论 →
          </a-button>
        </template>
        <template v-else-if="['pending_decision','tracking'].includes(panelCurrent.status)">
          <a-button size="large" class="act-btn" @click="pTaskVisible = true" v-if="panelCurrent.status === 'pending_decision'">
            <template #icon><TeamOutlined /></template>下发核实任务
          </a-button>
          <a-button size="large" class="act-btn" @click="pSupplementVisible = true">
            <template #icon><FileAddOutlined /></template>PC补录
          </a-button>
          <a-button size="large" class="act-btn" @click="pTrackAppendVisible = true" v-if="panelCurrent.status === 'tracking'">
            <template #icon><EditOutlined /></template>追加跟踪记录
          </a-button>
          <a-button size="large" type="primary" class="act-btn act-primary" @click="pDecideVisible = true">
            <template #icon><SendOutlined /></template>
            {{ panelCurrent.status === 'tracking' ? '更新处置' : '做出决策 →' }}
          </a-button>
        </template>
      </div>
      <div class="panel-actions panel-actions-terminal" v-else-if="!panelReadonly">
        <span class="terminal-hint">该预警已进入终态：{{ STATUS_LABEL[panelCurrent.status] }}，不可再操作</span>
      </div>

      <!-- 核实结论弹窗 -->
      <a-modal v-model:open="pVerifyVisible" title="提交核实结论" width="480px" @ok="pVerifyVisible = false">
        <a-form layout="vertical" style="margin-top:12px">
          <a-form-item label="核实结论" required>
            <a-radio-group v-model:value="pVerifyForm.result">
              <a-radio value="real">✅ 真实（确认存在威胁）</a-radio>
              <a-radio value="unconfirmed">❓ 无法确认</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="核实说明">
            <a-textarea v-model:value="pVerifyForm.note" :rows="3" placeholder="描述核实过程和判断依据" />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 决策弹窗 -->
      <a-modal v-model:open="pDecideVisible" title="做出决策" width="480px" @ok="pDecideVisible = false">
        <a-form layout="vertical" style="margin-top:12px">
          <a-form-item label="处置方式" required>
            <a-radio-group v-model:value="pDecideForm.action">
              <a-radio value="resolve">✅ 解除预警</a-radio>
              <a-radio value="track">👁 持续跟踪</a-radio>
              <a-radio value="escalate">🚨 升级为事件</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item v-if="pDecideForm.action === 'resolve'" label="解除原因">
            <a-select v-model:value="pDecideForm.resolveReason" placeholder="请选择">
              <a-select-option value="风险已消除">风险已消除</a-select-option>
              <a-select-option value="误报已确认">误报已确认</a-select-option>
              <a-select-option value="威胁已离开区域">威胁已离开区域</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="说明">
            <a-textarea v-model:value="pDecideForm.note" :rows="3" placeholder="填写决策说明" />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 标记误报弹窗 -->
      <a-modal v-model:open="pFalseAlarmVisible" title="标记误报" width="440px" @ok="pFalseAlarmVisible = false">
        <a-form layout="vertical" style="margin-top:12px">
          <a-form-item label="误报原因" required>
            <a-select v-model:value="pFalseAlarmForm.reason" placeholder="请选择">
              <a-select-option value="己方目标">己方目标</a-select-option>
              <a-select-option value="设备误识别">设备误识别</a-select-option>
              <a-select-option value="干扰信号">干扰信号</a-select-option>
              <a-select-option value="其他">其他</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="补充说明">
            <a-textarea v-model:value="pFalseAlarmForm.remark" :rows="2" />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 并入预警弹窗（缺口 #8） -->
      <a-modal v-model:open="pMergeVisible" title="并入其他预警" width="500px" @ok="pMergeVisible = false">
        <a-form layout="vertical" style="margin-top:12px">
          <a-form-item label="选择目标预警" required>
            <a-select v-model:value="pMergeForm.targetNo" placeholder="请选择待核实预警">
              <a-select-option
                v-for="r in pMergeTargets"
                :key="r.alert_id"
                :value="r.alert_no"
              >{{ r.alert_no }} — {{ r.alert_type_name }} · {{ r.camp_name }}</a-select-option>
            </a-select>
            <div style="margin-top:6px;font-size:12px;color:var(--of-text-quaternary)">
              当前预警的证据将复制到目标预警的时间线，并标注「来自 {{ panelCurrent?.alert_no }} 并入」
            </div>
          </a-form-item>
          <a-form-item label="备注">
            <a-textarea v-model:value="pMergeForm.note" :rows="2" placeholder="可选，说明并入原因" />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 下发核实任务弹窗（缺口 #10a） -->
      <a-modal v-model:open="pTaskVisible" title="下发核实任务" width="480px" @ok="pTaskVisible = false">
        <a-form layout="vertical" style="margin-top:12px">
          <a-form-item label="接收人" required>
            <a-select v-model:value="pTaskForm.receiver" placeholder="请选择接收人">
              <a-select-option value="张三">张三（今日值班）</a-select-option>
              <a-select-option value="李四">李四（今日值班）</a-select-option>
              <a-select-option value="王五">王五（今日值班）</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="核实要求" required>
            <a-textarea v-model:value="pTaskForm.requirement" :rows="3" placeholder="描述需要现场核实的内容，如：前往坐标位置确认是否有可疑目标" />
          </a-form-item>
          <a-form-item label="期限">
            <a-date-picker
              v-model:value="pTaskForm.deadline"
              show-time
              format="MM-DD HH:mm"
              placeholder="选择截止时间（可选）"
              style="width:100%"
            />
          </a-form-item>
          <div style="font-size:12px;color:var(--of-text-quaternary)">任务发出后接收人将收到 App 推送；超期未回填将触发催办通知。</div>
        </a-form>
      </a-modal>

      <!-- PC 补录弹窗（缺口 #10b） -->
      <a-modal v-model:open="pSupplementVisible" title="PC 补录现场核实" width="480px" @ok="pSupplementVisible = false">
        <a-form layout="vertical" style="margin-top:12px">
          <a-form-item label="补录内容" required>
            <a-textarea
              v-model:value="pSupplementForm.content"
              :rows="4"
              placeholder="通过手台线下联系后，在此补录现场核实结果（文字说明 + 可附图片说明）"
              @input="isDirty = true"
            />
          </a-form-item>
          <div style="font-size:12px;color:var(--of-text-quaternary)">补录内容将写入时间线并标注「PC补录」，不改变预警状态。</div>
        </a-form>
      </a-modal>

      <!-- 追加跟踪记录弹窗（缺口 #9） -->
      <a-modal v-model:open="pTrackAppendVisible" title="追加跟踪记录" width="480px" @ok="pTrackAppendVisible = false">
        <a-form layout="vertical" style="margin-top:12px">
          <a-form-item label="跟踪说明" required>
            <a-textarea
              v-model:value="pTrackAppendForm.content"
              :rows="4"
              placeholder="描述最新观察情况，如：巡逻车确认围界外约500m有2人，暂无入侵行为"
              @input="isDirty = true"
            />
          </a-form-item>
          <div style="font-size:12px;color:var(--of-text-quaternary)">追加记录写入时间线，不改变状态和复核周期。</div>
        </a-form>
      </a-modal>

      <!-- 切换预警二次确认（缺口 #1） -->
      <a-modal
        v-model:open="switchConfirmVisible"
        title="切换预警"
        width="400px"
        @ok="confirmSwitch"
        ok-text="放弃并切换"
        cancel-text="继续当前"
      >
        <div style="padding:8px 0;color:var(--of-text-secondary)">
          当前页面有未提交的内容，切换后将丢失。确定要切换到其他预警吗？
        </div>
      </a-modal>

    </div><!-- /panel-overlay -->

    <!-- ═══ 右下角实时弹窗（缺口 #5） ══════════════════════════════ -->
    <transition name="toast-slide">
      <div v-if="toastVisible && toastRecord" class="toast-wrap">
        <div class="toast-card" :class="toastRecord.urgency === 'urgent' ? 'toast-urgent' : 'toast-normal'">
          <div class="toast-header">
            <span class="toast-dot" :class="toastRecord.urgency === 'urgent' ? 'dot-urgent' : 'dot-normal'" />
            <span class="toast-title">新预警 · {{ toastRecord.urgency === 'urgent' ? '🔴 紧急' : '⚪ 一般' }}</span>
            <button class="toast-close" @click="toastVisible = false">✕</button>
          </div>
          <div class="toast-body">
            <div class="toast-name">{{ toastRecord.alert_type_name }} · {{ toastRecord.camp_name }}营地</div>
            <div class="toast-meta">{{ toastRecord.alert_no }} · {{ SOURCE_LABEL[toastRecord.source_type] }}</div>
          </div>
          <div class="toast-footer">
            <button class="toast-action" @click="openPanel(toastRecord.alert_id); toastVisible = false">
              立即处理
            </button>
            <span v-if="toastRecord.urgency !== 'urgent'" class="toast-auto">3秒后自动关闭</span>
          </div>
        </div>
      </div>
    </transition>

  </div><!-- /bs-root -->
</template>


<style scoped lang="scss">
// ═══════════════════════════════════════════════════
// 大屏根布局
// ═══════════════════════════════════════════════════
.bs-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--of-bg-body);
  overflow: hidden;
}

// ═══════════════════════════════════════════════════
// 顶栏
// ═══════════════════════════════════════════════════
.bs-topbar {
  flex-shrink: 0;
  height: 48px;
  background: var(--of-bg-header);
  border-bottom: 1px solid var(--of-border-table);
  display: flex;
  align-items: center;
  padding: 0 var(--of-spacing-4);
  gap: var(--of-spacing-4);
  z-index: 10;
}
.topbar-logo  { font-size: 18px; }
.topbar-title { font-size: var(--of-font-size-base); font-weight: var(--of-font-weight-bold); color: var(--of-text-brand); white-space: nowrap; margin-right: var(--of-spacing-3); }
.topbar-nav   { flex: 1; display: flex; align-items: center; gap: 2px; }
.nav-item {
  padding: 4px 14px; font-size: var(--of-font-size-xs); color: var(--of-text-topnav); cursor: pointer;
  border-radius: var(--of-radius-base); border-bottom: 2px solid transparent;
  transition: background var(--of-transition-base), color var(--of-transition-base);
  &:hover { background: rgba(255,255,255,0.06); color: var(--of-text-primary); }
  &.active { color: var(--of-color-link); border-color: var(--of-color-primary); }
}
.topbar-right { display: flex; align-items: center; gap: var(--of-spacing-3); margin-left: auto; }
.ws-badge { font-size: var(--of-font-size-xs); padding: 2px 8px; border-radius: 3px; &.ws-warn { background: rgba(250,173,20,0.15); color: var(--of-color-warning); } }
.icon-btn {
  background: none; border: none; color: var(--of-text-tertiary); cursor: pointer; font-size: 16px; padding: 4px; border-radius: var(--of-radius-base);
  &:hover { color: var(--of-text-primary); background: rgba(255,255,255,0.08); }
  &.sound-off { color: var(--of-color-error); opacity: 0.6; }
}
.topbar-clock { font-size: 16px; font-weight: var(--of-font-weight-bold); color: var(--of-text-primary); font-variant-numeric: tabular-nums; }
.topbar-date  { font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); }
.topbar-user  { font-size: var(--of-font-size-xs); color: var(--of-text-secondary); }

// ═══════════════════════════════════════════════════
// 主体三栏
// ═══════════════════════════════════════════════════
.bs-body { flex: 1; display: grid; grid-template-columns: 360px 1fr 360px; overflow: hidden; }

// 左侧预警区
.bs-left { display: flex; flex-direction: column; border-right: 1px solid var(--of-border-table); overflow: hidden; }

// KPI 看板
.kpi-panel { flex-shrink: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--of-border-table); border-bottom: 1px solid var(--of-border-table); }
.kpi-card { background: var(--of-bg-card); padding: 10px 12px; text-align: center; &:last-child { grid-column: span 2; } }
.kpi-value { font-size: 26px; font-weight: var(--of-font-weight-bold); color: var(--of-text-primary); font-variant-numeric: tabular-nums; line-height: 1.1; }
.kpi-label { font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); margin-top: 2px; }
.kpi-danger { background: rgba(255,102,102,0.06); .kpi-value { color: var(--of-color-error); } }
.kpi-warn   { background: rgba(250,173,20,0.06); .kpi-value { color: var(--of-color-warning); } }
.kpi-purple .kpi-value { color: #9b7cff; }
.kpi-muted  .kpi-value { color: var(--of-text-tertiary); }

// 处置漏斗
.funnel-panel { flex-shrink: 0; padding: 10px 12px; border-bottom: 1px solid var(--of-border-table); background: var(--of-bg-card); }
.funnel-title { font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); margin-bottom: 8px; font-weight: var(--of-font-weight-medium); }
.funnel-node { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
.fn-label   { font-size: var(--of-font-size-xs); color: var(--of-text-secondary); }
.fn-count   { font-size: 18px; font-weight: var(--of-font-weight-bold); font-variant-numeric: tabular-nums; }
.fn-primary { color: var(--of-color-primary); }
.fn-warn    { color: var(--of-color-warning); }
.fn-purple  { color: #9b7cff; }
.funnel-arrow { font-size: 11px; color: var(--of-text-quaternary); padding-left: 6px; }
.fn-dwell     { font-size: 11px; color: var(--of-text-quaternary); }
.funnel-terminals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--of-border-table); }
.ft-item { text-align: center; }
.ft-val  { font-size: 16px; font-weight: var(--of-font-weight-bold); font-variant-numeric: tabular-nums; }
.ft-lab  { font-size: 11px; color: var(--of-text-quaternary); margin-top: 1px; }
.ft-success { color: var(--of-color-success); }
.ft-error   { color: var(--of-color-error); }
.ft-muted   { color: var(--of-text-tertiary); }

// 预警列表
.alert-list-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.al-tabs { flex-shrink: 0; display: flex; border-bottom: 1px solid var(--of-border-table); background: var(--of-bg-card); }
.al-tab {
  flex: 1; text-align: center; padding: 8px 4px; font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); cursor: pointer;
  border-bottom: 2px solid transparent; transition: color var(--of-transition-base), border-color var(--of-transition-base);
  &.active { color: var(--of-color-link); border-color: var(--of-color-primary); }
}
.al-badge { display: inline-block; margin-left: 3px; background: rgba(255,255,255,0.08); border-radius: 3px; padding: 0 5px; font-size: 11px; &.badge-danger { background: rgba(255,102,102,0.2); color: var(--of-color-error); } }
.al-rows { flex: 1; overflow-y: auto; }
.al-row {
  display: flex; align-items: center; gap: var(--of-spacing-2); padding: 8px 10px;
  border-bottom: 1px solid var(--of-border-table); cursor: pointer; position: relative;
  transition: background var(--of-transition-base);
  &::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: transparent; transition: background var(--of-transition-base); }
  &:hover { background: var(--of-bg-row-hover); &::before { background: var(--of-color-primary); } }
  &.row-urgent::before { background: rgba(255,102,102,0.5); }
  &.row-ended { opacity: 0.6; }
}
.al-dot { flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; &.dot-urgent { background: var(--of-color-error); box-shadow: 0 0 0 3px rgba(255,102,102,0.2); animation: pulse-dot 2s infinite; } &.dot-normal { background: var(--of-text-quaternary); } }
@keyframes pulse-dot { 0%,100% { box-shadow: 0 0 0 3px rgba(255,102,102,0.2); } 50% { box-shadow: 0 0 0 6px rgba(255,102,102,0.08); } }
.al-info    { flex: 1; min-width: 0; }
.al-name    { font-size: var(--of-font-size-xs); color: var(--of-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.al-meta    { font-size: 11px; color: var(--of-text-quaternary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.al-deadline { flex-shrink: 0; font-size: 11px; color: var(--of-text-tertiary); font-variant-numeric: tabular-nums; white-space: nowrap; &.dl-overdue { color: var(--of-color-error); font-weight: var(--of-font-weight-medium); } }

.al-overflow, .al-empty { text-align: center; padding: var(--of-spacing-4); font-size: var(--of-font-size-xs); color: var(--of-text-quaternary); }

// 中央地图区
.bs-map { position: relative; background: #0e1a24; overflow: hidden; }
.map-toolbar { position: absolute; top: var(--of-spacing-3); left: var(--of-spacing-3); z-index: 2; display: flex; align-items: center; gap: var(--of-spacing-2); }
.map-label  { font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); }
.layer-btn  { background: rgba(30,38,47,0.85); border: 1px solid var(--of-border-table); color: var(--of-text-secondary); font-size: var(--of-font-size-xs); padding: 4px 10px; border-radius: var(--of-radius-base); cursor: pointer; display: flex; align-items: center; gap: 4px; &:hover { color: var(--of-text-primary); } }
.layer-dropdown { position: absolute; top: 100%; left: 0; margin-top: 4px; background: var(--of-bg-modal); border: 1px solid var(--of-border-modal); border-radius: var(--of-radius-base); padding: var(--of-spacing-2) var(--of-spacing-3); display: flex; flex-direction: column; gap: var(--of-spacing-2); white-space: nowrap; label { display: flex; align-items: center; gap: var(--of-spacing-2); font-size: var(--of-font-size-xs); color: var(--of-text-secondary); cursor: pointer; } }
.map-svg { width: 100%; height: 100%; }
.alert-pulse { animation: map-pulse 2s ease-out infinite; }
.alert-ring  { animation: map-ring  2s ease-out infinite; }
@keyframes map-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 0.15; } }
@keyframes map-ring  { 0% { opacity: 0.8; } 100% { opacity: 0; } }
.ws-banner { position: absolute; top: var(--of-spacing-3); right: var(--of-spacing-3); background: rgba(250,173,20,0.15); border: 1px solid rgba(250,173,20,0.3); color: var(--of-color-warning); font-size: var(--of-font-size-xs); padding: 4px 10px; border-radius: var(--of-radius-base); display: flex; align-items: center; gap: 4px; }

// 地图图例
.map-legend {
  position: absolute; left: var(--of-spacing-3); bottom: var(--of-spacing-3); z-index: 2;
  display: flex; align-items: center; gap: var(--of-spacing-3);
  background: rgba(30,38,47,0.85); border: 1px solid var(--of-border-table); border-radius: var(--of-radius-base);
  padding: 4px 10px; font-size: 11px; color: var(--of-text-tertiary);
  span { display: inline-flex; align-items: center; gap: 4px; }
  .lg-dot { width: 8px; height: 8px; border-radius: 50%; background: #faad14; }
  .lg-diamond { width: 8px; height: 8px; background: #fa8c16; transform: rotate(45deg); }
  .lg-count { color: var(--of-text-quaternary); }
}
.inc-pulse { animation: inc-pulse 2s ease-out infinite; }
@keyframes inc-pulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.8); opacity: 0; } }

// ═══════════════════════════════════════════════════
// 右侧事件区（PRD-大屏-事件 §3）
// ═══════════════════════════════════════════════════
.bs-right { display: flex; flex-direction: column; border-left: 1px solid var(--of-border-table); overflow: hidden; }
.inc-kpi { flex-shrink: 0; height: 80px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: var(--of-border-table); border-bottom: 1px solid var(--of-border-table); }
.inc-kpi-card {
  background: var(--of-bg-card); display: flex; flex-direction: column; align-items: center; justify-content: center;
  .kpi-value { font-size: 22px; }
  .kpi-label { white-space: nowrap; }
}
.inc-funnel-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 2px; }
.inc-fn-node { flex: 1; text-align: center; min-width: 0; }
.inc-fn-arrow { flex-shrink: 0; width: 52px; display: flex; flex-direction: column; align-items: center; color: var(--of-text-quaternary); font-size: 14px; line-height: 1.2; .fn-dwell { font-size: 10px; white-space: nowrap; } }
.inc-fn-tasks { margin-top: 4px; text-align: right; font-size: 11px; color: var(--of-text-tertiary); white-space: nowrap; }
// 第二行：来源信息可截断（hover 看全），状态与辅助信息不截断
.inc-meta { display: flex; align-items: center; gap: 6px; }
.inc-meta-src { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inc-terminals { grid-template-columns: repeat(3, 1fr); }
.inc-row { align-items: flex-start; }
.inc-level {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 3px; margin-top: 1px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: var(--of-font-weight-bold);
}
.inc-no { font-family: monospace; color: var(--of-text-tertiary); margin-right: 4px; }
.inc-dot { display: inline-block; vertical-align: middle; margin-left: 4px; }
.inc-status { flex-shrink: 0; }
.inc-aux { flex-shrink: 0; color: var(--of-text-tertiary); &.dl-overdue { color: var(--of-color-error); font-weight: var(--of-font-weight-medium); } }
.inc-empty { display: flex; flex-direction: column; align-items: center; padding-top: 48px; }
.placeholder-icon { font-size: 40px; opacity: 0.2; display: block; margin-bottom: var(--of-spacing-3); }

// 列表条目进出动画（§3.3：插入 100ms，移出 200ms）
.inc-row-enter-active { transition: opacity 100ms ease-out, transform 100ms ease-out; }
.inc-row-leave-active { transition: opacity 200ms ease-in; }
.inc-row-enter-from { opacity: 0; transform: translateY(-8px); }
.inc-row-leave-to { opacity: 0; }

// 事件详情覆盖层（Teleport 到 body）；叠层的预警面板须在其之上
.inc-overlay {
  position: fixed; inset: 0; z-index: 100; background: var(--of-bg-body);
  display: flex; flex-direction: column;
  :deep(.id-root) { flex: 1; min-height: 0; height: auto; }
}
.inc-terminal-bar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; background: rgba(250,173,20,0.12); border-bottom: 1px solid rgba(250,173,20,0.3);
  color: var(--of-color-warning); font-size: var(--of-font-size-xs);
}
.panel-overlay.panel-stacked { z-index: 110; }
.pd-link { color: var(--of-color-link); cursor: pointer; &:hover { color: var(--of-color-link-hover); } }

// ═══════════════════════════════════════════════════
// 研判面板覆盖层
// ═══════════════════════════════════════════════════
.panel-overlay { position: fixed; inset: 0; z-index: 100; background: var(--of-bg-body); display: flex; flex-direction: column; }
.panel-topbar { flex-shrink: 0; height: 48px; background: var(--of-bg-header); border-bottom: 1px solid var(--of-border-table); display: flex; align-items: center; padding: 0 var(--of-spacing-4); gap: var(--of-spacing-3); }
.panel-back { background: none; border: none; color: var(--of-color-link); font-size: var(--of-font-size-xs); cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap; &:hover { color: var(--of-color-link-hover); } }
.panel-meta { display: flex; align-items: center; gap: var(--of-spacing-2); flex: 1; min-width: 0; }
.panel-no   { font-family: monospace; font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); white-space: nowrap; }
.panel-name { font-size: var(--of-font-size-base); color: var(--of-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.panel-urgency { font-size: var(--of-font-size-xs); padding: 1px 7px; border-radius: 3px; white-space: nowrap; &.badge-urgent { background: rgba(255,102,102,0.15); color: var(--of-color-error); } &.badge-normal { background: rgba(255,255,255,0.06); color: var(--of-text-tertiary); } }
.panel-right  { display: flex; align-items: center; gap: var(--of-spacing-2); flex-shrink: 0; }
.panel-status { font-size: var(--of-font-size-xs); padding: 1px 8px; border: 1px solid; border-radius: 3px; white-space: nowrap; }
.panel-body { flex: 1; display: grid; grid-template-columns: 280px 1fr 420px; overflow: hidden; }

// 待办队列
.panel-queue { border-right: 1px solid var(--of-border-table); display: flex; flex-direction: column; overflow: hidden; &.collapsed { width: 40px; overflow: hidden; } }
.pq-header { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid var(--of-border-table); background: var(--of-bg-card); }
.pq-title  { font-size: var(--of-font-size-xs); color: var(--of-text-secondary); }
.pq-count  { background: rgba(255,102,102,0.2); color: var(--of-color-error); border-radius: 3px; padding: 0 5px; font-size: 11px; margin-left: 4px; }
.pq-collapse { background: none; border: none; color: var(--of-text-tertiary); cursor: pointer; font-size: 14px; &:hover { color: var(--of-text-primary); } }
.pq-list { flex: 1; overflow-y: auto; }
.pq-item { display: flex; align-items: center; gap: var(--of-spacing-2); padding: 8px 10px; border-bottom: 1px solid var(--of-border-table); cursor: pointer; &:hover { background: var(--of-bg-row-hover); } }
.pq-dot  { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; &.dot-urgent { background: var(--of-color-error); } &.dot-normal { background: var(--of-text-quaternary); } }
.pq-info { flex: 1; min-width: 0; }
.pq-name { font-size: 11px; color: var(--of-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pq-camp { font-size: 11px; color: var(--of-text-quaternary); }

// 面板中央
.panel-center  { display: flex; flex-direction: column; overflow: hidden; }
.panel-map     { flex: 1; position: relative; overflow: hidden; background: #0e1a24; }
.pm-layers     { position: absolute; top: var(--of-spacing-3); left: var(--of-spacing-3); z-index: 2; display: flex; gap: var(--of-spacing-2); flex-wrap: wrap; }
.pm-layer-btn  { background: rgba(30,38,47,0.85); border: 1px solid var(--of-border-table); color: var(--of-text-tertiary); font-size: 11px; padding: 3px 8px; border-radius: var(--of-radius-base); cursor: pointer; display: flex; align-items: center; gap: 3px; &.active { color: var(--of-color-link); border-color: rgba(20,129,166,0.4); } &:hover { color: var(--of-text-primary); } }
.pm-map-area   { width: 100%; height: 100%; }
.panel-video   { flex-shrink: 0; border-top: 1px solid var(--of-border-table); background: var(--of-bg-card); &.collapsed .pv-slots { display: none; } }
.pv-header     { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); }
.pv-toggle     { background: none; border: none; color: var(--of-color-link); font-size: 11px; cursor: pointer; }
.pv-slots      { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 2px 8px 8px; height: 130px; }
.pv-slot       { background: #0e1a24; border: 1px solid var(--of-border-table); display: flex; align-items: center; justify-content: center; border-radius: var(--of-radius-base); font-size: 11px; color: var(--of-text-secondary); }
.pv-empty      { color: var(--of-text-quaternary); font-size: 18px; }

// 右侧详情栏
.panel-detail  { border-left: 1px solid var(--of-border-table); display: flex; flex-direction: column; overflow: hidden; }
.pd-tabs       { flex-shrink: 0; display: flex; border-bottom: 1px solid var(--of-border-table); background: var(--of-bg-card); }
.pd-tab        { flex: 1; text-align: center; padding: 10px 4px; font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); cursor: pointer; border-bottom: 2px solid transparent; &.active { color: var(--of-color-link); border-color: var(--of-color-primary); } }
.pd-content    { flex: 1; overflow-y: auto; padding: var(--of-spacing-3) var(--of-spacing-4); }
.pd-field      { display: flex; gap: var(--of-spacing-2); padding: 6px 0; border-bottom: 1px solid var(--of-border-table); font-size: var(--of-font-size-xs); &:last-child { border-bottom: none; } }
.pd-key        { color: var(--of-text-tertiary); white-space: nowrap; width: 70px; flex-shrink: 0; }
.pd-val        { color: var(--of-text-primary); flex: 1; min-width: 0; word-break: break-all; &.mono { font-family: monospace; } }
.pd-placeholder{ display: flex; align-items: center; justify-content: center; color: var(--of-text-quaternary); font-size: var(--of-font-size-xs); }
.tl-filter     { display: flex; gap: var(--of-spacing-2); margin-bottom: var(--of-spacing-3); flex-wrap: wrap; }
.tl-chip       { font-size: 11px; padding: 2px 8px; border-radius: 3px; background: rgba(255,255,255,0.06); color: var(--of-text-tertiary); cursor: pointer; &.active { background: rgba(20,129,166,0.2); color: var(--of-color-link); } }
.tl-item       { display: flex; gap: var(--of-spacing-2); margin-bottom: var(--of-spacing-3); }
.tl-dot        { flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; }
.tl-body       { flex: 1; min-width: 0; }
.tl-action     { font-size: var(--of-font-size-xs); color: var(--of-text-primary); font-weight: var(--of-font-weight-medium); }
.tl-op         { color: var(--of-text-tertiary); font-weight: var(--of-font-weight-normal); }
.tl-content    { font-size: 11px; color: var(--of-text-secondary); margin-top: 2px; }
.tl-time       { font-size: 11px; color: var(--of-text-quaternary); margin-top: 2px; font-variant-numeric: tabular-nums; }
.tl-empty      { text-align: center; color: var(--of-text-quaternary); font-size: var(--of-font-size-xs); padding: var(--of-spacing-4) 0; }

// 操作栏
.panel-actions { flex-shrink: 0; height: 64px; background: var(--of-bg-header); border-top: 1px solid var(--of-border-table); display: flex; align-items: center; justify-content: flex-end; padding: 0 var(--of-spacing-4); gap: var(--of-spacing-3); }
:deep(.act-btn.ant-btn) { height: 48px !important; font-size: var(--of-font-size-base) !important; }
.act-primary { min-width: 160px; }
.act-warn :deep(.ant-btn) { border-color: var(--of-color-warning) !important; color: var(--of-color-warning) !important; }
.panel-actions-terminal { justify-content: center; }
.terminal-hint { font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); }

// ── 右下角实时弹窗 ────────────────────────────────
.toast-wrap {
  position: fixed;
  bottom: var(--of-spacing-4);
  right: var(--of-spacing-4);
  z-index: 200;
  width: 300px;
}
.toast-card {
  background: var(--of-bg-card);
  border: 1px solid var(--of-border-modal);
  border-radius: var(--of-radius-base);
  box-shadow: var(--of-shadow-modal);
  overflow: hidden;
  &.toast-urgent { border-color: rgba(255,102,102,0.4); }
  &.toast-normal { border-color: rgba(250,173,20,0.3); }
}
.toast-header {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-2);
  padding: 8px 12px;
  background: var(--of-bg-modal-header);
  border-bottom: 1px solid var(--of-border-table);
}
.toast-title { flex: 1; font-size: var(--of-font-size-xs); font-weight: var(--of-font-weight-medium); color: var(--of-text-primary); }
.toast-close { background: none; border: none; color: var(--of-text-quaternary); cursor: pointer; font-size: 12px; &:hover { color: var(--of-text-primary); } }
.toast-body { padding: 10px 12px; }
.toast-name { font-size: var(--of-font-size-base); color: var(--of-text-primary); font-weight: var(--of-font-weight-medium); }
.toast-meta { font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); margin-top: 3px; }
.toast-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--of-border-table);
}
.toast-action {
  background: var(--of-color-primary);
  border: none;
  color: #fff;
  font-size: var(--of-font-size-xs);
  padding: 4px 14px;
  border-radius: var(--of-radius-base);
  cursor: pointer;
  &:hover { background: var(--of-color-primary-hover); }
}
.toast-auto { font-size: 11px; color: var(--of-text-quaternary); }

// toast 进出动画
.toast-slide-enter-active { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-slide-leave-active { transition: all 0.2s ease-in; }
.toast-slide-enter-from { transform: translateY(20px); opacity: 0; }
.toast-slide-leave-to  { transform: translateY(10px); opacity: 0; }
</style>
