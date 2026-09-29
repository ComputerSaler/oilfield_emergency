<script setup lang="ts">
/**
 * A 类无人机管理 —— 详情页
 * PRD V3.0 IS-03/IS-04/IS-05/IS-08/IS-09、F-13~F-27、5.2 全部联动规则
 *
 * 页面布局（PRD 5.2.1）：
 *   面包屑 → 页头（名称/SN/工具栏）→ 状态摘要
 *   → 左栏（基础信息 只读 / 平台扩展信息 可编辑）+ 右栏（实时视频 / 位置预览）
 *   → 累计飞行数据 → 巡检任务
 *
 * 主数据来源为 A 类无人机统一数据源，平台仅同步与展示；本页无任何主数据写入口（E-55）。
 */
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CopyOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  CAMP_ANCHOR,
  CAMP_DICT,
  ICON_OPTIONS,
  PERSON_OPTIONS,
  POSITIONS,
  POSITION_TYPE_LABEL,
  SYS_CONFIG,
  TASKS,
  TASK_STATUS_DICT,
  type UavExtension,
} from '@/mock/aUav'
import {
  MANAGEMENT_STATUS_LABEL as _MANAGEMENT_STATUS_LABEL,
  campName,
  flightStatusOf as _flightStatusOf,
  normalize,
  type LogicalUav,
} from '@/mock/aUavNormalize'
import { useAUavDemoStore } from '@/stores/aUavDemo'
import {
  ABNORMAL as _ABNORMAL,
  DASH,
  fmtAgo,
  fmtDateTime,
  fmtDuration,
  fmtHm,
  fmtKm,
  fmtSorties,
  fmtWithTz,
  isCoordValid,
  isTimeInverted,
} from '@/utils/aUavFormat'

const route = useRoute()
const router = useRouter()
const demo = useAUavDemoStore()

const sn = computed(() => String(route.params.sn ?? ''))

// ============================ 数据装载 ============================

const refreshedAt = ref(new Date().toISOString())
const loading = ref(false)

const allDrones = computed(() =>
  normalize(undefined, {
    listLoadState: demo.listLoadState,
    managementStatusBySn: demo.managementStatusBySn,
    disableInfoBySn: demo.disableInfoBySn,
    archiveInfoBySn: demo.archiveInfoBySn,
    onlineOverrideBySn: demo.onlineOverrideBySn,
    extOverrideBySn: demo.extOverrideBySn,
  }),
)

const drone = computed<LogicalUav | undefined>(() =>
  allDrones.value.find((d) => d.drone_sn === sn.value),
)

/**
 * E-41 / E-42：对象不存在、已归档、无权访问 → 全页替换为提示 + 返回列表，
 * 禁止展示缓存数据冒充有效对象。
 */
const blockedReason = computed(() => {
  if (!drone.value) return '该无人机不存在、已归档或您无访问权限'
  if (!demo.perms.detail) return '无权访问该设备'
  return null
})

/** 已归档：全部编辑与操作入口隐藏，仅保留返回列表（5.2.4） */
const isArchived = computed(() => drone.value?.management_status === 'ARCHIVED')

// ============================ 源记录 ============================

const sourceRecord = computed(() => drone.value?.source_record)

/** 当前所在营地：由当前地面站推导的单值，仅展示不用于筛选 */
const currentCampLabel = computed(() => {
  const code = drone.value?.current_camp_code
  return code ? campName(code) : DASH
})

// ============================ F-13 刷新数据 ============================

function onRefresh() {
  // 编辑态下禁止刷新，防止冲掉未保存内容（5.2.4）
  if (editing.value) return
  loading.value = true
  setTimeout(() => {
    loading.value = false
    refreshedAt.value = new Date().toISOString()
    message.success('已刷新')
  }, 500)
}

async function copySn() {
  try {
    await navigator.clipboard.writeText(sn.value)
    message.success('已复制', 2)
  } catch {
    message.warning('复制失败，请手动选中 SN 文字后复制')
  }
}

// ============================ 平台扩展信息编辑（F-13~F-15）============================

const editing = ref(false)
const form = reactive({
  serviceable_camps: [] as string[],
  display_icon_id: null as string | null,
  responsible_org: '',
  responsible_person_id: null as string | null,
  show_on_bigscreen: true,
  ops_remark: '',
})

function snapshot(): typeof form {
  const e = drone.value?.ext
  return {
    serviceable_camps: [...(e?.serviceable_camps ?? [])],
    display_icon_id: e?.display_icon_id ?? null,
    responsible_org: e?.responsible_org ?? '',
    responsible_person_id: e?.responsible_person_id ?? null,
    show_on_bigscreen: e?.show_on_bigscreen ?? true,
    ops_remark: e?.ops_remark ?? '',
  }
}

let original = snapshot()

function startEdit() {
  original = snapshot()
  Object.assign(form, snapshot())
  editing.value = true
}

/** 变更字段清单（保存按钮置灰依据 + 取消时列出已变更字段 E-25） */
const changedFields = computed(() => {
  const out: string[] = []
  const cmp: [keyof typeof form, string][] = [
    ['serviceable_camps', '可服务营地'],
    ['display_icon_id', '显示图标'],
    ['responsible_org', '责任单位'],
    ['responsible_person_id', '责任人'],
    ['show_on_bigscreen', '是否大屏展示'],
    ['ops_remark', '运维备注'],
  ]
  for (const [key, label] of cmp) {
    const a = JSON.stringify(form[key])
    const b = JSON.stringify(original[key])
    if (a !== b) out.push(label)
  }
  return out
})

/** E-19：可服务营地至少选 1 项，否则保存置灰 + 字段下红字 */
const campsError = computed(() =>
  form.serviceable_camps.length === 0 ? '可服务营地至少选择 1 个营地' : '',
)

const canSave = computed(() => changedFields.value.length > 0 && !campsError.value)

function onSave() {
  if (!canSave.value || !drone.value) return
  const patch: Partial<UavExtension> = {
    serviceable_camps: [...form.serviceable_camps],
    display_icon_id: form.display_icon_id,
    responsible_org: form.responsible_org,
    responsible_person_id: form.responsible_person_id,
    show_on_bigscreen: form.show_on_bigscreen,
    ops_remark: form.ops_remark,
    updated_by: demo.role.label,
    updated_at: new Date().toISOString(),
  }
  demo.saveExtension(drone.value.drone_sn, patch, changedFields.value)
  editing.value = false
  message.success('保存成功')
}

/** F-15 / E-27：有未保存变更时弹二次确认并列出变更字段 */
function onCancelEdit() {
  if (changedFields.value.length === 0) {
    editing.value = false
    return
  }
  Modal.confirm({
    title: '放弃未保存的修改？',
    content: `已变更字段：${changedFields.value.join('、')}`,
    okText: '放弃修改',
    okType: 'danger',
    cancelText: '继续编辑',
    onOk: () => {
      editing.value = false
    },
  })
}

/** E-29：显示图标已在动态图标设置中被删除 → 回退默认并提示 */
const iconRemoved = computed(() => {
  const id = drone.value?.ext.display_icon_id
  return ICON_OPTIONS.find((i) => i.id === id)?.removed === true
})

const iconPath = computed(() => {
  const id = drone.value?.ext.display_icon_id
  const hit = ICON_OPTIONS.find((i) => i.id === id)
  return hit && !hit.removed ? hit.iconPath : ICON_OPTIONS[0].iconPath
})

/** E-28：责任人已在人员台账停用 → 保留原值 + 提示，编辑时不可选 */
const responsiblePerson = computed(() =>
  PERSON_OPTIONS.find((p) => p.id === drone.value?.ext.responsible_person_id),
)

const personOptions = computed(() =>
  PERSON_OPTIONS.filter((p) => !p.disabled).map((p) => ({
    value: p.id,
    label: `${p.name}（${p.org}）`,
  })),
)


// ============================ 实时视频（IS-08 / F-18~F-20 / 7.6）============================

/** 飞行状态是否为「飞行中」—— 视频开放的必要条件，依赖 Q-01 确认枚举 */
const isFlying = computed(() => drone.value?.flight_status_code === 'FLYING')

type VideoUi =
  /** E-49 无视频查看权限，不请求流地址 */
  | 'NO_PERMISSION'
  /** 5.2.4 在线状态变离线 → 立即停止并释放 */
  | 'DEVICE_OFFLINE'
  /** E-46 非飞行中，不请求流地址 */
  | 'NOT_FLYING'
  /** E-47 飞行中但流未就绪 */
  | 'PREPARING'
  /** E-48 断流/超时 */
  | 'INTERRUPTED'
  /** 源未返回可用流 */
  | 'UNAVAILABLE'
  /** E-51 浏览器不支持播放协议 */
  | 'PROTOCOL_UNSUPPORTED'
  /** 可播放但用户尚未点播放 */
  | 'READY'
  | 'PLAYING'

/** 视频区状态判定顺序：权限 → 设备生命周期 → 在线 → 飞行 → 流状态 → 播放态 */
const videoUi = computed<VideoUi>(() => {
  if (!demo.perms.video) return 'NO_PERMISSION'
  if (drone.value?.online_status === 'OFFLINE') return 'DEVICE_OFFLINE'
  if (!isFlying.value) return 'NOT_FLYING'
  if (demo.videoState === 'PREPARING') return 'PREPARING'
  if (demo.videoState === 'INTERRUPTED') return 'INTERRUPTED'
  if (demo.videoState === 'UNAVAILABLE') return 'UNAVAILABLE'
  if (demo.videoState === 'PROTOCOL_UNSUPPORTED') return 'PROTOCOL_UNSUPPORTED'
  return playing.value ? 'PLAYING' : 'READY'
})

const playing = ref(false)
const muted = ref(true)
const retryCount = ref(0)
const videoClockText = ref('')
let videoClock: ReturnType<typeof setInterval> | null = null

/** F-17：起流并写入视频访问审计（E-58）。播放地址由后端签发，不落前端存储（E-57） */
function playVideo() {
  if (!drone.value) return
  playing.value = true
  demo.audit('访问实时视频', drone.value.drone_sn, '后端签发短时效播放凭证并起流')
  startVideoClock()
}

function stopVideo() {
  playing.value = false
  if (videoClock) clearInterval(videoClock)
  videoClock = null
}

function startVideoClock() {
  if (videoClock) clearInterval(videoClock)
  videoClock = setInterval(() => {
    videoClockText.value = fmtDateTime(new Date().toISOString())
  }, 1000)
  videoClockText.value = fmtDateTime(new Date().toISOString())
}

/** F-18：重新连接。自动重连上限 3 次，达上限后仅保留手动入口（E-48） */
function reconnectVideo() {
  if (retryCount.value >= SYS_CONFIG.videoRetryLimit) {
    message.warning(`自动重连已达上限 ${SYS_CONFIG.videoRetryLimit} 次，请手动重试`)
  }
  retryCount.value += 1
  demo.videoState = 'AVAILABLE'
  playVideo()
}

/**
 * 5.2.4 联动：飞行状态离开「飞行中」/ 设备离线 / 权限撤回 →
 * 立即停止拉流并释放连接，不保留伪直播画面（E-53）
 */
watch(
  () => [isFlying.value, drone.value?.online_status, demo.perms.video] as const,
  ([flying, online, canView]) => {
    if (!flying || online === 'OFFLINE' || !canView) stopVideo()
  },
)

// 离开页面立即释放连接（E-53 / 非功能 B-06）
onBeforeUnmount(stopVideo)

// ============================ 位置预览（7.2 E-14/E-15，验收 A-19）============================

const position = computed(() => {
  const base = POSITIONS.find((p) => p.drone_sn === sn.value)
  if (!base) return null
  // 演示控制台可强制位置异常
  if (demo.positionFault === 'NO_COORD') {
    return { ...base, longitude: null, latitude: null, coordinate_system: null }
  }
  if (demo.positionFault === 'UNKNOWN_CRS') return { ...base, coordinate_system: null }
  return base
})

const coordValid = computed(() =>
  isCoordValid(position.value?.longitude ?? null, position.value?.latitude ?? null),
)

/** 有坐标但坐标系未知 → 不与底图叠加，仅显示坐标文本（E-15） */
const crsUnknown = computed(() => coordValid.value && !position.value?.coordinate_system)

/** 可落图 = 坐标合法且坐标系已知 */
const canPlot = computed(() => coordValid.value && !!position.value?.coordinate_system)

/** 示意底图：把经纬度映射到 SVG 视口（不接真实地图服务，纯前端无网络依赖） */
const plotBox = { w: 320, h: 150, pad: 26 }
const plotted = computed(() => {
  if (!canPlot.value) return null
  const lngs = Object.values(CAMP_ANCHOR).map((c) => c.lng)
  const lats = Object.values(CAMP_ANCHOR).map((c) => c.lat)
  const lng0 = Math.min(...lngs, position.value!.longitude!) - 0.03
  const lng1 = Math.max(...lngs, position.value!.longitude!) + 0.03
  const lat0 = Math.min(...lats, position.value!.latitude!) - 0.03
  const lat1 = Math.max(...lats, position.value!.latitude!) + 0.03
  const sx = (lng: number) =>
    plotBox.pad + ((lng - lng0) / (lng1 - lng0)) * (plotBox.w - plotBox.pad * 2)
  const sy = (lat: number) =>
    plotBox.h - plotBox.pad - ((lat - lat0) / (lat1 - lat0)) * (plotBox.h - plotBox.pad * 2)
  return {
    self: { x: sx(position.value!.longitude!), y: sy(position.value!.latitude!) },
    camps: Object.entries(CAMP_ANCHOR).map(([code, c]) => ({
      code,
      name: campName(code),
      x: sx(c.lng),
      y: sy(c.lat),
    })),
  }
})

// ============================ 多站注册关系（F-16 / F-17，验收 A-03）============================

// ============================ 巡检任务（F-22~F-24）============================

const taskStatusFilter = ref<string | undefined>(undefined)
const taskPage = ref({ current: 1, pageSize: 10 })

const allTasks = computed(() => TASKS.filter((t) => t.drone_sn === sn.value))

const filteredTasks = computed(() => {
  if (!taskStatusFilter.value || taskStatusFilter.value === '__all__') return allTasks.value
  return allTasks.value.filter((t) => t.task_status_code === taskStatusFilter.value)
})

const pagedTasks = computed(() => {
  const s = (taskPage.value.current - 1) * taskPage.value.pageSize
  return filteredTasks.value.slice(s, s + taskPage.value.pageSize)
})

const TASK_STATUS_OPTIONS = [
  { value: '__all__', label: '全部' },
  ...TASK_STATUS_DICT.map((d) => ({ value: d.code, label: d.label })),
]

const taskColumns: TableColumnsType = [
  { title: '任务编号', key: 'taskId', width: 190 },
  { title: '任务状态', key: 'status', width: 130 },
  { title: '开始时间', key: 'startedAt', width: 110 },
  { title: '结束时间', key: 'endedAt', width: 110 },
  { title: '已飞时长', key: 'duration', width: 110 },
]

function taskStatusLabel(code: string) {
  return TASK_STATUS_DICT.find((d) => d.code === code)?.label ?? `未知（源值：${code}）`
}

// 任务区筛选变更仅影响任务区，回第 1 页，不影响其他区块（5.2.4）
watch(taskStatusFilter, () => {
  taskPage.value.current = 1
})

// ============================ 页头操作（F-21 / F-25~F-27）============================

/** F-21：跳转实时监控中心，携带 assetType 与 droneId（Q-14 待与该模块 PRD 对齐） */
function goMonitorCenter() {
  if (!demo.perms.monitorCenter) return
  router.push({
    name: 'Placeholder',
    params: { name: '实时监控中心' },
    query: { assetType: 'A_UAV', droneId: drone.value?.drone_id },
  })
}

/** F-22：跳转任务中心并按本机 SN 预筛选 */
function goTaskCenter() {
  router.push({ name: 'Placeholder', params: { name: '任务中心' }, query: { sn: sn.value } })
}

/** F-25 / E-21：停用 —— 必填原因，弹窗列出 4 项影响 */
const disableModalOpen = ref(false)
const disableReason = ref('')
const disableReasonError = computed(() => {
  if (!disableModalOpen.value) return ''
  if (!disableReason.value.trim()) return '请填写停用原因'
  if (disableReason.value.length > 200) return '停用原因不得超过 200 字符'
  return ''
})

function submitDisable() {
  if (disableReasonError.value || !drone.value) return
  demo.disableUav(drone.value.drone_sn, disableReason.value.trim())
  disableModalOpen.value = false
  disableReason.value = ''
  message.success('已停用')
}

/** F-26 / E-22：启用 */
function confirmEnable() {
  Modal.confirm({
    title: '确认启用该无人机？',
    content: '启用后设备将恢复正常使用。',
    okText: '确认启用',
    cancelText: '取消',
    onOk: () => {
      demo.enableUav(sn.value)
      message.success('已启用')
    },
  })
}

/** F-27 / E-23：确认归档 */
function confirmArchive() {
  Modal.confirm({
    title: '确认归档该无人机？',
    width: 520,
    content:
      '归档后：① 不可在列表与大屏查看，仅在归档库可见；② 源记录快照与操作审计永久保留，不物理删除；③ 若源端后续恢复该记录，可从归档库恢复。',
    okText: '确认归档',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      demo.archiveUav(sn.value)
      message.success('已归档')
    },
  })
}

/** 「更多」菜单可用项：按接入状态与权限计算（4.2 前置条件） */
const canDisable = computed(
  () => demo.perms.disable && drone.value?.management_status === 'NORMAL',
)
const canEnable = computed(() => demo.perms.disable && drone.value?.management_status === 'DISABLED')
const canArchive = computed(
  () => demo.perms.archive && drone.value?.management_status === 'DISABLED',
)

/** E-28：当前地面站未在台账中登记 → 不提供跳转 */
const GROUND_STATIONS_IN_LEDGER = ['Jaouro-GS-01', 'Koulele-GS-1', 'Dibeilla-GS-1', 'Jaouro-GS-02']
const groundStationInLedger = computed(() =>
  GROUND_STATIONS_IN_LEDGER.includes(drone.value?.ground_station_name ?? ''),
)
</script>

<template>
  <!-- E-41 / E-42：不存在 / 已归档 / 无权访问 → 全页替换，禁止用缓存数据冒充 -->
  <PageContainer v-if="blockedReason" title="装备管理 / A 类无人机管理">
    <PanelCard>
      <div class="of-blocked">
        <ExclamationCircleOutlined class="of-blocked__icon" />
        <div>{{ blockedReason }}</div>
        <a-button type="primary" @click="router.push({ name: 'AUavList' })">返回列表</a-button>
      </div>
    </PanelCard>
  </PageContainer>

  <PageContainer v-else :title="`装备管理 / A 类无人机管理 / ${drone?.aircraft_name ?? sn}`">
    <!-- ============ 页头 ============ -->
    <PanelCard class="of-head">
      <div class="of-head__row">
        <div class="of-head__main">
          <span class="of-head__name">{{ drone?.aircraft_name ?? DASH }}</span>
          <a-tooltip title="大屏显示图标">
            <img :src="iconPath" alt="设备图标" class="of-head__icon-img" />
          </a-tooltip>
          <span class="of-head__sn">
            SN: <code>{{ sn }}</code>
            <a-tooltip title="复制 SN">
              <CopyOutlined class="of-head__copy" @click="copySn" />
            </a-tooltip>
          </span>

          <!-- 接入状态标签 -->
          <StatusTag v-if="isArchived" tone="mute" variant="solid">已归档</StatusTag>
          <StatusTag
            v-else-if="drone?.management_status === 'DISABLED'"
            tone="mute"
            variant="solid"
          >
            已停用
          </StatusTag>
          <StatusTag v-if="drone?.management_status === 'DISABLED'" tone="mute">已停用</StatusTag>
          <StatusTag v-else-if="drone?.management_status === 'ARCHIVED'" tone="mute">已归档</StatusTag>
          <StatusTag v-else tone="ok">正常</StatusTag>
        </div>

        <div class="of-head__tools">
          <a-tooltip :title="editing ? '请先保存或取消编辑' : undefined">
            <a-button :disabled="editing || isArchived" :loading="loading" @click="onRefresh">
              <template #icon><ReloadOutlined /></template>
              刷新数据
            </a-button>
          </a-tooltip>

          <a-tooltip :title="demo.perms.monitorCenter ? undefined : '无实时监控中心访问权限'">
            <a-button :disabled="!demo.perms.monitorCenter" @click="goMonitorCenter">
              前往实时监控中心
            </a-button>
          </a-tooltip>

          <a-dropdown v-if="!isArchived">
            <a-button>更多 ▾</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item :disabled="!canDisable" @click="disableModalOpen = true">
                  停用
                </a-menu-item>
                <a-menu-item v-if="canEnable" @click="confirmEnable">启用</a-menu-item>
                <a-menu-item :disabled="!canArchive" @click="confirmArchive">确认归档</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>

          <a-button @click="router.push({ name: 'AUavList' })">返回列表</a-button>
        </div>
      </div>

      <!-- 状态摘要行 -->
      <div class="of-head__summary">
        <span class="of-head__field">
          飞行状态：
          <FlightStatusTag
            :code="drone?.flight_status_code ?? null"
            show-pending
          />
        </span>
        <span class="of-head__sep">│</span>
        <span class="of-head__field">
          在线状态：
          <OnlineDot
            :status="drone?.online_status ?? 'UNKNOWN'"
            :source="drone?.online_status_source"
            :not-realtime="demo.wsState !== 'CONNECTED'"
          />
        </span>
        <span class="of-head__sep">│</span>
        <span class="of-head__field">
          源更新：
          <a-tooltip :title="fmtWithTz(sourceRecord?.last_updated_at)">
            <span>{{ fmtDateTime(sourceRecord?.last_updated_at) }}</span>
          </a-tooltip>
          <span class="of-head__ago">（{{ fmtAgo(sourceRecord?.last_updated_at) }}）</span>
        </span>
        <span class="of-head__sep">│</span>
        <span class="of-head__field of-head__field--muted">
          最后刷新：{{ fmtDateTime(refreshedAt) }}
        </span>
      </div>

      <!-- 已归档 / 已停用 说明 -->
      <div v-if="isArchived" class="of-head__note of-head__note--mute">
        已于 {{ fmtDateTime(drone?.archived_at) }} 由 {{ drone?.archived_by }} 归档。
        源记录快照与操作审计永久保留，全部编辑与操作入口已隐藏。
      </div>
      <div
        v-else-if="drone?.management_status === 'DISABLED'"
        class="of-head__note of-head__note--mute"
      >
        已于 {{ fmtDateTime(drone.disabled_at) }} 由 {{ drone.disabled_by }} 停用，
        原因：{{ drone.disabled_reason }}
      </div>

      <!-- E-17：源更新时间缺失提示 -->
      <div v-if="!sourceRecord?.last_updated_at" class="of-head__note of-head__note--warn">
        数据更新时间未知
      </div>
    </PanelCard>

    <!-- ============ 主体两栏 ============ -->
    <div class="of-cols">
      <div class="of-cols__left">
        <!-- 基础信息（源系统，全部只读；编辑态下不置灰不受影响 5.2.4） -->
        <PanelCard class="of-block">
          <div class="of-block__head">
            <span class="of-block__title">基础信息</span>
            <StatusTag tone="info">源系统 · 只读</StatusTag>
          </div>

          <dl class="of-kv">
            <dt>飞机名称</dt>
            <dd>
              {{ drone?.aircraft_name ?? DASH }}
            </dd>

            <dt>SN</dt>
            <dd><code>{{ sn }}</code></dd>

            <dt>飞行状态</dt>
            <dd>
              <FlightStatusTag
                :code="drone?.flight_status_code ?? null"
              />
            </dd>

            <dt>在线状态</dt>
            <dd>
              <OnlineDot
                :status="drone?.online_status ?? 'UNKNOWN'"
                :source="drone?.online_status_source"
              />
            </dd>

            <dt>
              停入时间
              <a-tooltip title="进入机场/停机位时间">
                <InfoCircleOutlined class="of-kv__info" />
              </a-tooltip>
            </dt>
            <dd>
              {{ fmtDateTime(sourceRecord?.parked_at) }}
            </dd>

            <dt>
              最近飞行时间
              <a-tooltip title="最近起飞的时间">
                <InfoCircleOutlined class="of-kv__info" />
              </a-tooltip>
            </dt>
            <dd>
              {{ fmtDateTime(drone?.last_flight_at) }}
            </dd>

            <dt>当前地面站</dt>
            <dd>
              <template v-if="!drone?.ground_station_name">{{ DASH }}</template>
              <!-- E-30：台账中不存在则不提供跳转，仅悬浮说明 -->
              <a-tooltip v-else-if="!groundStationInLedger" title="该地面站未在台账中登记">
                <span class="of-kv__plain">{{ drone.ground_station_name }}</span>
              </a-tooltip>
              <a-button
                v-else
                type="link"
                class="of-kv__link"
                @click="router.push({ name: 'Placeholder', params: { name: 'A 类地面站管理' } })"
              >
                {{ drone.ground_station_name }}
              </a-button>
            </dd>

            <dt>当前所在营地</dt>
            <dd>
              <a-tooltip
                :title="
                  drone?.ground_station_name
                    ? `由当前地面站 ${drone.ground_station_name} 推导`
                    : undefined
                "
              >
                <span>{{ currentCampLabel }}</span>
              </a-tooltip>
            </dd>

            <dt>源更新时间</dt>
            <dd>
              <a-tooltip :title="fmtWithTz(sourceRecord?.last_updated_at)">
                <span>{{ fmtDateTime(sourceRecord?.last_updated_at) }}</span>
              </a-tooltip>
            </dd>

            <dt>平台同步时间</dt>
            <dd>{{ fmtDateTime(sourceRecord?.last_updated_at) }}</dd>
          </dl>

          <!-- 累计飞行数据KPI区 -->
          <div class="of-flight-stats">
            <div class="of-flight-stats__item">
              <div class="of-flight-stats__label">总架次</div>
              <div class="of-flight-stats__value">{{ fmtSorties(sourceRecord?.total_sorties) }}</div>
            </div>
            <div class="of-flight-stats__item">
              <div class="of-flight-stats__label">总里程</div>
              <div class="of-flight-stats__value">{{ fmtKm(sourceRecord?.total_flight_distance_m) }}</div>
            </div>
            <div class="of-flight-stats__item">
              <div class="of-flight-stats__label">总航时</div>
              <div class="of-flight-stats__value">{{ fmtDuration(sourceRecord?.total_flight_duration_sec) }}</div>
            </div>
          </div>
          <div class="of-flight-stats__time">
            数据更新：{{ fmtDateTime(sourceRecord?.last_updated_at) || '未知' }}
          </div>

          <div class="of-block__foot">
            展示时区：{{ SYS_CONFIG.timezone }}
          </div>
        </PanelCard>

        <!-- 平台扩展信息（可编辑，F-14~F-16，验收 A-07/A-08） -->
        <PanelCard class="of-block">
          <div class="of-block__head">
            <span class="of-block__title">平台扩展信息</span>
            <StatusTag tone="pending">平台自有 · 同步不覆盖</StatusTag>
            <template v-if="!isArchived && demo.perms.editExt && !editing">
              <a-button type="link" size="small" @click="startEdit">编辑</a-button>
            </template>
            <template v-if="editing">
              <a-button
                type="primary"
                size="small"
                :disabled="!canSave"
                @click="onSave"
              >
                保存
              </a-button>
              <a-button size="small" @click="onCancelEdit">取消</a-button>
            </template>
          </div>

          <!-- 只读视图 -->
          <dl v-if="!editing" class="of-kv">
            <dt>可服务营地</dt>
            <dd>
              <span v-for="c in drone?.ext.serviceable_camps" :key="c">
                {{ campName(c) }}
              </span>
            </dd>

            <dt>显示图标</dt>
            <dd>
              <img :src="iconPath" alt="显示图标" class="of-kv__icon-img" />
              <!-- E-29：图标已被删除 → 已回退默认 -->
              <a-tooltip v-if="iconRemoved" title="原图标已被删除，已回退默认图标">
                <WarningOutlined class="of-kv__warn" />
              </a-tooltip>
            </dd>

            <dt>责任单位</dt>
            <dd>{{ drone?.ext.responsible_org || DASH }}</dd>

            <dt>责任人</dt>
            <dd>
              {{ responsiblePerson?.name ?? DASH }}
              <!-- E-28：已在人员台账停用 -->
              <a-tooltip
                v-if="responsiblePerson?.disabled"
                title="该人员已在人员台账停用，请编辑后更换"
              >
                <WarningOutlined class="of-kv__warn" />
              </a-tooltip>
            </dd>

            <dt>是否大屏展示</dt>
            <dd>{{ drone?.ext.show_on_bigscreen ? '是' : '否' }}</dd>

            <dt>运维备注</dt>
            <dd class="of-kv__remark">{{ drone?.ext.ops_remark || DASH }}</dd>
          </dl>

          <!-- 编辑表单 -->
          <div v-else class="of-ext-form">
            <div class="of-ext-form__row">
              <label class="of-ext-form__label">可服务营地 <span class="of-ext-form__req">*</span></label>
              <div class="of-ext-form__ctrl">
                <a-select
                  v-model:value="form.serviceable_camps"
                  mode="multiple"
                  placeholder="至少选择 1 个营地"
                  style="min-width: 280px"
                  :options="CAMP_DICT.map((c) => ({ value: c.code, label: c.name }))"
                />
                <div v-if="campsError" class="of-ext-form__err">{{ campsError }}</div>
              </div>
            </div>

            <div class="of-ext-form__row">
              <label class="of-ext-form__label">显示图标</label>
              <a-select
                v-model:value="(form as any).display_icon_id"
                allow-clear
                style="width: 200px"
                :options="ICON_OPTIONS.filter((i) => !i.removed).map((i) => ({ value: i.id, label: i.label }))"
              />
            </div>

            <div class="of-ext-form__row">
              <label class="of-ext-form__label">责任单位</label>
              <a-input v-model:value="form.responsible_org" :maxlength="50" style="width: 240px" />
            </div>

            <div class="of-ext-form__row">
              <label class="of-ext-form__label">责任人</label>
              <a-select
                v-model:value="(form as any).responsible_person_id"
                allow-clear
                style="width: 200px"
                :options="personOptions"
              />
            </div>

            <div class="of-ext-form__row">
              <label class="of-ext-form__label">是否大屏展示</label>
              <a-switch v-model:checked="form.show_on_bigscreen" />
            </div>

            <div class="of-ext-form__row of-ext-form__row--textarea">
              <label class="of-ext-form__label">运维备注</label>
              <div class="of-ext-form__ctrl">
                <a-textarea
                  v-model:value="form.ops_remark"
                  :maxlength="500"
                  :rows="3"
                  style="width: 100%"
                />
                <div class="of-ext-form__count">{{ form.ops_remark.length }}/500</div>
              </div>
            </div>
          </div>

          <div class="of-block__foot">
            末次修改：{{ fmtDateTime(drone?.ext.updated_at) }} · {{ drone?.ext.updated_by }}
          </div>
        </PanelCard>
      </div><!-- /of-cols__left -->

      <div class="of-cols__right">
        <!-- 实时视频（IS-08，验收 A-17/A-18） -->
        <PanelCard class="of-block of-video-card">
          <div class="of-block__head">
            <span class="of-block__title">实时视频</span>
          </div>

          <!-- 不可播放的各种占位 -->
          <div v-if="videoUi !== 'PLAYING' && videoUi !== 'READY'" class="of-video__placeholder">
            <template v-if="videoUi === 'NO_PERMISSION'">
              <span class="of-video__msg">暂无实时视频查看权限</span>
            </template>
            <template v-else-if="videoUi === 'DEVICE_OFFLINE'">
              <span class="of-video__msg">设备已离线</span>
            </template>
            <template v-else-if="videoUi === 'NOT_FLYING'">
              <span class="of-video__msg">
                无人机当前未飞行，实时视频仅在飞行中可查看
              </span>
            </template>
            <template v-else-if="videoUi === 'PREPARING'">
              <span class="of-video__msg">视频流准备中…</span>
              <a-button type="primary" size="small" @click="reconnectVideo">重试</a-button>
            </template>
            <template v-else-if="videoUi === 'INTERRUPTED'">
              <span class="of-video__msg of-video__msg--warn">视频断流</span>
              <a-button
                type="primary"
                size="small"
                :disabled="retryCount >= SYS_CONFIG.videoRetryLimit"
                @click="reconnectVideo"
              >
                重新连接（{{ SYS_CONFIG.videoRetryLimit - retryCount }} 次剩余）
              </a-button>
            </template>
            <template v-else-if="videoUi === 'UNAVAILABLE'">
              <span class="of-video__msg of-video__msg--warn">视频流暂不可用</span>
            </template>
            <template v-else-if="videoUi === 'PROTOCOL_UNSUPPORTED'">
              <span class="of-video__msg of-video__msg--warn">
                当前浏览器不支持该视频协议，请更换受支持浏览器或前往实时监控中心查看
              </span>
            </template>
          </div>

          <!-- 可播放（READY / PLAYING） -->
          <div v-else class="of-video">
            <div class="of-video__screen" :class="{ 'of-video__screen--playing': playing }">
              <!-- 模拟画面：扫描线动效（原型无真实流，见 Q-12） -->
              <div v-if="playing" class="of-video__scanline" />
              <div class="of-video__noise" />
              <div class="of-video__overlay">
                <span class="of-video__drone-name">{{ drone?.aircraft_name ?? sn }}</span>
                <span class="of-video__clock">{{ videoClockText }}</span>
              </div>
            </div>
            <!-- 播放器控制条 -->
            <div class="of-video__controls">
              <a-button
                type="link"
                size="small"
                @click="playing ? stopVideo() : playVideo()"
              >
                {{ playing ? '⏸ 暂停' : '▶ 播放' }}
              </a-button>
              <a-button type="link" size="small" @click="muted = !muted">
                {{ muted ? '🔇' : '🔊' }}
              </a-button>
              <div class="of-video__progress">
                <div class="of-video__track" />
              </div>
              <a-tooltip title="全屏（F-20，仅前端行为）">
                <a-button type="link" size="small">⛶</a-button>
              </a-tooltip>
            </div>
          </div>
        </PanelCard>

        <!-- 位置预览（验收 A-19） -->
        <PanelCard class="of-block">
          <div class="of-block__head">
            <span class="of-block__title">位置预览</span>
            <span class="of-block__sub">
              {{ position?.position_type ? POSITION_TYPE_LABEL[position.position_type] : '无数据' }}
            </span>
          </div>

          <!-- 无坐标 → 文本卡片，不渲染空白地图（E-14，验收 A-19） -->
          <div v-if="!coordValid" class="of-position__empty">
            <div class="of-position__label">当前地面站</div>
            <div class="of-position__val">{{ drone?.ground_station_name ?? DASH }}</div>
            <div class="of-position__label">当前营地</div>
            <div class="of-position__val">{{ currentCampLabel }}</div>
            <div class="of-position__tip">
              {{ position ? '位置数据异常（经纬度缺失或超出合法范围）' : '暂无可用坐标' }}
            </div>
          </div>

          <!-- 坐标系未知 → 仅显示坐标文本（E-15） -->
          <div v-else-if="crsUnknown" class="of-position__no-map">
            <code class="of-position__coords">
              {{ position?.latitude?.toFixed(5) }}°N / {{ position?.longitude?.toFixed(5) }}°E
            </code>
            <div class="of-position__tip">坐标系未知，暂不落图（E-15）</div>
          </div>

          <!-- SVG 示意底图落点（纯前端，无外部地图服务）-->
          <div v-else-if="canPlot && plotted" class="of-position__map">
            <svg
              class="of-position__svg"
              :viewBox="`0 0 ${plotBox.w} ${plotBox.h}`"
              preserveAspectRatio="xMidYMid meet"
            >
              <!-- 营地示意框 -->
              <g v-for="camp in plotted.camps" :key="camp.code">
                <circle :cx="camp.x" :cy="camp.y" r="14" fill="rgba(20,129,166,0.15)" stroke="#1481a6" stroke-width="0.8" />
                <text :x="camp.x" :y="camp.y + 5" text-anchor="middle" font-size="7" fill="#57c4f7">
                  {{ camp.name.slice(0, 6) }}
                </text>
              </g>
              <!-- 位置点 -->
              <circle :cx="plotted.self.x" :cy="plotted.self.y" r="5" fill="#52c41a" />
              <circle :cx="plotted.self.x" :cy="plotted.self.y" r="9" fill="none" stroke="#52c41a" stroke-width="1" opacity="0.5" />
            </svg>

            <div class="of-position__meta">
              <span>
                {{ position?.latitude?.toFixed(5) }}°N /
                {{ position?.longitude?.toFixed(5) }}°E
                <a-tooltip v-if="position?.altitude_m" :title="`海拔/高度: ${position.altitude_m}m`">
                  <InfoCircleOutlined />
                </a-tooltip>
              </span>
              <span class="of-position__upd">
                {{ fmtDateTime(position?.position_updated_at) }}
                （{{ position?.coordinate_system }}）
              </span>
            </div>
          </div>
        </PanelCard>
      </div><!-- /of-cols__right -->
    </div><!-- /of-cols -->

    <!-- ============ 巡检任务（F-22~F-24）============ -->
    <PanelCard class="of-block">
      <div class="of-block__head">
        <span class="of-block__title">巡检任务</span>
        <a-select
          v-model:value="taskStatusFilter"
          :options="TASK_STATUS_OPTIONS"
          allow-clear
          placeholder="全部状态"
          style="width: 130px"
          size="small"
        />
        <a-tooltip v-if="!demo.perms.monitorCenter" title="无任务中心访问权限">
          <a-button type="link" size="small" disabled>查看全部任务</a-button>
        </a-tooltip>
        <a-button v-else type="link" size="small" @click="goTaskCenter">查看全部任务</a-button>
      </div>

      <a-table
        class="of-table of-task-table"
        :columns="taskColumns"
        :data-source="pagedTasks"
        :pagination="{
          current: taskPage.current,
          pageSize: taskPage.pageSize,
          total: filteredTasks.length,
          showTotal: (t: number) => `共 ${t} 条`,
          onChange: (p: number, s: number) => (taskPage = { current: p, pageSize: s }),
        }"
        row-key="task_pk"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'taskId'">
            <code class="of-task__id">{{ record.source_task_id }}</code>
          </template>
          <template v-else-if="column.key === 'status'">
            <StatusTag :tone="record.task_status_code === 'EXECUTING' ? 'ok' : record.task_status_code === 'FAILED' ? 'danger' : 'info'">
              {{ taskStatusLabel(record.task_status_code) }}
            </StatusTag>
          </template>
          <template v-else-if="column.key === 'startedAt'">
            {{ fmtHm(record.started_at) }}
          </template>
          <template v-else-if="column.key === 'endedAt'">
            <a-tooltip
              v-if="isTimeInverted(record.started_at, record.ended_at)"
              title="结束时间早于开始时间，原样展示，不自动修正（E-13）"
            >
              <span class="of-abnormal">{{ fmtHm(record.ended_at) }} ⚠</span>
            </a-tooltip>
            <template v-else>{{ fmtHm(record.ended_at) }}</template>
          </template>
          <template v-else-if="column.key === 'duration'">
            {{ fmtDuration(record.flown_duration_sec) }}
          </template>
        </template>
      </a-table>
    </PanelCard>

    <!-- 停用弹窗（E-21） -->
    <FormModal
      v-model:open="disableModalOpen"
      title="确认停用该无人机？"
      @ok="submitDisable"
      @cancel="disableReason = ''"
    >
      <div class="of-confirm">
        <p>停用后将产生以下影响：</p>
        <ul>
          <li>从列表默认视图移除（勾选「显示已停用」可见）</li>
          <li>从大屏全部图层移除</li>
          <li>不再计入「无人机在线总数」</li>
          <li>历史任务与统计数据保留</li>
        </ul>
      </div>
      <a-form-item label="停用原因" required :colon="false">
        <a-textarea
          v-model:value="disableReason"
          :maxlength="200"
          :rows="3"
          placeholder="请输入停用原因（必填）"
        />
        <div v-if="disableReasonError" class="of-ext-form__err">{{ disableReasonError }}</div>
        <div class="of-ext-form__count">{{ disableReason.length }}/200</div>
      </a-form-item>
    </FormModal>
  </PageContainer>
</template>

<style scoped lang="scss">
// 访问受阻全页提示
.of-blocked {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-3);
  align-items: center;
  padding: 60px 0;

  &__icon {
    font-size: 40px;
    color: var(--of-color-error);
  }
}

// 页头卡片
.of-head {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-2);

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-3);
    align-items: center;
    justify-content: space-between;
  }

  &__main {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-2) var(--of-spacing-3);
    align-items: center;
  }

  &__name {
    font-size: var(--of-font-size-lg);
    font-weight: var(--of-font-weight-medium);
  }

  &__icon {
    font-size: 20px;
    cursor: help;
  }

  &__icon-img {
    width: 24px;
    height: 24px;
    vertical-align: middle;
    cursor: help;
  }

  &__sn {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-tertiary);

    code {
      font-family: 'SFMono-Regular', Consolas, monospace;
    }
  }

  &__copy {
    color: var(--of-text-quaternary);
    cursor: pointer;

    &:hover {
      color: var(--of-color-link);
    }
  }

  &__tools {
    display: flex;
    flex-shrink: 0;
    gap: var(--of-spacing-2);
    align-items: center;
  }

  &__summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-2) var(--of-spacing-3);
    align-items: center;
    padding-top: var(--of-spacing-2);
    border-top: var(--of-border-width) solid var(--of-border-table);
  }

  &__field {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-size: var(--of-font-size-xs);

    &--muted {
      color: var(--of-text-quaternary);
    }
  }

  &__sep {
    color: var(--of-border-table);
  }

  &__ago {
    color: var(--of-text-quaternary);
    font-size: var(--of-font-size-xs);
  }

  &__origin {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
  }

  &__note {
    padding: 6px 10px;
    font-size: var(--of-font-size-xs);
    border-left: 3px solid transparent;
    border-radius: var(--of-radius-sm);

    &--warn {
      color: var(--of-color-warning);
      background: rgba(250, 173, 20, 0.08);
      border-left-color: var(--of-color-warning);
    }

    &--danger {
      color: var(--of-color-error);
      background: rgba(255, 102, 102, 0.08);
      border-left-color: var(--of-color-error);
    }

    &--mute {
      color: var(--of-text-secondary);
      background: rgba(255, 255, 255, 0.05);
      border-left-color: rgba(255, 255, 255, 0.2);
    }
  }
}

// 告警条（复用列表页同名样式，scoped 下各页独立）
.of-alert {
  display: flex;
  gap: var(--of-spacing-2);
  align-items: center;
  border-left: 3px solid transparent;

  &__icon { flex-shrink: 0; font-size: 16px; }
  &__text { flex: 1 1 auto; }

  &--warn {
    border-left-color: var(--of-color-warning);
    .of-alert__icon { color: var(--of-color-warning); }
  }

  &--danger {
    border-left-color: var(--of-color-error);
    .of-alert__icon { color: var(--of-color-error); }
  }
}

// 双栏布局
.of-cols {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: var(--of-spacing-4);
  align-items: start;

  &__left,
  &__right {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-4);
  }
}

// 区块通用
.of-block {
  &__head {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-2);
    align-items: center;
    padding: var(--of-spacing-3) var(--of-spacing-3) var(--of-spacing-3) var(--of-spacing-3);
    margin: calc(var(--of-spacing-4) * -1) calc(var(--of-spacing-4) * -1) var(--of-spacing-3);
    background: rgba(255, 255, 255, 0.03);
    border-bottom: var(--of-border-width) solid var(--of-border-table);
  }

  &__title {
    flex: 1;
    font-size: var(--of-font-size-base);
    font-weight: var(--of-font-weight-medium);
  }

  &__sub {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
  }

  &__foot {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-2);
    align-items: center;
    padding-top: var(--of-spacing-3);
    margin-top: var(--of-spacing-3);
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
    border-top: var(--of-border-width) solid var(--of-border-table);
  }
}

// KV 展示
.of-kv {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px 16px;
  margin: 0;

  dt {
    display: flex;
    gap: 4px;
    align-items: center;
    color: var(--of-text-secondary);
    font-size: var(--of-font-size-xs);
  }

  dd {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    margin: 0;
    font-size: var(--of-font-size-base);

    code {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 13px;
    }
  }

  &__warn { color: var(--of-color-warning); cursor: help; }
  &__info { color: var(--of-text-quaternary); cursor: help; }
  &__link { padding: 0; }
  &__plain { color: var(--of-text-primary); }

  &__icon-img {
    width: 20px;
    height: 20px;
    vertical-align: middle;
  }

  &__remark {
    white-space: pre-wrap;
    word-break: break-all;
  }
}

// 扩展信息编辑表单
.of-ext-form {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-3);

  &__row {
    display: flex;
    gap: var(--of-spacing-3);
    align-items: flex-start;

    &--textarea { align-items: stretch; }
  }

  &__label {
    flex-shrink: 0;
    width: 90px;
    padding-top: 5px;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-secondary);
    text-align: right;
  }

  &__ctrl { flex: 1; }

  &__req { color: var(--of-color-error); }

  &__err {
    margin-top: 2px;
    font-size: var(--of-font-size-xs);
    color: var(--of-color-error);
  }

  &__hint {
    display: flex;
    gap: var(--of-spacing-2);
    align-items: center;
    margin-top: 4px;
  }

  &__count {
    margin-top: 2px;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
    text-align: right;
  }
}

// 视频
.of-video-card { min-height: 280px; }

.of-video {
  &__placeholder {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-3);
    align-items: center;
    justify-content: center;
    min-height: 200px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: var(--of-radius-base);
  }

  &__msg {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-tertiary);
    text-align: center;

    &--warn { color: var(--of-color-warning); }
  }

  &__screen {
    position: relative;
    height: 190px;
    overflow: hidden;
    background: #000;
    border-radius: var(--of-radius-base);
  }

  &__noise {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.03) 2px,
      rgba(255, 255, 255, 0.03) 4px
    );
  }

  &__screen--playing &__noise {
    background: linear-gradient(135deg, #0a1a22 25%, #0d2436 50%, #0a1a22 75%);
  }

  &__scanline {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: rgba(87, 196, 247, 0.4);
    box-shadow: 0 0 8px rgba(87, 196, 247, 0.6);
    animation: scanline 3s linear infinite;
  }

  @keyframes scanline {
    0% { top: 0; }
    100% { top: 100%; }
  }

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    font-size: var(--of-font-size-xs);
    color: rgba(255, 255, 255, 0.7);
    background: linear-gradient(rgba(0,0,0,0.5), transparent);
  }

  &__controls {
    display: flex;
    gap: var(--of-spacing-1);
    align-items: center;
    padding: 6px 0 0;
  }

  &__progress { flex: 1; }

  &__track {
    height: 3px;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 2px;
  }
}

// 位置预览
.of-position {
  &__empty,
  &__no-map {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--of-spacing-3);
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--of-radius-base);
  }

  &__label {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
  }

  &__val {
    font-size: var(--of-font-size-base);
  }

  &__tip {
    margin-top: 4px;
    font-size: var(--of-font-size-xs);
    color: var(--of-color-warning);
  }

  &__coords {
    font-family: 'SFMono-Regular', Consolas, monospace;
    color: var(--of-text-primary);
  }

  &__map {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-2);
  }

  &__svg {
    width: 100%;
    height: 140px;
    background: rgba(14, 22, 32, 0.8);
    border-radius: var(--of-radius-base);

    text { fill: #57c4f7; }
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: var(--of-font-size-xs);
  }

  &__upd { color: var(--of-text-quaternary); }
}

// 基础信息卡片底部的累计飞行数据KPI区
.of-flight-stats {
  display: flex;
  gap: var(--of-spacing-4);
  padding: var(--of-spacing-4) 0 var(--of-spacing-3);
  margin-top: var(--of-spacing-3);
  border-top: var(--of-border-width) solid var(--of-border-modal);

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-2);
    text-align: center;
  }

  &__label {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
  }

  &__value {
    font-size: 24px;
    font-weight: var(--of-font-weight-medium);
    color: var(--of-color-accent-ice);
  }

  &__time {
    padding: var(--of-spacing-2) 0;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-tertiary);
    text-align: center;
  }
}

// 任务表格
.of-task-table {
  :deep(.ant-table-thead > tr > th) {
    padding: 10px 16px !important;
    text-align: center !important;
    vertical-align: middle;
  }

  :deep(.ant-table-tbody > tr > td) {
    height: auto;
    padding: 10px 16px !important;
    text-align: center !important;
    vertical-align: middle;
  }
}

// 数据异常
.of-abnormal { color: var(--of-color-error); }

// 任务 ID 等宽
.of-task__id {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
}

// 停用弹窗说明
.of-confirm {
  ul { padding-left: 20px; }
  li { margin: 4px 0; font-size: var(--of-font-size-xs); }
}
</style>




