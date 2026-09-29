<script setup lang="ts">
/**
 * 入侵记录 —— 反无记录台账
 * 纯台账页面：列表 + 搜索 + CRUD
 */
import { computed, reactive, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  INTRUSION_RECORDS,
  WHITE_LIST_OPTIONS,
  ALARM_LEVEL_OPTIONS,
  getAlarmLevelColor,
  getAlarmLevelLabel,
  type IntrusionRecord,
} from '@/mock/counterUasRecords'

// ========================= 筛选条件 =========================

const query = reactive({
  Uavid: '', // 序列号
  isWhiteList: '', // 是否白名单
  uav_model: '', // 无人机型号
  AlarmLevel: 0, // 入侵等级：0=全部
  dateRange: [] as string[], // 发现时间范围
})

const isFilterDirty = computed(() =>
  query.Uavid.trim() !== '' ||
  query.isWhiteList !== '' ||
  query.uav_model.trim() !== '' ||
  query.AlarmLevel !== 0 ||
  query.dateRange.length > 0,
)

function onReset() {
  query.Uavid = ''
  query.isWhiteList = ''
  query.uav_model = ''
  query.AlarmLevel = 0
  query.dateRange = []
  page.current = 1
}

// ========================= 数据层 =========================

const page = reactive({ current: 1, pageSize: 20 })
const loading = ref(false)
const dataSource = ref<IntrusionRecord[]>([...INTRUSION_RECORDS])

const filteredData = computed(() => {
  return dataSource.value.filter(d => {
    if (query.Uavid.trim() && !d.Uavid.toLowerCase().includes(query.Uavid.trim().toLowerCase())) {
      return false
    }
    if (query.isWhiteList && d.isWhiteList !== query.isWhiteList) {
      return false
    }
    if (query.uav_model.trim() && !d.uav_model.toLowerCase().includes(query.uav_model.trim().toLowerCase())) {
      return false
    }
    if (query.AlarmLevel !== 0 && d.AlarmLevel !== query.AlarmLevel) {
      return false
    }
    if (query.dateRange.length === 2) {
      const startFrom = new Date(d.StartFrom).getTime()
      const start = new Date(query.dateRange[0]).getTime()
      const end = new Date(query.dateRange[1]).getTime()
      if (startFrom < start || startFrom > end) {
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
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 180,
    align: 'center',
    ellipsis: true,
  },
  {
    title: '序列号',
    dataIndex: 'Uavid',
    key: 'Uavid',
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
    title: '入侵等级',
    dataIndex: 'AlarmLevel',
    key: 'AlarmLevel',
    width: 100,
    align: 'center',
  },
  {
    title: '高度(m)',
    dataIndex: 'height',
    key: 'height',
    width: 100,
    align: 'right',
  },
  {
    title: '速度(m/s)',
    dataIndex: 'velocity',
    key: 'velocity',
    width: 110,
    align: 'right',
  },
  {
    title: '方位角(°)',
    dataIndex: 'azimuth',
    key: 'azimuth',
    width: 110,
    align: 'right',
  },
  {
    title: '距离(m)',
    dataIndex: 'distance',
    key: 'distance',
    width: 100,
    align: 'right',
  },
  {
    title: '频率',
    dataIndex: 'Frequency',
    key: 'Frequency',
    width: 100,
    align: 'center',
  },
  {
    title: '是否白名单',
    dataIndex: 'isWhiteList',
    key: 'isWhiteList',
    width: 120,
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
    title: '发现开始日期',
    dataIndex: 'StartFrom',
    key: 'StartFrom',
    width: 140,
    align: 'center',
  },
]
</script>

<template>
  <PageContainer title="入侵记录">
    <PanelCard title="入侵记录列表">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-row">
          <div class="search-item">
            <span class="search-label">序列号</span>
            <a-input
              v-model:value="query.Uavid"
              placeholder="输入序列号搜索"
              allow-clear
              style="width: 200px"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </div>
          <div class="search-item">
            <span class="search-label">入侵等级</span>
            <a-select
              v-model:value="query.AlarmLevel"
              :options="ALARM_LEVEL_OPTIONS"
              style="width: 120px"
            />
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
            <span class="search-label">无人机型号</span>
            <a-input
              v-model:value="query.uav_model"
              placeholder="输入型号搜索"
              allow-clear
              style="width: 180px"
            />
          </div>
          <div class="search-item">
            <span class="search-label">发现时间</span>
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
        <span class="stat-item">1级：<strong>{{ filteredData.filter(d => d.AlarmLevel === 1).length }}</strong> 条</span>
        <span class="stat-item">2级：<strong>{{ filteredData.filter(d => d.AlarmLevel === 2).length }}</strong> 条</span>
        <span class="stat-item">3级：<strong>{{ filteredData.filter(d => d.AlarmLevel === 3).length }}</strong> 条</span>
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
        :scroll="{ x: 2000 }"
        @change="(p: any) => { page.current = p.current; page.pageSize = p.pageSize }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'AlarmLevel'">
            <span
              class="status-badge"
              :style="{ backgroundColor: getAlarmLevelColor(record.AlarmLevel) }"
            >
              {{ getAlarmLevelLabel(record.AlarmLevel) }}
            </span>
          </template>
          <template v-else-if="column.key === 'isWhiteList'">
            <span
              class="status-badge"
              :style="{ backgroundColor: record.isWhiteList === '是' ? '#52c41a' : '#8c8c8c' }"
            >
              {{ record.isWhiteList }}
            </span>
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
