<script setup lang="ts">
/**
 * 营地管理 —— 对应 PRD-人员管理-营地管理 V1.0
 * 功能：营地增删改查、查看边界、导出
 */
import { computed, ref, reactive } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'

// ========== Mock数据 ==========
interface CampItem {
  id: string
  name: string
  leader: string
  contact: string
  hasBoundary: boolean
  status: '启用' | '停用'
  remark: string
  createdAt: string
  updatedAt: string
}

const CAMPS = ref<CampItem[]>([
  {
    id: 'camp-1',
    name: 'WAPCO总部营地',
    leader: '张三',
    contact: '13800138001',
    hasBoundary: true,
    status: '启用',
    remark: '总部主营地',
    createdAt: '2024-01-15 10:00:00',
    updatedAt: '2024-06-20 14:30:00',
  },
  {
    id: 'camp-2',
    name: 'CPF生产营地',
    leader: '李四',
    contact: '13800138002',
    hasBoundary: true,
    status: '启用',
    remark: '中央处理设施',
    createdAt: '2024-01-20 09:00:00',
    updatedAt: '2024-05-10 11:20:00',
  },
  {
    id: 'camp-3',
    name: '钻井营地A',
    leader: '王五',
    contact: '13800138003',
    hasBoundary: false,
    status: '启用',
    remark: '',
    createdAt: '2024-02-01 08:00:00',
    updatedAt: '2024-02-01 08:00:00',
  },
  {
    id: 'camp-4',
    name: '钻井营地B',
    leader: '赵六',
    contact: '13800138004',
    hasBoundary: false,
    status: '停用',
    remark: '已完井，暂时停用',
    createdAt: '2024-01-10 10:00:00',
    updatedAt: '2024-07-01 16:00:00',
  },
  {
    id: 'camp-5',
    name: '物流中转站',
    leader: '孙七',
    contact: '13800138005',
    hasBoundary: true,
    status: '启用',
    remark: '',
    createdAt: '2024-03-05 14:00:00',
    updatedAt: '2024-03-05 14:00:00',
  },
])

// ========== 状态管理 ==========
const query = ref({
  name: '',
  status: undefined as '启用' | '停用' | undefined,
})
const loading = ref(false)
const page = ref({ current: 1, pageSize: 20 })

// 抽屉状态
const drawerVisible = ref(false)
const drawerMode = ref<'create' | 'edit'>('create')
const drawerLoading = ref(false)

// 表单数据
const formData = reactive<Partial<CampItem>>({
  name: '',
  leader: '',
  contact: '',
  remark: '',
})

// 地图弹窗
const mapVisible = ref(false)
const currentCamp = ref<CampItem | null>(null)

// ========== 表格列定义 ==========
const columns: TableColumnsType = [
  { title: '营地名称', dataIndex: 'name', key: 'name', width: 200, align: 'center' },
  { title: '负责人', dataIndex: 'leader', key: 'leader', width: 120, align: 'center' },
  { title: '联系方式', dataIndex: 'contact', key: 'contact', width: 150, align: 'center' },
  { title: '边界', key: 'boundary', width: 100, align: 'center' },
  { title: '状态', key: 'status', width: 100, align: 'center' },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 200, align: 'center', ellipsis: true },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center' },
  { title: '操作', key: 'action', width: 200, fixed: 'right', align: 'center' },
]

// ========== 数据过滤 ==========
const filteredData = computed(() => {
  let result = CAMPS.value

  // 营地名称筛选
  if (query.value.name) {
    const kw = query.value.name.toLowerCase()
    result = result.filter((r) => r.name.toLowerCase().includes(kw))
  }

  // 状态筛选
  if (query.value.status) {
    result = result.filter((r) => r.status === query.value.status)
  }

  return result
})

const paginatedData = computed(() => {
  const start = (page.value.current - 1) * page.value.pageSize
  const end = start + page.value.pageSize
  return filteredData.value.slice(start, end)
})

// ========== 操作函数 ==========
function resetFilters() {
  query.value = {
    name: '',
    status: undefined,
  }
  page.value.current = 1
}

function openCreateDrawer() {
  drawerMode.value = 'create'
  Object.assign(formData, {
    name: '',
    leader: '',
    contact: '',
    remark: '',
  })
  drawerVisible.value = true
}

function openEditDrawer(record: CampItem) {
  drawerMode.value = 'edit'
  Object.assign(formData, {
    id: record.id,
    name: record.name,
    leader: record.leader,
    contact: record.contact,
    remark: record.remark,
  })
  drawerVisible.value = true
}

function closeDrawer() {
  drawerVisible.value = false
}

async function saveCamp() {
  // 表单校验
  if (!formData.name?.trim()) {
    message.error('请填写营地名称')
    return
  }
  if (!formData.leader?.trim()) {
    message.error('请填写负责人')
    return
  }
  if (!formData.contact) {
    message.error('请填写联系方式')
    return
  }
  if (!/^1\d{10}$/.test(formData.contact)) {
    message.error('请输入正确的11位手机号')
    return
  }

  drawerLoading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (drawerMode.value === 'create') {
      // 新增
      CAMPS.value.push({
        id: `camp-${Date.now()}`,
        name: formData.name!,
        leader: formData.leader!,
        contact: formData.contact!,
        hasBoundary: false,
        status: '启用',
        remark: formData.remark || '',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      })
      message.success('营地创建成功')
    } else {
      // 编辑
      const index = CAMPS.value.findIndex((c) => c.id === formData.id)
      if (index !== -1) {
        CAMPS.value[index] = {
          ...CAMPS.value[index],
          name: formData.name!,
          leader: formData.leader!,
          contact: formData.contact!,
          remark: formData.remark || '',
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        }
        message.success('营地更新成功')
      }
    }

    closeDrawer()
  } finally {
    drawerLoading.value = false
  }
}

function toggleStatus(record: CampItem) {
  const action = record.status === '启用' ? '停用' : '启用'
  Modal.confirm({
    title: `确认${action}`,
    content: `确认${action}营地"${record.name}"？${action === '停用' ? '停用后将不可在选择器中被选择。' : ''}`,
    okText: `确认${action}`,
    okType: action === '停用' ? 'danger' : 'primary',
    cancelText: '取消',
    onOk: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const index = CAMPS.value.findIndex((c) => c.id === record.id)
      if (index !== -1) {
        CAMPS.value[index].status = action as '启用' | '停用'
        CAMPS.value[index].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)
        message.success(`${action}成功`)
      }
    },
  })
}

function viewBoundary(record: CampItem) {
  currentCamp.value = record
  mapVisible.value = true
}

function exportData() {
  message.success('导出功能开发中')
}
</script>

<template>
  <PageContainer title="营地管理">
    <PanelCard>
      <a-form layout="inline" style="margin-bottom: 16px">
        <a-form-item label="营地名称">
          <a-input
            v-model:value="query.name"
            placeholder="支持模糊搜索"
            style="width: 200px"
            allow-clear
            @change="page.current = 1"
          />
        </a-form-item>

        <a-form-item label="状态">
          <a-select
            v-model:value="query.status"
            placeholder="全部"
            style="width: 120px"
            allow-clear
            @change="page.current = 1"
          >
            <a-select-option value="启用">启用</a-select-option>
            <a-select-option value="停用">停用</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item>
          <a-button @click="resetFilters">重置</a-button>
        </a-form-item>
      </a-form>

      <!-- 操作按钮栏 -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
        <div>
          <a-button type="primary" @click="openCreateDrawer">新增营地</a-button>
        </div>
        <div>
          <a-button @click="exportData">导出</a-button>
        </div>
      </div>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="paginatedData"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1200 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div style="text-align: center">{{ record.name }}</div>
          </template>

          <template v-if="column.key === 'leader'">
            <div style="text-align: center">{{ record.leader }}</div>
          </template>

          <template v-if="column.key === 'contact'">
            <div style="text-align: center">{{ record.contact }}</div>
          </template>

          <template v-if="column.key === 'boundary'">
            <div style="text-align: center">
              <span v-if="record.hasBoundary" style="color: #52c41a">已绘制</span>
              <span v-else style="color: #8c8c8c">未绘制</span>
            </div>
          </template>

          <template v-if="column.key === 'status'">
            <div style="text-align: center">
              <a-tag :color="record.status === '启用' ? 'green' : 'gray'">
                {{ record.status }}
              </a-tag>
            </div>
          </template>

          <template v-if="column.key === 'remark'">
            <div style="text-align: center">
              <a-tooltip v-if="record.remark" :title="record.remark">
                <span>{{ record.remark.slice(0, 30) }}{{ record.remark.length > 30 ? '...' : '' }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </div>
          </template>

          <template v-if="column.key === 'updatedAt'">
            <div style="text-align: center">{{ record.updatedAt }}</div>
          </template>

          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="openEditDrawer(record)">编辑</a>
              <a @click="viewBoundary(record)" :class="{ disabled: !record.hasBoundary }">查看边界</a>
              <a
                @click="toggleStatus(record)"
                :style="{ color: record.status === '启用' ? '#ff4d4f' : '#1890ff' }"
              >
                {{ record.status === '启用' ? '停用' : '启用' }}
              </a>
            </a-space>
          </template>
        </template>
      </a-table>

      <!-- 分页 -->
      <div style="margin-top: 16px; text-align: right">
        <a-pagination
          v-model:current="page.current"
          v-model:page-size="page.pageSize"
          :total="filteredData.length"
          show-size-changer
          show-quick-jumper
          :show-total="(total) => `共 ${total} 条`"
        />
      </div>
    </PanelCard>

    <!-- 新增/编辑抽屉 -->
    <a-drawer
      :visible="drawerVisible"
      :title="drawerMode === 'create' ? '新增营地' : '编辑营地'"
      width="640"
      :closable="true"
      @close="closeDrawer"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="营地名称" required>
          <a-input
            v-model:value="formData.name"
            placeholder="请输入营地名称"
            :maxlength="50"
            show-count
          />
        </a-form-item>

        <a-form-item label="负责人" required>
          <a-input
            v-model:value="formData.leader"
            placeholder="请输入负责人姓名"
            :maxlength="50"
          />
        </a-form-item>

        <a-form-item label="联系方式" required>
          <a-input
            v-model:value="formData.contact"
            placeholder="请输入11位手机号"
            :maxlength="11"
          />
        </a-form-item>

        <a-form-item label="备注">
          <a-textarea
            v-model:value="formData.remark"
            placeholder="选填，最多200字符"
            :maxlength="200"
            :rows="3"
            show-count
          />
        </a-form-item>
      </a-form>

      <template #footer>
        <div style="text-align: right">
          <a-space>
            <a-button @click="closeDrawer">取消</a-button>
            <a-button type="primary" :loading="drawerLoading" @click="saveCamp">保存</a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>

    <!-- 查看边界弹窗 -->
    <a-modal
      :visible="mapVisible"
      :title="`查看营地边界 — ${currentCamp?.name}`"
      width="90%"
      :body-style="{ height: '70vh', padding: '16px' }"
      @cancel="mapVisible = false"
    >
      <div class="map-container">
        <div class="map-placeholder">
          <p style="color: #999; text-align: center; padding-top: 200px">
            [ 地图组件待集成 ]<br />
            显示营地边界多边形（只读）
          </p>
        </div>
      </div>
      <template #footer>
        <a-button type="primary" @click="mapVisible = false">关闭</a-button>
      </template>
    </a-modal>
  </PageContainer>
</template>

<style scoped>
/* 表格底色 / 固定列 / 行 hover 一律由 global.scss 统一处理，此处不再覆写 */

.map-container {
  height: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
}

.map-placeholder {
  height: 100%;
  background: #fafafa;
}

.disabled {
  color: #8c8c8c !important;
  cursor: not-allowed !important;
  pointer-events: none;
}
</style>
