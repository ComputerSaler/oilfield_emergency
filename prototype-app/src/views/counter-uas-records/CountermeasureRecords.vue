<script setup lang="ts">
/**
 * 反制记录 —— 反无记录台账
 * 纯台账页面：列表 + 搜索 + CRUD
 */
import { computed, reactive, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  COUNTERMEASURE_RECORDS,
  COUNTERMEASURE_TYPE_OPTIONS,
  STATUS_OPTIONS,
  getDirectionLabel,
  getStatusColor,
  getStatusLabel,
  type CountermeasureRecord,
} from '@/mock/counterUasRecords'

// ========================= 筛选条件 =========================

const query = reactive({
  id: '', // 记录编号
  name: '', // 反制类型
  device_name: '', // 反制设备名称
  status: '', // 执行状态
  dateRange: [] as string[], // 创建时间范围
})

const isFilterDirty = computed(() =>
  query.id.trim() !== '' ||
  query.name !== '' ||
  query.device_name.trim() !== '' ||
  query.status !== '' ||
  query.dateRange.length > 0,
)

function onReset() {
  query.id = ''
  query.name = ''
  query.device_name = ''
  query.status = ''
  query.dateRange = []
  page.current = 1
}

// ========================= 数据层 =========================

const page = reactive({ current: 1, pageSize: 20 })
const loading = ref(false)
const dataSource = ref<CountermeasureRecord[]>([...COUNTERMEASURE_RECORDS])

const filteredData = computed(() => {
  return dataSource.value.filter(d => {
    if (query.id.trim() && !d.id.toLowerCase().includes(query.id.trim().toLowerCase())) {
      return false
    }
    if (query.name && d.name !== query.name) {
      return false
    }
    if (query.device_name.trim() && !d.device_name.toLowerCase().includes(query.device_name.trim().toLowerCase())) {
      return false
    }
    if (query.status && d.status !== query.status) {
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
    title: '记录编号',
    dataIndex: 'id',
    key: 'id',
    width: 180,
    align: 'center',
    ellipsis: true,
  },
  {
    title: '反制类型',
    dataIndex: 'name',
    key: 'name',
    width: 120,
    align: 'center',
  },
  {
    title: '反制设备',
    dataIndex: 'device_name',
    key: 'device_name',
    width: 140,
    align: 'center',
  },
  {
    title: '反制方式',
    dataIndex: 'jammer_type',
    key: 'jammer_type',
    width: 120,
    align: 'center',
  },
  {
    title: '操作人',
    dataIndex: 'operator',
    key: 'operator',
    width: 100,
    align: 'center',
  },
  {
    title: '反制频段',
    dataIndex: 'Frequency',
    key: 'Frequency',
    width: 140,
    align: 'center',
  },
  {
    title: '打击扇区',
    dataIndex: 'Direction',
    key: 'Direction',
    width: 160,
    align: 'center',
  },
  {
    title: '持续时间(s)',
    dataIndex: 'Duration',
    key: 'Duration',
    width: 120,
    align: 'right',
  },
  {
    title: '执行状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: '下发指令时间',
    dataIndex: 'issuingInstructionTime',
    key: 'issuingInstructionTime',
    width: 180,
    align: 'center',
  },
  {
    title: '指令执行时间',
    dataIndex: 'executionTime',
    key: 'executionTime',
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
  <PageContainer title="反制记录">
    <PanelCard title="反制记录列表">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-row">
          <div class="search-item">
            <span class="search-label">记录编号</span>
            <a-input
              v-model:value="query.id"
              placeholder="输入编号搜索"
              allow-clear
              style="width: 200px"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </div>
          <div class="search-item">
            <span class="search-label">反制类型</span>
            <a-select
              v-model:value="query.name"
              :options="COUNTERMEASURE_TYPE_OPTIONS"
              style="width: 140px"
            />
          </div>
          <div class="search-item">
            <span class="search-label">执行状态</span>
            <a-select
              v-model:value="query.status"
              :options="STATUS_OPTIONS"
              style="width: 140px"
            />
          </div>
          <div class="search-item">
            <span class="search-label">反制设备</span>
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
        <span class="stat-item">手动反制：<strong>{{ filteredData.filter(d => d.name === '手动反制').length }}</strong> 条</span>
        <span class="stat-item">自动反制：<strong>{{ filteredData.filter(d => d.name === '自动反制').length }}</strong> 条</span>
        <span class="stat-item">成功：<strong>{{ filteredData.filter(d => d.status === '是').length }}</strong> 条</span>
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
        :scroll="{ x: 2100 }"
        @change="(p: any) => { page.current = p.current; page.pageSize = p.pageSize }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'Direction'">
            {{ getDirectionLabel(record.Direction) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <span
              class="status-badge"
              :style="{ backgroundColor: getStatusColor(record.status) }"
            >
              {{ getStatusLabel(record.status) }}
            </span>
          </template>
          <template v-else-if="column.key === 'issuingInstructionTime'">
            {{ formatDateTime(record.issuingInstructionTime) }}
          </template>
          <template v-else-if="column.key === 'executionTime'">
            {{ formatDateTime(record.executionTime) }}
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
