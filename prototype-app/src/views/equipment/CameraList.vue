<script setup lang="ts">
/**
 * 高点摄像头管理 —— 列表页
 * PRD: 装备管理 · 高点摄像头管理 v1.1
 *
 * 页面布局（PRD 5.1）：
 *   面包屑标题条 → WS 断开告警条（条件）
 *   → 筛选区 → 数据表格 → 分页
 *
 * 核心约束：
 *   - 平台完全只读，无增删改权限（PRD 1.4）
 *   - 通道在线/离线状态由中台判定并推送（PRD 2 术语定义）
 *   - WebSocket 断连时严禁批量判离线（PRD 3.2 防误判铁律）
 *   - 多个通道聚合为一个物理设备，按设备维度展示（PRD 2 设备与通道关系）
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { CheckOutlined, CloseOutlined, MinusOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  MOCK_CAMERA_CHANNELS,
  type CameraChannel,
} from '@/mock/camera'

// ============================ 数据聚合：通道 → 设备 ============================

/** 设备聚合数据结构 */
interface CameraDevice {
  /** 设备名称（去掉通道后缀）*/
  name: string
  /** 所属营地ID */
  campId: string
  /** 所属营地名称 */
  campName: string
  /** 该设备下的所有通道 */
  channels: CameraChannel[]
  /** 设备位置（取第一个通道的位置）*/
  location?: { latitude: number; longitude: number }
}

/** 将通道列表聚合为设备列表 */
function groupChannelsToDevices(channels: CameraChannel[]): CameraDevice[] {
  const deviceMap = new Map<string, CameraDevice>()

  channels.forEach(channel => {
    const groupKey = channel.deviceGroup || channel.name // 优先使用 deviceGroup，否则用 name

    if (!deviceMap.has(groupKey)) {
      deviceMap.set(groupKey, {
        name: groupKey,
        campId: channel.campId,
        campName: channel.campName,
        channels: [],
        location: channel.location,
      })
    }

    deviceMap.get(groupKey)!.channels.push(channel)
  })

  return Array.from(deviceMap.values())
}

// ============================ 查询条件 ============================

const query = reactive({
  name: '',
  campName: '',
})

// ============================ 数据源 ============================

const allChannels = ref<CameraChannel[]>([...MOCK_CAMERA_CHANNELS])

/** 聚合后的设备列表 */
const allDevices = computed(() => groupChannelsToDevices(allChannels.value))

/** 筛选后的设备 */
const filtered = computed(() => {
  return allDevices.value.filter(device => {
    const matchName = !query.name || device.name.includes(query.name)
    const matchCamp = !query.campName || device.campName.includes(query.campName)
    return matchName && matchCamp
  })
})

// ============================ 分页 ============================

const page = reactive({ current: 1, pageSize: 20 })
const loading = ref(false)

const paged = computed(() => {
  const start = (page.current - 1) * page.pageSize
  const end = start + page.pageSize
  return filtered.value.slice(start, end)
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
  page.current = 1
  onSearch()
}

// ============================ 位置查看 ============================

const locationModalVisible = ref(false)
const currentDevice = ref<CameraDevice | null>(null)
const editableLocation = reactive({
  latitude: 0,
  longitude: 0,
})

function viewLocation(record: CameraDevice) {
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

/** 复制通道编号到剪贴板 */
async function copyChannelId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    message.success('已复制')
  } catch (err) {
    message.error('复制失败，请手动选中复制')
  }
}

// ============================ 表格列定义 ============================

const columns: TableColumnsType = [
  {
    title: '设备名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
    align: 'center',
    ellipsis: true,
  },
  {
    title: '所属营地',
    dataIndex: 'campName',
    key: 'campName',
    width: 140,
    align: 'center',
  },
  {
    title: '通道',
    key: 'channels',
    width: 200,
    align: 'center',
  },
  {
    title: '经纬度',
    key: 'location',
    width: 220,
    align: 'center',
  },
  {
    title: '在线',
    key: 'online',
    width: 140,
    align: 'center',
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    align: 'center',
    fixed: 'right',
  },
]

// ============================ WS 实时状态更新 ============================

const flashIds = ref<Set<string>>(new Set())
let wsTimer: ReturnType<typeof setInterval> | null = null

function simulateWsUpdate() {
  if (!wsConnected.value) return

  const randomIdx = Math.floor(Math.random() * allChannels.value.length)
  const channel = allChannels.value[randomIdx]

  // 随机切换在线状态
  channel.online = Math.random() > 0.3

  // 闪烁高亮效果（整个设备行闪烁）
  const device = allDevices.value.find(d => d.channels.some(c => c.id === channel.id))
  if (device) {
    flashIds.value.add(device.name)
    setTimeout(() => {
      flashIds.value.delete(device.name)
    }, 800)
  }
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
  <PageContainer title="高点摄像头">
    <PanelCard>
      <!-- WS 断开告警条（PRD 5.1 页面骨架）-->
      <div v-if="!wsConnected" class="of-alert of-alert--warn" style="margin-bottom: 16px">
        <WarningOutlined class="of-alert__icon" />
        <span class="of-alert__text">
          实时状态同步已中断，正在重连…（当前展示为最后同步数据，更新于 {{ wsDisconnectTime }}）
        </span>
      </div>

      <!-- 筛选区（PRD 5.2 筛选控件）-->
      <SearchBar :loading="loading" @reset="onReset" @search="onSearch">
        <a-form-item label="设备名称" :colon="false" class="of-field">
          <a-input
            v-model:value="query.name"
            placeholder="请输入"
            style="width: 200px"
            @press-enter="onSearch"
          />
        </a-form-item>
        <a-form-item label="营地名称" :colon="false" class="of-field">
          <a-input
            v-model:value="query.campName"
            placeholder="请输入"
            style="width: 200px"
            @press-enter="onSearch"
          />
        </a-form-item>
      </SearchBar>

      <!-- 数据表格（PRD 5.3 表格列定义）-->
      <a-table
        class="of-table"
        :columns="columns"
        :data-source="paged"
        :loading="loading"
        row-key="name"
        :scroll="{ x: 1200 }"
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
            <div style="text-align: center">{{ record.name }}</div>
          </template>

          <!-- 所属营地列 -->
          <template v-if="column.key === 'campName'">
            <div style="text-align: center">{{ record.campName }}</div>
          </template>

          <!-- 通道列：Tag 显示，颜色表示在线状态，悬停显示编号 -->
          <template v-if="column.key === 'channels'">
            <div style="text-align: center">
              <a-space>
                <a-tooltip v-for="ch in record.channels" :key="ch.id" :title="`编号：${ch.id}`">
                  <a-tag :color="ch.online ? 'green' : 'default'">
                    {{ ch.name.split('-')[1] || ch.name }}
                  </a-tag>
                </a-tooltip>
              </a-space>
            </div>
          </template>

          <!-- 经纬度列 -->
          <template v-else-if="column.key === 'location'">
            <div style="text-align: center">
              <span v-if="record.location">
                {{ record.location.latitude.toFixed(6) }}, {{ record.location.longitude.toFixed(6) }}
              </span>
              <span v-else style="color: #8c8c8c">--</span>
            </div>
          </template>

          <!-- 在线状态：2/2通道在线格式 -->
          <template v-else-if="column.key === 'online'">
            <div style="text-align: center">
              <span :class="{ 'cell-flash': flashIds.has(record.name) }">
                <template v-if="wsConnected">
                  {{ record.channels.filter((c: CameraChannel) => c.online).length }}/{{ record.channels.length }}通道在线
                </template>
                <template v-else>
                  <a-tooltip :title="`链路中断，状态未知。最后同步于 ${wsDisconnectTime}`">
                    <MinusOutlined style="color: #d9d9d9; opacity: 0.45" />
                  </a-tooltip>
                </template>
              </span>
            </div>
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="viewLocation(record)">查看位置</a-button>
          </template>
        </template>
      </a-table>
    </PanelCard>

    <!-- 位置查看弹窗 -->
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
// WS 断开告警条（PRD 5.1 页面骨架）
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

// 单元格闪烁高亮效果（PRD 5.4 联动规则）
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

// WS 断连时表格整体未知态（PRD 3.2 防误判铁律）
:deep(.ws-disconnected) {
  .ant-table-tbody > tr {
    opacity: 0.6;
  }
}
</style>
