<script setup lang="ts">
/**
 * 预警规则配置 —— PRD-预警管理-预警规则配置 V1.0
 */
import { ref, reactive, computed } from 'vue'
import {
  PlusOutlined,
  EditOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import PageContainer from '@/components/PageContainer.vue'
import PanelCard from '@/components/PanelCard.vue'

// ==================== Tab 全局 ====================
const activeTab = ref('type-mapping')

// ==================== Tab1: 类型与映射 ====================

interface AlertType {
  key: string
  label: string
  status: 'active' | 'inactive'
  urgency: 'urgent' | 'normal'
}

interface AlertCategory {
  key: string
  label: string
  expanded: boolean
  types: AlertType[]
}

const categories = reactive<AlertCategory[]>([
  {
    key: 'intrusion', label: '入侵', expanded: true,
    types: [
      { key: 'zone-intrusion', label: '区域入侵', status: 'active', urgency: 'urgent' },
      { key: 'boundary-detect', label: '越界侦测', status: 'active', urgency: 'urgent' },
      { key: 'perimeter-loiter', label: '周界徘徊', status: 'active', urgency: 'normal' },
    ],
  },
  {
    key: 'uav-threat', label: '无人机威胁', expanded: true,
    types: [
      { key: 'uav-intrusion', label: '无人机入侵', status: 'active', urgency: 'urgent' },
      { key: 'uav-recon', label: '无人机侦察', status: 'active', urgency: 'normal' },
    ],
  },
  {
    key: 'device-alarm', label: '设备告警', expanded: false,
    types: [
      { key: 'device-offline', label: '设备离线', status: 'active', urgency: 'normal' },
      { key: 'device-fault', label: '设备故障', status: 'active', urgency: 'normal' },
    ],
  },
  {
    key: 'personnel-sos', label: '人员求助', expanded: false,
    types: [
      { key: 'sos', label: '紧急求助', status: 'active', urgency: 'urgent' },
    ],
  },
  {
    key: 'vehicle-anomaly', label: '车辆异常', expanded: false,
    types: [
      { key: 'vehicle-geofence', label: '出围栏', status: 'active', urgency: 'urgent' },
      { key: 'vehicle-overspeed', label: '超速', status: 'active', urgency: 'normal' },
    ],
  },
  {
    key: 'natural-disaster', label: '自然灾害', expanded: false,
    types: [
      { key: 'smoke', label: '烟雾', status: 'active', urgency: 'urgent' },
      { key: 'fire', label: '火情', status: 'active', urgency: 'urgent' },
    ],
  },
  {
    key: 'security-incident', label: '治安事件', expanded: false,
    types: [
      { key: 'abnormal-person', label: '异常人员', status: 'active', urgency: 'normal' },
      { key: 'night-light', label: '夜间异常光源', status: 'active', urgency: 'normal' },
    ],
  },
])

interface MappingRule {
  id: string; sourceSystem: string; sourceType: string
  targetType: string; status: 'active' | 'inactive'
}

const mappingRules = reactive<MappingRule[]>([
  { id: '1', sourceSystem: '反无设备', sourceType: 'alarm（入侵告警）', targetType: '无人机入侵', status: 'active' },
  { id: '2', sourceSystem: '反无设备', sourceType: 'detect（探测）', targetType: '无人机侦察', status: 'active' },
  { id: '3', sourceSystem: '高点摄像头', sourceType: '越界侦测', targetType: '越界侦测', status: 'active' },
  { id: '4', sourceSystem: '高点摄像头', sourceType: '区域入侵', targetType: '区域入侵', status: 'active' },
  { id: '5', sourceSystem: '高点摄像头', sourceType: '烟雾检测', targetType: '烟雾', status: 'active' },
  { id: '6', sourceSystem: '高点摄像头', sourceType: '火点检测', targetType: '火情', status: 'active' },
  { id: '7', sourceSystem: 'CCTV', sourceType: '人员识别', targetType: '异常人员', status: 'inactive' },
  { id: '8', sourceSystem: 'CCTV', sourceType: '明火烟雾', targetType: '烟雾', status: 'active' },
  { id: '9', sourceSystem: 'CCTV', sourceType: '夜间异常光源', targetType: '夜间异常光源', status: 'active' },
  { id: '10', sourceSystem: 'C类无人机', sourceType: '侦查事件', targetType: '无人机侦察', status: 'active' },
  { id: '11', sourceSystem: '车辆系统', sourceType: '出围栏', targetType: '出围栏', status: 'active' },
  { id: '12', sourceSystem: '车辆系统', sourceType: '超速', targetType: '超速', status: 'active' },
])

// ==================== Tab2: 合并与紧急度 ====================

interface MergeRule {
  typeKey: string; typeLabel: string; category: string
  windowN: number; distanceM: number; urgency: 'urgent' | 'normal'
}

const mergeRules = reactive<MergeRule[]>([
  { typeKey: 'zone-intrusion', typeLabel: '区域入侵', category: '入侵', windowN: 10, distanceM: 500, urgency: 'urgent' },
  { typeKey: 'boundary-detect', typeLabel: '越界侦测', category: '入侵', windowN: 5, distanceM: 300, urgency: 'urgent' },
  { typeKey: 'perimeter-loiter', typeLabel: '周界徘徊', category: '入侵', windowN: 30, distanceM: 200, urgency: 'normal' },
  { typeKey: 'uav-intrusion', typeLabel: '无人机入侵', category: '无人机威胁', windowN: 3, distanceM: 1000, urgency: 'urgent' },
  { typeKey: 'uav-recon', typeLabel: '无人机侦察', category: '无人机威胁', windowN: 10, distanceM: 2000, urgency: 'normal' },
  { typeKey: 'device-offline', typeLabel: '设备离线', category: '设备告警', windowN: 60, distanceM: 0, urgency: 'normal' },
  { typeKey: 'device-fault', typeLabel: '设备故障', category: '设备告警', windowN: 60, distanceM: 0, urgency: 'normal' },
  { typeKey: 'sos', typeLabel: '紧急求助', category: '人员求助', windowN: 5, distanceM: 100, urgency: 'urgent' },
  { typeKey: 'vehicle-geofence', typeLabel: '出围栏', category: '车辆异常', windowN: 5, distanceM: 500, urgency: 'urgent' },
  { typeKey: 'vehicle-overspeed', typeLabel: '超速', category: '车辆异常', windowN: 10, distanceM: 0, urgency: 'normal' },
  { typeKey: 'smoke', typeLabel: '烟雾', category: '自然灾害', windowN: 5, distanceM: 500, urgency: 'urgent' },
  { typeKey: 'fire', typeLabel: '火情', category: '自然灾害', windowN: 3, distanceM: 500, urgency: 'urgent' },
  { typeKey: 'abnormal-person', typeLabel: '异常人员', category: '治安事件', windowN: 15, distanceM: 200, urgency: 'normal' },
  { typeKey: 'night-light', typeLabel: '夜间异常光源', category: '治安事件', windowN: 10, distanceM: 300, urgency: 'normal' },
])


const timeLimits = reactive({
  urgentVerify: 5, normalVerify: 30,
  urgentDecision: 10, normalDecision: 60,
})
const reviewCycle = ref(24)
const overtimeInterval = ref(15)

// ==================== Tab4: 研判参数 ====================

const investigationRadius = reactive([
  { category: '入侵', radius: 1000 },
  { category: '无人机威胁', radius: 3000 },
  { category: '设备告警', radius: 500 },
  { category: '人员求助', radius: 1000 },
  { category: '车辆异常', radius: 1500 },
  { category: '自然灾害', radius: 1000 },
  { category: '治安事件', radius: 1000 },
])

const cameraRange = reactive({ visible: 3000, thermal: 5000 })
const historyWindow = reactive({ before: 30, after: 10 })
const friendlyParams = reactive({ distance: 200, timeDiff: 10 })
const trackRetentionDays = ref(30)

// ==================== Tab5: 字典 ====================

interface DictItem { id: string; label: string; status: 'active' | 'inactive'; protected?: boolean }

const falseAlarmReasons = reactive<DictItem[]>([
  { id: 'f1', label: '设备误识别', status: 'active' },
  { id: 'f2', label: '己方目标', status: 'active' },
  { id: 'f3', label: '白名单目标', status: 'active' },
  { id: 'f4', label: '动物或天气干扰', status: 'active' },
  { id: 'f5', label: '其他（必填说明）', status: 'active', protected: true },
])

const dismissReasons = reactive<DictItem[]>([
  { id: 'd1', label: '已劝离', status: 'active' },
  { id: 'd2', label: '自然消失', status: 'active' },
  { id: 'd3', label: '风险已消除', status: 'active' },
  { id: 'd4', label: '其他（必填说明）', status: 'active', protected: true },
])

// ==================== Tab6: 通知配置 ====================

interface NotifyNode {
  id: string; label: string; required: boolean
  recipients: { type: 'shift' | 'fixed' | 'auto'; label: string }[]
}

const notifyNodes = reactive<NotifyNode[]>([
  { id: 'n1', label: '新预警待核实', required: true, recipients: [{ type: 'shift', label: '今日值班（指挥中心值班）' }] },
  { id: 'n3', label: '待决策', required: false, recipients: [{ type: 'shift', label: '今日值班（安保负责人）' }] },
  { id: 'n6', label: '核实任务已回填', required: false, recipients: [{ type: 'auto', label: '任务下发人（自动）' }] },
  { id: 'n7', label: '出现疑似关联预警', required: false, recipients: [{ type: 'shift', label: '今日值班（指挥中心值班）' }] },
])

// ==================== 弹窗状态 ====================

const unmappedVisible = ref(false)
const unmappedItems = reactive([
  { system: '高点摄像头', type: 'crowd_gather（人群聚集）', firstSeen: '2026-09-20 08:14', count: 47 },
  { system: 'CCTV', type: 'abnormal_stop（车辆异常停留）', firstSeen: '2026-09-22 14:30', count: 12 },
  { system: '反无设备', type: 'jamming（干扰信号）', firstSeen: '2026-09-25 03:22', count: 3 },
])

// 类型表单：区分新增大类 / 新增具体类型 / 编辑具体类型
const typeFormVisible = ref(false)
const typeFormMode = ref<'addCategory' | 'addType' | 'editType'>('addType')
const typeFormEditTarget = ref<AlertType | null>(null)
const typeForm = reactive({ categoryKey: '', label: '', urgency: 'normal' as 'urgent' | 'normal' })

// 映射表单：新增 / 编辑
const mappingFormVisible = ref(false)
const mappingFormMode = ref<'add' | 'edit'>('add')
const mappingFormEditTarget = ref<MappingRule | null>(null)
const mappingForm = reactive({ sourceSystem: '', sourceType: '', targetType: '' })

// 字典表单：新增 / 编辑
const dictFormVisible = ref(false)
const dictFormTarget = ref<'false' | 'dismiss'>('false')
const dictFormMode = ref<'add' | 'edit'>('add')
const dictFormEditTarget = ref<DictItem | null>(null)
const dictForm = reactive({ label: '' })

// 通知接收人选择器
const recipientPickerVisible = ref(false)
const recipientPickerNode = ref<NotifyNode | null>(null)
const recipientPickerType = ref<'shift' | 'fixed'>('shift')
const shiftRoles = ['指挥中心值班', '安保负责人', '营地主管', '安保队长']
const fixedUsers = ['张明远', '李慧敏', '王大伟', '陈晓东', '赵建国', '刘芳芳']
const selectedShiftRole = ref('')
const selectedFixedUsers = ref<string[]>([])

// 通知配置空接收人警告
const notifyEmptyWarning = computed(() =>
  notifyNodes[0].recipients.length === 0
)

// ==================== 操作日志 ====================

interface LogEntry {
  time: string
  operator: string
  action: string
  detail: string
}

const auditLogs = reactive<Record<string, LogEntry[]>>({
  'type-mapping': [
    { time: '2026-09-26 10:32', operator: '张明远', action: '新增映射规则', detail: '高点摄像头 / crowd_gather → 治安事件' },
    { time: '2026-09-25 16:14', operator: '李慧敏', action: '停用具体类型', detail: '治安事件 → 异常车辆（已停用）' },
    { time: '2026-09-24 09:05', operator: '张明远', action: '新增具体类型', detail: '自然灾害 → 洪涝' },
  ],
  'merge-urgency': [
    { time: '2026-09-23 14:20', operator: '王大伟', action: '修改合并窗口', detail: '无人机入侵：N 从 5 → 3 分钟' },
    { time: '2026-09-20 11:00', operator: '张明远', action: '修改紧急程度', detail: '周界徘徊：紧急 → 一般' },
  ],
  'time-review': [
    { time: '2026-09-22 09:30', operator: '李慧敏', action: '修改时限', detail: '待核实紧急档：10 → 5 分钟' },
  ],
  'investigation': [
    { time: '2026-09-21 15:45', operator: '张明远', action: '修改研判半径', detail: '无人机威胁：2000 → 3000 米' },
  ],
  'dictionary': [
    { time: '2026-09-20 10:10', operator: '王大伟', action: '新增误报原因', detail: '「动物或天气干扰」' },
  ],
  'notify': [
  ],
})

function addLog(tab: string, action: string, detail: string) {
  if (!auditLogs[tab]) auditLogs[tab] = []
  auditLogs[tab].unshift({
    time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    operator: '当前用户',
    action,
    detail,
  })
}

// ==================== 事件处理 ====================

function toggleCategory(cat: AlertCategory) { cat.expanded = !cat.expanded }

// 新增大类
function openAddCategoryForm() {
  typeFormMode.value = 'addCategory'
  typeForm.categoryKey = ''
  typeForm.label = ''
  typeForm.urgency = 'normal'
  typeFormVisible.value = true
}

// 新增具体类型
function openAddTypeForm(categoryKey: string) {
  typeFormMode.value = 'addType'
  typeFormEditTarget.value = null
  typeForm.categoryKey = categoryKey
  typeForm.label = ''
  typeForm.urgency = 'normal'
  typeFormVisible.value = true
}

// 编辑具体类型
function openEditTypeForm(categoryKey: string, type: AlertType) {
  typeFormMode.value = 'editType'
  typeFormEditTarget.value = type
  typeForm.categoryKey = categoryKey
  typeForm.label = type.label
  typeForm.urgency = type.urgency
  typeFormVisible.value = true
}

function saveTypeForm() {
  if (!typeForm.label.trim()) { message.error('请填写名称'); return }
  if (typeFormMode.value === 'addCategory') {
    categories.push({ key: `cat-${Date.now()}`, label: typeForm.label.trim(), expanded: true, types: [] })
    addLog('type-mapping', '新增大类', `「${typeForm.label.trim()}」`)
    message.success('大类已添加')
  } else if (typeFormMode.value === 'addType') {
    const cat = categories.find(c => c.key === typeForm.categoryKey)
    if (cat) {
      cat.types.push({ key: `type-${Date.now()}`, label: typeForm.label.trim(), status: 'active', urgency: typeForm.urgency })
      addLog('type-mapping', '新增具体类型', `${cat.label} → ${typeForm.label.trim()}`)
      message.success('类型已添加')
    }
  } else if (typeFormMode.value === 'editType' && typeFormEditTarget.value) {
    const old = typeFormEditTarget.value.label
    typeFormEditTarget.value.label = typeForm.label.trim()
    typeFormEditTarget.value.urgency = typeForm.urgency
    addLog('type-mapping', '编辑具体类型', `「${old}」→「${typeForm.label.trim()}」`)
    message.success('已更新')
  }
  typeFormVisible.value = false
}

function toggleTypeStatus(type: AlertType) {
  if (type.status === 'active') {
    Modal.confirm({
      title: '确认停用',
      content: `停用「${type.label}」后，关联的映射规则同步停用，已有预警记录不受影响，确认停用？`,
      okText: '确认停用', cancelText: '取消', okType: 'danger',
      onOk() {
        type.status = 'inactive'
        addLog('type-mapping', '停用具体类型', `「${type.label}」`)
        message.success('已停用')
      },
    })
  } else {
    type.status = 'active'
    addLog('type-mapping', '启用具体类型', `「${type.label}」`)
    message.success('已启用')
  }
}

// 新增映射规则
function openMappingForm() {
  mappingFormMode.value = 'add'
  mappingFormEditTarget.value = null
  mappingForm.sourceSystem = ''
  mappingForm.sourceType = ''
  mappingForm.targetType = ''
  mappingFormVisible.value = true
}

// 编辑映射规则
function openEditMappingForm(rule: MappingRule) {
  mappingFormMode.value = 'edit'
  mappingFormEditTarget.value = rule
  mappingForm.sourceSystem = rule.sourceSystem
  mappingForm.sourceType = rule.sourceType
  mappingForm.targetType = rule.targetType
  mappingFormVisible.value = true
}

function saveMappingForm() {
  if (!mappingForm.sourceSystem || !mappingForm.sourceType || !mappingForm.targetType) {
    message.error('请填写完整信息'); return
  }
  const dup = mappingRules.find(r =>
    r.sourceSystem === mappingForm.sourceSystem &&
    r.sourceType === mappingForm.sourceType &&
    r !== mappingFormEditTarget.value
  )
  if (dup) {
    message.error(`该三方告警类型已映射到「${dup.targetType}」，请先停用再修改`); return
  }
  if (mappingFormMode.value === 'add') {
    mappingRules.push({ id: `m-${Date.now()}`, ...mappingForm, status: 'active' })
    addLog('type-mapping', '新增映射规则', `${mappingForm.sourceSystem} / ${mappingForm.sourceType} → ${mappingForm.targetType}`)
    message.success('映射规则已添加')
  } else if (mappingFormEditTarget.value) {
    const old = `${mappingFormEditTarget.value.sourceSystem} / ${mappingFormEditTarget.value.sourceType}`
    mappingFormEditTarget.value.sourceSystem = mappingForm.sourceSystem
    mappingFormEditTarget.value.sourceType = mappingForm.sourceType
    mappingFormEditTarget.value.targetType = mappingForm.targetType
    addLog('type-mapping', '编辑映射规则', `「${old}」已更新`)
    message.success('已更新')
  }
  mappingFormVisible.value = false
}

function toggleMappingStatus(rule: MappingRule) {
  rule.status = rule.status === 'active' ? 'inactive' : 'active'
  addLog('type-mapping', rule.status === 'active' ? '启用映射规则' : '停用映射规则', `${rule.sourceSystem} / ${rule.sourceType}`)
  message.success(rule.status === 'active' ? '已启用' : '已停用')
}

function saveTimeLimits() {
  addLog('time-review', '修改时限配置', `待核实 ${timeLimits.urgentVerify}/${timeLimits.normalVerify} 分钟，待决策 ${timeLimits.urgentDecision}/${timeLimits.normalDecision} 分钟`)
  message.success('时限配置已保存')
}
function saveReviewCycle() {
  addLog('time-review', '修改复核周期', `${reviewCycle.value} 小时`)
  message.success('复核周期已保存')
}
function saveInvestigationParams() {
  addLog('investigation', '修改研判参数', '参数已更新')
  message.success('研判参数已保存')
}

// 通知配置——接收人选择器
function openRecipientPicker(node: NotifyNode, type: 'shift' | 'fixed') {
  recipientPickerNode.value = node
  recipientPickerType.value = type
  selectedShiftRole.value = ''
  selectedFixedUsers.value = []
  recipientPickerVisible.value = true
}

function saveRecipient() {
  const node = recipientPickerNode.value
  if (!node) return
  if (recipientPickerType.value === 'shift' && selectedShiftRole.value) {
    node.recipients.push({ type: 'shift', label: `今日值班（${selectedShiftRole.value}）` })
    addLog('notify', '修改接收人', `${node.label}：添加今日值班「${selectedShiftRole.value}」`)
  } else if (recipientPickerType.value === 'fixed' && selectedFixedUsers.value.length > 0) {
    selectedFixedUsers.value.forEach(u => node.recipients.push({ type: 'fixed', label: u }))
    addLog('notify', '修改接收人', `${node.label}：添加固定人员「${selectedFixedUsers.value.join('、')}」`)
  }
  recipientPickerVisible.value = false
  message.success('接收人已添加')
}

function removeRecipient(node: NotifyNode, idx: number) {
  if (node.id === 'n6') return // 自动节点不可删
  node.recipients.splice(idx, 1)
  addLog('notify', '移除接收人', `${node.label}：已移除`)
}

function saveNotifyConfig() {
  if (notifyEmptyWarning.value) {
    message.error('「新预警待核实」接收人不能为空，禁止保存')
    return
  }
  addLog('notify', '保存通知配置', '全部节点接收人已更新')
  message.success('通知配置已保存')
}

// 字典
function openDictForm(target: 'false' | 'dismiss') {
  dictFormTarget.value = target
  dictFormMode.value = 'add'
  dictFormEditTarget.value = null
  dictForm.label = ''
  dictFormVisible.value = true
}

function openEditDictForm(target: 'false' | 'dismiss', item: DictItem) {
  dictFormTarget.value = target
  dictFormMode.value = 'edit'
  dictFormEditTarget.value = item
  dictForm.label = item.label
  dictFormVisible.value = true
}

function saveDictForm() {
  if (!dictForm.label.trim()) { message.error('请输入原因名称'); return }
  if (dictForm.label.length > 20) { message.error('原因名称最多 20 个字符'); return }
  if (dictFormMode.value === 'add') {
    const newItem: DictItem = { id: `dict-${Date.now()}`, label: dictForm.label.trim(), status: 'active' }
    if (dictFormTarget.value === 'false') falseAlarmReasons.push(newItem)
    else dismissReasons.push(newItem)
    addLog('dictionary', '新增字典条目', `「${dictForm.label.trim()}」`)
    message.success('已添加')
  } else if (dictFormEditTarget.value) {
    const old = dictFormEditTarget.value.label
    dictFormEditTarget.value.label = dictForm.label.trim()
    addLog('dictionary', '编辑字典条目', `「${old}」→「${dictForm.label.trim()}」`)
    message.success('已更新')
  }
  dictFormVisible.value = false
}

function toggleDictStatus(item: DictItem) {
  if (item.protected) return
  item.status = item.status === 'active' ? 'inactive' : 'active'
  addLog('dictionary', item.status === 'active' ? '启用字典条目' : '停用字典条目', `「${item.label}」`)
  message.success(item.status === 'active' ? '已启用' : '已停用')
}
</script>

<template>
  <PageContainer title="预警规则配置">
    <!-- 顶部 Tab 导航 -->
    <div class="rule-tabs">
      <button
        v-for="tab in [
          { key: 'type-mapping', label: '类型与映射' },
          { key: 'merge-urgency', label: '合并与紧急度' },
          { key: 'investigation', label: '研判参数' },
          { key: 'dictionary', label: '字典' },
          { key: 'notify', label: '通知配置' },
        ]"
        :key="tab.key"
        class="rule-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- ======== Tab1: 类型与映射 ======== -->
    <template v-if="activeTab === 'type-mapping'">
      <PanelCard>
        <div class="card-header">
          <span class="card-title">预警类型字典</span>
          <button class="btn-primary" @click="openAddCategoryForm">
            <PlusOutlined /> 新增大类
          </button>
        </div>

        <div class="type-tree">
          <div v-for="cat in categories" :key="cat.key" class="tree-category">
            <div class="category-row" @click="toggleCategory(cat)">
              <span class="category-toggle">
                <CaretDownOutlined v-if="cat.expanded" />
                <CaretRightOutlined v-else />
              </span>
              <span class="category-label">{{ cat.label }}</span>
              <span class="category-count">{{ cat.types.length }} 个类型</span>
              <button class="btn-link" @click.stop="openAddTypeForm(cat.key)">
                <PlusOutlined /> 新增类型
              </button>
            </div>
            <div v-if="cat.expanded" class="type-list">
              <div v-for="type in cat.types" :key="type.key" class="type-row">
                <span class="type-name">{{ type.label }}</span>
                <span class="status-badge" :class="type.status">
                  {{ type.status === 'active' ? '启用' : '停用' }}
                </span>
                <span class="urgency-badge" :class="type.urgency">
                  {{ type.urgency === 'urgent' ? '🔴 紧急' : '⚪ 一般' }}
                </span>
                <div class="row-actions">
                  <button class="btn-link" @click.stop="openEditTypeForm(cat.key, type)"><EditOutlined /> 编辑</button>
                  <button
                    class="btn-link"
                    :class="{ danger: type.status === 'active' }"
                    @click.stop="toggleTypeStatus(type)"
                  >{{ type.status === 'active' ? '停用' : '启用' }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PanelCard>

      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header">
          <span class="card-title">三方告警映射</span>
          <div class="header-actions">
            <button class="btn-ghost" @click="unmappedVisible = true">
              查看未映射类型 <span class="badge-count">3</span>
            </button>
            <button class="btn-primary" @click="openMappingForm">
              <PlusOutlined /> 新增映射规则
            </button>
          </div>
        </div>

        <div class="data-table">
          <div class="table-head">
            <span class="col-system">三方系统</span>
            <span class="col-source-type">三方告警类型</span>
            <span class="col-target">映射到预警类型</span>
            <span class="col-status">状态</span>
            <span class="col-actions">操作</span>
          </div>
          <div
            v-for="rule in mappingRules"
            :key="rule.id"
            class="table-row"
            :class="{ inactive: rule.status === 'inactive' }"
          >
            <span class="col-system">{{ rule.sourceSystem }}</span>
            <span class="col-source-type">{{ rule.sourceType }}</span>
            <span class="col-target">{{ rule.targetType }}</span>
            <span class="col-status">
              <span class="status-badge" :class="rule.status">
                {{ rule.status === 'active' ? '启用' : '停用' }}
              </span>
            </span>
            <span class="col-actions">
              <button class="btn-link" @click="openEditMappingForm(rule)"><EditOutlined /> 编辑</button>
              <button
                class="btn-link"
                :class="{ danger: rule.status === 'active' }"
                @click="toggleMappingStatus(rule)"
              >{{ rule.status === 'active' ? '停用' : '启用' }}</button>
            </span>
          </div>
        </div>
      </PanelCard>
    </template>

    <!-- ======== Tab2: 合并与紧急度 ======== -->
    <template v-if="activeTab === 'merge-urgency'">
      <PanelCard>
        <div class="card-header">
          <span class="card-title">合并规则与紧急程度预置</span>
        </div>
        <p class="card-desc">
          自动合并只在「待核实」阶段生效。同设备、同类型、窗口 N 内、距离 M 内的新告警自动并入已有预警。人工上报不参与自动合并。合并距离设为 0 表示只按时间窗合并，不限空间。
        </p>

        <div class="data-table">
          <div class="table-head">
            <span class="col-type-name">预警类型</span>
            <span class="col-num">合并窗口 N（分钟）</span>
            <span class="col-num">合并距离 M（米）</span>
            <span class="col-urgency">默认紧急程度</span>
          </div>
          <template v-for="cat in categories" :key="cat.key">
            <div class="table-row category-separator">
              <span class="col-type-name category-label-inline">{{ cat.label }}</span>
            </div>
            <div
              v-for="rule in mergeRules.filter(r => r.category === cat.label)"
              :key="rule.typeKey"
              class="table-row"
            >
              <span class="col-type-name indent">{{ rule.typeLabel }}</span>
              <span class="col-num">
                <input class="inline-input" type="number" v-model="rule.windowN" min="1" max="1440" />
              </span>
              <span class="col-num">
                <input class="inline-input" type="number" v-model="rule.distanceM" min="0" max="50000" />
              </span>
              <span class="col-urgency">
                <button
                  class="urgency-toggle"
                  :class="rule.urgency"
                  @click="rule.urgency = rule.urgency === 'urgent' ? 'normal' : 'urgent'"
                >
                  {{ rule.urgency === 'urgent' ? '🔴 紧急' : '⚪ 一般' }}
                </button>
              </span>
            </div>
          </template>
        </div>
        <div class="card-footer">
          <button class="btn-primary" @click="() => message.success('合并规则已保存')">保存</button>
        </div>
      </PanelCard>
    </template>

    <template v-if="activeTab === 'time-review'">
      <PanelCard>
        <div class="card-header"><span class="card-title">状态时限（分钟）</span></div>
        <p class="card-desc">时限从进入该状态的时刻起算。超时后列表标红并触发通知，不自动改变预警状态。</p>
        <div class="time-limit-grid">
          <div class="tl-header">
            <span>状态</span><span>紧急档时限</span><span>一般档时限</span>
          </div>
          <div class="tl-row">
            <span>待核实</span>
            <span><input class="inline-input" type="number" v-model="timeLimits.urgentVerify" min="1" max="1440" /> 分钟</span>
            <span><input class="inline-input" type="number" v-model="timeLimits.normalVerify" min="1" max="1440" /> 分钟</span>
          </div>
          <div class="tl-row">
            <span>待决策</span>
            <span><input class="inline-input" type="number" v-model="timeLimits.urgentDecision" min="1" max="1440" /> 分钟</span>
            <span><input class="inline-input" type="number" v-model="timeLimits.normalDecision" min="1" max="1440" /> 分钟</span>
          </div>
        </div>
        <div class="card-footer"><button class="btn-primary" @click="saveTimeLimits">保存</button></div>
      </PanelCard>

      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">持续跟踪复核周期</span></div>
        <p class="card-desc">持续跟踪中的预警每隔此周期提醒负责人复核一次。复核时间从上次复核（或进入跟踪状态）时刻起算。</p>
        <div class="single-param">
          <span class="param-label">复核周期</span>
          <input class="inline-input wide" type="number" v-model="reviewCycle" min="1" max="168" />
          <span class="param-unit">小时（范围：1–168）</span>
        </div>
        <div class="card-footer"><button class="btn-primary" @click="saveReviewCycle">保存</button></div>
      </PanelCard>

      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">超时后通知间隔</span></div>
        <div class="single-param">
          <span class="param-label">待决策超时后，每隔</span>
          <input class="inline-input wide" type="number" v-model="overtimeInterval" min="5" max="60" />
          <span class="param-unit">分钟重复通知负责人，直到有人处理。（范围：5–60 分钟）</span>
        </div>
        <div class="card-footer"><button class="btn-primary" @click="() => message.success('已保存')">保存</button></div>
      </PanelCard>
    </template>

    <!-- ======== Tab4: 研判参数 ======== -->
    <template v-if="activeTab === 'investigation'">
      <PanelCard>
        <div class="card-header"><span class="card-title">研判半径（按预警大类配置，单位：米）</span></div>
        <p class="card-desc">值班员在研判页可以临时调整当前预警的半径，不影响此处配置。</p>
        <div class="data-table">
          <div class="table-head">
            <span class="col-category">预警大类</span><span class="col-radius">研判半径（米）</span>
          </div>
          <div v-for="row in investigationRadius" :key="row.category" class="table-row">
            <span class="col-category">{{ row.category }}</span>
            <span class="col-radius">
              <input class="inline-input" type="number" v-model="row.radius" min="100" max="50000" />
            </span>
          </div>
        </div>
      </PanelCard>

      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">高点摄像头有效监视距离</span></div>
        <p class="card-desc">研判页据此判断高点摄像头是否「理论可视」预警点，标注「已对准 / 需转向」。距离为理论值，不考虑地形遮挡。初始值待厂家确认（TBD-02）。</p>
        <div class="param-row-group">
          <div class="single-param">
            <span class="param-label">可见光通道</span>
            <input class="inline-input wide" type="number" v-model="cameraRange.visible" min="100" max="20000" />
            <span class="param-unit">米</span>
          </div>
          <div class="single-param" style="margin-top: var(--of-spacing-3)">
            <span class="param-label">热成像通道</span>
            <input class="inline-input wide" type="number" v-model="cameraRange.thermal" min="100" max="30000" />
            <span class="param-unit">米</span>
          </div>
        </div>
      </PanelCard>

      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">历史回溯时间窗</span></div>
        <p class="card-desc">研判页历史回溯图层加载此时间范围内的历史记录。初始值待确认（TBD-03）。</p>
        <div class="param-row-group">
          <div class="single-param">
            <span class="param-label">预警发生时刻前</span>
            <input class="inline-input wide" type="number" v-model="historyWindow.before" min="1" max="1440" />
            <span class="param-unit">分钟</span>
          </div>
          <div class="single-param" style="margin-top: var(--of-spacing-3)">
            <span class="param-label">预警发生时刻后</span>
            <input class="inline-input wide" type="number" v-model="historyWindow.after" min="1" max="60" />
            <span class="param-unit">分钟</span>
          </div>
        </div>
      </PanelCard>

      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">疑似己方判定参数</span></div>
        <p class="card-desc">反无识别到的目标，若与我方无人机（有新鲜实时位置，≤3个通信周期）的距离 ≤ 空间距离阈值 且 位置时间差 ≤ 时间差阈值，则标注「疑似己方」。只作展示参考，最终结论由值班员下。</p>
        <div class="param-row-group">
          <div class="single-param">
            <span class="param-label">空间距离阈值</span>
            <input class="inline-input wide" type="number" v-model="friendlyParams.distance" min="50" max="5000" />
            <span class="param-unit">米（范围：50–5000）</span>
          </div>
          <div class="single-param" style="margin-top: var(--of-spacing-3)">
            <span class="param-label">时间差阈值</span>
            <input class="inline-input wide" type="number" v-model="friendlyParams.timeDiff" min="1" max="300" />
            <span class="param-unit">秒（范围：1–300）</span>
          </div>
        </div>
      </PanelCard>

      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">反无实时轨迹保留时长</span></div>
        <p class="card-desc">平台落库的反无实时 WS 推送轨迹数据，超出保留天数后自动清理。存储容量影响需系统管理员评估（TBD-XX）。</p>
        <div class="single-param">
          <span class="param-label">保留</span>
          <input class="inline-input wide" type="number" v-model="trackRetentionDays" min="7" max="90" />
          <span class="param-unit">天（范围：7–90）</span>
        </div>
        <div class="card-footer"><button class="btn-primary" @click="saveInvestigationParams">保存</button></div>
      </PanelCard>
    </template>

    <!-- ======== Tab5: 字典 ======== -->
    <template v-if="activeTab === 'dictionary'">
      <PanelCard>
        <div class="card-header">
          <span class="card-title">误报原因字典</span>
          <button class="btn-primary" @click="openDictForm('false')"><PlusOutlined /> 新增原因</button>
        </div>
        <div class="data-table">
          <div class="table-head">
            <span class="col-dict-name">原因名称</span>
            <span class="col-status">状态</span>
            <span class="col-actions">操作</span>
          </div>
          <div v-for="item in falseAlarmReasons" :key="item.id" class="table-row">
            <span class="col-dict-name">{{ item.label }}</span>
            <span class="col-status">
              <span class="status-badge" :class="item.status">{{ item.status === 'active' ? '启用' : '停用' }}</span>
            </span>
            <span class="col-actions">
              <button class="btn-link" @click="openEditDictForm('false', item)"><EditOutlined /> 编辑</button>
              <a-tooltip v-if="item.protected" title="「其他」条目不可停用，以保证操作总有兜底选项">
                <button class="btn-link disabled">停用</button>
              </a-tooltip>
              <button v-else class="btn-link" :class="{ danger: item.status === 'active' }" @click="toggleDictStatus(item)">
                {{ item.status === 'active' ? '停用' : '启用' }}
              </button>
            </span>
          </div>
        </div>
      </PanelCard>

      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header">
          <span class="card-title">解除原因字典</span>
          <button class="btn-primary" @click="openDictForm('dismiss')"><PlusOutlined /> 新增原因</button>
        </div>
        <div class="data-table">
          <div class="table-head">
            <span class="col-dict-name">原因名称</span>
            <span class="col-status">状态</span>
            <span class="col-actions">操作</span>
          </div>
          <div v-for="item in dismissReasons" :key="item.id" class="table-row">
            <span class="col-dict-name">{{ item.label }}</span>
            <span class="col-status">
              <span class="status-badge" :class="item.status">{{ item.status === 'active' ? '启用' : '停用' }}</span>
            </span>
            <span class="col-actions">
              <button class="btn-link" @click="openEditDictForm('dismiss', item)"><EditOutlined /> 编辑</button>
              <a-tooltip v-if="item.protected" title="「其他」条目不可停用，以保证操作总有兜底选项">
                <button class="btn-link disabled">停用</button>
              </a-tooltip>
              <button v-else class="btn-link" :class="{ danger: item.status === 'active' }" @click="toggleDictStatus(item)">
                {{ item.status === 'active' ? '停用' : '启用' }}
              </button>
            </span>
          </div>
        </div>
      </PanelCard>

      <!-- 操作日志 -->
      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">操作日志</span></div>
        <div class="audit-log">
          <div v-if="!auditLogs['dictionary']?.length" class="log-empty">暂无操作记录</div>
          <div v-for="(log, i) in auditLogs['dictionary']" :key="i" class="log-row">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-op">{{ log.operator }}</span>
            <span class="log-action">{{ log.action }}</span>
            <span class="log-detail">{{ log.detail }}</span>
          </div>
        </div>
      </PanelCard>
    </template>

    <!-- ======== Tab6: 通知配置 ======== -->
    <template v-if="activeTab === 'notify'">
      <!-- 空接收人全局警告 -->
      <div v-if="notifyEmptyWarning" class="global-warning">
        ⚠️ 「新预警待核实」接收人未配置，预警将无人收到通知，请立即添加接收人后保存。
      </div>
      <PanelCard>
        <div class="card-header"><span class="card-title">通知接收人配置</span></div>
        <p class="card-desc">
          每个通知节点独立配置接收人。「今日值班」选项从排班管理中按预警所属营地推算。
          「新预警待核实」节点的接收人不能为空，否则禁止保存。
        </p>
        <div class="notify-table">
          <div class="notify-head">
            <span class="notify-col-label">通知节点</span>
            <span class="notify-col-recipients">接收人</span>
          </div>
          <div v-for="node in notifyNodes" :key="node.id" class="notify-row" :class="{ required: node.required, empty: node.required && node.recipients.length === 0 }">
            <span class="notify-col-label">
              <span v-if="node.required" class="required-dot">🔴</span>
              {{ node.label }}
              <span v-if="node.required" class="required-hint">（必填）</span>
            </span>
            <span class="notify-col-recipients">
              <span
                v-for="(r, i) in node.recipients" :key="i"
                class="recipient-tag"
                :class="r.type"
              >
                {{ r.label }}
                <button v-if="r.type !== 'auto'" class="tag-remove" @click="removeRecipient(node, i)">×</button>
              </span>
              <template v-if="node.id !== 'n6'">
                <div class="add-recipient-dropdown">
                  <button class="btn-add-recipient">+ 添加</button>
                  <div class="dropdown-menu">
                    <button class="dropdown-item" @click="openRecipientPicker(node, 'shift')">今日值班（按职责）</button>
                    <button class="dropdown-item" @click="openRecipientPicker(node, 'fixed')">固定人员</button>
                  </div>
                </div>
              </template>
            </span>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn-primary" @click="saveNotifyConfig">保存</button>
        </div>
      </PanelCard>

      <!-- 操作日志 -->
      <PanelCard style="margin-top: var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">操作日志</span></div>
        <div class="audit-log">
          <div v-if="!auditLogs['notify']?.length" class="log-empty">暂无操作记录</div>
          <div v-for="(log, i) in auditLogs['notify']" :key="i" class="log-row">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-op">{{ log.operator }}</span>
            <span class="log-action">{{ log.action }}</span>
            <span class="log-detail">{{ log.detail }}</span>
          </div>
        </div>
      </PanelCard>
    </template>

    <!-- ======== 弹窗：未映射类型清单 ======== -->
    <a-modal v-model:open="unmappedVisible" title="未映射告警类型清单（近7天）" :footer="null" width="680px">
      <p class="modal-desc">以下三方告警类型近 7 天内出现过，但未配置映射规则，符合条件的告警只写日志、不生成预警。</p>
      <div class="data-table">
        <div class="table-head">
          <span class="mc-system">三方系统</span>
          <span class="mc-type">告警类型</span>
          <span class="mc-time">首次出现</span>
          <span class="mc-count">出现次数</span>
          <span class="mc-ops">操作</span>
        </div>
        <div v-for="(item, i) in unmappedItems" :key="i" class="table-row">
          <span class="mc-system">{{ item.system }}</span>
          <span class="mc-type">{{ item.type }}</span>
          <span class="mc-time">{{ item.firstSeen }}</span>
          <span class="mc-count">{{ item.count }}</span>
          <span class="mc-ops">
            <button class="btn-link" @click="() => { unmappedVisible = false; openMappingForm() }">新增映射</button>
            <button class="btn-link" @click="() => unmappedItems.splice(i, 1)">标记忽略</button>
          </span>
        </div>
      </div>
    </a-modal>

    <!-- ======== 弹窗：新增预警类型 ======== -->
    <a-modal v-model:open="typeFormVisible" title="新增预警类型" @ok="saveTypeForm" ok-text="保存" cancel-text="取消">
      <div class="form-item">
        <label>所属大类</label>
        <a-select v-model:value="typeForm.categoryKey" style="width:100%" placeholder="请选择大类">
          <a-select-option v-for="cat in categories" :key="cat.key" :value="cat.key">{{ cat.label }}</a-select-option>
        </a-select>
      </div>
      <div class="form-item" style="margin-top:16px">
        <label>类型名称</label>
        <a-input v-model:value="typeForm.label" placeholder="最多20个字符" :maxlength="20" />
      </div>
      <div class="form-item" style="margin-top:16px">
        <label>默认紧急程度</label>
        <a-radio-group v-model:value="typeForm.urgency">
          <a-radio value="urgent">🔴 紧急</a-radio>
          <a-radio value="normal">⚪ 一般</a-radio>
        </a-radio-group>
      </div>
    </a-modal>

    <!-- ======== 弹窗：新增映射规则 ======== -->
    <a-modal v-model:open="mappingFormVisible" title="新增映射规则" @ok="saveMappingForm" ok-text="保存" cancel-text="取消">
      <div class="form-item">
        <label>三方系统</label>
        <a-select v-model:value="mappingForm.sourceSystem" style="width:100%" placeholder="请选择三方系统">
          <a-select-option v-for="s in ['反无设备','高点摄像头','CCTV','C类无人机','车辆系统']" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
      </div>
      <div class="form-item" style="margin-top:16px">
        <label>三方告警类型</label>
        <a-input v-model:value="mappingForm.sourceType" placeholder="精确匹配三方系统推送的事件类型字段值" />
      </div>
      <div class="form-item" style="margin-top:16px">
        <label>映射到预警类型</label>
        <a-input v-model:value="mappingForm.targetType" placeholder="选择已启用的预警具体类型" />
      </div>
    </a-modal>

    <!-- ======== 弹窗：字典新增 ======== -->
    <a-modal v-model:open="dictFormVisible" :title="dictFormMode === 'edit' ? '编辑原因' : dictFormTarget === 'false' ? '新增误报原因' : '新增解除原因'" @ok="saveDictForm" ok-text="保存" cancel-text="取消">
      <div class="form-item">
        <label>原因名称</label>
        <a-input v-model:value="dictForm.label" placeholder="最多20个字符" :maxlength="20" show-count />
      </div>
    </a-modal>

    <!-- ======== 弹窗：接收人选择器 ======== -->
    <a-modal
      v-model:open="recipientPickerVisible"
      :title="recipientPickerType === 'shift' ? '添加今日值班接收人' : '添加固定人员'"
      @ok="saveRecipient"
      ok-text="确认添加"
      cancel-text="取消"
    >
      <template v-if="recipientPickerType === 'shift'">
        <p class="modal-desc">选择一个值班职责，系统会按当天排班推算对应人员。</p>
        <div class="shift-role-list">
          <div
            v-for="role in shiftRoles"
            :key="role"
            class="shift-role-item"
            :class="{ selected: selectedShiftRole === role }"
            @click="selectedShiftRole = role"
          >{{ role }}</div>
        </div>
      </template>
      <template v-else>
        <p class="modal-desc">从用户列表中选择固定接收人，用户注销后自动移除。</p>
        <div class="fixed-user-list">
          <div
            v-for="user in fixedUsers"
            :key="user"
            class="fixed-user-item"
            :class="{ selected: selectedFixedUsers.includes(user) }"
            @click="() => { const idx = selectedFixedUsers.indexOf(user); if (idx >= 0) selectedFixedUsers.splice(idx, 1); else selectedFixedUsers.push(user) }"
          >
            <span class="user-avatar">{{ user[0] }}</span>
            <span>{{ user }}</span>
            <span v-if="selectedFixedUsers.includes(user)" class="check-mark">✓</span>
          </div>
        </div>
      </template>
    </a-modal>

  </PageContainer>
</template>

<style scoped lang="scss">
// ---- Tab 导航 ----
.rule-tabs {
  display: flex;
  gap: 0;
  margin-bottom: var(--of-spacing-4);
  border-bottom: 1px solid var(--of-border-table);
}

.rule-tab {
  padding: var(--of-spacing-3) var(--of-spacing-5);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--of-text-tab-inactive);
  font-size: var(--of-font-size-base);
  cursor: pointer;
  transition: color var(--of-transition-base), border-color var(--of-transition-base);

  &:hover { color: var(--of-text-secondary); }

  &.active {
    color: var(--of-color-accent-cyan);
    border-bottom-color: var(--of-color-accent-cyan);
  }
}

// ---- 通用卡片结构 ----
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--of-spacing-4);
}

.card-title {
  font-size: var(--of-font-size-base);
  font-weight: var(--of-font-weight-medium);
  color: var(--of-text-primary);
}

.card-desc {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  margin-bottom: var(--of-spacing-4);
  line-height: 1.6;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--of-spacing-4);
  padding-top: var(--of-spacing-4);
  border-top: 1px solid var(--of-border-table);
}

.header-actions {
  display: flex;
  gap: var(--of-spacing-2);
  align-items: center;
}

// ---- 按钮 ----
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--of-spacing-1);
  height: var(--of-control-height);
  padding: 0 var(--of-spacing-4);
  background: var(--of-color-primary);
  color: var(--of-text-primary);
  border: none;
  border-radius: var(--of-radius-base);
  font-size: var(--of-font-size-base);
  cursor: pointer;
  transition: background var(--of-transition-base);

  &:hover { background: var(--of-color-primary-hover); }
  &:active { background: var(--of-color-primary-active); }
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: var(--of-spacing-1);
  height: var(--of-control-height);
  padding: 0 var(--of-spacing-3);
  background: transparent;
  border: 1px solid var(--of-color-primary-border);
  color: var(--of-color-link);
  border-radius: var(--of-radius-base);
  font-size: var(--of-font-size-base);
  cursor: pointer;
  transition: background var(--of-transition-base);

  &:hover { background: rgba(20, 129, 166, 0.1); }
}

.btn-link {
  background: none;
  border: none;
  color: var(--of-color-link);
  font-size: var(--of-font-size-xs);
  cursor: pointer;
  padding: 0 var(--of-spacing-2);

  &:hover { color: var(--of-color-link-hover); }
  &.danger { color: var(--of-color-error); }
  &.disabled { color: var(--of-text-quaternary); cursor: not-allowed; }
}

.badge-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: var(--of-color-error);
  color: #fff;
  border-radius: 9px;
  font-size: 11px;
  font-weight: var(--of-font-weight-medium);
  margin-left: var(--of-spacing-1);
}

// ---- 类型树 ----
.type-tree { display: flex; flex-direction: column; gap: 2px; }

.tree-category { border-bottom: 1px solid var(--of-border-table); }

.category-row {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-2);
  padding: var(--of-spacing-3) var(--of-spacing-2);
  cursor: pointer;
  color: var(--of-text-primary);

  &:hover { background: var(--of-bg-row-hover); }
}

.category-toggle { color: var(--of-text-tertiary); font-size: 12px; }
.category-label { font-weight: var(--of-font-weight-medium); flex: 1; }
.category-count { font-size: var(--of-font-size-xs); color: var(--of-text-tertiary); margin-right: auto; }

.type-list { padding-left: var(--of-spacing-6); }

.type-row {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
  padding: var(--of-spacing-2) var(--of-spacing-2);
  border-top: 1px solid var(--of-border-table);

  &:hover { background: var(--of-bg-row-hover); }
}

.type-name { flex: 1; font-size: var(--of-font-size-base); color: var(--of-text-primary); }

.row-actions { display: flex; gap: 0; margin-left: auto; }

// ---- 通用表格 ----
.data-table {
  width: 100%;
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  overflow: hidden;
}

.table-head {
  display: flex;
  align-items: center;
  background: var(--of-bg-table-head);
  padding: 0 var(--of-spacing-4);
  height: var(--of-table-head-height);
  font-size: var(--of-font-size-xs);
  font-weight: var(--of-font-weight-medium);
  color: var(--of-text-secondary);
  border-bottom: 1px solid var(--of-border-table);
}

.table-row {
  display: flex;
  align-items: center;
  padding: 0 var(--of-spacing-4);
  height: var(--of-table-row-height);
  border-bottom: 1px solid var(--of-border-table);
  font-size: var(--of-font-size-base);
  color: var(--of-text-primary);
  background: transparent;
  transition: background var(--of-transition-base);

  &:last-child { border-bottom: none; }
  &:hover { background: var(--of-bg-row-hover); }
  &.inactive { opacity: 0.5; }
  &.category-separator {
    background: rgba(34, 54, 71, 0.5);
    height: 36px;
    cursor: default;
    &:hover { background: rgba(34, 54, 71, 0.5); }
  }
}

// 表格列宽
.col-system   { width: 120px; flex-shrink: 0; }
.col-source-type { flex: 1; }
.col-target   { width: 180px; flex-shrink: 0; }
.col-status   { width: 80px; flex-shrink: 0; }
.col-actions  { width: 120px; flex-shrink: 0; display: flex; gap: 0; }
.col-type-name { flex: 1; }
.col-num      { width: 160px; flex-shrink: 0; display: flex; align-items: center; gap: var(--of-spacing-2); }
.col-urgency  { width: 140px; flex-shrink: 0; }
.col-dict-name{ flex: 1; }
.col-category { flex: 1; }
.col-radius   { width: 180px; flex-shrink: 0; display: flex; align-items: center; gap: var(--of-spacing-2); }
.indent       { padding-left: var(--of-spacing-4); }
.category-label-inline { font-weight: var(--of-font-weight-medium); color: var(--of-text-secondary); font-size: var(--of-font-size-xs); }

// ---- 状态徽章 ----
.status-badge {
  display: inline-block;
  padding: 1px var(--of-spacing-2);
  border-radius: var(--of-radius-base);
  font-size: 11px;
  font-weight: var(--of-font-weight-medium);

  &.active  { background: rgba(82, 196, 26, 0.15); color: var(--of-color-success); }
  &.inactive{ background: rgba(255,255,255,0.08);   color: var(--of-text-quaternary); }
}

.urgency-badge {
  font-size: var(--of-font-size-xs);
  &.urgent { color: var(--of-color-error); }
  &.normal { color: var(--of-text-tertiary); }
}

.urgency-toggle {
  background: transparent;
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  padding: 2px var(--of-spacing-2);
  font-size: var(--of-font-size-xs);
  cursor: pointer;
  color: var(--of-text-primary);
  transition: background var(--of-transition-base);

  &:hover { background: var(--of-bg-row-hover); }
  &.urgent { border-color: rgba(255,102,102,0.4); color: var(--of-color-error); }
}

// ---- 行内输入框 ----
.inline-input {
  width: 80px;
  height: 28px;
  background: var(--of-bg-select);
  border: 1px solid var(--of-color-primary-border);
  border-radius: var(--of-radius-base);
  color: var(--of-text-primary);
  font-size: var(--of-font-size-base);
  text-align: right;
  padding: 0 var(--of-spacing-2);

  &:focus { outline: none; border-color: var(--of-color-primary); }
  &.wide  { width: 100px; }

  // 去掉浏览器数字 spinner
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { appearance: none; }
}

// ---- 时限网格 ----
.time-limit-grid {
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  overflow: hidden;
}

.tl-header, .tl-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  padding: var(--of-spacing-3) var(--of-spacing-4);
  border-bottom: 1px solid var(--of-border-table);
  gap: var(--of-spacing-4);

  &:last-child { border-bottom: none; }
}

.tl-header {
  background: var(--of-bg-table-head);
  font-size: var(--of-font-size-xs);
  font-weight: var(--of-font-weight-medium);
  color: var(--of-text-secondary);
  height: var(--of-table-head-height);
}

.tl-row {
  background: transparent;
  color: var(--of-text-primary);
  height: var(--of-table-row-height);
  transition: background var(--of-transition-base);
  &:hover { background: var(--of-bg-row-hover); }
  span:not(:first-child) { display: flex; align-items: center; gap: var(--of-spacing-2); }
}

// ---- 单参数行 ----
.single-param {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
}

.param-label { color: var(--of-text-secondary); font-size: var(--of-font-size-base); white-space: nowrap; }
.param-unit  { color: var(--of-text-tertiary); font-size: var(--of-font-size-xs); }
.param-row-group { display: flex; flex-direction: column; }

// ---- 通知配置表 ----
.notify-table {
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  overflow: hidden;
}

.notify-head {
  display: flex;
  background: var(--of-bg-table-head);
  padding: 0 var(--of-spacing-4);
  height: var(--of-table-head-height);
  font-size: var(--of-font-size-xs);
  font-weight: var(--of-font-weight-medium);
  color: var(--of-text-secondary);
  align-items: center;
  border-bottom: 1px solid var(--of-border-table);
}

.notify-col-label    { width: 220px; flex-shrink: 0; }
.notify-col-recipients { flex: 1; display: flex; align-items: center; flex-wrap: wrap; gap: var(--of-spacing-2); }

.notify-row {
  display: flex;
  align-items: center;
  padding: var(--of-spacing-3) var(--of-spacing-4);
  border-bottom: 1px solid var(--of-border-table);

  &:last-child { border-bottom: none; }
  &:hover { background: var(--of-bg-row-hover); }
  &.required .notify-col-label { color: var(--of-color-error); }
}

.required-dot  { margin-right: var(--of-spacing-1); }
.required-hint { font-size: 11px; color: var(--of-color-error); }

.recipient-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--of-spacing-2);
  border-radius: var(--of-radius-base);
  font-size: 11px;
  border: 1px solid;

  &.shift { background: rgba(20,129,166,0.12); border-color: rgba(20,129,166,0.3); color: var(--of-color-accent-cyan); }
  &.fixed { background: rgba(82,196,26,0.1); border-color: rgba(82,196,26,0.3); color: var(--of-color-success); }
  &.auto  { background: rgba(250,173,20,0.1); border-color: rgba(250,173,20,0.3); color: var(--of-color-warning); }
}

.btn-add-recipient {
  background: transparent;
  border: 1px dashed var(--of-color-primary-border);
  color: var(--of-color-link);
  border-radius: var(--of-radius-base);
  font-size: 11px;
  padding: 2px var(--of-spacing-2);
  cursor: pointer;

  &:hover { background: rgba(20,129,166,0.1); }
}

// ---- 弹窗内容 ----
.modal-desc {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  margin-bottom: var(--of-spacing-4);
}

// 未映射弹窗专用列宽（宽度在 680px 弹窗内分配）
.mc-system  { width: 90px;  flex-shrink: 0; }
.mc-type    { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-time    { width: 150px; flex-shrink: 0; }
.mc-count   { width: 70px;  flex-shrink: 0; text-align: right; }
.mc-ops     { width: 130px; flex-shrink: 0; display: flex; gap: 0; }

.form-item {
  label {
    display: block;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-secondary);
    margin-bottom: var(--of-spacing-1);
  }
}
// ---- 操作日志 ----
.audit-log {
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  overflow: hidden;
}

.log-empty {
  padding: var(--of-spacing-4);
  text-align: center;
  color: var(--of-text-quaternary);
  font-size: var(--of-font-size-xs);
}

.log-row {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-4);
  padding: var(--of-spacing-3) var(--of-spacing-4);
  border-bottom: 1px solid var(--of-border-table);
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
  background: transparent;
  transition: background var(--of-transition-base);

  &:last-child { border-bottom: none; }
  &:hover { background: var(--of-bg-row-hover); }
}

.log-time   { width: 140px; flex-shrink: 0; color: var(--of-text-tertiary); }
.log-op     { width: 80px; flex-shrink: 0; color: var(--of-text-secondary); }
.log-action { width: 120px; flex-shrink: 0; color: var(--of-color-link); }
.log-detail { flex: 1; color: var(--of-text-primary); }

// ---- 全局警告 ----
.global-warning {
  padding: var(--of-spacing-3) var(--of-spacing-4);
  background: rgba(255, 102, 102, 0.12);
  border: 1px solid rgba(255, 102, 102, 0.4);
  border-radius: var(--of-radius-base);
  color: var(--of-color-error);
  font-size: var(--of-font-size-xs);
  margin-bottom: var(--of-spacing-4);
}

// ---- 接收人标签删除按钮 ----
.tag-remove {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0 0 0 4px;
  font-size: 12px;
  line-height: 1;

  &:hover { opacity: 1; }
}

// ---- 添加接收人下拉 ----
.add-recipient-dropdown {
  position: relative;
  display: inline-flex;

  &:hover .dropdown-menu { display: flex; }
}

.dropdown-menu {
  display: none;
  flex-direction: column;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  min-width: 140px;
  background: var(--of-bg-modal);
  border: 1px solid var(--of-border-modal);
  border-radius: var(--of-radius-base);
  box-shadow: var(--of-shadow-modal);
  overflow: hidden;
  margin-top: 2px;
}

.dropdown-item {
  padding: var(--of-spacing-2) var(--of-spacing-3);
  background: none;
  border: none;
  color: var(--of-text-primary);
  font-size: var(--of-font-size-xs);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;

  &:hover { background: var(--of-bg-row-hover); color: var(--of-color-link); }
}

// ---- 接收人选择器弹窗 ----
.shift-role-list,
.fixed-user-list {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-2);
  max-height: 300px;
  overflow-y: auto;
}

.shift-role-item {
  padding: var(--of-spacing-3) var(--of-spacing-4);
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  cursor: pointer;
  color: var(--of-text-primary);
  font-size: var(--of-font-size-base);
  transition: all var(--of-transition-base);

  &:hover { border-color: var(--of-color-primary); background: rgba(20,129,166,0.08); }
  &.selected { border-color: var(--of-color-primary); background: rgba(20,129,166,0.15); color: var(--of-color-accent-cyan); }
}

.fixed-user-item {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
  padding: var(--of-spacing-2) var(--of-spacing-3);
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  cursor: pointer;
  color: var(--of-text-primary);
  transition: all var(--of-transition-base);

  &:hover { border-color: var(--of-color-primary); background: rgba(20,129,166,0.08); }
  &.selected { border-color: var(--of-color-primary); background: rgba(20,129,166,0.15); }
}

.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--of-color-primary-bg);
  color: var(--of-color-accent-cyan);
  font-size: var(--of-font-size-xs);
  font-weight: var(--of-font-weight-medium);
  flex-shrink: 0;
}

.check-mark {
  margin-left: auto;
  color: var(--of-color-success);
  font-weight: var(--of-font-weight-medium);
}

// ---- notify row empty state ----
.notify-row.empty .notify-col-label {
  color: var(--of-color-error);
}

</style>
