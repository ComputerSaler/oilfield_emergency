<script setup lang="ts">
/**
 * CCTV 管理 —— 列表页
 * PRD: 装备管理 · CCTV 管理 v1.0
 *
 * 页面布局（PRD §5.1）：
 *   面包屑标题条 → WS 断开告警条（条件）
 *   → 筛选区 → 数据表格 → 分页
 *
 * 核心约束：
 *   - 平台完全只读，无增删改权限（PRD §1.4）
 *   - 在线状态由中台判定并推送（PRD §3.2）
 *   - WebSocket 断连时严禁批量判离线（PRD §3.2 防误判铁律）
 *   - 经纬度为平台扩展字段，可标记编辑（PRD §3.4）
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { MinusOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  MOCK_CCTV_DEVICES,
  type CctvDevice,
} from '@/mock/cctv'
import DeviceVideoFloatWindow from './components/DeviceVideoFloatWindow.vue'

// ============================ 查询条件 ============================

const query = reactive({
  name: '',
  campName: '',
  siteName: '',
  onlineStatus: 'all', // 'all' | 'online' | 'offline'
  ipAddress: '',
})

// ============================ 数据源 ============================

const allDevices = ref<CctvDevice[]>([...MOCK_CCTV_DEVICES])

/** 筛选后的设备 */
const filtered = computed(() => {
  return allDevices.value.filter(device => {
    const matchName = !query.name || device.name.includes(query.name)
    const matchCamp = !query.campName || device.campName.includes(query.campName)
    const matchSite = !query.siteName || device.siteName.includes(query.siteName)
    const matchIp = !query.ipAddress || device.ipAddress.includes(query.ipAddress)
    const matchOnline =
      query.onlineStatus === 'all' ||
      (query.onlineStatus === 'online' && device.online) ||
      (query.onlineStatus === 'offline' && !device.online)
    return matchName && matchCamp && matchSite && matchIp && matchOnline
  })
})

// 排序：在线状态降序（在线优先），设备名称升序
const sorted = computed(() => {
  return [...filtered.value].sort((a, b) => {
    // 先按在线状态排序（在线优先）
    if (a.online !== b.online) {
      return a.online ? -1 : 1
    }
    // 再按设备名称升序
    return a.name.localeCompare(b.name, 'zh-CN')
  })
})

// ============================ 分页 ============================

const page = reactive({ current: 1, pageSize: 20 })
const loading = ref(false)

const paged = computed(() => {
  const start = (page.current - 1) * page.pageSize
  const end = start + page.pageSize
  return sorted.value.slice(start, end)
})

// ============================ WebSocket 状态 ============================

const wsConnected = ref(true)
const wsDisconnectTime = ref('')

// ============================ 操作 ============================

function onSearch() {
  loading.value = true
  page.current = 1
  setTimeout(() => (loading.value = false), 300)
}

function onReset() {
  query.name = ''
  query.campName = ''
  query.siteName = ''
  query.onlineStatus = 'all'
  query.ipAddress = ''
  page.current = 1
  onSearch()
}

// ============================ 位置标记/查看 ============================

const locationModalVisible = ref(false)
const currentDevice = ref<CctvDevice | null>(null)
const editableLocation = reactive({
  latitude: 0,
  longitude: 0,
})

function markLocation(record: CctvDevice) {
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

function viewLocation(record: CctvDevice) {
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

function saveLocation() {
  if (!currentDevice.value) return

  // 校验经纬度范围
  if (
    editableLocation.longitude < -180 ||
    editableLocation.longitude > 180 ||
    editableLocation.latitude < -90 ||
    editableLocation.latitude > 90
  ) {
    message.error('经纬度超出有效范围，请检查后重试')
    return
  }

  // 更新该设备的位置（原型阶段模拟保存）
  const device = allDevices.value.find(d => d.id === currentDevice.value!.id)
  if (device) {
    device.location = {
      latitude: editableLocation.latitude,
      longitude: editableLocation.longitude,
    }
  }

  message.success('位置已保存')
  locationModalVisible.value = false
}

/** 实时监控浮窗（PRD §5.4）*/
const videoFloatVisible = ref(false)
const currentVideoDevice = ref<CctvDevice>()

function openVideoMonitor(record: CctvDevice) {
  currentVideoDevice.value = record
  videoFloatVisible.value = true
}

function closeVideoMonitor() {
  videoFloatVisible.value = false
  // 关闭时清空设备，模拟断开视频流
  setTimeout(() => {
    if (!videoFloatVisible.value) {
      currentVideoDevice.value = undefined
    }
  }, 300)
}

// ============================ 表格列定义（PRD §5.3）============================

const columns: TableColumnsType = [
  {
    title: '设备名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
    align: 'center',
    ellipsis: true,
    sorter: (a: CctvDevice, b: CctvDevice) => a.name.localeCompare(b.name, 'zh-CN'),
  },
  {
    title: '所属营地',
    dataIndex: 'campName',
    key: 'campName',
    width: 140,
    align: 'center',
  },
  {
    title: '站点',
    dataIndex: 'siteName',
    key: 'siteName',
    width: 120,
    align: 'center',
  },
  {
    title: '在线状态',
    dataIndex: 'online',
    key: 'online',
    width: 100,
    align: 'center',
    sorter: (a: CctvDevice, b: CctvDevice) => (a.online === b.online ? 0 : a.online ? -1 : 1),
  },
  {
    title: 'IP地址',
    dataIndex: 'ipAddress',
    key: 'ipAddress',
    width: 140,
    align: 'center',
  },
  {
    title: '服务器',
    dataIndex: 'serverName',
    key: 'serverName',
    width: 140,
    align: 'center',
  },
  {
    title: '经纬度',
    key: 'location',
    width: 220,
    align: 'center',
  },
  {
    title: '操作',
    key: 'action',
    width: 240,
    align: 'center',
    fixed: 'right',
  },
]

// ============================ WS 实时状态更新 ============================

const flashIds = ref<Set<string>>(new Set())
let wsTimer: ReturnType<typeof setInterval> | null = null

function simulateWsUpdate() {
  if (!wsConnected.value) return

  const randomIdx = Math.floor(Math.random() * allDevices.value.length)
  const device = allDevices.value[randomIdx]

  // 随机切换在线状态
  device.online = Math.random() > 0.3

  // 闪烁高亮效果
  flashIds.value.add(device.id)
  setTimeout(() => {
    flashIds.value.delete(device.id)
  }, 800)
}

/** 模拟 WS 断线重连 */
function simulateWsDisconnect() {
  wsConnected.value = false
  wsDisconnectTime.value = new Date().toLocaleString('zh-CN', { hour12: false })

  // 5 秒后自动重连
  setTimeout(() => {
    wsConnected.value = true
    wsDisconnectTime.value = ''
    message.success('实时同步已恢复', 2)
  }, 5000)
}

// ============================ 生命周期 ============================

onMounted(() => {
  // 首屏加载
  onSearch()

  // 启动 WS 模拟
  wsTimer = setInterval(simulateWsUpdate, 6000)

  // 30 秒后模拟一次断线（演示用）
  setTimeout(simulateWsDisconnect, 30000)
})

onBeforeUnmount(() => {
  if (wsTimer) clearInterval(wsTimer)
})
</script>

<template>
  <PageContainer title="CCTV管理">
    <PanelCard>
      <!-- WS 断开告警条（PRD §5.6）-->
      <div v-if="!wsConnected" class="of-alert of-alert--warn" style="margin-bottom: 16px">
        <WarningOutlined class="of-alert__icon" />
        <span class="of-alert__text">
          与服务器连接中断，设备状态无法更新，正在尝试重连...（最后同步于 {{ wsDisconnectTime }}）
        </span>
      </div>

      <!-- 筛选区（PRD §5.2 筛选功能）-->
      <SearchBar :loading="loading" @reset="onReset" @search="onSearch">
        <a-form-item label="设备名称" :colon="false" class="of-field">
          <a-input
            v-model:value="query.name"
            placeholder="请输入设备名称"
            style="width: 200px"
            @press-enter="onSearch"
          />
        </a-form-item>
        <a-form-item label="营地" :colon="false" class="of-field">
          <a-input
            v-model:value="query.campName"
            placeholder="请输入营地名称"
            style="width: 200px"
            @press-enter="onSearch"
          />
        </a-form-item>
        <a-form-item label="站点" :colon="false" class="of-field">
          <a-input
            v-model:value="query.siteName"
            placeholder="请输入站点名称"
            style="width: 200px"
            @press-enter="onSearch"
          />
        </a-form-item>
        <a-form-item label="在线状态" :colon="false" class="of-field">
          <a-select
            v-model:value="query.onlineStatus"
            style="width: 140px"
            placeholder="请选择在线状态"
          >
            <a-select-option value="all">全部</a-select-option>
            <a-select-option value="online">在线</a-select-option>
            <a-select-option value="offline">离线</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="IP地址" :colon="false" class="of-field">
          <a-input
            v-model:value="query.ipAddress"
            placeholder="请输入IP地址"
            style="width: 200px"
            @press-enter="onSearch"
          />
        </a-form-item>
      </SearchBar>

      <!-- 数据表格（PRD §5.3 表格列定义）-->
      <a-table
        class="of-table"
        :columns="columns"
        :data-source="paged"
        :loading="loading"
        row-key="id"
        :scroll="{ x: 1280 }"
        :pagination="{
          current: page.current,
          pageSize: page.pageSize,
          total: filtered.length,
          showTotal: (t: number) => `共${t}条`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (p: number, s: number) => { page.current = p; page.pageSize = s },
        }"
        :class="{ 'ws-disconnected': !wsConnected }"
      >
        <template #bodyCell="{ column, record }">
          <!-- 设备名称列 -->
          <template v-if="column.key === 'name'">
            <a-tooltip :title="record.name">
              <div style="text-align: center">{{ record.name }}</div>
            </a-tooltip>
          </template>

          <!-- 所属营地列 -->
          <template v-else-if="column.key === 'campName'">
            <div style="text-align: center">{{ record.campName || '--' }}</div>
          </template>

          <!-- 站点列 -->
          <template v-else-if="column.key === 'siteName'">
            <div style="text-align: center">{{ record.siteName || '--' }}</div>
          </template>

          <!-- 在线状态列（PRD §5.3 表格列定义）-->
          <template v-else-if="column.key === 'online'">
            <div style="text-align: center">
              <span :class="{ 'cell-flash': flashIds.has(record.id) }">
                <template v-if="wsConnected">
                  <span :style="{ color: record.online ? '#52c41a' : '#8c8c8c' }">
                    {{ record.online ? '在线' : '离线' }}
                  </span>
                </template>
                <template v-else>
                  <a-tooltip :title="`链路中断，状态未知。最后同步于 ${wsDisconnectTime}`">
                    <MinusOutlined style="color: #d9d9d9; opacity: 0.45" />
                  </a-tooltip>
                </template>
              </span>
            </div>
          </template>

          <!-- IP地址列 -->
          <template v-else-if="column.key === 'ipAddress'">
            <a-tooltip :title="record.ipAddress">
              <div style="text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">{{ record.ipAddress }}</div>
            </a-tooltip>
          </template>

          <!-- 服务器列 -->
          <template v-else-if="column.key === 'serverName'">
            <a-tooltip :title="record.serverName || '--'">
              <div style="text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">{{ record.serverName || '--' }}</div>
            </a-tooltip>
          </template>

          <!-- 经纬度列（PRD §5.3 表格列定义）-->
          <template v-else-if="column.key === 'location'">
            <div style="text-align: center">
              <span v-if="record.location">
                {{ record.location.latitude.toFixed(6) }}, {{ record.location.longitude.toFixed(6) }}
              </span>
              <span v-else style="color: #8c8c8c">--</span>
            </div>
          </template>

          <!-- 操作列（PRD §5.4 操作按钮）-->
          <template v-else-if="column.key === 'action'">
            <a-space :size="8">
              <a-button type="link" @click="markLocation(record as CctvDevice)">标记位置</a-button>
              <span style="color: rgba(255, 255, 255, 0.2)">|</span>
              <a-button type="link" @click="viewLocation(record as CctvDevice)">查看位置</a-button>
              <span style="color: rgba(255, 255, 255, 0.2)">|</span>
              <a-button type="link" @click="openVideoMonitor(record as CctvDevice)">实时监控</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </PanelCard>

    <!-- 位置设置弹窗（PRD §5.5 位置标记弹窗）-->
    <a-modal
      :visible="locationModalVisible"
      :title="`设备位置 — ${currentDevice?.name}`"
      width="80%"
      :footer="null"
      :closable="false"
      :body-style="{ padding: 0, height: '80vh' }"
    >
      <div style="display: flex; flex-direction: column; height: 100%">
        <!-- 地图区域（V1 原型阶段占位）-->
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
            <p style="font-size: 16px; margin-bottom: 8px">地图功能待集成</p>
            <p style="font-size: 14px">实际开发时集成 GIS 地图服务</p>
            <div v-if="editableLocation.latitude && editableLocation.longitude" style="margin-top: 16px; color: #1890ff">
              📍 设备位置：{{ editableLocation.longitude.toFixed(6) }}, {{ editableLocation.latitude.toFixed(6) }}
            </div>
          </div>
        </div>

        <!-- 底部操作栏（PRD §5.5 操作栏规格）-->
        <div
          style="
            padding: 16px;
            background: #1f1f1f;
            border-top: 1px solid #303030;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          "
        >
          <div style="display: flex; gap: 24px; align-items: center; flex: 1">
            <div style="color: #fff; font-weight: 500; font-size: 16px">{{ currentDevice?.name }}</div>
            <div style="display: flex; gap: 16px; align-items: center">
              <span style="color: #8c8c8c">经度：</span>
              <a-input-number
                v-model:value="editableLocation.longitude"
                :min="-180"
                :max="180"
                :precision="6"
                :step="0.000001"
                style="width: 140px"
                placeholder="请输入经度"
              />
              <span style="color: #8c8c8c">纬度：</span>
              <a-input-number
                v-model:value="editableLocation.latitude"
                :min="-90"
                :max="90"
                :precision="6"
                :step="0.000001"
                style="width: 140px"
                placeholder="请输入纬度"
              />
            </div>
          </div>
          <a-space>
            <a-button @click="locationModalVisible = false">取消</a-button>
            <a-button type="primary" @click="saveLocation">保存</a-button>
          </a-space>
        </div>
      </div>
    </a-modal>

    <!-- 视频监控浮窗（PRD §5.4 实时监控浮窗）-->
    <DeviceVideoFloatWindow
      :visible="videoFloatVisible"
      :device="currentVideoDevice"
      @close="closeVideoMonitor"
    />
  </PageContainer>
</template>

<style scoped lang="scss">
// WS 断开告警条（PRD §5.6 WS 断线处理）
.of-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 4px;
  border-left: 4px solid;

  &__icon {
    flex-shrink: 0;
    font-size: 16px;
  }

  &__text {
    flex: 1;
    font-size: 14px;
  }

  &--warn {
    border-left-color: var(--of-color-warning);
    .of-alert__icon {
      color: var(--of-color-warning);
    }
  }
}

// 单元格闪烁高亮效果（WS 实时更新）
.cell-flash {
  animation: highlight 0.8s ease-out;
}

@keyframes highlight {
  0% {
    background-color: rgba(24, 144, 255, 0.2);
  }
  100% {
    background-color: transparent;
  }
}

// WS 断连时表格整体未知态（PRD §3.2 防误判铁律）
:deep(.ws-disconnected) {
  .ant-table-tbody > tr {
    opacity: 0.6;
  }
}
</style>
