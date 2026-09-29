<script setup lang="ts">
/**
 * 探测记录 —— 反无记录台账
 * 纯台账页面：列表 + 搜索 + CRUD
 */
import { computed, reactive, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  DETECTION_RECORDS,
  WHITE_LIST_OPTIONS,
  type DetectionRecord,
} from '@/mock/counterUasRecords'

// ========================= 筛选条件 =========================

const query = reactive({
  uav_id: '', // 序列号
  isWhiteList: '', // 是否白名单
  device_name: '', // 侦测设备名称
  dateRange: [] as string[], // 创建时间范围
})

const isFilterDirty = computed(() =>
  query.uav_id.trim() !== '' ||
  query.isWhiteList !== '' ||
  query.device_name.trim() !== '' ||
  query.dateRange.length > 0,
)

function onReset() {
  query.uav_id = ''
  query.isWhiteList = ''
  query.device_name = ''
  query.dateRange = []
  page.current = 1
}

// ========================= 数据层 =========================

const page = reactive({ current: 1, pageSize: 20 })
const loading = ref(false)
const dataSource = ref<DetectionRecord[]>([...DETECTION_RECORDS])

const filteredData = computed(() => {
  return dataSource.value.filter(d => {
    if (query.uav_id.trim() && !d.uav_id.toLowerCase().includes(query.uav_id.trim().toLowerCase())) {
      return false
    }
    if (query.isWhiteList && d.isWhiteList !== query.isWhiteList) {
      return false
    }
    if (query.device_name.trim() && !d.device_name.toLowerCase().includes(query.device_name.trim().toLowerCase())) {
      return false
    }
    if (query.dateRange.length === 2) {
      const createTime = new Date(d.createTime).getTime()
      const start = new Date(query.dateRange[0]).getTime()
      const end = new Date(query.dateRange[1]).getTime()
      if (createTime < start || createTime > end) {
        return false
      }
    }
    return true
  })
})

const pagedData = computed(() => {
  const s = (page.current - 1) * page.pageSize
  return filteredData.value.slice(s, s + page.pageSize)
})

// ========================= 表格列定义 =========================
const columns: TableColumnsType = [
  {
    title: '记录ID',
    dataIndex: 'id',
    key: 'id',
    width: 180,
    align: 'center',
    ellipsis: true,
  },
  {
    title: '序列号',
    dataIndex: 'uav_id',
    key: 'uav_id',
    width: 160,
    align: 'center',
    ellipsis: true,
  },
  {
    title: '无人机名称',
    dataIndex: 'uav_name',
    key: 'uav_name',
    width: 150,
    align: 'center',
  },
  {
    title: '无人机型号',
    dataIndex: 'uav_model',
    key: 'uav_model',
    width: 180,
    align: 'center',
  },
  {
    title: '轨迹ID',
    dataIndex: 'trace_id',
    key: 'trace_id',
    width: 180,
    align: 'center',
    ellipsis: true,
  },
  {
    title: '侦测设备',
    dataIndex: 'device_name',
    key: 'device_name',
    width: 140,
    align: 'center',
  },
  {
    title: '频率(GHz)',
    dataIndex: 'frequency',
    key: 'frequency',
    width: 120,
    align: 'right',
  },
  {
    title: '持续时间(s)',
    dataIndex: 'duration',
    key: 'duration',
    width: 120,
    align: 'right',
  },
  {
    title: '是否白名单',
    dataIndex: 'isWhiteList',
    key: 'isWhiteList',
    width: 120,
    align: 'center',
  },
  {
    title: '侦测开始',
    dataIndex: 'start_time',
    key: 'start_time',
    width: 180,
    align: 'center',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 180,
    align: 'center',
  },
]

// ========================= 时间格式化 =========================

function formatDateTime(isoTime: string): string {
  const d = new Date(isoTime)
  return d.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}
</script>

<template>
  <PageContainer title="探测记录">
    <PanelCard title="探测记录列表">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-row">
          <div class="search-item">
            <span class="search-label">序列号</span>
            <a-input
              v-model:value="query.uav_id"
              placeholder="输入序列号搜索"
              allow-clear
              style="width: 200px"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </div>
          <div class="search-item">
            <span class="search-label">是否白名单</span>
            <a-select
              v-model:value="query.isWhiteList"
              :options="WHITE_LIST_OPTIONS"
              style="width: 140px"
            />
          </div>
          <div class="search-item">
            <span class="search-label">侦测设备</span>
            <a-input
              v-model:value="query.device_name"
              placeholder="输入设备名称"
              allow-clear
              style="width: 180px"
            />
          </div>
          <div class="search-item">
            <span class="search-label">创建时间</span>
            <a-range-picker
              v-model:value="query.dateRange"
              format="YYYY-MM-DD"
              style="width: 260px"
            />
          </div>
        </div>
        <div class="search-actions">
          <a-button v-if="isFilterDirty" @click="onReset">重置</a-button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-bar">
        <span class="stat-item">总计：<strong>{{ filteredData.length }}</strong> 条</span>
        <span class="stat-item">白名单：<strong>{{ filteredData.filter(d => d.isWhiteList === '是').length }}</strong> 条</span>
      </div>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="pagedData"
        :pagination="{
          current: page.current,
          pageSize: page.pageSize,
          total: filteredData.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total: number) => `共 ${total} 条`,
        }"
        :loading="loading"
        :scroll="{ x: 1800 }"
        @change="(p: any) => { page.current = p.current; page.pageSize = p.pageSize }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'isWhiteList'">
            <span
              class="status-badge"
              :style="{ backgroundColor: record.isWhiteList === '是' ? '#52c41a' : '#8c8c8c' }"
            >
              {{ record.isWhiteList }}
            </span>
          </template>
          <template v-else-if="column.key === 'start_time'">
            {{ formatDateTime(record.start_time) }}
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
        </template>
      </a-table>
    </PanelCard>
  </PageContainer>
</template>

<style scoped lang="scss">
.search-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
}

.search-row {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-label {
  font-size: 14px;
  color: var(--of-text-secondary);
  white-space: nowrap;
}

.search-actions {
  display: flex;
  gap: 8px;
}

.stats-bar {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--of-fill-quaternary);
  border-radius: 4px;
}

.stat-item {
  font-size: 14px;
  color: var(--of-text-secondary);

  strong {
    color: var(--of-text-primary);
    font-size: 16px;
    margin-left: 4px;
  }
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--of-text-primary);
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.modal-content {
  padding: 16px 0;
}

.modal-tip {
  text-align: center;
  color: var(--of-text-tertiary);
  font-size: 14px;
}
</style>
