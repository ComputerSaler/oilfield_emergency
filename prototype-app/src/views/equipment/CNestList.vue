<script setup lang="ts">
/**
 * C 类机巢管理 —— 列表页
 * PRD V1.0 IS-01/IS-03/IS-05/IS-06、5.1~5.4 全部联动规则
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { InboxOutlined, WarningOutlined } from '@ant-design/icons-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { Modal } from 'ant-design-vue'
import { useCNestDemoStore } from '@/stores/cNestDemo'
import {
  CAMP_DICT, ACCESS_STATUS_LABEL, campName, fmtCoord,
  type AccessStatus,
} from '@/mock/cNest'

const router = useRouter()
const demo = useCNestDemoStore()

// ========================= 筛选条件 =========================

const query = reactive({
  camps: [] as string[],
  accessStatuses: [] as AccessStatus[],
})

const isFilterDirty = computed(() =>
  query.camps.length > 0 || query.accessStatuses.length > 0,
)

const CAMP_OPTIONS = CAMP_DICT.map(c => ({ value: c.code, label: c.name }))
const ACCESS_STATUS_OPTIONS: { value: AccessStatus; label: string }[] = [
  { value: 'ONLINE', label: '在线' },
  { value: 'OFFLINE', label: '离线' },
]

// ========================= 数据层 =========================

const page = reactive({ current: 1, pageSize: 20 })
const loading = ref(false)

const filteredDevices = computed(() => {
  return demo.devices.filter(d => {
    const status = demo.accessStatusById[d.nest_id]

    if (query.camps.length > 0 && !query.camps.includes(d.camp)) return false
    if (query.accessStatuses.length > 0 && !query.accessStatuses.includes(status)) return false

    return true
  })
})

const pagedDevices = computed(() => {
  const s = (page.current - 1) * page.pageSize
  return filteredDevices.value.slice(s, s + page.pageSize)
})

function onReset() {
  query.camps = []
  query.accessStatuses = []
  page.current = 1
}

function onSearch() {
  page.current = 1
  loading.value = true
  setTimeout(() => (loading.value = false), 300)
}

function goDetail(id: string) {
  router.push({ name: 'CNestDetail', params: { id } })
}

// ========================= GIS Modal =========================

const gisVisible = ref(false)
const gisData = ref<{ title: string; name: string; lng: number; lat: number } | null>(null)

function showNestLocation(device: any) {
  gisData.value = {
    title: `机巢位置 — ${device.name}`,
    name: device.name,
    lng: device.longitude,
    lat: device.latitude,
  }
  gisVisible.value = true
}

function showAlternateLandPoint(device: any) {
  const t = demo.telemetryById[device.nest_id]
  if (!t?.alternate_land_point_configured || t.alternate_land_point_longitude == null) return
  gisData.value = {
    title: `备降点位置 — ${device.name}`,
    name: device.name,
    lng: t.alternate_land_point_longitude,
    lat: t.alternate_land_point_latitude!,
  }
  gisVisible.value = true
}

function closeGisModal() {
  gisVisible.value = false
  gisData.value = null
}

// ========================= 辅助 =========================

function accessStatusTone(s: AccessStatus): 'ok' | 'danger' {
  return s === 'ONLINE' ? 'ok' : 'danger'
}

// ========================= 表格列定义 =========================

const columns: TableColumnsType = [
  { title: '名称', key: 'name', width: 200, sorter: (a: any, b: any) => a.name.localeCompare(b.name), defaultSortOrder: 'ascend' },
  { title: '序列号', key: 'serialNumber', width: 180 },
  { title: '所属营地', key: 'camp', width: 140 },
  { title: '在线状态', key: 'accessStatus', width: 100, align: 'center' },
  { title: '备降点', key: 'alternateLandPoint', width: 100, align: 'center' },
  { title: '固件版本', key: 'firmwareVersion', width: 120 },
  { title: '操作', key: 'action', width: 160, fixed: 'right', align: 'center' },
]
</script>

<template>
  <PageContainer title="C 类机巢管理">

    <!-- WS 断开告警条 -->
    <PanelCard v-if="demo.wsState !== 'CONNECTED'" class="of-alert of-alert--warn" padding="10px 16px">
      <WarningOutlined class="of-alert__icon" />
      <span class="of-alert__text">实时数据连接已断开，正在重连…</span>
      <a-button type="link" size="small" @click="demo.wsReconnect">重连</a-button>
    </PanelCard>

    <!-- 中台连接异常 -->
    <PanelCard v-if="!demo.midPlatformOk" class="of-alert of-alert--warn" padding="10px 16px">
      <WarningOutlined class="of-alert__icon" />
      <span class="of-alert__text">中台连接异常，数据可能不是最新</span>
    </PanelCard>

    <!-- 设备清单变更提示 -->
    <PanelCard v-if="demo.listChangedMsg" class="of-alert of-alert--info" padding="10px 16px">
      <span class="of-alert__text">{{ demo.listChangedMsg }}</span>
    </PanelCard>

    <!-- 筛选区 -->
    <SearchBar :loading="loading" @search="onSearch" @reset="onReset">
      <a-form-item label="所属营地" :colon="false" class="of-field">
        <a-select v-model:value="query.camps" mode="multiple" placeholder="全部" allow-clear style="min-width: 180px"
          :options="CAMP_OPTIONS" />
      </a-form-item>
      <a-form-item label="在线状态" :colon="false" class="of-field">
        <a-select v-model:value="query.accessStatuses" mode="multiple" placeholder="全部" allow-clear style="min-width: 160px"
          :options="ACCESS_STATUS_OPTIONS" />
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
          {{ record.name }}
        </template>

        <template v-else-if="column.key === 'serialNumber'">
          <a-tooltip :title="record.serial_number">
            <code class="of-sn">{{ record.serial_number }}</code>
          </a-tooltip>
        </template>

        <template v-else-if="column.key === 'camp'">
          {{ campName(record.camp) }}
        </template>

        <template v-else-if="column.key === 'accessStatus'">
          <StatusTag :tone="accessStatusTone(demo.accessStatusById[record.nest_id])">
            {{ ACCESS_STATUS_LABEL[demo.accessStatusById[record.nest_id]] }}
          </StatusTag>
        </template>

        <template v-else-if="column.key === 'alternateLandPoint'">
          <template v-if="demo.telemetryById[record.nest_id]?.alternate_land_point_configured && demo.telemetryById[record.nest_id]?.alternate_land_point_longitude != null">
            <a @click="showAlternateLandPoint(record)">查看</a>
          </template>
          <span v-else class="of-dash">--</span>
        </template>

        <template v-else-if="column.key === 'firmwareVersion'">
          <span v-if="record.firmware_version">{{ record.firmware_version }}</span>
          <span v-else class="of-dash">--</span>
        </template>

        <template v-else-if="column.key === 'action'">
          <a-space>
            <a @click="showNestLocation(record)">查看位置</a>
            <a-divider type="vertical" />
            <a @click="goDetail(record.nest_id)">详情</a>
          </a-space>
        </template>
      </template>

      <template #emptyText>
        <div class="of-empty">
          <template v-if="isFilterDirty">
            <InboxOutlined class="of-empty__icon" />
            <div class="of-empty__text">未找到符合条件的设备</div>
            <a-button size="small" @click="onReset">重置筛选条件</a-button>
          </template>
          <template v-else>
            <InboxOutlined class="of-empty__icon" />
            <div class="of-empty__text">暂无 C 类机巢。设备清单由 AIRIOT 中台管理，请联系系统管理员核查同步状态。</div>
          </template>
        </div>
      </template>
    </DataTable>

    <!-- GIS Modal -->
    <a-modal
      v-model:open="gisVisible"
      :title="gisData?.title"
      :width="'80%'"
      :footer="null"
      :closable="false"
      wrap-class-name="of-gis-modal"
    >
      <div class="of-gis-container">
        <div class="of-gis-map">
          <div class="of-gis-placeholder">
            [ 地图组件待集成 ]<br>
            显示备降点位置标记点
          </div>
        </div>
        <div class="of-gis-footer">
          <div class="of-gis-info">
            <span class="of-gis-info__name">{{ gisData?.name }}</span>
            <span class="of-gis-info__coord">
              经度: {{ fmtCoord(gisData?.lng) }}, 纬度: {{ fmtCoord(gisData?.lat) }}
            </span>
          </div>
          <a-button @click="closeGisModal">关闭</a-button>
        </div>
      </div>
    </a-modal>

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

// GIS Modal 样式
.of-gis-container {
  display: flex;
  flex-direction: column;
  height: 80vh;
}

.of-gis-map {
  flex: 1;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--of-radius-base);
  margin-bottom: var(--of-spacing-3);
}

.of-gis-placeholder {
  color: #666;
  text-align: center;
  font-size: var(--of-font-size-base);
  line-height: 1.8;
}

.of-gis-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--of-spacing-3);
  background: #1f1f1f;
  border: 1px solid #303030;
  border-radius: var(--of-radius-base);
}

.of-gis-info {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-1);

  &__name {
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-primary);
  }

  &__coord {
    font-size: var(--of-font-size-sm);
    color: var(--of-text-secondary);
    font-family: 'SFMono-Regular', Consolas, monospace;
  }
}
</style>
