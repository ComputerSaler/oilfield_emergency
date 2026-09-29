<script setup lang="ts">
/**
 * A 类无人机管理 —— 列表页
 * PRD IS-01/IS-02/IS-06/IS-07、F-01~F-09
 *
 * 页面布局（PRD 5.1.1）：
 *   面包屑标题条 → WS 断开告警条（条件）
 *   → 筛选区 → 数据表格（含行标签）→ 分页
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  CopyOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { CAMP_DICT, FLIGHT_STATUS_DICT } from '@/mock/aUav'
import { normalize, type LogicalUav } from '@/mock/aUavNormalize'
import { useAUavDemoStore } from '@/stores/aUavDemo'
import { fmtListTime, fmtDateTime, fmtWithTz, fmtKm, fmtDuration, fmtSorties, truncate, DASH } from '@/utils/aUavFormat'

const router = useRouter()
const demo = useAUavDemoStore()

// ============================ 查询条件 ============================

const query = reactive({
  sn: '',
  name: '',
  flightStatus: undefined as string | undefined,
  onlineStatus: undefined as string | undefined,
  camp: undefined as string | undefined,
  accessStatus: undefined as string | undefined,
  showDisabled: false,
})

const isQueryDirty = computed(
  () =>
    query.sn || query.name || query.flightStatus || query.onlineStatus ||
    query.camp || query.accessStatus || query.showDisabled,
)

const FLIGHT_STATUS_OPTIONS = [
  { value: '__all__', label: '全部' },
  ...FLIGHT_STATUS_DICT.map((d) => ({ value: d.code, label: d.label })),
  { value: '__unknown__', label: '未知' },
]

const ONLINE_OPTIONS = [
  { value: '__all__', label: '全部' },
  { value: 'ONLINE', label: '在线' },
  { value: 'OFFLINE', label: '离线' },
  { value: 'UNKNOWN', label: '未知' },
]

const CAMP_OPTIONS = [
  { value: '__all__', label: '全部' },
  ...CAMP_DICT.map((c) => ({ value: c.code, label: c.name })),
]

const ACCESS_OPTIONS = [
  { value: '__all__', label: '全部' },
  { value: 'NORMAL', label: '正常' },
  { value: 'DISABLED', label: '已停用' },
]

// ============================ 数据层 ============================

const loading = ref(false)
const page = ref({ current: 1, pageSize: 20 })

/** 运行数据转换（真实环境：REST 调用） */
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

const filtered = computed(() => {
  if (demo.listLoadState !== 'OK') return []
  return allDrones.value.filter((d) => {
    // 接入状态过滤（PRD 3.2「列表默认可见」列）
    // 已归档 → 仅归档库可见；源端已删除 → 仅待归档清单可见
    // 已停用 → 需勾选「显示已停用」（F-03）
    const s = d.management_status
    if (s === 'ARCHIVED') return false
    if (s === 'DISABLED' && !query.showDisabled) return false

    // 筛选项（F-01）
    const snQ = query.sn.trim().replace(/[<>]/g, '')
    if (snQ && !d.drone_sn.toLowerCase().includes(snQ.toLowerCase())) return false
    const nameQ = query.name.trim()
    if (nameQ && !(d.aircraft_name ?? '').toLowerCase().includes(nameQ.toLowerCase())) return false

    if (query.flightStatus && query.flightStatus !== '__all__') {
      if (query.flightStatus === '__unknown__') {
        if (d.flight_status_code !== null && FLIGHT_STATUS_DICT.some((x) => x.code === d.flight_status_code)) return false
      } else {
        if (d.flight_status_code !== query.flightStatus) return false
      }
    }
    if (query.onlineStatus && query.onlineStatus !== '__all__') {
      if (d.online_status !== query.onlineStatus) return false
    }
    // 营地筛选：命中规则为「可服务营地集合包含所选营地」（A-07，不是当前所在营地）
    if (query.camp && query.camp !== '__all__') {
      if (!d.ext.serviceable_camps.includes(query.camp)) return false
    }
    if (query.accessStatus && query.accessStatus !== '__all__') {
      if (d.management_status !== query.accessStatus) return false
    }
    return true
  })
})

const paged = computed(() => {
  const s = (page.value.current - 1) * page.value.pageSize
  return filtered.value.slice(s, s + page.value.pageSize)
})

// ============================ 操作 ============================

function onSearch() {
  loading.value = true
  page.value.current = 1
  setTimeout(() => (loading.value = false), 300)
}

function onReset() {
  query.sn = ''
  query.name = ''
  query.flightStatus = undefined
  query.onlineStatus = undefined
  query.camp = undefined
  query.accessStatus = undefined
  query.showDisabled = false
  page.value.current = 1
  onSearch()
}

async function copySn(sn: string) {
  try {
    await navigator.clipboard.writeText(sn)
    message.success('已复制', 2)
  } catch {
    message.warning('复制失败，请手动选中 SN 文字后复制')
  }
}

function goDetail(sn: string) {
  router.push({ name: 'AUavDetail', params: { sn } })
}

// ============================ 归档库（F-27 / F-28）============================

const archiveDrawerOpen = ref(false)
const archivedList = computed(() =>
  allDrones.value.filter((d) => d.management_status === 'ARCHIVED'),
)

const archivedColumns: TableColumnsType = [
  { title: '名称', dataIndex: 'aircraft_name', key: 'name' },
  { title: 'SN', dataIndex: 'drone_sn', key: 'sn', width: 100 },
  { title: '归档时间', key: 'archivedAt', width: 170 },
  { title: '归档人', dataIndex: 'archived_by', key: 'archivedBy', width: 100 },
  { title: '操作', key: 'action', width: 140 },
]

/** 从归档库恢复（F-27 / E-26） */
function confirmRestore(d: LogicalUav) {
  Modal.confirm({
    title: '确认恢复该无人机？',
    content: '恢复后管理状态将置为"正常"，设备将重新出现在列表中。',
    okText: '确认恢复',
    cancelText: '取消',
    onOk: () => {
      demo.restoreUav(d.drone_sn)
      message.success('已恢复')
    },
  })
}

// ============================ WS 实时状态更新（IS-07 / PRD 3.3）============================

/**
 * 首屏走 REST 快照（上方 computed 即为快照），不等 WS 首帧（A-11）。
 * 此处模拟「WS 推送 → 仅更新该行相关单元格 → 变更单元格闪烁高亮 1.5 秒」。
 * 联动规则：状态变化不导致该行移出/移入列表，仅附「状态已变更，刷新后生效」提示。
 */
const flashSns = ref<Set<string>>(new Set())
let wsTimer: ReturnType<typeof setInterval> | null = null

function flash(sn: string) {
  flashSns.value = new Set([...flashSns.value, sn])
  setTimeout(() => {
    const next = new Set(flashSns.value)
    next.delete(sn)
    flashSns.value = next
  }, 1500)
}

function startWsSim() {
  if (wsTimer) return
  wsTimer = setInterval(() => {
    if (demo.wsState !== 'CONNECTED' || !demo.wsSimEnabled) return
    const pool = paged.value.filter(
      (d) => d.management_status === 'NORMAL',
    )
    if (pool.length === 0) return
    const target = pool[Math.floor(Math.random() * pool.length)]
    const flip = target.online_status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'
    demo.onlineOverrideBySn = {
      ...demo.onlineOverrideBySn,
      [target.drone_sn]: { status: flip, source: 'SOURCE_PUSH' },
    }
    flash(target.drone_sn)
    // 该行可能已不满足当前在线状态筛选，但不移出列表
    if (query.onlineStatus && query.onlineStatus !== '__all__' && flip !== query.onlineStatus) {
      if (!demo.staleFilterSns.includes(target.drone_sn)) {
        demo.staleFilterSns.push(target.drone_sn)
      }
    }
  }, 4000)
}

onMounted(startWsSim)
onBeforeUnmount(() => {
  if (wsTimer) clearInterval(wsTimer)
  wsTimer = null
})

// 分页越界保护（E-40）
watch(filtered, (newList) => {
  const maxPage = Math.ceil(newList.length / page.value.pageSize) || 1
  if (page.value.current > maxPage) {
    page.value.current = maxPage
    message.info(`数据已更新，已跳转至第 ${maxPage} 页`)
  }
})

// ============================ 表格列定义（PRD 5.1.3）============================

const columns: TableColumnsType = [
  { title: '名称', dataIndex: 'aircraft_name', key: 'name', width: 160 },
  { title: 'SN', dataIndex: 'drone_sn', key: 'sn', width: 200 },
  { title: '型号', dataIndex: 'model', key: 'model', width: 100 },
  { title: '飞行状态', key: 'flightStatus', width: 120 },
  { title: '在线状态', key: 'onlineStatus', width: 120 },
  { title: '可服务营地', key: 'camps', width: 150 },
  { title: '当前地面站', key: 'groundStation', width: 150 },
  { title: '总架次', key: 'totalSorties', width: 100 },
  { title: '总里程', key: 'totalDistance', width: 120 },
  { title: '总航时', key: 'totalDuration', width: 100 },
  { title: '更新时间', key: 'updatedAt', width: 120 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

/** 行级状态标签（PRD 5.1.3 行级状态标签叠加规则） */
function rowTags(d: LogicalUav) {
  const tags: { label: string; tone: 'warn' | 'danger' | 'mute' | 'pending'; tip?: string }[] = []
  if (d.management_status === 'DISABLED') tags.push({ label: '已停用', tone: 'mute' })
  return tags
}

/** 可服务营地展示：≤1 显示全称；>1 显示缩写(n) */
function campsDisplay(camps: string[]) {
  if (camps.length === 0) return DASH
  if (camps.length === 1) {
    const c = CAMP_DICT.find((x) => x.code === camps[0])
    return c?.name ?? camps[0]
  }
  const shorts = camps.map((c) => CAMP_DICT.find((x) => x.code === c)?.short ?? c).join('/')
  return `${shorts}(${camps.length})`
}

function campsFullList(camps: string[]) {
  return camps.map((c) => CAMP_DICT.find((x) => x.code === c)?.name ?? c).join('\n')
}
</script>

<template>
  <PageContainer title="A 类无人机管理">
    <!-- 页面说明 -->
    <PanelCard class="of-intro">
      <div class="of-intro__title">A 类无人机管理</div>
      <div class="of-intro__actions">
        <a-button type="link" @click="archiveDrawerOpen = true">
          归档库({{ archivedList.length }})
        </a-button>
      </div>
    </PanelCard>

    <!-- WS 断开告警条（E-33 / E-34） -->
    <PanelCard
      v-if="demo.wsState !== 'CONNECTED'"
      class="of-alert of-alert--warn"
      padding="12px 16px"
    >
      <WarningOutlined class="of-alert__icon" />
      <span class="of-alert__text">
        实时状态更新{{
          demo.wsState === 'DISCONNECTED' ? '已断开，正在重连' : '不可用'
        }}，当前数据为静态快照
      </span>
      <a-button type="link" size="small" @click="demo.wsReconnect">
        {{ demo.wsState === 'DISCONNECTED' ? '重连' : '手动刷新' }}
      </a-button>
    </PanelCard>

    <!-- 筛选区（F-01 / F-02 / F-03） -->
    <SearchBar :loading="loading" @search="onSearch" @reset="onReset">
      <a-form-item label="SN" :colon="false" class="of-field">
        <a-input
          v-model:value="query.sn"
          placeholder="请输入"
          allow-clear
          style="width: 180px"
          @press-enter="onSearch"
        />
      </a-form-item>
      <a-form-item label="名称" :colon="false" class="of-field">
        <a-input
          v-model:value="query.name"
          placeholder="请输入"
          allow-clear
          style="width: 180px"
          @press-enter="onSearch"
        />
      </a-form-item>
      <a-form-item label="飞行状态" :colon="false" class="of-field">
        <a-select
          v-model:value="query.flightStatus"
          placeholder="全部"
          allow-clear
          style="width: 140px"
          :options="FLIGHT_STATUS_OPTIONS"
        />
      </a-form-item>
      <a-form-item label="在线状态" :colon="false" class="of-field">
        <a-select
          v-model:value="query.onlineStatus"
          placeholder="全部"
          allow-clear
          style="width: 120px"
          :options="ONLINE_OPTIONS"
        />
      </a-form-item>
      <a-form-item label="可服务营地" :colon="false" class="of-field">
        <a-select
          v-model:value="query.camp"
          placeholder="全部"
          allow-clear
          style="width: 150px"
          :options="CAMP_OPTIONS"
        />
      </a-form-item>
      <a-form-item label="接入状态" :colon="false" class="of-field">
        <a-select
          v-model:value="query.accessStatus"
          placeholder="全部"
          allow-clear
          style="width: 130px"
          :options="ACCESS_OPTIONS"
        />
      </a-form-item>
      <a-form-item v-if="demo.perms.equipAdmin" :colon="false" class="of-field of-field--switch">
        <a-checkbox v-model:checked="query.showDisabled">显示已停用</a-checkbox>
      </a-form-item>
    </SearchBar>

    <!-- 数据表格（F-04 / F-05 / F-09 / 验收 A-01~A-06） -->
    <DataTable
      :columns="columns"
      :data-source="paged"
      :loading="loading"
      :total="filtered.length"
      :current="page.current"
      :page-size="page.pageSize"
      :scroll-x="1200"
      @change="(p: number, s: number) => (page = { current: p, pageSize: s })"
    >
      <template #bodyCell="{ column, record }">
        <!-- 名称列同时承载行级状态标签（PRD 5.1.3 叠加规则，自左向右） -->
        <template v-if="column.key === 'name'">
          <div class="of-name">
            <a-tooltip
              :title="
                truncate((record as LogicalUav).aircraft_name, 20).full
                  ? (record as LogicalUav).aircraft_name
                  : undefined
              "
            >
              <a-button type="link" @click="goDetail((record as LogicalUav).drone_sn)">
                {{ truncate((record as LogicalUav).aircraft_name, 20).text }}
              </a-button>
            </a-tooltip>

            <div v-if="rowTags(record as LogicalUav).length || demo.staleFilterSns.includes((record as LogicalUav).drone_sn)" class="of-name__tags">
              <template v-for="tag in rowTags(record as LogicalUav)" :key="tag.label">
                <a-tooltip v-if="tag.tip" :title="tag.tip">
                  <StatusTag :tone="tag.tone" :variant="tag.tone === 'mute' ? 'solid' : 'outline'">
                    {{ tag.label }}
                  </StatusTag>
                </a-tooltip>
                <StatusTag v-else :tone="tag.tone">{{ tag.label }}</StatusTag>
              </template>

              <!-- 联动规则：WS 推送使该行不再满足筛选，仍保留在当前页 -->
              <a-tooltip
                v-if="demo.staleFilterSns.includes((record as LogicalUav).drone_sn)"
                title="在线状态已变更，已不满足当前筛选条件，刷新后生效"
              >
                <StatusTag tone="pending">状态已变更</StatusTag>
              </a-tooltip>
            </div>
          </div>
        </template>

        <!-- SN：等宽字体展示；超出截断并悬浮显示完整值，悬浮出现复制图标（F-09） -->
        <template v-else-if="column.key === 'sn'">
          <span class="of-sn">
            <a-tooltip :title="truncate((record as LogicalUav).drone_sn, 18).full ? (record as LogicalUav).drone_sn : undefined">
              <a-button type="link" class="of-sn__link" @click="goDetail((record as LogicalUav).drone_sn)">
                <code>{{ truncate((record as LogicalUav).drone_sn, 18).text }}</code>
              </a-button>
            </a-tooltip>
            <a-tooltip title="复制 SN">
              <CopyOutlined class="of-sn__copy" @click="copySn((record as LogicalUav).drone_sn)" />
            </a-tooltip>
          </span>
        </template>

        <!-- 型号 -->
        <template v-else-if="column.key === 'model'">
          {{ (record as LogicalUav).source_record.model || '--' }}
        </template>

        <template v-else-if="column.key === 'flightStatus'">
          <FlightStatusTag
            :code="(record as LogicalUav).flight_status_code"
          />
        </template>

        <!-- 在线状态：V3.0 单一源，无冲突标记 -->
        <template v-else-if="column.key === 'onlineStatus'">
          <span
            class="of-cell-inline"
            :class="{ 'of-flash': flashSns.has((record as LogicalUav).drone_sn) }"
          >
            <OnlineDot
              :status="(record as LogicalUav).online_status"
              :source="(record as LogicalUav).online_status_source"
              :not-realtime="demo.wsState !== 'CONNECTED'"
            />
          </span>
        </template>

        <template v-else-if="column.key === 'camps'">
          <a-tooltip :title="campsFullList((record as LogicalUav).ext.serviceable_camps)">
            <span>{{ campsDisplay((record as LogicalUav).ext.serviceable_camps) }}</span>
          </a-tooltip>
        </template>

        <!-- 当前地面站：V3.0 单一源，无冲突标记 -->
        <template v-else-if="column.key === 'groundStation'">
          <a-tooltip
            :title="
              truncate((record as LogicalUav).ground_station_name, 12).full
                ? (record as LogicalUav).ground_station_name
                : undefined
            "
          >
            <span>{{ truncate((record as LogicalUav).ground_station_name, 12).text }}</span>
          </a-tooltip>
        </template>

        <!-- 总架次 -->
        <template v-else-if="column.key === 'totalSorties'">
          {{ fmtSorties((record as LogicalUav).total_sorties) }}
        </template>

        <!-- 总里程 -->
        <template v-else-if="column.key === 'totalDistance'">
          {{ fmtKm((record as LogicalUav).total_flight_distance_m) }}
        </template>

        <!-- 总航时 -->
        <template v-else-if="column.key === 'totalDuration'">
          {{ fmtDuration((record as LogicalUav).total_flight_duration_sec) }}
        </template>

        <template v-else-if="column.key === 'updatedAt'">
          <a-tooltip :title="fmtWithTz((record as LogicalUav).source_record.last_updated_at)">
            <span>{{ fmtListTime((record as LogicalUav).source_record.last_updated_at) }}</span>
          </a-tooltip>
        </template>

        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="goDetail((record as LogicalUav).drone_sn)">
            详情
          </a-button>
        </template>
      </template>

      <!-- 空态与失败态（E-37 / E-38 / E-39，禁止把失败渲染成「共 0 条」） -->
      <template #emptyText>
        <div class="of-empty">
          <template v-if="demo.listLoadState === 'FAILED'">
            <ExclamationCircleOutlined class="of-empty__icon of-empty__icon--error" />
            <div class="of-empty__text">加载失败，请重试</div>
            <a-button type="primary" size="small" @click="onSearch">重新加载</a-button>
          </template>
          <template v-else-if="isQueryDirty">
            <InboxOutlined class="of-empty__icon" />
            <div class="of-empty__text">未查询到符合条件的 A 类无人机</div>
            <a-button size="small" @click="onReset">清空筛选</a-button>
          </template>
          <template v-else>
            <InboxOutlined class="of-empty__icon" />
            <div class="of-empty__text">暂无 A 类无人机数据，请检查基础站接入状态</div>
            <a-button
              v-if="demo.perms.accessAdmin"
              type="primary"
              size="small"
              @click="router.push({ name: 'Placeholder', params: { name: '外部数据接入管理' } })"
            >
              查看接入状态
            </a-button>
          </template>
        </div>
      </template>
    </DataTable>

    <!-- 归档库（F-27 / F-28） -->
    <a-drawer
      v-model:open="archiveDrawerOpen"
      title="归档库"
      width="820"
      placement="right"
    >
      <div class="of-drawer-note">
        已归档设备保留完整源记录快照与操作审计。恢复后管理状态将置为"正常"。
      </div>
      <a-table
        class="of-table of-drawer-table"
        :columns="archivedColumns"
        :data-source="archivedList"
        :pagination="false"
        row-key="drone_sn"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'archivedAt'">
            {{ fmtDateTime((record as LogicalUav).archived_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              type="link"
              size="small"
              :disabled="!demo.perms.archive"
              @click="confirmRestore(record as LogicalUav)"
            >
              从归档库恢复
            </a-button>
          </template>
        </template>
      </a-table>
    </a-drawer>
  </PageContainer>
</template>

<style scoped lang="scss">
.of-field {
  margin-bottom: 0;
}

// 页面说明条：标题 + 数据来源声明（E-59 / 验收 A-22）
.of-intro {
  display: flex;
  flex-wrap: wrap;
  gap: var(--of-spacing-2) var(--of-spacing-4);
  align-items: center;

  &__title {
    font-size: var(--of-font-size-lg);
    font-weight: var(--of-font-weight-medium);
  }

  &__note {
    flex: 1 1 auto;
    min-width: 240px;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--of-spacing-2);
    align-items: center;
  }
}

// 非阻断告警条
.of-alert {
  display: flex;
  gap: var(--of-spacing-2);
  align-items: center;
  border-left: 3px solid transparent;

  &__icon {
    flex-shrink: 0;
    font-size: 16px;
  }

  &__text {
    flex: 1 1 auto;
    font-size: var(--of-font-size-base);
  }

  &--danger {
    border-left-color: var(--of-color-error);

    .of-alert__icon {
      color: var(--of-color-error);
    }
  }

  &--warn {
    border-left-color: var(--of-color-warning);

    .of-alert__icon {
      color: var(--of-color-warning);
    }
  }
}

// 名称列：链接 + 行级状态标签纵向叠放
.of-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
  }
}

// SN 列：等宽字体 + 悬浮出现的复制与累计浮层图标
.of-sn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;

  &__link {
    padding: 0;

    code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 13px;
    }
  }

  &__copy {
    color: var(--of-text-quaternary);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--of-transition-base), color var(--of-transition-base);

    &:hover {
      color: var(--of-color-link);
    }
  }
}

// 悬浮整行时才露出复制图标，避免常驻噪点
:deep(.ant-table-row:hover) .of-sn__copy {
  opacity: 1;
}

// WS 推送变更单元格闪烁高亮 1.5s（PRD 5.1.4 联动规则）
.of-flash {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--of-radius-sm);
  animation: of-flash-kf 1.5s ease-out;
}

@keyframes of-flash-kf {
  0% {
    background: rgba(87, 196, 247, 0.45);
  }

  100% {
    background: transparent;
  }
}

// 数据异常（E-13）：与空值 `--` 视觉区分
.of-abnormal {
  color: var(--of-color-error);
}

// 单元格内联容器：值居中
.of-cell-inline {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

// 空态 / 失败态
.of-empty {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-3);
  align-items: center;
  padding: 40px 0;

  &__icon {
    font-size: 40px;
    color: var(--of-text-quaternary);

    &--error {
      color: var(--of-color-error);
    }
  }

  &__text {
    color: var(--of-text-secondary);
  }
}

.of-drawer-note {
  padding: 0 0 var(--of-spacing-3);
  font-size: var(--of-font-size-xs);
  line-height: 18px;
  color: var(--of-text-quaternary);
}

.of-drawer-table {
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
</style>

