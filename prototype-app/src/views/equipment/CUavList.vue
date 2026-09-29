<script setup lang="ts">
/**
 * C 类无人机管理 —— 列表页
 * PRD V1.2 IS-01/IS-03/IS-05/IS-06、5.1 全部联动规则
 */
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { InboxOutlined, WarningOutlined } from '@ant-design/icons-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { useCUavDemoStore } from '@/stores/cUavDemo'
import {
  CAMP_DICT, MODEL_DICT, ACCESS_STATUS_LABEL,
  modeCodeGroup, modeCodeLabel, campName, modelName, nestName,
  type AccessStatus, type FlightGroup,
} from '@/mock/cUav'

const router = useRouter()
const demo = useCUavDemoStore()

// ========================= 筛选条件 =========================

const query = reactive({
  camps: [] as string[],
  models: [] as string[],
  accessStatuses: [] as AccessStatus[],
  flightGroups: [] as FlightGroup[],
  keyword: '',
})

const isFilterDirty = computed(() =>
  query.camps.length > 0 || query.models.length > 0 ||
  query.accessStatuses.length > 0 || query.flightGroups.length > 0 ||
  query.keyword.trim() !== '',
)

// debounce 300ms（PRD 5.1.3）
let keyTimer: ReturnType<typeof setTimeout> | null = null
const debouncedKeyword = ref('')
watch(() => query.keyword, (v) => {
  if (keyTimer) clearTimeout(keyTimer)
  keyTimer = setTimeout(() => { debouncedKeyword.value = v }, 300)
}, { immediate: true })
onBeforeUnmount(() => { if (keyTimer) clearTimeout(keyTimer) })

const CAMP_OPTIONS = CAMP_DICT.map(c => ({ value: c.code, label: c.name }))
const MODEL_OPTIONS = MODEL_DICT.map(m => ({ value: m.code, label: m.name }))
const ACCESS_STATUS_OPTIONS: { value: AccessStatus; label: string }[] = [
  { value: 'ONLINE', label: '在线' },
  { value: 'OFFLINE', label: '离线' },
]
const FLIGHT_GROUP_OPTIONS: { value: FlightGroup; label: string }[] = [
  { value: 'ground', label: '地面待机' },
  { value: 'flying', label: '飞行中' },
  { value: 'return', label: '返航/降落' },
  { value: 'special', label: '特殊/异常' },
]

// ========================= 数据层 =========================

const page = reactive({ current: 1, pageSize: 20 })
const loading = ref(false)

const filteredDevices = computed(() => {
  return demo.devices.filter(d => {
    const status = demo.accessStatusById[d.device_id]

    if (query.camps.length > 0 && !query.camps.includes(d.camp_code)) return false
    if (query.models.length > 0 && !query.models.includes(d.model_code)) return false
    if (query.accessStatuses.length > 0 && !query.accessStatuses.includes(status)) return false

    // 飞行状态分组：仅对在线设备有效（PRD 5.1.3）
    if (query.flightGroups.length > 0) {
      if (status !== 'ONLINE') return false
      const grp = modeCodeGroup(demo.telemetryById[d.device_id]?.mode_code)
      if (!grp || !query.flightGroups.includes(grp)) return false
    }

    if (debouncedKeyword.value.trim()) {
      const kw = debouncedKeyword.value.trim().toLowerCase()
      if (!d.name.toLowerCase().includes(kw) && !d.serial_no.toLowerCase().includes(kw)) return false
    }

    return true
  })
})

const pagedDevices = computed(() => {
  const s = (page.current - 1) * page.pageSize
  return filteredDevices.value.slice(s, s + page.pageSize)
})

watch(filteredDevices, (list) => {
  const max = Math.ceil(list.length / page.pageSize) || 1
  if (page.current > max) page.current = max
})

function onReset() {
  query.camps = []; query.models = []
  query.accessStatuses = []; query.flightGroups = []; query.keyword = ''
  page.current = 1
}

function onSearch() {
  page.current = 1
  loading.value = true
  setTimeout(() => (loading.value = false), 300)
}

function goDetail(id: string) {
  router.push({ name: 'CUavDetail', params: { id } })
}

// ========================= 辅助 =========================

function accessStatusTone(s: AccessStatus): 'ok' | 'mute' {
  const map: Record<AccessStatus, 'ok' | 'mute'> = { ONLINE: 'ok', OFFLINE: 'mute' }
  return map[s]
}

function flightGroupTone(grp: FlightGroup | null): 'ok' | 'info' | 'danger' | 'mute' {
  if (!grp) return 'mute'
  const map: Record<FlightGroup, 'ok' | 'info' | 'danger' | 'mute'> = { ground: 'mute', flying: 'ok', return: 'info', special: 'danger' }
  return map[grp]
}

// ========================= 表格列定义 =========================

const columns: TableColumnsType = [
  { title: '设备名称', key: 'name',         width: 160, sorter: (a: any, b: any) => a.name.localeCompare(b.name) },
  { title: '序列号',   key: 'serialNo',     width: 220, sorter: (a: any, b: any) => a.serial_no.localeCompare(b.serial_no) },
  { title: '所属营地', key: 'camp',         width: 120, sorter: (a: any, b: any) => a.camp_code.localeCompare(b.camp_code) },
  { title: '机巢',     key: 'nest',         width: 150, sorter: (a: any, b: any) => (a.nest_id ?? '').localeCompare(b.nest_id ?? '') },
  { title: '机型',     key: 'model',        width: 120, sorter: (a: any, b: any) => a.model_code.localeCompare(b.model_code) },
  { title: '接入状态', key: 'accessStatus', width: 100, sorter: (a: any, b: any) => (demo.accessStatusById[a.device_id] ?? '').localeCompare(demo.accessStatusById[b.device_id] ?? '') },
  { title: '飞行状态', key: 'flightStatus', width: 130 },
  { title: '操作',     key: 'action',       width: 80,  fixed: 'right' },
]
</script>

<template>
  <PageContainer title="C 类无人机管理">

    <!-- WS 断开告警条（E-06） -->
    <PanelCard v-if="demo.wsState !== 'CONNECTED'" class="of-alert of-alert--warn" padding="10px 16px">
      <WarningOutlined class="of-alert__icon" />
      <span class="of-alert__text">实时数据连接已断开，正在重连…</span>
      <a-button type="link" size="small" @click="demo.wsReconnect">重连</a-button>
    </PanelCard>

    <!-- 中台连接异常（E-07） -->
    <PanelCard v-if="!demo.midPlatformOk" class="of-alert of-alert--warn" padding="10px 16px">
      <WarningOutlined class="of-alert__icon" />
      <span class="of-alert__text">中台连接异常，数据可能不是最新</span>
    </PanelCard>

    <!-- 设备清单变更提示（E-02） -->
    <PanelCard v-if="demo.listChangedMsg" class="of-alert of-alert--info" padding="10px 16px">
      <span class="of-alert__text">{{ demo.listChangedMsg }}</span>
    </PanelCard>

    <!-- 筛选区（PRD 5.1.3） -->
    <SearchBar :loading="loading" @search="onSearch" @reset="onReset">
      <a-form-item label="所属营地" :colon="false" class="of-field">
        <a-select v-model:value="query.camps" mode="multiple" placeholder="全部" allow-clear style="min-width: 160px; max-width: 280px"
          :options="CAMP_OPTIONS" />
      </a-form-item>
      <a-form-item label="机型" :colon="false" class="of-field">
        <a-select v-model:value="query.models" mode="multiple" placeholder="全部" allow-clear style="min-width: 140px"
          :options="MODEL_OPTIONS" />
      </a-form-item>
      <a-form-item label="接入状态" :colon="false" class="of-field">
        <a-select v-model:value="query.accessStatuses" mode="multiple" placeholder="全部" allow-clear style="min-width: 160px"
          :options="ACCESS_STATUS_OPTIONS" />
      </a-form-item>
      <a-form-item label="飞行状态分组" :colon="false" class="of-field">
        <a-select v-model:value="query.flightGroups" mode="multiple" placeholder="全部" allow-clear style="min-width: 180px"
          :options="FLIGHT_GROUP_OPTIONS" />
      </a-form-item>
      <a-form-item label="名称/序列号" :colon="false" class="of-field">
        <a-input v-model:value="query.keyword" placeholder="模糊搜索" allow-clear style="width: 200px" @press-enter="page.current = 1" />
      </a-form-item>
    </SearchBar>

    <!-- 数据表格 -->
    <DataTable
      :columns="columns"
      :data-source="pagedDevices"
      :loading="loading"
      :total="filteredDevices.length"
      :current="page.current"
      :page-size="page.pageSize"
      :scroll-x="1050"
      @change="(p: number, s: number) => { page.current = p; page.pageSize = s }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a-button type="link" class="of-name-link" @click="goDetail(record.device_id)">{{ record.name }}</a-button>
        </template>

        <template v-else-if="column.key === 'serialNo'">
          <a-tooltip :title="record.serial_no">
            <code class="of-sn">{{ record.serial_no }}</code>
          </a-tooltip>
        </template>

        <template v-else-if="column.key === 'camp'">
          {{ campName(record.camp_code) }}
        </template>

        <template v-else-if="column.key === 'nest'">
          <span v-if="record.nest_id">{{ nestName(record.nest_id) }}</span>
          <span v-else class="of-dash">--</span>
        </template>

        <template v-else-if="column.key === 'model'">
          {{ modelName(record.model_code) }}
        </template>

        <template v-else-if="column.key === 'accessStatus'">
          <StatusTag :tone="accessStatusTone(demo.accessStatusById[record.device_id])">
            {{ ACCESS_STATUS_LABEL[demo.accessStatusById[record.device_id]] }}
          </StatusTag>
        </template>

        <template v-else-if="column.key === 'flightStatus'">
          <template v-if="demo.accessStatusById[record.device_id] === 'ONLINE'">
            <StatusTag :tone="flightGroupTone(modeCodeGroup(demo.telemetryById[record.device_id]?.mode_code))">
              {{ modeCodeLabel(demo.telemetryById[record.device_id]?.mode_code) }}
            </StatusTag>
          </template>
          <span v-else class="of-dash">--</span>
        </template>

        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="goDetail(record.device_id)">详情</a-button>
        </template>
      </template>

      <template #emptyText>
        <div class="of-empty">
          <template v-if="isFilterDirty">
            <InboxOutlined class="of-empty__icon" />
            <div class="of-empty__text">未找到符合条件的设备，请调整筛选条件</div>
            <a-button size="small" @click="onReset">重置筛选</a-button>
          </template>
          <template v-else>
            <InboxOutlined class="of-empty__icon" />
            <div class="of-empty__text">暂无 C 类无人机，设备清单由 AIRIOT 中台管理，请确认中台是否已录入设备</div>
          </template>
        </div>
      </template>
    </DataTable>

  </PageContainer>
</template>

<style scoped lang="scss">
.of-field { margin-bottom: 0; }

.of-alert {
  display: flex;
  gap: var(--of-spacing-2);
  align-items: center;
  border-left: 3px solid transparent;

  &__icon { flex-shrink: 0; font-size: 16px; }
  &__text { flex: 1; font-size: var(--of-font-size-base); }

  &--warn { border-left-color: var(--of-color-warning); .of-alert__icon { color: var(--of-color-warning); } }
  &--info { border-left-color: var(--of-color-accent-cyan); }
}

.of-name-link { padding: 0; }
.of-sn {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  vertical-align: middle;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
}
.of-dash { color: var(--of-text-quaternary); }

.of-empty {
  display: flex; flex-direction: column; gap: var(--of-spacing-3);
  align-items: center; padding: 40px 0;

  &__icon { font-size: 40px; color: var(--of-text-quaternary); }
  &__text { color: var(--of-text-secondary); }
}
</style>
