<script setup lang="ts">
/**
 * 应急物资管理-物资台账 —— 对应 PRD-应急物资管理-物资台账 V1.0
 * 功能：物资增删改查、4种盘点方式、盘点历史、关联预案、导入导出
 */
import { computed, ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import { useRoute } from 'vue-router'

// ========== Mock数据 ==========
interface MaterialItem {
  id: number
  name: string
  category: string
  spec: string
  unit: string
  currentStock: number
  minStockAlert: number | null
  storageId: number
  storageName: string
  lastCheckAt: string | null
  lastCheckBy: number | null
  lastCheckName: string | null
  remark: string
  createdAt: string
}

interface CheckRecord {
  id: number
  inventoryId: number
  inventoryName: string
  storageName: string
  stockBefore: number
  stockAfter: number
  difference: number
  checkAt: string
  checkBy: number
  checkName: string
  checkSource: 'single' | 'batch' | 'storage' | 'import'
  remark: string
}

const MATERIALS = ref<MaterialItem[]>([
  {
    id: 1,
    name: 'ABC干粉灭火器',
    category: '消防灭火器材',
    spec: '4kg',
    unit: '个',
    currentStock: 25,
    minStockAlert: 20,
    storageId: 1,
    storageName: '1号营地应急库房',
    lastCheckAt: '2026-08-08 14:30:00',
    lastCheckBy: 1,
    lastCheckName: '张三',
    remark: '定期检查压力表',
    createdAt: '2026-08-01 10:00:00',
  },
  {
    id: 2,
    name: '医疗急救包',
    category: '医疗急救物资',
    spec: '标准型',
    unit: '套',
    currentStock: 8,
    minStockAlert: 10,
    storageId: 1,
    storageName: '1号营地应急库房',
    lastCheckAt: '2026-08-07 09:15:00',
    lastCheckBy: 1,
    lastCheckName: '张三',
    remark: '',
    createdAt: '2026-08-01 10:05:00',
  },
  {
    id: 3,
    name: '防护口罩',
    category: '个人防护装备',
    spec: 'N95',
    unit: '个',
    currentStock: 0,
    minStockAlert: 50,
    storageId: 1,
    storageName: '1号营地应急库房',
    lastCheckAt: '2026-08-06 16:00:00',
    lastCheckBy: 2,
    lastCheckName: '李四',
    remark: '已用完，待补充',
    createdAt: '2026-08-01 10:10:00',
  },
  {
    id: 4,
    name: '应急照明灯',
    category: '照明与电力',
    spec: '充电式LED',
    unit: '台',
    currentStock: 15,
    minStockAlert: null,
    storageId: 2,
    storageName: 'CPF场站物资仓',
    lastCheckAt: null,
    lastCheckBy: null,
    lastCheckName: null,
    remark: '',
    createdAt: '2026-08-02 14:30:00',
  },
])

const CHECK_RECORDS = ref<CheckRecord[]>([
  {
    id: 1,
    inventoryId: 1,
    inventoryName: 'ABC干粉灭火器',
    storageName: '1号营地应急库房',
    stockBefore: 28,
    stockAfter: 25,
    difference: -3,
    checkAt: '2026-08-08 14:30:00',
    checkBy: 1,
    checkName: '张三',
    checkSource: 'single',
    remark: '3个压力不足已报废',
  },
  {
    id: 2,
    inventoryId: 2,
    inventoryName: '医疗急救包',
    storageName: '1号营地应急库房',
    stockBefore: 10,
    stockAfter: 8,
    difference: -2,
    checkAt: '2026-08-07 09:15:00',
    checkBy: 1,
    checkName: '张三',
    checkSource: 'batch',
    remark: '2套已使用',
  },
])

const STORAGE_OPTIONS = [
  { label: '1号营地应急库房', value: 1 },
  { label: 'CPF场站物资仓', value: 2 },
  { label: '钻井队应急物资点', value: 3 },
]

const CATEGORY_OPTIONS = [
  '医疗急救物资',
  '消防灭火器材',
  '个人防护装备',
  '通讯设备',
  '照明与电力',
  '破拆救援工具',
  '应急生活物资',
  '警戒与标识',
  '检测与监测',
  '其他物资',
]

const UNIT_OPTIONS = ['个', '件', '套', '箱', '瓶', '支', '卷', '包', '桶', '台', '米', '公斤(kg)', '升(L)']

const PERSONNEL_OPTIONS = [
  { label: '张三', value: 1 },
  { label: '李四', value: 2 },
  { label: '王五', value: 3 },
]

// ========== 状态管理 ==========
const route = useRoute()
const query = ref({
  storageId: undefined as number | undefined,
  category: '',
  name: '',
  stockStatus: '' as '' | 'sufficient' | 'warning' | 'zero',
})
const loading = ref(false)
const page = ref({ current: 1, pageSize: 20 })
const selectedRowKeys = ref<Key[]>([])

// 抽屉/弹窗状态
const drawerVisible = ref(false)
const drawerMode = ref<'create' | 'edit' | 'detail'>('create')
const drawerLoading = ref(false)

const detailVisible = ref(false)
const checkHistoryVisible = ref(false)
const relatedPlansVisible = ref(false)
const currentMaterial = ref<MaterialItem | null>(null)

const singleCheckVisible = ref(false)
const batchCheckVisible = ref(false)
const storageCheckVisible = ref(false)
const importCheckVisible = ref(false)

// 表单数据
const formData = reactive<Partial<MaterialItem>>({
  name: '',
  category: '',
  spec: '',
  unit: '',
  currentStock: 0,
  minStockAlert: undefined,
  storageId: undefined,
  storageName: '',
  remark: '',
})

const checkFormData = reactive({
  actualStock: undefined as number | undefined,
  checkBy: 1,
  remark: '',
})

const batchCheckData = ref<Array<{ id: number; name: string; storageName: string; currentStock: number; actualStock: number | undefined }>>([])
const storageCheckData = ref<Array<{ id: number; name: string; currentStock: number; actualStock: number | undefined }>>([])


// ========== 计算属性 ==========
const filteredData = computed(() => {
  let result = MATERIALS.value

  // 所属存放点筛选
  if (query.value.storageId) {
    result = result.filter((r) => r.storageId === query.value.storageId)
  }

  // 物资分类筛选
  if (query.value.category) {
    result = result.filter((r) => r.category === query.value.category)
  }

  // 物资名称筛选
  if (query.value.name) {
    const kw = query.value.name.toLowerCase()
    result = result.filter((r) => r.name.toLowerCase().includes(kw))
  }

  // 库存状态筛选
  if (query.value.stockStatus === 'sufficient') {
    result = result.filter((r) => r.currentStock > 0 && (r.minStockAlert === null || r.currentStock > r.minStockAlert))
  } else if (query.value.stockStatus === 'warning') {
    result = result.filter((r) => r.minStockAlert !== null && r.currentStock > 0 && r.currentStock <= r.minStockAlert)
  } else if (query.value.stockStatus === 'zero') {
    result = result.filter((r) => r.currentStock === 0)
  }

  return result
})

const paginatedData = computed(() => {
  const start = (page.value.current - 1) * page.value.pageSize
  const end = start + page.value.pageSize
  return filteredData.value.slice(start, end)
})

const selectedMaterials = computed(() => {
  return MATERIALS.value.filter((m) => selectedRowKeys.value.includes(m.id))
})

const checkRecords = computed(() => {
  if (!currentMaterial.value) return []
  return CHECK_RECORDS.value.filter((r) => r.inventoryId === currentMaterial.value.id)
})

// ========== 表格列定义 ==========
const columns: TableColumnsType = [
  { title: '物资名称', dataIndex: 'name', key: 'name', width: 180, align: 'center' },
  { title: '物资分类', dataIndex: 'category', key: 'category', width: 120, align: 'center' },
  { title: '规格型号', dataIndex: 'spec', key: 'spec', width: 150, align: 'center', ellipsis: true },
  { title: '计量单位', dataIndex: 'unit', key: 'unit', width: 80, align: 'center' },
  { title: '当前库存', dataIndex: 'currentStock', key: 'currentStock', width: 100, align: 'right' },
  { title: '最低库存预警值', dataIndex: 'minStockAlert', key: 'minStockAlert', width: 120, align: 'right' },
  { title: '所属存放点', dataIndex: 'storageName', key: 'storageName', width: 150, align: 'center' },
  { title: '支撑预案', key: 'plans', width: 100, align: 'center' },
  { title: '最后盘点日期', dataIndex: 'lastCheckAt', key: 'lastCheckAt', width: 120, align: 'center' },
  { title: '最后盘点人', dataIndex: 'lastCheckName', key: 'lastCheckName', width: 100, align: 'center' },
  { title: '操作', key: 'action', width: 280, fixed: 'right', align: 'center' },
]

// ========== 生命周期 ==========
onMounted(() => {
  // 如果有路由参数，自动筛选
  if (route.query.storageId) {
    query.value.storageId = Number(route.query.storageId)
  }
})

// ========== 操作函数 ==========
function resetFilters() {
  query.value = {
    storageId: undefined,
    category: '',
    name: '',
    stockStatus: '',
  }
  page.value.current = 1
}

function isStockWarning(record: MaterialItem) {
  return record.minStockAlert !== null && record.currentStock > 0 && record.currentStock <= record.minStockAlert
}

function openCreateDrawer() {
  drawerMode.value = 'create'
  Object.assign(formData, {
    name: '',
    category: '',
    spec: '',
    unit: '',
    currentStock: 0,
    minStockAlert: undefined,
    storageId: undefined,
    storageName: '',
    remark: '',
  })
  drawerVisible.value = true
}

function openEditDrawer(record: MaterialItem) {
  drawerMode.value = 'edit'
  Object.assign(formData, { ...record })
  drawerVisible.value = true
}

function closeDrawer() {
  drawerVisible.value = false
}

async function saveMaterial() {
  // 表单校验
  if (!formData.name?.trim()) {
    message.error('请填写物资名称')
    return
  }
  if (!formData.category) {
    message.error('请选择物资分类')
    return
  }
  if (!formData.unit) {
    message.error('请选择计量单位')
    return
  }
  if (formData.currentStock === undefined || formData.currentStock < 0) {
    message.error('请输入有效的当前库存（≥ 0）')
    return
  }
  if (!formData.storageId) {
    message.error('请选择所属存放点')
    return
  }

  drawerLoading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (drawerMode.value === 'create') {
      const storageName = STORAGE_OPTIONS.find((s) => s.value === formData.storageId)?.label || ''
      MATERIALS.value.push({
        id: Date.now(),
        name: formData.name!,
        category: formData.category!,
        spec: formData.spec || '',
        unit: formData.unit!,
        currentStock: formData.currentStock!,
        minStockAlert: formData.minStockAlert || null,
        storageId: formData.storageId!,
        storageName,
        lastCheckAt: null,
        lastCheckBy: null,
        lastCheckName: null,
        remark: formData.remark || '',
        createdAt: new Date().toISOString(),
      })
      message.success('物资创建成功')
    } else {
      const index = MATERIALS.value.findIndex((m) => m.id === formData.id)
      if (index !== -1) {
        const storageName = STORAGE_OPTIONS.find((s) => s.value === formData.storageId)?.label || ''
        MATERIALS.value[index] = {
          ...MATERIALS.value[index],
          name: formData.name!,
          category: formData.category!,
          spec: formData.spec || '',
          unit: formData.unit!,
          minStockAlert: formData.minStockAlert || null,
          storageId: formData.storageId!,
          storageName,
          remark: formData.remark || '',
        }
        message.success('物资信息更新成功')
      }
    }

    closeDrawer()
  } finally {
    drawerLoading.value = false
  }
}


function deleteMaterial(record: MaterialItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除物资"${record.name}"吗？该物资的盘点历史记录也将一并删除，且不可恢复。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const index = MATERIALS.value.findIndex((m) => m.id === record.id)
      if (index !== -1) {
        MATERIALS.value.splice(index, 1)
        message.success('物资已删除')
      }
    },
  })
}

// ========== 盘点功能 ==========
function openSingleCheck(record: MaterialItem) {
  currentMaterial.value = record
  checkFormData.actualStock = undefined
  checkFormData.checkBy = 1
  checkFormData.remark = ''
  singleCheckVisible.value = true
}

async function confirmSingleCheck() {
  if (checkFormData.actualStock === undefined || checkFormData.actualStock < 0) {
    message.error('请输入有效的实际数量（≥ 0）')
    return
  }

  await new Promise((resolve) => setTimeout(resolve, 500))

  const material = MATERIALS.value.find((m) => m.id === currentMaterial.value?.id)
  if (material) {
    const stockBefore = material.currentStock
    const stockAfter = checkFormData.actualStock
    const difference = stockAfter - stockBefore
    const checkName = PERSONNEL_OPTIONS.find((p) => p.value === checkFormData.checkBy)?.label || ''

    // 更新库存
    material.currentStock = stockAfter
    material.lastCheckAt = new Date().toISOString().replace('T', ' ').substring(0, 19)
    material.lastCheckBy = checkFormData.checkBy
    material.lastCheckName = checkName

    // 添加盘点记录
    CHECK_RECORDS.value.unshift({
      id: Date.now(),
      inventoryId: material.id,
      inventoryName: material.name,
      storageName: material.storageName,
      stockBefore,
      stockAfter,
      difference,
      checkAt: material.lastCheckAt,
      checkBy: checkFormData.checkBy,
      checkName,
      checkSource: 'single',
      remark: checkFormData.remark,
    })

    message.success(`盘点完成，库存已更新为 ${stockAfter} ${material.unit}`)
    singleCheckVisible.value = false
  }
}

function openBatchCheck() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先勾选要盘点的物资')
    return
  }

  batchCheckData.value = selectedMaterials.value.map((m) => ({
    id: m.id,
    name: m.name,
    storageName: m.storageName,
    currentStock: m.currentStock,
    actualStock: undefined,
  }))
  checkFormData.checkBy = 1
  batchCheckVisible.value = true
}

async function confirmBatchCheck() {
  const validItems = batchCheckData.value.filter((item) => item.actualStock !== undefined && item.actualStock >= 0)
  
  if (validItems.length === 0) {
    message.error('请至少填写一项物资的实际数量')
    return
  }

  await new Promise((resolve) => setTimeout(resolve, 800))

  const checkName = PERSONNEL_OPTIONS.find((p) => p.value === checkFormData.checkBy)?.label || ''
  const checkTime = new Date().toISOString().replace('T', ' ').substring(0, 19)

  validItems.forEach((item) => {
    const material = MATERIALS.value.find((m) => m.id === item.id)
    if (material && item.actualStock !== undefined) {
      const stockBefore = material.currentStock
      const stockAfter = item.actualStock
      const difference = stockAfter - stockBefore

      material.currentStock = stockAfter
      material.lastCheckAt = checkTime
      material.lastCheckBy = checkFormData.checkBy
      material.lastCheckName = checkName

      CHECK_RECORDS.value.unshift({
        id: Date.now() + item.id,
        inventoryId: material.id,
        inventoryName: material.name,
        storageName: material.storageName,
        stockBefore,
        stockAfter,
        difference,
        checkAt: checkTime,
        checkBy: checkFormData.checkBy,
        checkName,
        checkSource: 'batch',
        remark: '',
      })
    }
  })

  message.success(`批量盘点完成，成功更新 ${validItems.length} 项物资库存`)
  batchCheckVisible.value = false
  selectedRowKeys.value = []
}

function openStorageCheck() {
  // 如果已选择存放点，直接打开
  if (query.value.storageId) {
    const materials = MATERIALS.value.filter((m) => m.storageId === query.value.storageId)
    if (materials.length === 0) {
      message.warning('该存放点下暂无物资')
      return
    }
    startStorageCheck(query.value.storageId)
  } else {
    // 弹出存放点选择对话框
    Modal.confirm({
      title: '选择存放点',
      content: '请选择要进行整存放点盘点的存放点',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        // 这里简化处理，实际应该有一个选择器
        startStorageCheck(1)
      },
    })
  }
}

function startStorageCheck(storageId: number) {
  const materials = MATERIALS.value.filter((m) => m.storageId === storageId)
  const storageName = STORAGE_OPTIONS.find((s) => s.value === storageId)?.label || ''
  
  storageCheckData.value = materials.map((m) => ({
    id: m.id,
    name: m.name,
    currentStock: m.currentStock,
    actualStock: undefined,
  }))
  
  checkFormData.checkBy = 1
  storageCheckVisible.value = true
}

async function confirmStorageCheck() {
  const validItems = storageCheckData.value.filter((item) => item.actualStock !== undefined && item.actualStock >= 0)
  
  if (validItems.length === 0) {
    message.error('请至少填写一项物资的实际数量')
    return
  }

  await new Promise((resolve) => setTimeout(resolve, 800))

  const checkName = PERSONNEL_OPTIONS.find((p) => p.value === checkFormData.checkBy)?.label || ''
  const checkTime = new Date().toISOString().replace('T', ' ').substring(0, 19)

  validItems.forEach((item) => {
    const material = MATERIALS.value.find((m) => m.id === item.id)
    if (material && item.actualStock !== undefined) {
      const stockBefore = material.currentStock
      const stockAfter = item.actualStock
      const difference = stockAfter - stockBefore

      material.currentStock = stockAfter
      material.lastCheckAt = checkTime
      material.lastCheckBy = checkFormData.checkBy
      material.lastCheckName = checkName

      CHECK_RECORDS.value.unshift({
        id: Date.now() + item.id,
        inventoryId: material.id,
        inventoryName: material.name,
        storageName: material.storageName,
        stockBefore,
        stockAfter,
        difference,
        checkAt: checkTime,
        checkBy: checkFormData.checkBy,
        checkName,
        checkSource: 'storage',
        remark: '',
      })
    }
  })

  const storageName = MATERIALS.value.find((m) => m.id === validItems[0].id)?.storageName || ''
  message.success(`${storageName}盘点完成，成功更新 ${validItems.length} 项物资库存`)
  storageCheckVisible.value = false
}

function openImportCheck() {
  importCheckVisible.value = true
}

function downloadTemplate() {
  message.success('下载盘点模板功能开发中')
}

function handleImportFile() {
  message.success('导入盘点功能开发中')
}

function viewCheckHistory(record: MaterialItem) {
  currentMaterial.value = record
  checkHistoryVisible.value = true
}

function viewRelatedPlans(record: MaterialItem) {
  currentMaterial.value = record
  relatedPlansVisible.value = true
}

function viewDetail(record: MaterialItem) {
  currentMaterial.value = record
  detailVisible.value = true
}

function exportData() {
  message.success('导出功能开发中')
}
</script>


<template>
  <PageContainer title="物资台账">
    <PanelCard>
      <a-form layout="inline" style="margin-bottom: 16px">
        <a-form-item label="所属存放点">
          <a-select
            v-model:value="query.storageId"
            placeholder="全部"
            style="width: 180px"
            allow-clear
            @change="page.current = 1"
          >
            <a-select-option v-for="storage in STORAGE_OPTIONS" :key="storage.value" :value="storage.value">
              {{ storage.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="物资分类">
          <a-select
            v-model:value="query.category"
            placeholder="全部"
            style="width: 160px"
            allow-clear
            @change="page.current = 1"
          >
            <a-select-option v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat">
              {{ cat }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="物资名称">
          <a-input
            v-model:value="query.name"
            placeholder="支持模糊搜索"
            style="width: 200px"
            allow-clear
            @change="page.current = 1"
          />
        </a-form-item>

        <a-form-item label="库存状态">
          <a-select
            v-model:value="query.stockStatus"
            placeholder="全部"
            style="width: 140px"
            allow-clear
            @change="page.current = 1"
          >
            <a-select-option value="sufficient">库存充足</a-select-option>
            <a-select-option value="warning">库存预警</a-select-option>
            <a-select-option value="zero">库存为零</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item>
          <a-button @click="resetFilters">重置</a-button>
        </a-form-item>
      </a-form>

      <!-- 操作按钮栏 -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
        <div>
          <a-space>
            <a-button type="primary" @click="openCreateDrawer">新增物资</a-button>
            <a-button :disabled="selectedRowKeys.length === 0" @click="openBatchCheck">
              批量盘点
            </a-button>
            <a-button @click="openStorageCheck">按存放点盘点</a-button>
          </a-space>
        </div>
        <div>
          <a-space>
            <a-button @click="openImportCheck">导入盘点</a-button>
            <a-button @click="exportData">导出</a-button>
          </a-space>
        </div>
      </div>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="paginatedData"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1600 }"
        :row-selection="{
          selectedRowKeys,
          onChange: (keys: Key[]) => (selectedRowKeys = keys),
        }"
        :row-key="(record: MaterialItem) => record.id"
        :row-class-name="(record: MaterialItem) => isStockWarning(record) ? 'warning-row' : ''"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div style="text-align: center">{{ record.name }}</div>
          </template>

          <template v-if="column.key === 'category'">
            <div style="text-align: center">{{ record.category }}</div>
          </template>

          <template v-if="column.key === 'spec'">
            <div style="text-align: center">
              <a-tooltip v-if="record.spec" :title="record.spec">
                <span>{{ record.spec.slice(0, 20) }}{{ record.spec.length > 20 ? '...' : '' }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </div>
          </template>

          <template v-if="column.key === 'unit'">
            <div style="text-align: center">{{ record.unit }}</div>
          </template>

          <template v-if="column.key === 'currentStock'">
            <div style="text-align: right">
              <span
                :style="{
                  color: isStockWarning(record) ? '#ff4d4f' : record.currentStock === 0 ? '#8c8c8c' : '',
                  fontWeight: isStockWarning(record) ? 'bold' : 'normal',
                }"
              >
                {{ record.currentStock === 0 ? '-' : record.currentStock }}
              </span>
            </div>
          </template>

          <template v-if="column.key === 'minStockAlert'">
            <div style="text-align: right">
              <span v-if="record.minStockAlert === null">-</span>
              <span v-else>{{ record.minStockAlert }}</span>
            </div>
          </template>

          <template v-if="column.key === 'storageName'">
            <div style="text-align: center">{{ record.storageName }}</div>
          </template>

          <template v-if="column.key === 'plans'">
            <div style="text-align: center">
              <a @click="viewRelatedPlans(record)">0个预案</a>
            </div>
          </template>

          <template v-if="column.key === 'lastCheckAt'">
            <div style="text-align: center">
              <span v-if="record.lastCheckAt">{{ record.lastCheckAt.substring(0, 10) }}</span>
              <span v-else style="color: #8c8c8c">-</span>
            </div>
          </template>

          <template v-if="column.key === 'lastCheckName'">
            <div style="text-align: center">
              <span v-if="record.lastCheckName">{{ record.lastCheckName }}</span>
              <span v-else style="color: #8c8c8c">-</span>
            </div>
          </template>

          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="viewDetail(record)">详情</a>
              <a @click="openEditDrawer(record)">编辑</a>
              <a @click="openSingleCheck(record)">盘点</a>
              <a @click="viewCheckHistory(record)">盘点历史</a>
              <a @click="viewRelatedPlans(record)">关联预案</a>
              <a style="color: #ff4d4f" @click="deleteMaterial(record)">删除</a>
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
      :title="drawerMode === 'create' ? '新增物资' : '编辑物资'"
      width="640"
      :closable="true"
      @close="closeDrawer"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="物资名称" required>
          <a-input
            v-model:value="formData.name"
            placeholder="请输入物资名称"
            :maxlength="50"
            show-count
          />
        </a-form-item>

        <a-form-item label="物资分类" required>
          <a-select v-model:value="formData.category" placeholder="请选择物资分类">
            <a-select-option v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat">
              {{ cat }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="规格型号">
          <a-input
            v-model:value="formData.spec"
            placeholder="选填，如：4kg、XXX型号"
            :maxlength="100"
          />
        </a-form-item>

        <a-form-item label="计量单位" required>
          <a-select v-model:value="formData.unit" placeholder="请选择计量单位">
            <a-select-option v-for="unit in UNIT_OPTIONS" :key="unit" :value="unit">
              {{ unit }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="当前库存" required>
          <a-input-number
            v-model:value="formData.currentStock"
            :min="0"
            :precision="1"
            style="width: 100%"
            placeholder="请输入当前库存"
          />
          <div style="color: #8c8c8c; font-size: 12px; margin-top: 4px">
            新增时可填0，表示暂无库存
          </div>
        </a-form-item>

        <a-form-item label="所属存放点" required>
          <a-select v-model:value="formData.storageId" placeholder="请选择所属存放点">
            <a-select-option v-for="storage in STORAGE_OPTIONS" :key="storage.value" :value="storage.value">
              {{ storage.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="最低库存预警值">
          <a-input-number
            v-model:value="formData.minStockAlert"
            :min="0"
            :precision="1"
            style="width: 100%"
            placeholder="选填，不填则不启用预警"
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
            <a-button type="primary" :loading="drawerLoading" @click="saveMaterial">保存</a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>

    <!-- 单条盘点对话框 -->
    <a-modal
      :visible="singleCheckVisible"
      title="盘点物资"
      @ok="confirmSingleCheck"
      @cancel="singleCheckVisible = false"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="物资名称">
          <span>{{ currentMaterial?.name }}</span>
        </a-form-item>

        <a-form-item label="所属存放点">
          <span>{{ currentMaterial?.storageName }}</span>
        </a-form-item>

        <a-form-item label="当前库存">
          <span style="color: #1890ff; font-weight: bold">
            {{ currentMaterial?.currentStock }} {{ currentMaterial?.unit }}
          </span>
        </a-form-item>

        <a-form-item label="实际数量" required>
          <a-input-number
            v-model:value="checkFormData.actualStock"
            :min="0"
            :precision="1"
            style="width: 100%"
            placeholder="请输入实际盘点数量"
          />
        </a-form-item>

        <a-form-item label="盘点人">
          <a-select v-model:value="checkFormData.checkBy" style="width: 100%">
            <a-select-option v-for="person in PERSONNEL_OPTIONS" :key="person.value" :value="person.value">
              {{ person.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="备注">
          <a-input
            v-model:value="checkFormData.remark"
            placeholder="选填，最多100字符"
            :maxlength="100"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量盘点抽屉 -->
    <a-drawer
      :visible="batchCheckVisible"
      :title="`批量盘点（已选 ${batchCheckData.length} 项物资）`"
      width="720"
      @close="batchCheckVisible = false"
    >
      <div style="margin-bottom: 16px">
        <a-form layout="inline">
          <a-form-item label="统一盘点人">
            <a-select v-model:value="checkFormData.checkBy" style="width: 200px">
              <a-select-option v-for="person in PERSONNEL_OPTIONS" :key="person.value" :value="person.value">
                {{ person.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="[
          { title: '物资名称', dataIndex: 'name', width: 180 },
          { title: '所属存放点', dataIndex: 'storageName', width: 150 },
          { title: '当前库存', dataIndex: 'currentStock', width: 100, align: 'right' },
          { title: '实际数量', key: 'actualStock', width: 150 },
          { title: '差异', key: 'difference', width: 100, align: 'right' },
        ]"
        :data-source="batchCheckData"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actualStock'">
            <a-input-number
              v-model:value="record.actualStock"
              :min="0"
              :precision="1"
              style="width: 100%"
              size="small"
            />
          </template>
          <template v-if="column.key === 'difference'">
            <span v-if="record.actualStock !== undefined" :style="{
              color: record.actualStock - record.currentStock > 0 ? '#52c41a' : record.actualStock - record.currentStock < 0 ? '#ff4d4f' : ''
            }">
              {{ record.actualStock - record.currentStock > 0 ? '+' : '' }}{{ record.actualStock - record.currentStock }}
            </span>
            <span v-else style="color: #8c8c8c">-</span>
          </template>
        </template>
      </a-table>

      <div style="margin-top: 16px; text-align: center; color: #8c8c8c">
        已填写 {{ batchCheckData.filter(item => item.actualStock !== undefined).length }}/{{ batchCheckData.length }}
      </div>

      <template #footer>
        <div style="text-align: right">
          <a-space>
            <a-button @click="batchCheckVisible = false">取消</a-button>
            <a-button type="primary" @click="confirmBatchCheck">提交盘点</a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>


    <!-- 按存放点盘点抽屉 -->
    <a-drawer
      :visible="storageCheckVisible"
      title="按存放点盘点"
      width="720"
      @close="storageCheckVisible = false"
    >
      <div style="margin-bottom: 16px">
        <a-form layout="inline">
          <a-form-item label="统一盘点人">
            <a-select v-model:value="checkFormData.checkBy" style="width: 200px">
              <a-select-option v-for="person in PERSONNEL_OPTIONS" :key="person.value" :value="person.value">
                {{ person.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="[
          { title: '物资名称', dataIndex: 'name', width: 200 },
          { title: '当前库存', dataIndex: 'currentStock', width: 100, align: 'right' },
          { title: '实际数量', key: 'actualStock', width: 150 },
          { title: '差异', key: 'difference', width: 100, align: 'right' },
        ]"
        :data-source="storageCheckData"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actualStock'">
            <a-input-number
              v-model:value="record.actualStock"
              :min="0"
              :precision="1"
              style="width: 100%"
              size="small"
            />
          </template>
          <template v-if="column.key === 'difference'">
            <span v-if="record.actualStock !== undefined" :style="{
              color: record.actualStock - record.currentStock > 0 ? '#52c41a' : record.actualStock - record.currentStock < 0 ? '#ff4d4f' : ''
            }">
              {{ record.actualStock - record.currentStock > 0 ? '+' : '' }}{{ record.actualStock - record.currentStock }}
            </span>
            <span v-else style="color: #8c8c8c">-</span>
          </template>
        </template>
      </a-table>

      <div style="margin-top: 16px; text-align: center; color: #8c8c8c">
        已填写 {{ storageCheckData.filter(item => item.actualStock !== undefined).length }}/{{ storageCheckData.length }}
      </div>

      <template #footer>
        <div style="text-align: right">
          <a-space>
            <a-button @click="storageCheckVisible = false">取消</a-button>
            <a-button type="primary" @click="confirmStorageCheck">提交盘点</a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>

    <!-- 导入盘点弹窗 -->
    <a-modal
      :visible="importCheckVisible"
      title="导入盘点"
      width="600"
      @cancel="importCheckVisible = false"
    >
      <div style="text-align: center; padding: 40px 0">
        <p style="margin-bottom: 24px; color: #595959">请先下载盘点模板，填写实际数量后再上传</p>
        <a-button type="primary" @click="downloadTemplate" style="margin-bottom: 24px">
          下载盘点模板
        </a-button>
        <a-upload-dragger
          name="file"
          accept=".xlsx,.xls"
          :before-upload="() => false"
          @change="handleImportFile"
        >
          <p class="ant-upload-drag-icon">
            <inbox-outlined />
          </p>
          <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p class="ant-upload-hint">仅支持 .xlsx / .xls 格式，文件大小限制 5MB</p>
        </a-upload-dragger>
      </div>

      <template #footer>
        <div style="text-align: right">
          <a-space>
            <a-button @click="importCheckVisible = false">取消</a-button>
            <a-button type="primary">开始导入</a-button>
          </a-space>
        </div>
      </template>
    </a-modal>

    <!-- 盘点历史抽屉 -->
    <a-drawer
      :visible="checkHistoryVisible"
      :title="`盘点历史 - ${currentMaterial?.name}`"
      width="720"
      @close="checkHistoryVisible = false"
    >
      <a-table
        :columns="[
          { title: '盘点日期', dataIndex: 'checkAt', width: 160 },
          { title: '盘点前数量', dataIndex: 'stockBefore', width: 100, align: 'right' },
          { title: '盘点后数量', dataIndex: 'stockAfter', width: 100, align: 'right' },
          { title: '差异', key: 'difference', width: 80, align: 'right' },
          { title: '盘点人', dataIndex: 'checkName', width: 100 },
          { title: '备注', dataIndex: 'remark', width: 200, ellipsis: true },
        ]"
        :data-source="checkRecords"
        :pagination="{ pageSize: 20 }"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'difference'">
            <span v-if="record.difference > 0" style="color: #52c41a">+{{ record.difference }}</span>
            <span v-else-if="record.difference < 0" style="color: #ff4d4f">{{ record.difference }}</span>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>

      <a-empty v-if="checkRecords.length === 0" description="该物资暂无盘点记录" />
    </a-drawer>

    <!-- 关联预案弹窗 -->
    <a-modal
      :visible="relatedPlansVisible"
      :title="`关联预案 - ${currentMaterial?.name}`"
      width="600"
      @cancel="relatedPlansVisible = false"
    >
      <p style="margin-bottom: 16px; color: #8c8c8c">
        以下应急预案将使用该物资（由预案管理模块维护）
      </p>
      <a-empty description="该物资暂无关联预案" />

      <template #footer>
        <a-button @click="relatedPlansVisible = false">关闭</a-button>
      </template>
    </a-modal>

    <!-- 物资详情抽屉 -->
    <a-drawer
      :visible="detailVisible"
      title="物资详情"
      width="720"
      @close="detailVisible = false"
    >
      <a-descriptions bordered :column="2" v-if="currentMaterial">
        <a-descriptions-item label="物资名称" :span="2">{{ currentMaterial.name }}</a-descriptions-item>
        <a-descriptions-item label="物资分类">{{ currentMaterial.category }}</a-descriptions-item>
        <a-descriptions-item label="规格型号">{{ currentMaterial.spec || '-' }}</a-descriptions-item>
        <a-descriptions-item label="计量单位">{{ currentMaterial.unit }}</a-descriptions-item>
        <a-descriptions-item label="当前库存">
          <span :style="{ color: isStockWarning(currentMaterial) ? '#ff4d4f' : '', fontWeight: isStockWarning(currentMaterial) ? 'bold' : 'normal' }">
            {{ currentMaterial.currentStock }}
          </span>
        </a-descriptions-item>
        <a-descriptions-item label="最低库存预警值" :span="2">
          {{ currentMaterial.minStockAlert !== null ? currentMaterial.minStockAlert : '未设置' }}
        </a-descriptions-item>
        <a-descriptions-item label="所属存放点" :span="2">{{ currentMaterial.storageName }}</a-descriptions-item>
        <a-descriptions-item label="最后盘点日期">
          {{ currentMaterial.lastCheckAt ? currentMaterial.lastCheckAt.substring(0, 10) : '未盘点' }}
        </a-descriptions-item>
        <a-descriptions-item label="最后盘点人">
          {{ currentMaterial.lastCheckName || '未盘点' }}
        </a-descriptions-item>
        <a-descriptions-item label="备注" :span="2">{{ currentMaterial.remark || '-' }}</a-descriptions-item>
      </a-descriptions>

      <a-divider>关联预案</a-divider>
      <a-empty description="暂无关联预案" />

      <a-divider>盘点历史记录</a-divider>
      <a-table
        :columns="[
          { title: '盘点日期', dataIndex: 'checkAt', width: 160 },
          { title: '盘点前', dataIndex: 'stockBefore', width: 80, align: 'right' },
          { title: '盘点后', dataIndex: 'stockAfter', width: 80, align: 'right' },
          { title: '差异', key: 'difference', width: 70, align: 'right' },
          { title: '盘点人', dataIndex: 'checkName', width: 90 },
        ]"
        :data-source="checkRecords"
        :pagination="{ pageSize: 10 }"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'difference'">
            <span v-if="record.difference > 0" style="color: #52c41a">+{{ record.difference }}</span>
            <span v-else-if="record.difference < 0" style="color: #ff4d4f">{{ record.difference }}</span>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
      <a-empty v-if="checkRecords.length === 0" description="暂无盘点记录" style="margin-top: 16px" />

      <template #footer>
        <div style="text-align: right">
          <a-space>
            <a-button @click="detailVisible = false">关闭</a-button>
            <a-button type="primary" @click="() => { detailVisible = false; openEditDrawer(currentMaterial!) }">
              编辑
            </a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>
  </PageContainer>
</template>

<style scoped>
/* 表格底色 / 固定列 / 行 hover 一律由 global.scss 统一处理，此处不再覆写 —— */
/* 原先硬编码的 hover 色 #1d2935 与 token --of-bg-row-hover(#24333c) 不一致，会让本页 hover 与其他页不同。 */

/* 预警行样式已通过文字颜色和字重标识，不设置背景色 */
</style>
