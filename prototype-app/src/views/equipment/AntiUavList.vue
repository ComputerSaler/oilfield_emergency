<script setup lang="ts">
/**
 * 反无设备管理 —— 列表页
 * PRD: 装备管理 · 反无设备管理 v1.0
 *
 * 页面布局（PRD 5.1）：
 *   面包屑标题条 → WS 断开告警条（条件）
 *   → 筛选区 → 数据表格 → 分页
 *
 * 核心约束：
 *   - 平台完全只读，无增删改权限（PRD 1.4）
 *   - 设备在线/离线状态由中台判定并推送（PRD 2 术语定义）
 *   - WebSocket 断连时严禁批量判离线（PRD 3.2 防误判铁律）
 *   - 操作列 fixed: 'right'，底色由 global.scss 统一给不透明实色
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { CheckOutlined, CloseOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  MOCK_ANTI_UAV_DEVICES,
  DEVICE_TYPE_DICT,
  DEVICE_STATUS_DICT,
  CAMP_DICT,
  type AntiUavDevice,
} from '@/mock/antiUav'

// ============================ 查询条件 ============================

const query = reactive({
  name: '',
  deviceType: undefined as string | undefined,
})

// const isQueryDirty = computed(() => query.name || query.deviceType)

const DEVICE_TYPE_OPTIONS = [
  { value: '__all__', label: '全部' },
  ...DEVICE_TYPE_DICT.map((d) => ({ value: d.code, label: d.label })),
]

// ============================ 数据层 ============================

const loading = ref(false)
const page = ref({ current: 1, pageSize: 20 })

/** 模拟 REST 全量快照（真实环境：从第三方系统同步） */
const allDevices = ref<AntiUavDevice[]>([...MOCK_ANTI_UAV_DEVICES])

/** WS 连接状态 */
const wsConnected = ref(true)
const wsDisconnectTime = ref<string>('')

const filtered = computed(() => {
  return allDevices.value.filter((d) => {
    // 设备名称模糊匹配
    const nameQ = query.name.trim()
    if (nameQ && !d.name.toLowerCase().includes(nameQ.toLowerCase())) return false

    // 设备类型筛选
    if (query.deviceType && query.deviceType !== '__all__') {
      if (d.deviceType !== query.deviceType) return false
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
  query.name = ''
  query.deviceType = undefined
  page.value.current = 1
  onSearch()
}

// ============================ 位置查看 ============================

const locationModalVisible = ref(false)
const currentDevice = ref<AntiUavDevice | null>(null)
const editableLocation = reactive({
  latitude: 0,
  longitude: 0,
})

function viewLocation(record: AntiUavDevice) {
  currentDevice.value = record
  if (record.location) {
    editableLocation.latitude = record.location.latitude
    editableLocation.longitude = record.location.longitude
  } else {
    editableLocation.latitude = 0
    editableLocation.longitude = 0
  }
  locationModalVisible.value = true
}

// ============================ 表格列定义（PRD 5.3）============================

const columns: TableColumnsType = [
  {
    title: '设备ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    align: 'center',
    sorter: (a: AntiUavDevice, b: AntiUavDevice) => Number(a.id) - Number(b.id),
    defaultSortOrder: 'descend',
  },
  {
    title: '设备名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    align: 'center',
    ellipsis: true,
  },
  {
    title: '所属营地',
    key: 'camp',
    width: 140,
    align: 'center',
  },
  {
    title: '设备类型',
    key: 'deviceType',
    width: 100,
    align: 'center',
  },
  {
    title: 'GPS卫星数量',
    dataIndex: 'GpsStalliteNum',
    key: 'GpsStalliteNum',
    width: 120,
    align: 'right',
  },
  {
    title: '设备状态',
    key: 'DeviceStatus',
    width: 100,
    align: 'center',
  },
  {
    title: '设备在线',
    key: 'dev_online',
    width: 100,
    align: 'center',
  },
  {
    title: '通信时间',
    dataIndex: 'connectTime',
    key: 'connectTime',
    width: 180,
    align: 'center',
  },
  {
    title: '今日探测次数',
    dataIndex: 'todayDetectCount',
    key: 'todayDetectCount',
    width: 120,
    align: 'right',
  },
  {
    title: '今日预警次数',
    dataIndex: 'todayWarningCount',
    key: 'todayWarningCount',
    width: 120,
    align: 'right',
  },
  {
    title: '今日入侵次数',
    dataIndex: 'todayIntrusionCount',
    key: 'todayIntrusionCount',
    width: 120,
    align: 'right',
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    align: 'center',
    fixed: 'right',
  },
]

/** 获取营地名称 */
function getCampName(campCode: string): string {
  const camp = CAMP_DICT.find((c) => c.code === campCode)
  return camp?.name ?? campCode
}

/** 获取设备类型标签 */
function getDeviceTypeLabel(code: string): string {
  const type = DEVICE_TYPE_DICT.find((t) => t.code === code)
  return type?.label ?? '--'
}

/** 获取设备状态配置 */
function getDeviceStatus(code: string) {
  const status = DEVICE_STATUS_DICT.find((s) => s.code === code)
  return status ?? { code, label: '--', color: 'default' }
}

// ============================ WS 实时状态更新（PRD 3.1 / 4）============================

/**
 * 模拟 WebSocket 实时推送
 * - 每 5 秒随机更新 1-2 个设备的状态
 * - 设备在线/离线状态由中台判定，平台不执行本地判定（PRD 2 术语）
 */
const flashIds = ref<Set<string>>(new Set())
let wsTimer: ReturnType<typeof setInterval> | null = null

function simulateWsUpdate() {
  if (!wsConnected.value) return

  const randomIdx = Math.floor(Math.random() * allDevices.value.length)
  const device = allDevices.value[randomIdx]

  // 随机更新设备状态
  const updates: Partial<AntiUavDevice> = {}
  const rand = Math.random()

  if (rand < 0.3) {
    // 更新 GPS 卫星数量
    updates.GpsStalliteNum = Math.floor(Math.random() * 30)
  } else if (rand < 0.6) {
    // 更新今日统计
    updates.todayDetectCount = device.todayDetectCount + Math.floor(Math.random() * 5)
    if (Math.random() < 0.3) {
      updates.todayWarningCount = device.todayWarningCount + 1
    }
  } else {
    // 更新设备状态
    const statuses = ['Idle', 'Running', 'Abnormal'] as const
    updates.DeviceStatus = statuses[Math.floor(Math.random() * statuses.length)]
  }

  // 应用更新
  Object.assign(device, updates)
  updates.connectTime = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  Object.assign(device, { connectTime: updates.connectTime })

  // 闪烁高亮效果
  flashIds.value.add(device.id)
  setTimeout(() => {
    flashIds.value.delete(device.id)
  }, 1500)
}

/** 模拟 WS 断线重连 */
function simulateWsDisconnect() {
  wsConnected.value = false
  wsDisconnectTime.value = new Date().toLocaleString('zh-CN', { hour12: false })

  // 5 秒后自动重连
  setTimeout(() => {
    wsConnected.value = true
    wsDisconnectTime.value = ''
  }, 5000)
}

// ============================ 生命周期 ============================

onMounted(() => {
  // 首屏加载
  onSearch()

  // 启动 WS 模拟
  wsTimer = setInterval(simulateWsUpdate, 5000)

  // 20 秒后模拟一次断线（演示用）
  setTimeout(simulateWsDisconnect, 20000)
})

onBeforeUnmount(() => {
  if (wsTimer) clearInterval(wsTimer)
})
</script>

<template>
  <PageContainer title="反无设备管理">
    <!-- WS 断开告警条（PRD 5.4 联动规则）-->
    <PanelCard
      v-if="!wsConnected"
      class="of-alert of-alert--warn"
      padding="10px 16px"
    >
      <WarningOutlined class="of-alert__icon" />
      <span class="of-alert__text">
        实时状态同步已中断，正在重连…（当前展示为最后同步数据，更新于 {{ wsDisconnectTime }}）
      </span>
    </PanelCard>

    <!-- 筛选区（PRD 5.2）-->
    <SearchBar :loading="loading" @search="onSearch" @reset="onReset">
      <a-form-item label="设备名称" :colon="false" class="of-field">
        <a-input
          v-model:value="query.name"
          placeholder="请输入设备名称"
          allow-clear
          style="width: 200px"
          @press-enter="onSearch"
        />
      </a-form-item>

      <a-form-item label="设备类型" :colon="false" class="of-field">
        <a-select
          v-model:value="query.deviceType"
          :options="DEVICE_TYPE_OPTIONS"
          placeholder="全部"
          allow-clear
          style="width: 120px"
        />
      </a-form-item>
    </SearchBar>

    <!-- 数据表格（PRD 5.3）-->
    <DataTable
      :columns="columns"
      :data-source="paged"
      :loading="loading"
      :total="filtered.length"
      :current="page.current"
      :page-size="page.pageSize"
      :scroll-x="1500"
      @change="(p: number, s: number) => { page.current = p; page.pageSize = s; onSearch() }"
    >
      <template #bodyCell="{ column, record }">
        <!-- 设备ID -->
        <template v-if="column.key === 'id'">
          <div style="text-align: center">{{ record.id }}</div>
        </template>

        <!-- 设备名称 -->
        <template v-else-if="column.key === 'name'">
          <div style="text-align: center">{{ record.name }}</div>
        </template>

        <!-- 所属营地 -->
        <template v-else-if="column.key === 'camp'">
          <div style="text-align: center">{{ getCampName(record.camp) }}</div>
        </template>

        <!-- 设备类型 -->
        <template v-else-if="column.key === 'deviceType'">
          <div style="text-align: center">{{ getDeviceTypeLabel(record.deviceType) }}</div>
        </template>

        <!-- GPS卫星数量 -->
        <template v-else-if="column.key === 'GpsStalliteNum'">
          <div style="text-align: right">
            <span
              :class="{ 'cell-flash': flashIds.has(record.id), 'cell-offline': !record.dev_online }"
            >
              {{ record.GpsStalliteNum >= 0 ? record.GpsStalliteNum : '--' }}
            </span>
          </div>
        </template>

        <!-- 设备状态 -->
        <template v-else-if="column.key === 'DeviceStatus'">
          <span
            :class="{ 'cell-flash': flashIds.has(record.id), 'cell-offline': !record.dev_online }"
          >
            <a-tag :color="getDeviceStatus(record.DeviceStatus).color">
              {{ getDeviceStatus(record.DeviceStatus).label }}
            </a-tag>
          </span>
        </template>

        <!-- 设备在线 -->
        <template v-else-if="column.key === 'dev_online'">
          <span :class="{ 'cell-flash': flashIds.has(record.id) }">
            <CheckOutlined v-if="record.dev_online" style="color: #52c41a" />
            <CloseOutlined v-else style="color: #ff4d4f" />
          </span>
        </template>

        <!-- 通信时间 -->
        <template v-else-if="column.key === 'connectTime'">
          <div style="text-align: center">{{ record.connectTime }}</div>
        </template>

        <!-- 今日统计列（PRD 5.4：离线时不置灰，继续更新）-->
        <template
          v-else-if="
            column.key === 'todayDetectCount' ||
            column.key === 'todayWarningCount' ||
            column.key === 'todayIntrusionCount'
          "
        >
          <div style="text-align: right">
            <span :class="{ 'cell-flash': flashIds.has(record.id) }">
              {{ record[column.key] }}
            </span>
          </div>
        </template>

        <!-- 操作列 -->
        <template v-else-if="column.key === 'action'">
          <a @click="viewLocation(record)">查看位置</a>
        </template>
      </template>
    </DataTable>

    <!-- 查看位置弹窗 -->
    <a-modal
      :visible="locationModalVisible"
      :title="`设备位置 — ${currentDevice?.name}`"
      width="80%"
      :footer="null"
      :body-style="{ padding: 0, height: '80vh' }"
    >
      <div style="display: flex; flex-direction: column; height: 100%">
        <!-- 地图区域 -->
        <div
          style="
            flex: 1;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          "
        >
          <div style="text-align: center; color: #8c8c8c">
            <p style="font-size: 16px; margin-bottom: 8px">地图组件占位</p>
            <p style="font-size: 14px">实际开发时集成GIS地图服务</p>
            <div v-if="editableLocation.latitude && editableLocation.longitude" style="margin-top: 16px; color: #1890ff">
              📍 设备位置：{{ editableLocation.longitude.toFixed(6) }}, {{ editableLocation.latitude.toFixed(6) }}
            </div>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div
          style="
            padding: 16px;
            background: #1f1f1f;
            border-top: 1px solid #303030;
            display: flex;
            justify-content: flex-end;
            align-items: center;
          "
        >
          <a-button @click="locationModalVisible = false">关闭</a-button>
        </div>
      </div>
    </a-modal>
  </PageContainer>
</template>

<style scoped lang="scss">
.of-field {
  margin-bottom: 0;
}

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
    flex: 1;
    font-size: var(--of-font-size-base);
  }

  &--warn {
    border-left-color: var(--of-color-warning);
    .of-alert__icon {
      color: var(--of-color-warning);
    }
  }
}

// 固定列底色由 global.scss 统一处理（操作列 fixed: 'right' 必须不透明，
// 否则横向滚动时下方列会穿透上来），此处不再覆写。

// 单元格闪烁高亮效果（PRD 5.4 联动规则）
.cell-flash {
  animation: highlight 1.5s ease-out;
}

@keyframes highlight {
  0% {
    background-color: rgba(24, 144, 255, 0.2);
  }
  100% {
    background-color: transparent;
  }
}

// 设备离线时状态字段置灰（PRD 5.4）
.cell-offline {
  opacity: 0.45;
}

// WS 断连时表格整体未知态（PRD 3.2 防误判铁律）
:deep(.ws-disconnected) {
  .ant-table-tbody > tr {
    opacity: 0.6;
  }
}
</style>
