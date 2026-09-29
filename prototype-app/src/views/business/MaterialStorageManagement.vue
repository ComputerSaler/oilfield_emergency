<script setup lang="ts">
/**
 * 应急物资管理-存放点管理 —— 对应 PRD-应急物资管理-存放点管理 V1.0
 * 布局：筛选栏 + 操作按钮 + 表格 + 分页 + 新增/编辑抽屉 + 地图选点弹窗
 */
import { computed, ref, reactive } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { useRouter } from 'vue-router'

// ========== Mock数据 ==========
interface StoragePoint {
  id: number
  name: string
  campId: number
  campName: string
  managerId: number
  managerName: string
  contactPhone: string
  longitude: number
  latitude: number
  showOnScreen: boolean
  materialCount: number
  remark: string
  createdAt: string
}

const STORAGE_POINTS = ref<StoragePoint[]>([
  {
    id: 1,
    name: '1号营地应急库房',
    campId: 1,
    campName: 'WAPCO总部营地',
    managerId: 1,
    managerName: '张三',
    contactPhone: '13800138001',
    longitude: 2.1234,
    latitude: 13.5678,
    showOnScreen: true,
    materialCount: 15,
    remark: '主要存放消防器材和医疗物资',
    createdAt: '2026-08-01 10:00:00',
  },
  {
    id: 2,
    name: 'CPF场站物资仓',
    campId: 2,
    campName: 'CPF生产营地',
    managerId: 2,
    managerName: '李四',
    contactPhone: '13800138002',
    longitude: 2.2345,
    latitude: 13.6789,
    showOnScreen: true,
    materialCount: 8,
    remark: '',
    createdAt: '2026-08-02 14:30:00',
  },
  {
    id: 3,
    name: '钻井队应急物资点',
    campId: 3,
    campName: '钻井营地A',
    managerId: 3,
    managerName: '王五',
    contactPhone: '13800138003',
    longitude: 2.3456,
    latitude: 13.7890,
    showOnScreen: false,
    materialCount: 0,
    remark: '新设立，待补充物资',
    createdAt: '2026-08-05 09:15:00',
  },
])

const CAMP_OPTIONS = [
  { label: 'WAPCO总部营地', value: 1 },
  { label: 'CPF生产营地', value: 2 },
  { label: '钻井营地A', value: 3 },
  { label: '钻井营地B', value: 4 },
]

const PERSONNEL_OPTIONS = [
  { label: '张三', value: 1 },
  { label: '李四', value: 2 },
  { label: '王五', value: 3 },
  { label: '赵六', value: 4 },
]

// ========== 状态管理 ==========
const router = useRouter()
const query = ref({
  campId: undefined as number | undefined,
  name: '',
  showOnScreen: undefined as boolean | undefined,
})
const loading = ref(false)
const page = ref({ current: 1, pageSize: 20 })

// 抽屉状态
const drawerVisible = ref(false)
const drawerMode = ref<'create' | 'edit'>('create')
const drawerLoading = ref(false)

// 表单数据
const formData = reactive<Partial<StoragePoint>>({
  name: '',
  campId: undefined,
  campName: '',
  managerId: undefined,
  managerName: '',
  contactPhone: '',
  longitude: undefined,
  latitude: undefined,
  showOnScreen: false,
  remark: '',
})

// 地图选点弹窗
const mapVisible = ref(false)
const editableLocation = reactive({
  longitude: 0,
  latitude: 0,
})

// ========== 表格列定义 ==========
const columns: TableColumnsType = [
  { title: '存放点名称', dataIndex: 'name', key: 'name', width: 200, align: 'center' },
  { title: '所属营地', dataIndex: 'campName', key: 'campName', width: 150, align: 'center' },
  { title: '责任人', dataIndex: 'managerName', key: 'managerName', width: 120, align: 'center' },
  { title: '联系方式', dataIndex: 'contactPhone', key: 'contactPhone', width: 150, align: 'center' },
  {
    title: '是否在大屏展示',
    dataIndex: 'showOnScreen',
    key: 'showOnScreen',
    width: 120,
    align: 'center',
  },
  {
    title: '物资数量',
    dataIndex: 'materialCount',
    key: 'materialCount',
    width: 100,
    align: 'right',
  },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 200, align: 'center', ellipsis: true },
  { title: '操作', key: 'action', width: 180, fixed: 'right', align: 'center' },
]

// ========== 数据过滤 ==========
const filteredData = computed(() => {
  let result = STORAGE_POINTS.value

  // 所属营地筛选
  if (query.value.campId) {
    result = result.filter((r) => r.campId === query.value.campId)
  }

  // 存放点名称筛选
  if (query.value.name) {
    const kw = query.value.name.toLowerCase()
    result = result.filter((r) => r.name.toLowerCase().includes(kw))
  }

  // 是否在大屏展示筛选
  if (query.value.showOnScreen !== undefined) {
    result = result.filter((r) => r.showOnScreen === query.value.showOnScreen)
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
    campId: undefined,
    name: '',
    showOnScreen: undefined,
  }
  page.value.current = 1
}

function openCreateDrawer() {
  drawerMode.value = 'create'
  Object.assign(formData, {
    name: '',
    campId: undefined,
    campName: '',
    managerId: undefined,
    managerName: '',
    contactPhone: '',
    longitude: undefined,
    latitude: undefined,
    showOnScreen: false,
    remark: '',
  })
  drawerVisible.value = true
}

function openEditDrawer(record: StoragePoint) {
  drawerMode.value = 'edit'
  Object.assign(formData, { ...record })
  drawerVisible.value = true
}

function closeDrawer() {
  drawerVisible.value = false
}

function openMapPicker() {
  // 如果是编辑且已有坐标，则显示已有位置
  if (drawerMode.value === 'edit' && formData.longitude && formData.latitude) {
    editableLocation.longitude = formData.longitude
    editableLocation.latitude = formData.latitude
  } else {
    // 新增时，设置默认位置
    editableLocation.longitude = 2.1234
    editableLocation.latitude = 13.5678
  }
  mapVisible.value = true
}

function confirmMapSelection() {
  formData.longitude = editableLocation.longitude
  formData.latitude = editableLocation.latitude
  mapVisible.value = false
  message.success('位置已设置')
}

function cancelMapSelection() {
  mapVisible.value = false
}

async function saveStorage() {
  // 表单校验
  if (!formData.name?.trim()) {
    message.error('请填写存放点名称')
    return
  }
  if (!formData.campId) {
    message.error('请选择所属营地')
    return
  }
  if (!formData.managerId) {
    message.error('请选择责任人')
    return
  }
  if (!formData.contactPhone) {
    message.error('请填写联系方式')
    return
  }
  if (!/^1\d{10}$/.test(formData.contactPhone)) {
    message.error('请输入正确的11位手机号')
    return
  }
  if (!formData.longitude || !formData.latitude) {
    message.error('请选择地图坐标')
    return
  }

  drawerLoading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (drawerMode.value === 'create') {
      // 新增
      const campName = CAMP_OPTIONS.find((c) => c.value === formData.campId)?.label || ''
      const managerName = PERSONNEL_OPTIONS.find((p) => p.value === formData.managerId)?.label || ''
      STORAGE_POINTS.value.push({
        id: Date.now(),
        name: formData.name!,
        campId: formData.campId!,
        campName,
        managerId: formData.managerId!,
        managerName,
        contactPhone: formData.contactPhone!,
        longitude: formData.longitude!,
        latitude: formData.latitude!,
        showOnScreen: formData.showOnScreen || false,
        materialCount: 0,
        remark: formData.remark || '',
        createdAt: new Date().toISOString(),
      })
      message.success('存放点创建成功')
    } else {
      // 编辑
      const index = STORAGE_POINTS.value.findIndex((s) => s.id === formData.id)
      if (index !== -1) {
        const campName = CAMP_OPTIONS.find((c) => c.value === formData.campId)?.label || ''
        const managerName =
          PERSONNEL_OPTIONS.find((p) => p.value === formData.managerId)?.label || ''
        STORAGE_POINTS.value[index] = {
          ...STORAGE_POINTS.value[index],
          name: formData.name!,
          campId: formData.campId!,
          campName,
          managerId: formData.managerId!,
          managerName,
          contactPhone: formData.contactPhone!,
          longitude: formData.longitude!,
          latitude: formData.latitude!,
          showOnScreen: formData.showOnScreen || false,
          remark: formData.remark || '',
        }
        message.success('存放点更新成功')
      }
    }

    closeDrawer()
  } finally {
    drawerLoading.value = false
  }
}

function deleteStorage(record: StoragePoint) {
  // 检查是否有物资
  if (record.materialCount > 0) {
    message.error(`该存放点下还有 ${record.materialCount} 项物资，请先清空或转移物资后再删除`)
    return
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除存放点"${record.name}"吗？删除后不可恢复。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const index = STORAGE_POINTS.value.findIndex((s) => s.id === record.id)
      if (index !== -1) {
        STORAGE_POINTS.value.splice(index, 1)
        message.success('存放点已删除')
      }
    },
  })
}

function viewMaterials(record: StoragePoint) {
  // 跳转到物资台账页面，并传递筛选参数
  router.push({
    path: '/business/material-inventory',
    query: { storageId: record.id },
  })
}

function exportData() {
  message.success('导出功能开发中')
}
</script>

<template>
  <PageContainer title="存放点管理">
    <PanelCard>
      <a-form layout="inline" style="margin-bottom: 16px">
        <a-form-item label="所属营地">
          <a-select
            v-model:value="query.campId"
            placeholder="全部"
            style="width: 180px"
            allow-clear
            @change="page.current = 1"
          >
            <a-select-option v-for="camp in CAMP_OPTIONS" :key="camp.value" :value="camp.value">
              {{ camp.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="存放点名称">
          <a-input
            v-model:value="query.name"
            placeholder="支持模糊搜索"
            style="width: 200px"
            allow-clear
            @change="page.current = 1"
          />
        </a-form-item>

        <a-form-item label="是否在大屏展示">
          <a-select
            v-model:value="query.showOnScreen"
            placeholder="全部"
            style="width: 120px"
            allow-clear
            @change="page.current = 1"
          >
            <a-select-option :value="true">是</a-select-option>
            <a-select-option :value="false">否</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item>
          <a-button @click="resetFilters">重置</a-button>
        </a-form-item>
      </a-form>

      <!-- 操作按钮栏 -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
        <div>
          <a-button type="primary" @click="openCreateDrawer">新增存放点</a-button>
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

          <template v-if="column.key === 'campName'">
            <div style="text-align: center">{{ record.campName }}</div>
          </template>

          <template v-if="column.key === 'managerName'">
            <div style="text-align: center">{{ record.managerName }}</div>
          </template>

          <template v-if="column.key === 'contactPhone'">
            <div style="text-align: center">{{ record.contactPhone }}</div>
          </template>

          <template v-if="column.key === 'showOnScreen'">
            <div style="text-align: center">
              <span v-if="record.showOnScreen" style="color: #52c41a">✓ 是</span>
              <span v-else style="color: #8c8c8c">✗ 否</span>
            </div>
          </template>

          <template v-if="column.key === 'materialCount'">
            <div style="text-align: right">
              <span v-if="record.materialCount === 0">-</span>
              <span v-else>{{ record.materialCount }}</span>
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

          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="openEditDrawer(record)">编辑</a>
              <a @click="viewMaterials(record)">查看物资</a>
              <a style="color: #ff4d4f" @click="deleteStorage(record)">删除</a>
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
      :title="drawerMode === 'create' ? '新增存放点' : '编辑存放点'"
      width="640"
      :closable="true"
      @close="closeDrawer"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="存放点名称" required>
          <a-input
            v-model:value="formData.name"
            placeholder="请输入存放点名称"
            :maxlength="50"
            show-count
          />
        </a-form-item>

        <a-form-item label="所属营地" required>
          <a-select v-model:value="formData.campId" placeholder="请选择所属营地">
            <a-select-option v-for="camp in CAMP_OPTIONS" :key="camp.value" :value="camp.value">
              {{ camp.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="责任人" required>
          <a-select v-model:value="formData.managerId" placeholder="请选择责任人">
            <a-select-option
              v-for="person in PERSONNEL_OPTIONS"
              :key="person.value"
              :value="person.value"
            >
              {{ person.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="联系方式" required>
          <a-input
            v-model:value="formData.contactPhone"
            placeholder="请输入11位手机号"
            :maxlength="11"
          />
        </a-form-item>

        <a-form-item label="地图选点" required>
          <div>
            <a-button @click="openMapPicker">
              {{ formData.longitude && formData.latitude ? '重新选点' : '选择位置' }}
            </a-button>
            <div v-if="formData.longitude && formData.latitude" style="margin-top: 8px; color: #52c41a">
              已选择：经度{{ formData.longitude.toFixed(2) }}, 纬度{{ formData.latitude.toFixed(2) }}
            </div>
          </div>
        </a-form-item>

        <a-form-item label="是否在大屏展示">
          <a-switch v-model:checked="formData.showOnScreen" />
          <span style="margin-left: 8px; color: #8c8c8c">
            {{ formData.showOnScreen ? '是' : '否' }}
          </span>
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
            <a-button type="primary" :loading="drawerLoading" @click="saveStorage">保存</a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>

    <!-- 地图选点弹窗 -->
    <a-modal
      :visible="mapVisible"
      :title="`存放点位置 — ${formData.name || '新增存放点'}`"
      width="80%"
      :footer="null"
      :closable="false"
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
            <p style="font-size: 16px; margin-bottom: 8px">地图组件占位（点击任意位置模拟选点）</p>
            <p style="font-size: 14px">实际开发时集成GIS地图服务</p>
            <div v-if="editableLocation.latitude && editableLocation.longitude" style="margin-top: 16px; color: #1890ff">
              📍 存放点位置：{{ editableLocation.longitude.toFixed(6) }}, {{ editableLocation.latitude.toFixed(6) }}
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
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          "
        >
          <div style="display: flex; gap: 24px; align-items: center; flex: 1">
            <div style="color: #fff; font-weight: 500">{{ formData.name || '新增存放点' }}</div>
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
            <a-button @click="cancelMapSelection">取消</a-button>
            <a-button type="primary" @click="confirmMapSelection">确认选点</a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </PageContainer>
</template>

<style scoped>
/* 表格底色 / 固定列 / 行 hover 一律由 global.scss 统一处理，此处不再覆写 */
</style>
