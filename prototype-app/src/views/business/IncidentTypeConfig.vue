<script setup lang="ts">
/**
 * 事件类型配置 —— PRD-事件管理-事件类型配置 V1.0
 * 架构：单页 5-Tab（类型与表单 / 等级分级标准 / 推荐响应措施 / 时限与上报 / 通知配置）
 */
import { ref, reactive, computed } from 'vue'
import { PlusOutlined, EditOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import PageContainer from '@/components/PageContainer.vue'
import PanelCard from '@/components/PanelCard.vue'

// ==================== 全局 ====================
const activeTab = ref('type-form')

// ==================== Tab1: 类型与表单 ====================
interface IncidentType {
  key: string; label: string; color: string; colorName: string
  sourceAlertTypes: string[]; note: string
  status: 'active' | 'inactive'; protected: boolean
}

const incidentTypes = reactive<IncidentType[]>([
  { key: 'drone-threat',        label: '无人机威胁', color: '#ff4d4f', colorName: '红色',
    sourceAlertTypes: ['无人机入侵', '无人机侦察'], note: '', status: 'active', protected: true },
  { key: 'personnel-intrusion', label: '人员入侵',   color: '#fa8c16', colorName: '橙色',
    sourceAlertTypes: ['区域入侵', '越界侦测', '紧急求助'], note: '', status: 'active', protected: true },
  { key: 'facility-safety',     label: '设施安全',   color: '#fadb14', colorName: '黄色',
    sourceAlertTypes: ['设备故障', '设备离线'], note: '', status: 'active', protected: true },
  { key: 'vehicle-anomaly',     label: '车辆异常',   color: '#1890ff', colorName: '蓝色',
    sourceAlertTypes: ['出围栏', '超速'], note: '', status: 'active', protected: true },
  { key: 'other',               label: '其他',       color: '#8c8c8c', colorName: '灰色',
    sourceAlertTypes: [], note: '手工录入无法归类的情况', status: 'active', protected: true },
])

const tab1Editing = ref(false)
const typeDrawerVisible = ref(false)
const typeDrawerMode = ref<'add' | 'view' | 'edit'>('add')
const typeDrawerTarget = ref<IncidentType | null>(null)
const colorOptions = [
  { color: '#ff4d4f', name: '红色' }, { color: '#fa8c16', name: '橙色' },
  { color: '#fadb14', name: '黄色' }, { color: '#52c41a', name: '绿色' },
  { color: '#1890ff', name: '蓝色' }, { color: '#722ed1', name: '紫色' },
  { color: '#eb2f96', name: '粉色' }, { color: '#8c8c8c', name: '灰色' },
]
const alertTypeOptions = [
  '无人机入侵', '无人机侦察', '区域入侵', '越界侦测', '周界徘徊',
  '紧急求助', '设备故障', '设备离线', '出围栏', '超速',
  '烟雾', '火情', '异常人员', '夜间异常光源',
]

const typeForm = reactive({
  label: '', color: '#ff4d4f', colorName: '红色',
  sourceAlertTypes: [] as string[], note: '',
})

function openAddTypeDrawer() {
  typeDrawerMode.value = 'add'; typeDrawerTarget.value = null
  typeForm.label = ''; typeForm.color = '#ff4d4f'; typeForm.colorName = '红色'
  typeForm.sourceAlertTypes = []; typeForm.note = ''
  typeDrawerVisible.value = true
}
function openViewTypeDrawer(t: IncidentType) {
  typeDrawerMode.value = tab1Editing.value ? 'edit' : 'view'
  typeDrawerTarget.value = t
  typeForm.label = t.label; typeForm.color = t.color; typeForm.colorName = t.colorName
  typeForm.sourceAlertTypes = [...t.sourceAlertTypes]; typeForm.note = t.note
  typeDrawerVisible.value = true
}
function selectColor(opt: { color: string; name: string }) {
  typeForm.color = opt.color; typeForm.colorName = opt.name
}
function saveTypeDrawer() {
  if (!typeForm.label.trim()) { message.error('请填写类型名称'); return }
  if (typeDrawerMode.value === 'add') {
    incidentTypes.push({
      key: `type-${Date.now()}`, label: typeForm.label.trim(),
      color: typeForm.color, colorName: typeForm.colorName,
      sourceAlertTypes: [...typeForm.sourceAlertTypes],
      note: typeForm.note, status: 'active', protected: false,
    })
    addLog('type-form', '新增事件类型', `「${typeForm.label.trim()}」`)
    message.success('类型已新增')
  } else if (typeDrawerMode.value === 'edit' && typeDrawerTarget.value) {
    const old = typeDrawerTarget.value.label
    typeDrawerTarget.value.label = typeForm.label.trim()
    typeDrawerTarget.value.color = typeForm.color
    typeDrawerTarget.value.colorName = typeForm.colorName
    typeDrawerTarget.value.sourceAlertTypes = [...typeForm.sourceAlertTypes]
    typeDrawerTarget.value.note = typeForm.note
    addLog('type-form', '编辑事件类型', `「${old}」→「${typeForm.label.trim()}」`)
    message.success('已更新')
  }
  typeDrawerVisible.value = false
}

function disableType(t: IncidentType) {
  Modal.confirm({
    title: '确认停用',
    content: `停用「${t.label}」后，该类型不可用于新建事件，已存在的事件记录不受影响。停用后不影响进行中事件的处置，但不可再新建该类型事件。确认停用？`,
    okText: '确认停用', cancelText: '取消', okType: 'danger',
    onOk() {
      t.status = 'inactive'
      addLog('type-form', '停用事件类型', `「${t.label}」`)
      message.success('已停用')
    },
  })
}

function enableType(t: IncidentType) {
  t.status = 'active'
  addLog('type-form', '启用事件类型', `「${t.label}」`)
  message.success('已启用')
}

// ==================== Tab2: 等级分级标准 ====================
type IncidentLevel = 'I' | 'II' | 'III' | 'IV'
interface LevelDesc { scope: string; risk: string; resource: string }
type LevelStandard = Record<IncidentLevel, LevelDesc>
type LevelStandardMap = Record<string, LevelStandard>

const levelStandards = reactive<LevelStandardMap>({
  'drone-threat': {
    I:   { scope: '多营地受威胁，或无人机已进入核心设施区域上方，疑似携带危险物品', risk: '现场人员处于直接威胁中，存在人身伤亡可能', resource: '需同时调动多支应急队伍，需上报集团公司' },
    II:  { scope: '单一营地受影响，无人机在禁飞区内持续飞行，或来源不明无人机已进入营地边界内', risk: '潜在威胁，需立即核实', resource: '需调动单支应急队伍，需上报安保部' },
    III: { scope: '无人机在营地外围 1km 内徘徊，暂未越界', risk: '潜在威胁，需持续监控', resource: '值班员处置，可通知安保部备案' },
    IV:  { scope: '远程无人机活动，或已确认为己方无人机且操作异常', risk: '极低风险', resource: '值班员记录即可，无需上报' },
  },
  'personnel-intrusion': {
    I:   { scope: '武装人员进入营地核心区域，或多点突破围界', risk: '现场人员面临直接威胁，存在暴力冲突可能', resource: '需立即启动安全疏散，上报集团公司' },
    II:  { scope: '不明人员突破围界进入营地', risk: '威胁存在，需立即处置', resource: '需安保队伍拦截，上报安保部' },
    III: { scope: '可疑人员在围界外持续游荡，有意图进入迹象', risk: '低风险，需关注', resource: '值班员协调现场安保巡视' },
    IV:  { scope: '偶发人员靠近围界，无持续意图', risk: '极低风险', resource: '记录并保持观察' },
  },
  'facility-safety': {
    I:   { scope: '关键设施损毁或失效（如主要管道、发电设施），影响整体运营', risk: '存在安全事故风险', resource: '需紧急维修团队响应，上报集团' },
    II:  { scope: '重要设施异常（如监控设备、围界损毁），范围局限', risk: '安防盲区风险增加', resource: '需专业维修响应，上报安保部' },
    III: { scope: '非关键设备故障，功能降级但有冗余', risk: '低风险', resource: '常规维修工单' },
    IV:  { scope: '轻微设备告警，自动恢复可能', risk: '极低风险', resource: '记录并跟踪' },
  },
  'vehicle-anomaly': {
    I:   { scope: '车辆武力冲撞围界，或多辆车辆协同异常行为', risk: '存在直接人员威胁', resource: '需立即安保响应，上报集团' },
    II:  { scope: '单辆车辆越界，驾驶员身份不明', risk: '潜在威胁', resource: '需安保拦截核查' },
    III: { scope: '车辆在营地附近异常停留，未越界', risk: '低风险', resource: '值班员记录，通知安保关注' },
    IV:  { scope: '车辆GPS信号异常或超速告警，无安防威胁', risk: '极低风险', resource: '记录并通知车辆管理员' },
  },
  'other': {
    I:   { scope: '影响范围广泛，威胁多个区域', risk: '存在直接人员风险', resource: '需上报集团公司，启动应急响应' },
    II:  { scope: '单一区域受影响', risk: '潜在威胁，需处置', resource: '需相关部门响应，上报安保部' },
    III: { scope: '局部影响，风险可控', risk: '低风险', resource: '值班员协调处置' },
    IV:  { scope: '轻微影响，无扩散迹象', risk: '极低风险', resource: '记录备案' },
  },
})

const selectedLevelTypeKey = ref('drone-threat')
const tab2Editing = ref(false)
const levelLabels: { key: IncidentLevel; label: string }[] = [
  { key: 'I', label: 'Ⅰ级（最严重）' },
  { key: 'II', label: 'Ⅱ级' },
  { key: 'III', label: 'Ⅲ级' },
  { key: 'IV', label: 'Ⅳ级（最轻）' },
]

const selectedLevelStandard = computed(() =>
  levelStandards[selectedLevelTypeKey.value] || levelStandards['other']
)

// ==================== Tab3: 推荐响应措施 ====================
interface ResponseMeasure { id: string; text: string }
type MeasureMap = Record<string, Record<IncidentLevel, ResponseMeasure[]>>

const responseMeasures = reactive<MeasureMap>({
  'drone-threat': {
    I:   [
      { id: 'dm-i-1', text: '立即启动营地戒备，限制所有人员进入暴露区域' },
      { id: 'dm-i-2', text: '通知反无操作员就位，执行压制/干扰操作' },
      { id: 'dm-i-3', text: '通知安保部门值班负责人及应急领导小组' },
      { id: 'dm-i-4', text: '调度多架 C 类无人机进行立体跟踪取证' },
      { id: 'dm-i-5', text: '准备人员疏散预案，与营地管理员确认集结点' },
    ],
    II:  [
      { id: 'dm-ii-1', text: '立即调取预警区域最近高点摄像头画面确认目标' },
      { id: 'dm-ii-2', text: '通知反无操作员就位，准备干扰操作' },
      { id: 'dm-ii-3', text: '通知营地管理员限制人员进入暴露区域' },
      { id: 'dm-ii-4', text: '调度 C 类无人机飞往预警位置进行空中取证' },
      { id: 'dm-ii-5', text: '通知安保部门值班负责人' },
    ],
    III: [
      { id: 'dm-iii-1', text: '调取周边摄像头画面，记录无人机特征与飞行路径' },
      { id: 'dm-iii-2', text: '通知反无系统保持监测状态' },
      { id: 'dm-iii-3', text: '继续观察，若越界立即升级' },
    ],
    IV:  [
      { id: 'dm-iv-1', text: '记录发现时间、位置及飞行特征' },
      { id: 'dm-iv-2', text: '核实是否为己方或授权无人机' },
      { id: 'dm-iv-3', text: '保持观察，不需要主动干预' },
    ],
  },
  'personnel-intrusion': {
    I:   [
      { id: 'pi-i-1', text: '立即启动人员疏散，通知所有在场人员撤离至安全区域' },
      { id: 'pi-i-2', text: '通知安保队伍立即出动，封锁突破点' },
      { id: 'pi-i-3', text: '上报安保部及集团公司应急指挥中心' },
      { id: 'pi-i-4', text: '调取现场所有监控画面，持续跟踪入侵者位置' },
    ],
    II:  [
      { id: 'pi-ii-1', text: '通知最近安保小组前往拦截' },
      { id: 'pi-ii-2', text: '调取越界点摄像头确认人员数量及武装情况' },
      { id: 'pi-ii-3', text: '通知营地管理员准备封锁敏感区域' },
      { id: 'pi-ii-4', text: '上报安保部值班负责人' },
    ],
    III: [
      { id: 'pi-iii-1', text: '通知围界附近巡逻队加强关注' },
      { id: 'pi-iii-2', text: '持续摄像头跟踪记录' },
      { id: 'pi-iii-3', text: '若出现越界意图立即升级处置' },
    ],
    IV:  [
      { id: 'pi-iv-1', text: '记录发现位置及时间' },
      { id: 'pi-iv-2', text: '安排下次巡逻经过该区域' },
    ],
  },
  'facility-safety': {
    I:   [
      { id: 'fs-i-1', text: '立即通知运维团队赶赴现场' },
      { id: 'fs-i-2', text: '启用备用系统，隔离故障设施' },
      { id: 'fs-i-3', text: '上报集团公司，评估运营影响' },
    ],
    II:  [
      { id: 'fs-ii-1', text: '通知专业维修人员前往检查' },
      { id: 'fs-ii-2', text: '启用冗余设备或临时措施' },
      { id: 'fs-ii-3', text: '上报安保部，评估安防影响' },
    ],
    III: [
      { id: 'fs-iii-1', text: '提交维修工单，安排计划维修' },
      { id: 'fs-iii-2', text: '确认冗余设备正常运行' },
    ],
    IV:  [
      { id: 'fs-iv-1', text: '记录告警信息，保持观察' },
      { id: 'fs-iv-2', text: '若告警持续则升级处理' },
    ],
  },
  'vehicle-anomaly': {
    I:   [
      { id: 'va-i-1', text: '立即通知安保队伍拦截冲撞车辆' },
      { id: 'va-i-2', text: '关闭受影响出入口，启动封堵程序' },
      { id: 'va-i-3', text: '上报集团公司，评估围界损毁情况' },
    ],
    II:  [
      { id: 'va-ii-1', text: '通知安保人员前往拦截核查驾驶员身份' },
      { id: 'va-ii-2', text: '调取越界点摄像头录像留证' },
      { id: 'va-ii-3', text: '通知营地出入口管理员核实车辆信息' },
    ],
    III: [
      { id: 'va-iii-1', text: '通知附近巡逻队关注该车辆' },
      { id: 'va-iii-2', text: '持续跟踪车辆位置变化' },
    ],
    IV:  [
      { id: 'va-iv-1', text: '记录车辆信息及告警详情' },
      { id: 'va-iv-2', text: '通知车辆管理员核实' },
    ],
  },
  'other': {
    I:   [{ id: 'ot-i-1', text: '根据实际情况启动应急响应' }],
    II:  [{ id: 'ot-ii-1', text: '通知相关部门处置' }],
    III: [{ id: 'ot-iii-1', text: '值班员协调处置' }],
    IV:  [{ id: 'ot-iv-1', text: '记录备案，保持关注' }],
  },
})

const selectedMeasureTypeKey = ref('drone-threat')
const selectedMeasureLevel = ref<IncidentLevel>('II')
const tab3Editing = ref(false)
const newMeasureText = ref('')

const currentMeasures = computed(() => {
  const typeMap = responseMeasures[selectedMeasureTypeKey.value]
  if (!typeMap) return []
  return typeMap[selectedMeasureLevel.value] || []
})

function addMeasure() {
  if (!newMeasureText.value.trim()) { message.error('请输入措施描述'); return }
  if (newMeasureText.value.length > 100) { message.error('措施描述最多 100 字'); return }
  const typeMap = responseMeasures[selectedMeasureTypeKey.value]
  if (!typeMap) return
  typeMap[selectedMeasureLevel.value].push({
    id: `m-${Date.now()}`,
    text: newMeasureText.value.trim(),
  })
  addLog('response-measures', '新增响应措施',
    `${incidentTypes.find(t => t.key === selectedMeasureTypeKey.value)?.label} - ${selectedMeasureLevel.value}级：${newMeasureText.value.trim()}`)
  newMeasureText.value = ''
  message.success('已添加')
}

function removeMeasure(id: string) {
  const typeMap = responseMeasures[selectedMeasureTypeKey.value]
  if (!typeMap) return
  const arr = typeMap[selectedMeasureLevel.value]
  const idx = arr.findIndex(m => m.id === id)
  if (idx >= 0) {
    addLog('response-measures', '删除响应措施', `已删除：「${arr[idx].text}」`)
    arr.splice(idx, 1)
    message.success('已删除')
  }
}

function moveMeasure(id: string, dir: 'up' | 'down') {
  const typeMap = responseMeasures[selectedMeasureTypeKey.value]
  if (!typeMap) return
  const arr = typeMap[selectedMeasureLevel.value]
  const idx = arr.findIndex(m => m.id === id)
  if (dir === 'up' && idx > 0) {
    ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  } else if (dir === 'down' && idx < arr.length - 1) {
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
  }
}

// ==================== Tab4: 时限与上报 ====================
const tab4Editing = ref(false)
const timeLimits = reactive({
  ratingLimitMin: 30,          // 评级时限（全局），分钟
  highLevelReportMin: 30,      // Ⅰ/Ⅱ级上报截止，分钟
  lowLevelReportHr: 24,        // Ⅲ/Ⅳ级上报截止，小时
  reminderAdvanceMin: 10,      // 上报提醒提前量，分钟
})
// 各类型默认上报负责人（初始均含"今日值班负责人"）
interface ReportOwner { label: string; type: 'shift' | 'fixed' }
type ReportOwnerMap = Record<string, ReportOwner[]>
const reportOwners = reactive<ReportOwnerMap>({
  'drone-threat':        [{ label: '今日值班负责人', type: 'shift' }, { label: '张明远', type: 'fixed' }],
  'personnel-intrusion': [{ label: '今日值班负责人', type: 'shift' }, { label: '张明远', type: 'fixed' }],
  'facility-safety':     [{ label: '今日值班负责人', type: 'shift' }],
  'vehicle-anomaly':     [{ label: '今日值班负责人', type: 'shift' }],
  'other':               [{ label: '今日值班负责人', type: 'shift' }],
})

const reportOwnerPickerVisible = ref(false)
const reportOwnerPickerTypeKey = ref('')
const reportOwnerSelectedFixed = ref<string[]>([])
function openReportOwnerPicker(typeKey: string) {
  reportOwnerPickerTypeKey.value = typeKey
  reportOwnerSelectedFixed.value = []
  reportOwnerPickerVisible.value = true
}
function addReportOwnerShift(typeKey: string) {
  const owners = reportOwners[typeKey]
  if (!owners) return
  if (owners.some(o => o.type === 'shift')) {
    message.warning('已包含今日值班负责人'); return
  }
  owners.unshift({ label: '今日值班负责人', type: 'shift' })
  addLog('time-report', '修改上报负责人', `${incidentTypes.find(t => t.key === typeKey)?.label}：添加今日值班负责人`)
}
function saveReportOwnerFixed() {
  const typeKey = reportOwnerPickerTypeKey.value
  const owners = reportOwners[typeKey]
  if (!owners) return
  reportOwnerSelectedFixed.value.forEach(name => {
    if (!owners.some(o => o.label === name)) {
      owners.push({ label: name, type: 'fixed' })
    }
  })
  addLog('time-report', '修改上报负责人',
    `${incidentTypes.find(t => t.key === typeKey)?.label}：添加固定人员「${reportOwnerSelectedFixed.value.join('、')}」`)
  reportOwnerPickerVisible.value = false
  message.success('已添加')
}
function removeReportOwner(typeKey: string, idx: number) {
  reportOwners[typeKey]?.splice(idx, 1)
  addLog('time-report', '移除上报负责人', `${incidentTypes.find(t => t.key === typeKey)?.label}：已移除`)
}
function saveTimeLimits() {
  addLog('time-report', '保存时限配置',
    `评级时限 ${timeLimits.ratingLimitMin} 分钟，Ⅰ/Ⅱ级上报 ${timeLimits.highLevelReportMin} 分钟，Ⅲ/Ⅳ级上报 ${timeLimits.lowLevelReportHr} 小时`)
  message.success('时限配置已保存')
  tab4Editing.value = false
}

// ==================== Tab5: 通知配置 ====================
interface NotifyNode {
  id: string; label: string
  autoRecipients: string[]       // 系统自动，不可更改
  fixedRecipients: { label: string; type: 'shift' | 'fixed' }[]
  editable: boolean              // false = 接收人全部由系统决定
}

const tab5Editing = ref(false)
const notifyNodes = reactive<NotifyNode[]>([
  { id: 'n1', label: '新事件创建',              autoRecipients: [],                                            fixedRecipients: [{ label: '今日值班负责人', type: 'shift' }], editable: true },
  { id: 'n2', label: '等级确认完成（事件生效）',  autoRecipients: ['事件创建人'],                                fixedRecipients: [], editable: true },
  { id: 'n3', label: '事件等级升级',             autoRecipients: ['事件负责人', '应急领导小组组长'],            fixedRecipients: [], editable: true },
  { id: 'n4', label: '处置任务下发',             autoRecipients: ['被指定的责任人（系统自动，不可更改）'],       fixedRecipients: [], editable: false },
  { id: 'n5', label: '处置任务提交验收',          autoRecipients: ['任务发起人（系统自动，不可更改）'],           fixedRecipients: [], editable: false },
  { id: 'n6', label: '处置任务驳回',             autoRecipients: ['任务责任人（系统自动，不可更改）'],           fixedRecipients: [], editable: false },
  { id: 'n7', label: '上报提醒',                 autoRecipients: ['上报负责人（按事件类型配置，见时限与上报 Tab）'], fixedRecipients: [], editable: false },
  { id: 'n8a', label: '应急启动建议提交（待审批）', autoRecipients: ['应急领导小组组长'],                        fixedRecipients: [], editable: true },
  { id: 'n8b', label: '应急启动令签发',           autoRecipients: [],                                           fixedRecipients: [{ label: '所有相关人员', type: 'shift' }], editable: true },
  { id: 'n9', label: '事件关闭（已关闭/已撤销）', autoRecipients: ['事件相关操作人（系统自动，不可更改）'],       fixedRecipients: [], editable: true },
])

const notifyPickerVisible = ref(false)
const notifyPickerNode = ref<NotifyNode | null>(null)
const notifyPickerType = ref<'shift' | 'fixed'>('shift')
const notifySelectedShift = ref('')
const notifySelectedFixed = ref<string[]>([])
const shiftRoles = ['指挥中心值班', '安保负责人', '营地主管', '安保队长', '应急领导小组组长']
const fixedUsers = ['张明远', '李慧敏', '王大伟', '陈晓东', '赵建国', '刘芳芳']

function openNotifyPicker(node: NotifyNode, type: 'shift' | 'fixed') {
  notifyPickerNode.value = node; notifyPickerType.value = type
  notifySelectedShift.value = ''; notifySelectedFixed.value = []
  notifyPickerVisible.value = true
}
function saveNotifyRecipient() {
  const node = notifyPickerNode.value; if (!node) return
  if (notifyPickerType.value === 'shift' && notifySelectedShift.value) {
    node.fixedRecipients.push({ label: `今日值班（${notifySelectedShift.value}）`, type: 'shift' })
    addLog('notify', '修改接收人', `${node.label}：添加今日值班「${notifySelectedShift.value}」`)
  } else if (notifyPickerType.value === 'fixed' && notifySelectedFixed.value.length > 0) {
    notifySelectedFixed.value.forEach(u => node.fixedRecipients.push({ label: u, type: 'fixed' }))
    addLog('notify', '修改接收人', `${node.label}：添加固定人员「${notifySelectedFixed.value.join('、')}」`)
  }
  notifyPickerVisible.value = false
  message.success('接收人已添加')
}
function removeNotifyRecipient(node: NotifyNode, idx: number) {
  node.fixedRecipients.splice(idx, 1)
  addLog('notify', '移除接收人', `${node.label}：已移除`)
}
function saveNotifyConfig() {
  addLog('notify', '保存通知配置', '全部节点接收人已更新')
  message.success('通知配置已保存')
  tab5Editing.value = false
}

// ==================== 操作日志 ====================
interface LogEntry { time: string; operator: string; action: string; detail: string }
const auditLogs = reactive<Record<string, LogEntry[]>>({
  'type-form': [
    { time: '2026-09-27 09:12', operator: '张明远', action: '初始化类型字典', detail: '平台预置 5 种事件类型' },
  ],
  'level-standard': [
    { time: '2026-09-27 09:12', operator: '系统', action: '初始化分级标准', detail: '平台预置各类型 Ⅰ–Ⅳ 级描述' },
  ],
  'response-measures': [
    { time: '2026-09-27 09:12', operator: '系统', action: '初始化响应措施', detail: '平台预置各类型各等级措施' },
  ],
  'time-report': [
    { time: '2026-09-27 09:12', operator: '系统', action: '初始化时限配置', detail: '评级时限 30 分钟，Ⅰ/Ⅱ级上报 30 分钟，Ⅲ/Ⅳ级上报 24 小时' },
  ],
  'notify': [
    { time: '2026-09-27 09:12', operator: '系统', action: '初始化通知配置', detail: 'N1–N9 节点接收人默认值已载入' },
  ],
})

function addLog(tab: string, action: string, detail: string) {
  if (!auditLogs[tab]) auditLogs[tab] = []
  auditLogs[tab].unshift({
    time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    operator: '当前用户', action, detail,
  })
}

const logExpandedMap = reactive<Record<string, boolean>>({
  'type-form': true, 'level-standard': true,
  'response-measures': true, 'time-report': true, 'notify': true,
})
// logTabKey reserved for future use
const LOG_PREVIEW = 5
</script>

<template>
  <PageContainer title="事件类型配置">

    <!-- 顶部 Tab 导航 -->
    <div class="rule-tabs">
      <button
        v-for="tab in [
          { key: 'type-form',         label: '类型与表单' },
          { key: 'level-standard',    label: '等级分级标准' },
          { key: 'response-measures', label: '推荐响应措施' },
          { key: 'time-report',       label: '时限与上报' },
          { key: 'notify',            label: '通知配置' },
        ]"
        :key="tab.key"
        class="rule-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- ======== Tab1: 类型与表单 ======== -->
    <template v-if="activeTab === 'type-form'">
      <PanelCard>
        <div class="card-header">
          <span class="card-title">事件类型字典</span>
          <div class="header-actions">
            <button v-if="!tab1Editing" class="btn-ghost" @click="tab1Editing = true">
              <EditOutlined /> 编辑
            </button>
            <template v-else>
              <button class="btn-primary" @click="tab1Editing = false; addLog('type-form','保存类型字典','已保存'); message.success('已保存')">保存</button>
              <button class="btn-ghost" @click="tab1Editing = false">取消</button>
            </template>
            <button v-if="tab1Editing" class="btn-primary" @click="openAddTypeDrawer">
              <PlusOutlined /> 新增类型
            </button>
          </div>
        </div>

        <div class="data-table">
          <div class="table-head">
            <span class="col-type-name">类型名称</span>
            <span class="col-color-id">颜色标识</span>
            <span class="col-sources">来源预警类型</span>
            <span class="col-status-s">状态</span>
            <span class="col-actions">操作</span>
          </div>
          <div
            v-for="t in incidentTypes" :key="t.key"
            class="table-row"
            :class="{ inactive: t.status === 'inactive' }"
          >
            <span class="col-type-name">
              <span class="color-dot" :style="{ background: t.color }"></span>
              {{ t.label }}
            </span>
            <span class="col-color-id">
              <span class="color-chip" :style="{ background: t.color }"></span>
              {{ t.colorName }}
            </span>
            <span class="col-sources">
              <span v-if="t.sourceAlertTypes.length === 0" class="text-tertiary">—</span>
              <span v-else class="source-tags">
                <span v-for="s in t.sourceAlertTypes" :key="s" class="source-tag">{{ s }}</span>
              </span>
            </span>
            <span class="col-status-s">
              <span class="status-badge" :class="t.status">
                {{ t.status === 'active' ? '启用' : '停用' }}
              </span>
            </span>
            <span class="col-actions">
              <button class="btn-link" @click="openViewTypeDrawer(t)">
                <EditOutlined v-if="tab1Editing" /> {{ tab1Editing ? '编辑' : '查看详情' }}
              </button>
              <button
                v-if="tab1Editing"
                class="btn-link"
                :class="{ danger: t.status === 'active' }"
                @click="t.status === 'active' ? disableType(t) : enableType(t)"
              >{{ t.status === 'active' ? '停用' : '启用' }}</button>
            </span>
          </div>
        </div>
      </PanelCard>

      <!-- 操作日志 -->
      <div class="audit-section">
        <div class="audit-header" @click="logExpandedMap['type-form'] = !logExpandedMap['type-form']">
          <span>操作日志</span>
          <span class="audit-toggle">{{ logExpandedMap['type-form'] ? '收起' : '展开' }}</span>
        </div>
        <div v-if="logExpandedMap['type-form']" class="audit-log">
          <div v-if="!auditLogs['type-form']?.length" class="log-empty">暂无操作记录</div>
          <div v-for="(log, i) in (auditLogs['type-form'] || []).slice(0, LOG_PREVIEW)" :key="i" class="log-row">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-op">{{ log.operator }}</span>
            <span class="log-action">{{ log.action }}</span>
            <span class="log-detail">{{ log.detail }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ======== Tab2: 等级分级标准 ======== -->
    <template v-if="activeTab === 'level-standard'">
      <PanelCard>
        <div class="card-header">
          <div class="header-filter">
            <span class="filter-label">选择事件类型：</span>
            <select class="inline-select" v-model="selectedLevelTypeKey">
              <option v-for="t in incidentTypes.filter(t => t.status === 'active')" :key="t.key" :value="t.key">{{ t.label }}</option>
            </select>
          </div>
          <div class="header-actions">
            <button v-if="!tab2Editing" class="btn-ghost" @click="tab2Editing = true"><EditOutlined /> 编辑</button>
            <template v-else>
              <button class="btn-primary" @click="tab2Editing = false; addLog('level-standard','保存分级标准',`${incidentTypes.find(t=>t.key===selectedLevelTypeKey)?.label} 已保存`); message.success('已保存')">保存</button>
              <button class="btn-ghost" @click="tab2Editing = false">取消</button>
            </template>
          </div>
        </div>
        <p class="card-desc">各等级描述供值班员在「确认等级」弹窗中对照参考，从影响范围、人员风险、所需资源三个维度说明各级特征。</p>

        <div
          v-for="lv in levelLabels" :key="lv.key"
          class="level-block"
        >
          <div class="level-title">
            <span class="level-badge" :class="`lv-${lv.key.toLowerCase()}`">{{ lv.label }}</span>
          </div>
          <div class="level-fields">
            <div class="level-field">
              <span class="field-label">影响范围</span>
              <textarea
                v-if="tab2Editing"
                class="field-textarea"
                v-model="selectedLevelStandard[lv.key].scope"
                rows="2"
              ></textarea>
              <span v-else class="field-value">{{ selectedLevelStandard[lv.key].scope }}</span>
            </div>
            <div class="level-field">
              <span class="field-label">人员风险</span>
              <textarea
                v-if="tab2Editing"
                class="field-textarea"
                v-model="selectedLevelStandard[lv.key].risk"
                rows="2"
              ></textarea>
              <span v-else class="field-value">{{ selectedLevelStandard[lv.key].risk }}</span>
            </div>
            <div class="level-field">
              <span class="field-label">所需资源</span>
              <textarea
                v-if="tab2Editing"
                class="field-textarea"
                v-model="selectedLevelStandard[lv.key].resource"
                rows="2"
              ></textarea>
              <span v-else class="field-value">{{ selectedLevelStandard[lv.key].resource }}</span>
            </div>
          </div>
        </div>
      </PanelCard>

      <div class="audit-section">
        <div class="audit-header" @click="logExpandedMap['level-standard'] = !logExpandedMap['level-standard']">
          <span>操作日志</span><span class="audit-toggle">{{ logExpandedMap['level-standard'] ? '收起' : '展开' }}</span>
        </div>
        <div v-if="logExpandedMap['level-standard']" class="audit-log">
          <div v-if="!auditLogs['level-standard']?.length" class="log-empty">暂无操作记录</div>
          <div v-for="(log, i) in (auditLogs['level-standard'] || []).slice(0, LOG_PREVIEW)" :key="i" class="log-row">
            <span class="log-time">{{ log.time }}</span><span class="log-op">{{ log.operator }}</span>
            <span class="log-action">{{ log.action }}</span><span class="log-detail">{{ log.detail }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ======== Tab3: 推荐响应措施 ======== -->
    <template v-if="activeTab === 'response-measures'">
      <PanelCard>
        <div class="card-header">
          <div class="header-filter">
            <span class="filter-label">事件类型：</span>
            <select class="inline-select" v-model="selectedMeasureTypeKey">
              <option v-for="t in incidentTypes.filter(t=>t.status==='active')" :key="t.key" :value="t.key">{{ t.label }}</option>
            </select>
            <span class="filter-label" style="margin-left:var(--of-spacing-4)">等级：</span>
            <select class="inline-select" v-model="selectedMeasureLevel">
              <option v-for="lv in levelLabels" :key="lv.key" :value="lv.key">{{ lv.label }}</option>
            </select>
          </div>
          <div class="header-actions">
            <button v-if="!tab3Editing" class="btn-ghost" @click="tab3Editing = true"><EditOutlined /> 编辑</button>
            <template v-else>
              <button class="btn-primary" @click="tab3Editing = false; addLog('response-measures','保存响应措施','已保存'); message.success('已保存')">保存</button>
              <button class="btn-ghost" @click="tab3Editing = false">取消</button>
            </template>
          </div>
        </div>
        <p class="card-desc">以下措施将在事件详情页「推荐响应措施」区域展示，值班员可勾选为处置计划。</p>

        <div class="measure-list">
          <div
            v-for="(m, idx) in currentMeasures" :key="m.id"
            class="measure-row"
          >
            <span class="measure-no">#{{ idx + 1 }}</span>
            <span class="measure-text">{{ m.text }}</span>
            <div v-if="tab3Editing" class="measure-actions">
              <button class="btn-icon" @click="moveMeasure(m.id, 'up')" :disabled="idx === 0">↑</button>
              <button class="btn-icon" @click="moveMeasure(m.id, 'down')" :disabled="idx === currentMeasures.length - 1">↓</button>
              <button class="btn-link danger" @click="removeMeasure(m.id)">删除</button>
            </div>
          </div>
          <div v-if="currentMeasures.length === 0" class="empty-state">暂无推荐措施</div>
        </div>

        <div v-if="tab3Editing" class="add-measure-row">
          <input
            class="measure-input"
            v-model="newMeasureText"
            placeholder="输入新措施描述（最多 100 字）"
            maxlength="100"
            @keydown.enter="addMeasure"
          />
          <button class="btn-primary" @click="addMeasure"><PlusOutlined /> 新增措施</button>
        </div>
      </PanelCard>

      <div class="audit-section">
        <div class="audit-header" @click="logExpandedMap['response-measures'] = !logExpandedMap['response-measures']">
          <span>操作日志</span><span class="audit-toggle">{{ logExpandedMap['response-measures'] ? '收起' : '展开' }}</span>
        </div>
        <div v-if="logExpandedMap['response-measures']" class="audit-log">
          <div v-if="!auditLogs['response-measures']?.length" class="log-empty">暂无操作记录</div>
          <div v-for="(log, i) in (auditLogs['response-measures'] || []).slice(0, LOG_PREVIEW)" :key="i" class="log-row">
            <span class="log-time">{{ log.time }}</span><span class="log-op">{{ log.operator }}</span>
            <span class="log-action">{{ log.action }}</span><span class="log-detail">{{ log.detail }}</span>
          </div>
        </div>
      </div>
    </template>


    <!-- ======== Tab4: 时限与上报 ======== -->
    <template v-if="activeTab === 'time-report'">
      <PanelCard>
        <div class="card-header">
          <span class="card-title">评级时限</span>
          <div class="header-actions">
            <button v-if="!tab4Editing" class="btn-ghost" @click="tab4Editing = true"><EditOutlined /> 编辑</button>
            <template v-else>
              <button class="btn-primary" @click="saveTimeLimits">保存</button>
              <button class="btn-ghost" @click="tab4Editing = false">取消</button>
            </template>
          </div>
        </div>
        <p class="card-desc">从事件创建到完成等级确认的最大时间，超时触发催办通知。评级前等级未知，按最高可能等级估算，配置为全局值。</p>
        <div class="config-row">
          <span class="config-label">所有类型统一评级时限</span>
          <template v-if="tab4Editing">
            <input class="inline-input" type="number" v-model="timeLimits.ratingLimitMin" min="5" max="120" />
            <span class="config-unit">分钟（范围：5–120 分钟，待客户确认 TBD-INC-01）</span>
          </template>
          <span v-else class="config-value">{{ timeLimits.ratingLimitMin }} 分钟 <span class="tbd-badge">TBD</span></span>
        </div>
      </PanelCard>

      <PanelCard style="margin-top:var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">上报截止时间</span></div>
        <p class="card-desc">从事件生效（等级确认）时刻开始计时。</p>
        <div class="config-grid">
          <div class="config-row">
            <span class="config-label">Ⅰ/Ⅱ 级上报截止</span>
            <template v-if="tab4Editing">
              <input class="inline-input" type="number" v-model="timeLimits.highLevelReportMin" min="10" max="120" />
              <span class="config-unit">分钟内完成上报（范围：10–120 分钟）</span>
            </template>
            <span v-else class="config-value">{{ timeLimits.highLevelReportMin }} 分钟</span>
          </div>
          <div class="config-row">
            <span class="config-label">Ⅲ/Ⅳ 级上报截止</span>
            <template v-if="tab4Editing">
              <input class="inline-input" type="number" v-model="timeLimits.lowLevelReportHr" min="1" max="72" />
              <span class="config-unit">小时内完成上报（范围：1–72 小时）</span>
            </template>
            <span v-else class="config-value">{{ timeLimits.lowLevelReportHr }} 小时</span>
          </div>
          <div class="config-row">
            <span class="config-label">上报提醒提前量</span>
            <template v-if="tab4Editing">
              <span class="config-unit">事件生效后</span>
              <input class="inline-input" type="number" v-model="timeLimits.reminderAdvanceMin" min="1" max="60" />
              <span class="config-unit">分钟开始提醒（范围：1–60 分钟）</span>
            </template>
            <span v-else class="config-value">事件生效后 {{ timeLimits.reminderAdvanceMin }} 分钟开始提醒</span>
          </div>
        </div>
      </PanelCard>

      <PanelCard style="margin-top:var(--of-spacing-4)">
        <div class="card-header"><span class="card-title">默认上报负责人（按事件类型）</span></div>
        <p class="card-desc">以下为默认值，创建单个事件时可手动覆盖。N7 上报提醒通知将发送给此处配置的人员。</p>
        <div class="data-table">
          <div class="table-head">
            <span class="col-ro-type">事件类型</span>
            <span class="col-ro-owners">上报负责人</span>
          </div>
          <div v-for="t in incidentTypes" :key="t.key" class="table-row">
            <span class="col-ro-type">
              <span class="color-dot" :style="{ background: t.color }"></span>{{ t.label }}
            </span>
            <span class="col-ro-owners">
              <span v-if="!(reportOwners[t.key] || []).length" class="text-tertiary">—</span>
              <span v-for="(o, i) in (reportOwners[t.key] || [])" :key="i" class="recipient-tag" :class="o.type">
                {{ o.label }}
                <button v-if="tab4Editing" class="tag-remove" @click="removeReportOwner(t.key, i)">×</button>
              </span>
              <template v-if="tab4Editing">
                <div class="add-recipient-dropdown">
                  <button class="btn-add-recipient">+ 添加</button>
                  <div class="dropdown-menu">
                    <button class="dropdown-item" @click="addReportOwnerShift(t.key)">今日值班负责人</button>
                    <button class="dropdown-item" @click="openReportOwnerPicker(t.key)">固定人员…</button>
                  </div>
                </div>
              </template>
            </span>
          </div>
        </div>
      </PanelCard>

      <div class="audit-section">
        <div class="audit-header" @click="logExpandedMap['time-report'] = !logExpandedMap['time-report']">
          <span>操作日志</span><span class="audit-toggle">{{ logExpandedMap['time-report'] ? '收起' : '展开' }}</span>
        </div>
        <div v-if="logExpandedMap['time-report']" class="audit-log">
          <div v-if="!auditLogs['time-report']?.length" class="log-empty">暂无操作记录</div>
          <div v-for="(log, i) in (auditLogs['time-report'] || []).slice(0, LOG_PREVIEW)" :key="i" class="log-row">
            <span class="log-time">{{ log.time }}</span><span class="log-op">{{ log.operator }}</span>
            <span class="log-action">{{ log.action }}</span><span class="log-detail">{{ log.detail }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ======== Tab5: 通知配置 ======== -->
    <template v-if="activeTab === 'notify'">
      <PanelCard>
        <div class="card-header">
          <span class="card-title">通知节点配置</span>
          <div class="header-actions">
            <button v-if="!tab5Editing" class="btn-ghost" @click="tab5Editing = true"><EditOutlined /> 编辑</button>
            <template v-else>
              <button class="btn-primary" @click="saveNotifyConfig">保存</button>
              <button class="btn-ghost" @click="tab5Editing = false">取消</button>
            </template>
          </div>
        </div>
        <p class="card-desc">以下配置为平台站内信的默认接收范围。App 推送本期仅实现站内信级别，后续版本扩展。</p>

        <div class="notify-list">
          <div v-for="node in notifyNodes" :key="node.id" class="notify-row">
            <div class="notify-col-id">{{ node.id.toUpperCase() }}</div>
            <div class="notify-col-label">{{ node.label }}</div>
            <div class="notify-col-recipients">
              <span v-for="(r, i) in node.autoRecipients" :key="`auto-${i}`" class="recipient-tag auto">{{ r }}</span>
              <span v-for="(r, i) in node.fixedRecipients" :key="`fixed-${i}`" class="recipient-tag" :class="r.type">
                {{ r.label }}
                <button v-if="tab5Editing && node.editable" class="tag-remove" @click="removeNotifyRecipient(node, i)">×</button>
              </span>
              <template v-if="tab5Editing && node.editable">
                <div class="add-recipient-dropdown">
                  <button class="btn-add-recipient">+ 添加</button>
                  <div class="dropdown-menu">
                    <button class="dropdown-item" @click="openNotifyPicker(node, 'shift')">今日值班…</button>
                    <button class="dropdown-item" @click="openNotifyPicker(node, 'fixed')">固定人员…</button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="notify-legend">
          <span class="recipient-tag shift">今日值班</span> 从排班管理实时推算；
          <span class="recipient-tag fixed">固定人员</span> 从用户列表选定，不随排班变化；
          <span class="recipient-tag auto">自动</span> 系统根据事件记录自动计算，不可手动配置
        </div>
      </PanelCard>

      <div class="audit-section">
        <div class="audit-header" @click="logExpandedMap['notify'] = !logExpandedMap['notify']">
          <span>操作日志</span><span class="audit-toggle">{{ logExpandedMap['notify'] ? '收起' : '展开' }}</span>
        </div>
        <div v-if="logExpandedMap['notify']" class="audit-log">
          <div v-if="!auditLogs['notify']?.length" class="log-empty">暂无操作记录</div>
          <div v-for="(log, i) in (auditLogs['notify'] || []).slice(0, LOG_PREVIEW)" :key="i" class="log-row">
            <span class="log-time">{{ log.time }}</span><span class="log-op">{{ log.operator }}</span>
            <span class="log-action">{{ log.action }}</span><span class="log-detail">{{ log.detail }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ======== 抽屉：类型详情/新增/编辑 ======== -->
    <a-drawer
      :open="typeDrawerVisible"
      :title="typeDrawerMode === 'add' ? '新增事件类型' : typeDrawerMode === 'edit' ? '编辑事件类型' : '查看事件类型'"
      width="480"
      @close="typeDrawerVisible = false"
    >
      <div class="drawer-body">
        <div class="form-item">
          <label>类型名称 <span class="required">*</span></label>
          <input v-if="typeDrawerMode !== 'view'" class="form-input" v-model="typeForm.label" maxlength="20" placeholder="最多 20 字" />
          <span v-else class="form-value">{{ typeForm.label }}</span>
        </div>
        <div class="form-item">
          <label>颜色标识 <span class="required">*</span></label>
          <div v-if="typeDrawerMode !== 'view'" class="color-picker">
            <div
              v-for="opt in colorOptions" :key="opt.color"
              class="color-option"
              :class="{ selected: typeForm.color === opt.color }"
              :style="{ background: opt.color }"
              :title="opt.name"
              @click="selectColor(opt)"
            ></div>
          </div>
          <span v-else>
            <span class="color-chip" :style="{ background: typeForm.color }"></span>
            {{ typeForm.colorName }}
          </span>
        </div>
        <div class="form-item">
          <label>来源预警类型映射</label>
          <div v-if="typeDrawerMode !== 'view'" class="source-type-select">
            <label v-for="opt in alertTypeOptions" :key="opt" class="checkbox-item">
              <input type="checkbox" :value="opt" v-model="typeForm.sourceAlertTypes" />
              {{ opt }}
            </label>
          </div>
          <div v-else class="source-tags">
            <span v-for="s in typeForm.sourceAlertTypes" :key="s" class="source-tag">{{ s }}</span>
            <span v-if="typeForm.sourceAlertTypes.length === 0" class="text-tertiary">—</span>
          </div>
        </div>
        <div class="form-item">
          <label>备注</label>
          <textarea v-if="typeDrawerMode !== 'view'" class="form-textarea" v-model="typeForm.note" rows="3" placeholder="运营说明，不对外展示"></textarea>
          <span v-else class="form-value">{{ typeForm.note || '—' }}</span>
        </div>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <button v-if="typeDrawerMode !== 'view'" class="btn-primary" @click="saveTypeDrawer">确认</button>
          <button class="btn-ghost" @click="typeDrawerVisible = false">{{ typeDrawerMode === 'view' ? '关闭' : '取消' }}</button>
        </div>
      </template>
    </a-drawer>

    <!-- ======== 弹窗：上报负责人固定人员选择 ======== -->
    <a-modal
      :open="reportOwnerPickerVisible" title="选择固定人员" width="440"
      @ok="saveReportOwnerFixed" @cancel="reportOwnerPickerVisible = false"
      ok-text="确认" cancel-text="取消"
    >
      <div class="fixed-user-list">
        <label
          v-for="user in fixedUsers" :key="user"
          class="fixed-user-item"
          :class="{ selected: reportOwnerSelectedFixed.includes(user) }"
          @click="reportOwnerSelectedFixed.includes(user)
            ? reportOwnerSelectedFixed.splice(reportOwnerSelectedFixed.indexOf(user), 1)
            : reportOwnerSelectedFixed.push(user)"
        >
          <span class="user-avatar">{{ user.slice(0, 1) }}</span>
          <span>{{ user }}</span>
          <span v-if="reportOwnerSelectedFixed.includes(user)" class="check-mark">✓</span>
        </label>
      </div>
    </a-modal>

    <!-- ======== 弹窗：通知接收人选择 ======== -->
    <a-modal
      :open="notifyPickerVisible"
      :title="notifyPickerType === 'shift' ? '选择今日值班角色' : '选择固定人员'"
      width="440"
      @ok="saveNotifyRecipient" @cancel="notifyPickerVisible = false"
      ok-text="确认" cancel-text="取消"
    >
      <template v-if="notifyPickerType === 'shift'">
        <div class="shift-role-list">
          <div
            v-for="role in shiftRoles" :key="role"
            class="shift-role-item"
            :class="{ selected: notifySelectedShift === role }"
            @click="notifySelectedShift = role"
          >{{ role }}</div>
        </div>
      </template>
      <template v-else>
        <div class="fixed-user-list">
          <label
            v-for="user in fixedUsers" :key="user"
            class="fixed-user-item"
            :class="{ selected: notifySelectedFixed.includes(user) }"
            @click="notifySelectedFixed.includes(user)
              ? notifySelectedFixed.splice(notifySelectedFixed.indexOf(user), 1)
              : notifySelectedFixed.push(user)"
          >
            <span class="user-avatar">{{ user.slice(0, 1) }}</span>
            <span>{{ user }}</span>
            <span v-if="notifySelectedFixed.includes(user)" class="check-mark">✓</span>
          </label>
        </div>
      </template>
    </a-modal>

  </PageContainer>
</template>

<style lang="scss" scoped>

// ---- Tab 导航 ----
.rule-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--of-border-table);
  margin-bottom: var(--of-spacing-4);
}

.rule-tab {
  padding: var(--of-spacing-2) var(--of-spacing-5);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--of-text-tab-inactive);
  font-size: var(--of-font-size-base);
  cursor: pointer;
  transition: color var(--of-transition-base), border-color var(--of-transition-base);
  white-space: nowrap;
  margin-bottom: -1px;

  &:hover { color: var(--of-text-primary); }
  &.active {
    color: var(--of-color-accent-cyan);
    border-bottom-color: var(--of-color-accent-cyan);
    font-weight: var(--of-font-weight-medium);
  }
}

// ---- 卡片 header ----
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

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-2);
}

.header-filter {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-2);
}

.filter-label {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
}

// ---- 按钮 ----
.btn-primary {
  height: var(--of-control-height);
  padding: 0 var(--of-spacing-4);
  background: var(--of-color-primary);
  color: #fff;
  border: none;
  border-radius: var(--of-radius-base);
  font-size: var(--of-font-size-xs);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--of-spacing-1);
  transition: background var(--of-transition-base);

  &:hover { background: var(--of-color-primary-hover); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.btn-ghost {
  height: var(--of-control-height);
  padding: 0 var(--of-spacing-4);
  background: transparent;
  color: var(--of-text-secondary);
  border: 1px solid var(--of-border-modal);
  border-radius: var(--of-radius-base);
  font-size: var(--of-font-size-xs);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--of-spacing-1);
  transition: all var(--of-transition-base);

  &:hover { border-color: var(--of-color-primary); color: var(--of-color-link); }
}

.btn-link {
  background: none;
  border: none;
  color: var(--of-color-link);
  font-size: var(--of-font-size-xs);
  cursor: pointer;
  padding: 0 var(--of-spacing-2);
  transition: color var(--of-transition-base);

  &:hover { color: var(--of-color-link-hover); }
  &.danger { color: var(--of-color-error); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.btn-icon {
  background: transparent;
  border: 1px solid var(--of-border-table);
  color: var(--of-text-secondary);
  border-radius: var(--of-radius-base);
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all var(--of-transition-base);

  &:hover:not(:disabled) { border-color: var(--of-color-primary); color: var(--of-color-link); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

// ---- 表格 ----
.data-table { border: 1px solid var(--of-border-table); border-radius: var(--of-radius-base); overflow: hidden; }

.table-head {
  display: flex;
  align-items: center;
  background: var(--of-bg-table-head);
  padding: 0 var(--of-spacing-4);
  height: var(--of-table-head-height);
  font-size: var(--of-font-size-xs);
  font-weight: var(--of-font-weight-medium);
  color: var(--of-text-secondary);
  gap: var(--of-spacing-4);
}

.table-row {
  display: flex;
  align-items: center;
  padding: 0 var(--of-spacing-4);
  min-height: var(--of-table-row-height);
  border-top: 1px solid var(--of-border-table);
  font-size: var(--of-font-size-xs);
  color: var(--of-text-primary);
  background: transparent;
  gap: var(--of-spacing-4);
  transition: background var(--of-transition-base);

  &:hover { background: var(--of-bg-row-hover); }
  &.inactive { opacity: 0.55; }
}

// ---- Tab1 列宽 ----
.col-type-name { width: 140px; flex-shrink: 0; display: flex; align-items: center; gap: var(--of-spacing-2); }
.col-color-id  { width: 100px; flex-shrink: 0; display: flex; align-items: center; gap: var(--of-spacing-2); }
.col-sources   { flex: 1; min-width: 0; }
.col-status-s  { width: 60px; flex-shrink: 0; }
.col-actions   { width: 130px; flex-shrink: 0; display: flex; align-items: center; gap: 0; }

// ---- Tab4 列宽 ----
.col-ro-type   { width: 140px; flex-shrink: 0; display: flex; align-items: center; gap: var(--of-spacing-2); }
.col-ro-owners { flex: 1; min-width: 0; display: flex; align-items: center; flex-wrap: wrap; gap: var(--of-spacing-1); }

// ---- 颜色点 / 色块 ----
.color-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}

.color-chip {
  display: inline-block;
  width: 14px; height: 14px; border-radius: 2px;
  vertical-align: middle; margin-right: 4px;
}

// ---- 状态 badge ----
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;

  &.active   { background: rgba(82,196,26,0.15); color: #52c41a; }
  &.inactive { background: rgba(255,255,255,0.06); color: var(--of-text-tertiary); }
}

// ---- 来源标签 ----
.source-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.source-tag {
  padding: 2px 8px;
  background: rgba(20,129,166,0.15);
  border: 1px solid rgba(87,196,247,0.2);
  border-radius: 10px;
  font-size: 11px;
  color: var(--of-color-accent-cyan);
  white-space: nowrap;
}

.text-tertiary { color: var(--of-text-tertiary); }

// ---- Tab2: 等级分级标准 ----
.inline-select {
  height: var(--of-control-height);
  background: var(--of-bg-select);
  border: 1px solid var(--of-color-primary-border);
  border-radius: var(--of-radius-base);
  color: var(--of-text-primary);
  font-size: var(--of-font-size-xs);
  padding: 0 var(--of-spacing-2);
  cursor: pointer;
  outline: none;
  min-width: 130px;
}

.level-block {
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  margin-bottom: var(--of-spacing-3);
  overflow: hidden;
}

.level-title {
  padding: var(--of-spacing-2) var(--of-spacing-4);
  background: var(--of-bg-table-head);
}

.level-badge {
  font-size: var(--of-font-size-xs);
  font-weight: var(--of-font-weight-medium);
  padding: 2px 10px;
  border-radius: 10px;

  &.lv-i   { background: rgba(255,77,79,0.2);  color: #ff4d4f; }
  &.lv-ii  { background: rgba(250,140,22,0.2); color: #fa8c16; }
  &.lv-iii { background: rgba(250,219,20,0.2); color: #fadb14; }
  &.lv-iv  { background: rgba(82,196,26,0.15); color: #52c41a; }
}

.level-fields {
  padding: var(--of-spacing-3) var(--of-spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-3);
}

.level-field {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: var(--of-spacing-3);
  align-items: start;
}

.field-label {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  padding-top: 4px;
  white-space: nowrap;
}

.field-value {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-primary);
  line-height: 1.6;
}

.field-textarea {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--of-color-primary-border);
  border-radius: var(--of-radius-base);
  color: var(--of-text-primary);
  font-size: var(--of-font-size-xs);
  padding: var(--of-spacing-2);
  resize: vertical;
  min-height: 48px;
  font-family: var(--of-font-family);
  line-height: 1.6;
  outline: none;

  &:focus { border-color: var(--of-color-primary); }
}

// ---- Tab3: 推荐响应措施 ----
.measure-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  overflow: hidden;
  margin-bottom: var(--of-spacing-3);
}

.measure-row {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
  padding: var(--of-spacing-3) var(--of-spacing-4);
  border-bottom: 1px solid var(--of-border-table);
  font-size: var(--of-font-size-xs);
  color: var(--of-text-primary);
  background: transparent;
  transition: background var(--of-transition-base);

  &:last-child { border-bottom: none; }
  &:hover { background: var(--of-bg-row-hover); }
}

.measure-no {
  width: 28px;
  flex-shrink: 0;
  color: var(--of-text-tertiary);
  font-size: 11px;
}

.measure-text { flex: 1; line-height: 1.6; }

.measure-actions {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-1);
  flex-shrink: 0;
}

.add-measure-row {
  display: flex;
  gap: var(--of-spacing-2);
  align-items: center;
  margin-top: var(--of-spacing-2);
}

.measure-input {
  flex: 1;
  height: var(--of-control-height);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--of-color-primary-border);
  border-radius: var(--of-radius-base);
  color: var(--of-text-primary);
  font-size: var(--of-font-size-xs);
  padding: 0 var(--of-spacing-3);
  outline: none;

  &:focus { border-color: var(--of-color-primary); }
  &::placeholder { color: var(--of-text-placeholder); }
}

.empty-state {
  padding: var(--of-spacing-5);
  text-align: center;
  color: var(--of-text-quaternary);
  font-size: var(--of-font-size-xs);
}

// ---- Tab4: 时限与上报 ----
.config-grid {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-4);
}

.config-row {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
  padding: var(--of-spacing-3) 0;
  border-bottom: 1px solid var(--of-border-table);

  &:last-child { border-bottom: none; }
}

.config-label {
  width: 180px;
  flex-shrink: 0;
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
}

.config-value {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-primary);
}

.config-unit {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
}

.tbd-badge {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(250,173,20,0.15);
  color: #faad14;
  border-radius: 3px;
  font-size: 11px;
  margin-left: 4px;
}

.inline-input {
  width: 72px;
  height: var(--of-control-height);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--of-color-primary-border);
  border-radius: var(--of-radius-base);
  color: var(--of-text-primary);
  font-size: var(--of-font-size-xs);
  padding: 0 var(--of-spacing-2);
  text-align: right;
  outline: none;

  &:focus { border-color: var(--of-color-primary); }
}

// ---- Tab5: 通知配置 ----
.notify-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  overflow: hidden;
  margin-bottom: var(--of-spacing-4);
}

.notify-row {
  display: flex;
  align-items: flex-start;
  gap: var(--of-spacing-4);
  padding: var(--of-spacing-3) var(--of-spacing-4);
  border-bottom: 1px solid var(--of-border-table);
  font-size: var(--of-font-size-xs);
  background: transparent;
  transition: background var(--of-transition-base);

  &:last-child { border-bottom: none; }
  &:hover { background: var(--of-bg-row-hover); }
}

.notify-col-id {
  width: 48px;
  flex-shrink: 0;
  color: var(--of-color-link);
  font-weight: var(--of-font-weight-medium);
  padding-top: 2px;
}

.notify-col-label {
  width: 200px;
  flex-shrink: 0;
  color: var(--of-text-primary);
  padding-top: 2px;
}

.notify-col-recipients {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--of-spacing-1);
  min-height: 24px;
}

.notify-legend {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  line-height: 2;
}

// ---- 接收人标签 ----
.recipient-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  white-space: nowrap;

  &.shift { background: rgba(20,129,166,0.2); color: var(--of-color-accent-cyan); border: 1px solid rgba(87,196,247,0.2); }
  &.fixed { background: rgba(255,255,255,0.08); color: var(--of-text-secondary); border: 1px solid var(--of-border-table); }
  &.auto  { background: rgba(82,196,26,0.1); color: #52c41a; border: 1px solid rgba(82,196,26,0.2); }
}

.tag-remove {
  background: none; border: none;
  color: inherit; opacity: 0.6;
  cursor: pointer; padding: 0 0 0 2px;
  font-size: 12px; line-height: 1;

  &:hover { opacity: 1; }
}

// ---- 添加接收人下拉 ----
.add-recipient-dropdown {
  position: relative;
  display: inline-flex;

  &:hover .dropdown-menu { display: flex; }
}

.btn-add-recipient {
  background: transparent;
  border: 1px dashed var(--of-color-primary-border);
  color: var(--of-color-link);
  border-radius: var(--of-radius-base);
  font-size: 11px;
  padding: 2px var(--of-spacing-2);
  cursor: pointer;
  white-space: nowrap;

  &:hover { background: rgba(20,129,166,0.1); }
}

.dropdown-menu {
  display: none;
  flex-direction: column;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 200;
  min-width: 130px;
  background: var(--of-bg-modal);
  border: 1px solid var(--of-border-modal);
  border-radius: var(--of-radius-base);
  box-shadow: var(--of-shadow-modal);
  overflow: hidden;
  margin-top: 2px;
}

.dropdown-item {
  padding: var(--of-spacing-2) var(--of-spacing-3);
  background: none; border: none;
  color: var(--of-text-primary);
  font-size: var(--of-font-size-xs);
  text-align: left; cursor: pointer;
  white-space: nowrap;

  &:hover { background: var(--of-bg-row-hover); color: var(--of-color-link); }
}

// ---- 操作日志 ----
.audit-section { margin-top: var(--of-spacing-4); }

.audit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--of-spacing-2) var(--of-spacing-4);
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
  cursor: pointer;
  border: 1px solid var(--of-border-table);
  border-radius: var(--of-radius-base);
  background: var(--of-bg-table-head);
  margin-bottom: 0;
  transition: background var(--of-transition-base);

  &:hover { background: var(--of-bg-row-hover); }
}

.audit-toggle { color: var(--of-color-link); font-size: 11px; }

.audit-log {
  border: 1px solid var(--of-border-table);
  border-top: none;
  border-radius: 0 0 var(--of-radius-base) var(--of-radius-base);
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
.log-op     { width: 80px;  flex-shrink: 0; color: var(--of-text-secondary); }
.log-action { width: 120px; flex-shrink: 0; color: var(--of-color-link); }
.log-detail { flex: 1; color: var(--of-text-primary); }

// ---- 抽屉内容 ----
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-5);
  padding: var(--of-spacing-4) 0;
}

.form-item {
  label {
    display: block;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-secondary);
    margin-bottom: var(--of-spacing-2);
  }
}

.required { color: var(--of-color-error); margin-left: 2px; }

.form-input {
  width: 100%;
  height: var(--of-control-height);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--of-color-primary-border);
  border-radius: var(--of-radius-base);
  color: var(--of-text-primary);
  font-size: var(--of-font-size-xs);
  padding: 0 var(--of-spacing-3);
  outline: none;

  &:focus { border-color: var(--of-color-primary); }
  &::placeholder { color: var(--of-text-placeholder); }
}

.form-textarea {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--of-color-primary-border);
  border-radius: var(--of-radius-base);
  color: var(--of-text-primary);
  font-size: var(--of-font-size-xs);
  padding: var(--of-spacing-2) var(--of-spacing-3);
  resize: vertical;
  font-family: var(--of-font-family);
  line-height: 1.6;
  outline: none;

  &:focus { border-color: var(--of-color-primary); }
  &::placeholder { color: var(--of-text-placeholder); }
}

.form-value {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-primary);
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--of-spacing-2);
}

.color-option {
  width: 28px; height: 28px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--of-transition-base), transform var(--of-transition-base);

  &:hover { transform: scale(1.1); }
  &.selected { border-color: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.4); }
}

.source-type-select {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--of-spacing-2);
  max-height: 200px;
  overflow-y: auto;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-2);
  font-size: var(--of-font-size-xs);
  color: var(--of-text-primary);
  cursor: pointer;
  padding: var(--of-spacing-1) 0;

  input[type="checkbox"] { accent-color: var(--of-color-primary); cursor: pointer; }
  &:hover { color: var(--of-color-link); }
}

.drawer-footer {
  display: flex;
  gap: var(--of-spacing-2);
  justify-content: flex-end;
}

// ---- 弹窗：用户列表 ----
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

  &:hover  { border-color: var(--of-color-primary); background: rgba(20,129,166,0.08); }
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

  &:hover   { border-color: var(--of-color-primary); background: rgba(20,129,166,0.08); }
  &.selected { border-color: var(--of-color-primary); background: rgba(20,129,166,0.15); }
}

.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
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
</style>

