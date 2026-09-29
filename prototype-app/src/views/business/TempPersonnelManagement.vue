<script setup lang="ts">
/**
 * 临时人员管理 —— 对应 PRD-人员管理-临时人员管理 V1.0
 * 架构：标准列表页（筛选栏 + 表格 + 新增/编辑抽屉 + 详情抽屉 + 配置弹窗 + 批量导入）
 * 核心规则：受限建号入口（角色仅限临时角色池）、必设注销时间（≤最大有效期）
 *          、到期自动注销（终态不复职）、用户名复用（命中临时+已注销记录 → 复用并覆盖，有效期序号+1）
 */
import { computed, ref, reactive } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import { DownloadOutlined } from '@ant-design/icons-vue'
import { pinyin } from 'pinyin-pro'
import {
  TEMP_PERSONNEL_ROWS,
  POSITION_OPTIONS,
  CAMP_OPTIONS,
  ALL_ROLES,
  TEMP_ROLE_POOL,
  TEMP_MAX_DAYS,
  OPERATOR_LEVEL,
  FORMAL_USERNAMES,
  type TempPersonnelRow,
} from '@/mock/temp-personnel'

// ========== 状态管理 ==========
const query = ref({
  keyword: '', // 姓名/用户名（OR 模糊）
  camp: '',
  status: '',
})
const showResigned = ref(false) // 显示已注销
const loading = ref(false)
const page = ref({ current: 1, pageSize: 20 })
const selectedRowKeys = ref<Key[]>([])

// 当前操作员等级（原型演示：主管理员视角，配置按钮可见）
const isAdmin = OPERATOR_LEVEL.isAdmin
const boundCamp = OPERATOR_LEVEL.boundCamp

// ========== 抽屉状态 ==========
const drawerVisible = ref(false)
const drawerMode = ref<'create' | 'edit' | 'detail'>('create')
const drawerLoading = ref(false)
const drawerSaveError = ref('') // 顶部内联错误

// ========== 弹窗状态 ==========
const rolePoolVisible = ref(false) // 临时人员角色配置
const rolePoolLoading = ref(false)
const maxDaysVisible = ref(false) // 最大有效期设置
const maxDaysLoading = ref(false)
const importVisible = ref(false) // 批量导入
const importLoading = ref(false)
const importResults = ref<{ ok: Record<string, string>[]; fail: { row: number; reason: string }[] }>({ ok: [], fail: [] })

// ========== 角色机制 ==========
const rolePool = ref<string[]>([...TEMP_ROLE_POOL])
const maxDays = ref<number>(TEMP_MAX_DAYS)
// 角色池内可选项（供下拉/校验）
const poolRoleOptions = computed(() =>
  rolePool.value
    .map((v) => ALL_ROLES.find((r) => r.value === v))
    .filter(Boolean)
    .map((r) => ({ label: r!.label, value: r!.value })),
)

const roleLabel = (v: string) => ALL_ROLES.find((r) => r.value === v)?.label || v
const campLabel = (v: string) => CAMP_OPTIONS.find((o) => o.value === v)?.label || v
const positionLabel = (v: string) => POSITION_OPTIONS.find((o) => o.value === v)?.label || v

// ========== 表单数据 ==========
const formData = reactive({
  name: '',
  gender: '未知' as '男' | '女' | '未知',
  position: '',
  camp: '',
  phone: '',
  email: '',
  remark: '',
  username: '',
  passwordMode: 'auto' as 'auto' | 'manual',
  password: '',
  roles: [] as string[],
  expiryAt: '' as string,
})

// 复用相关
const reuseRecord = ref<TempPersonnelRow | null>(null) // 命中的已注销记录

// ========== 表格列定义（PRD §5.4） ==========
const columns: TableColumnsType = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: 120, fixed: 'left', align: 'center' },
  { title: '登录名', dataIndex: 'username', key: 'username', width: 140, align: 'center' },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 120, align: 'center' },
  { title: '所属营地', dataIndex: 'camp', key: 'camp', width: 180, align: 'center' },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140, align: 'center' },
  { title: '角色', dataIndex: 'roles', key: 'roles', width: 180, align: 'center' },
  { title: '注销时间', dataIndex: 'expiryAt', key: 'expiryAt', width: 160, align: 'center' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100, align: 'center' },
  { title: '有效期', dataIndex: 'tempPeriodSeq', key: 'tempPeriodSeq', width: 90, align: 'center' },
  { title: '操作', key: 'action', width: 200, fixed: 'right', align: 'center' },
]

// ========== 数据过滤（PRD §3.1 / §5.2） ==========
const filtered = computed(() => {
  let result = TEMP_PERSONNEL_ROWS

  // 显示已注销：未勾选时排除已注销
  if (!showResigned.value) {
    result = result.filter((r) => r.status !== '注销')
  }

  // 关键字：姓名/登录名 OR 模糊，不区分大小写
  if (query.value.keyword) {
    const kw = query.value.keyword.toLowerCase()
    result = result.filter(
      (r) => r.name.toLowerCase().includes(kw) || r.username.toLowerCase().includes(kw),
    )
  }

  // 营地：营地操作员仅可见本人营地（前端数据隔离演示）
  if (!isAdmin && boundCamp) {
    result = result.filter((r) => r.camp === boundCamp)
  }
  if (query.value.camp) {
    result = result.filter((r) => r.camp === query.value.camp)
  }

  // 状态
  if (query.value.status) {
    result = result.filter((r) => r.status === query.value.status)
  }

  return result
})

// 分页数据（默认创建时间降序）
const paged = computed(() => {
  const sorted = [...filtered.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const start = (page.value.current - 1) * page.value.pageSize
  return sorted.slice(start, start + page.value.pageSize)
})

// 已注销行整行不透明度 60%（PRD §5.4）
const rowClassName = (record: TempPersonnelRow) => (record.status === '注销' ? 'of-temp--resigned' : '')

// ========== 筛选交互 ==========
function onSearch() {
  page.value.current = 1
}

function onReset() {
  query.value = { keyword: '', camp: '', status: '' }
  showResigned.value = false
  page.value.current = 1
}

// 状态选中「注销」时强制勾选显示已注销并置灰
function onStatusChange() {
  if (query.value.status === '注销') {
    showResigned.value = true
  }
}

// ========== 用户名判定（PRD §3.2 核心） ==========
function judgeUsername(username: string): 'new' | 'reuse' | 'occupied' {
  const uname = username.trim().toLowerCase()
  // 正式人员同名 → 占用（优先级最高）
  if (FORMAL_USERNAMES.some((u) => u === uname)) return 'occupied'
  // 在期临时同名 → 占用
  const activeTemp = TEMP_PERSONNEL_ROWS.find((r) => r.username === uname && r.status !== '注销')
  if (activeTemp) return 'occupied'
  // 临时 + 已注销 → 复用
  const resignedTemp = TEMP_PERSONNEL_ROWS.find((r) => r.username === uname && r.status === '注销')
  if (resignedTemp) return 'reuse'
  return 'new'
}

// 用户名失焦预检（提前提示，最终以提交时判定为准）
const usernameWarn = ref('')
function onUsernameBlur() {
  usernameWarn.value = ''
  const uname = formData.username.trim()
  if (!uname || drawerMode.value === 'edit') return
  const verdict = judgeUsername(uname)
  const poolEmpty = rolePool.value.length === 0
  if (verdict === 'occupied') {
    usernameWarn.value = '用户名已存在，与正式人员冲突'
  } else if (verdict === 'reuse') {
    // 复用分支：失焦预检只提示将复用，具体覆盖在提交时二次确认
    const rec = TEMP_PERSONNEL_ROWS.find((r) => r.username === uname && r.status === '注销')
    usernameWarn.value = rec ? `该用户名为已注销临时人员（第 ${rec.tempPeriodSeq} 期），提交后将复用该记录` : ''
    // 复用带入历史姓名/手机号（可改），登录名置灰
    if (rec && !reuseRecord.value) {
      reuseRecord.value = { ...rec }
      formData.name = formData.name || rec.name
      formData.gender = rec.gender
      formData.phone = formData.phone || rec.phone
      formData.email = formData.email || rec.email
      formData.camp = formData.camp || rec.camp
    }
  } else if (poolEmpty) {
    usernameWarn.value = '临时角色池未配置，无法完成新增'
  }
}

// ========== 新增 ==========
function openCreate() {
  pinyinGenerated = false
  drawerMode.value = 'create'
  Object.assign(formData, {
    name: '',
    gender: '未知',
    position: '',
    camp: isAdmin ? '' : boundCamp,
    phone: '',
    email: '',
    remark: '',
    username: '',
    passwordMode: 'auto',
    password: '',
    roles: [],
    expiryAt: '',
  })
  reuseRecord.value = null
  usernameWarn.value = ''
  drawerSaveError.value = ''
  drawerVisible.value = true
}

// 打开编辑抽屉（在期可编辑；注销态不可编辑）
function openEdit(record: TempPersonnelRow | any) {
  if (record.status === '注销') {
    message.warning('已注销人员不可编辑，请通过「新增」复用')
    return
  }
  drawerMode.value = 'edit'
  Object.assign(formData, {
    name: record.name,
    gender: record.gender,
    position: record.position,
    camp: record.camp,
    phone: record.phone,
    email: record.email,
    remark: record.remark,
    username: record.username,
    passwordMode: 'auto',
    password: '',
    roles: [...record.roles],
    expiryAt: record.expiryAt,
  })
  reuseRecord.value = null
  usernameWarn.value = ''
  drawerSaveError.value = ''
  drawerVisible.value = true
}

// 打开详情抽屉（只读）
function openDetail(record: TempPersonnelRow | any) {
  drawerMode.value = 'detail'
  detailId.value = record.id
  Object.assign(formData, {
    name: record.name,
    gender: record.gender,
    position: record.position,
    camp: record.camp,
    phone: record.phone,
    email: record.email,
    remark: record.remark,
    username: record.username,
    passwordMode: 'auto',
    password: '',
    roles: [...record.roles],
    expiryAt: record.expiryAt,
  })
  reuseRecord.value = null
  drawerVisible.value = true
}

// 生成拼音登录名（复用人名到拼音全拼）
let pinyinGenerated = false
function onNameBlur() {
  if (drawerMode.value === 'create' && !pinyinGenerated && formData.name && !formData.username) {
    const converted = pinyin(formData.name, { toneType: 'none', separator: '' })
    formData.username = converted.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32)
    pinyinGenerated = true
  }
}

// 注销时间可选区间 = [今天, 今天+最大有效期]
const expiryMinDate = () => new Date(new Date().toDateString()).getTime()
const expiryMaxDate = () => {
  const d = new Date(new Date().toDateString())
  d.setDate(d.getDate() + maxDays.value)
  return d.getTime()
}
// 日期选择器禁用过去日期与超出最大有效期日期
function disableExpiryDate(date: any) {
  if (!date) return false
  const t = date.valueOf()
  return t < expiryMinDate() || t > expiryMaxDate()
}
function clearExpiryError() {
  if (formErrors.value.expiryAt) delete formErrors.value.expiryAt
}

// ========== 表单校验 ==========
const formErrors = ref<Record<string, string>>({})
function validateForm(): boolean {
  const errs: Record<string, string> = {}
  if (!formData.name.trim()) errs.name = '请输入姓名'
  if (!formData.camp) errs.camp = '请选择所属营地'
  if (!formData.phone.trim()) errs.phone = '请输入手机号'
  if (!formData.username.trim()) errs.username = '请输入登录名'
  else if (!/^[a-z0-9_]{4,32}$/.test(formData.username)) errs.username = '登录名为 4-32 位小写字母、数字、下划线'
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = '邮箱格式不正确'
  if (drawerMode.value === 'create') {
    if (rolePool.value.length === 0) errs.roles = '临时角色池未配置，请联系主管理员'
    else if (formData.roles.length === 0) errs.roles = '请至少选择一个角色'
    if (reuseRecord.value) {
      // 复用：角色重填必选、注销时间重填必输
      if (!formData.expiryAt) errs.expiryAt = '请设置注销时间（复用需重新授权注销时间）'
    } else {
      if (!formData.expiryAt) errs.expiryAt = '请设置注销时间'
    }
    if (formData.passwordMode === 'manual' && (!formData.password || !/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(formData.password)))
      errs.password = '密码为 8-32 位，需同时包含字母和数字'
  } else {
    if (formData.expiryAt) {
      // 编辑时注销时间可在上限内调整，但不能早于今天
      if (new Date(formData.expiryAt).getTime() < expiryMinDate()) errs.expiryAt = '注销时间不能早于今天'
      if (new Date(formData.expiryAt).getTime() > expiryMaxDate()) errs.expiryAt = `注销时间不能晚于创建日 +${maxDays.value} 天`
    }
  }
  formErrors.value = errs
  return Object.keys(errs).length === 0
}

// ========== 保存（含复用二次确认） ==========
function onSave() {
  if (drawerMode.value === 'detail') return
  if (!validateForm()) {
    message.warning('请修正标红字段后再保存')
    return
  }
  // 新增且命中复用 → 走二次确认（不可关闭跳过）
  if (drawerMode.value === 'create' && reuseRecord.value) {
    confirmReuse(reuseRecord.value)
    return
  }
  doSubmit()
}

function confirmReuse(rec: TempPersonnelRow) {
  Modal.confirm({
    title: '复用已注销的临时人员记录',
    content: `用户名「${formData.username}」已存在已注销的临时人员记录（第 ${rec.tempPeriodSeq} 次有效期已结束）。本次新增将复用该记录并覆盖，其历史业务数据（事件、SOS、排班等）将保留在该用户名下。确认继续？`,
    okText: '确认复用并建号',
    okType: 'danger',
    cancelText: '取消',
    // 二次确认不可跳过：无 onClose 关闭路径，仅确认/取消
    closable: false,
    onOk: () => doSubmit(),
  })
}

function doSubmit() {
  drawerLoading.value = true
  drawerSaveError.value = ''
  setTimeout(() => {
    drawerLoading.value = false
    // 复用后应提示新密码（复用沿用原密码则提示已沿用）—— 统一按新账号返回初始密码
    drawerVisible.value = false
    if (drawerMode.value === 'create') {
      const pwd = formData.passwordMode === 'manual' ? formData.password : 'Abc123456'
      Modal.info({
        title: reuseRecord.value ? '账号已复用并生效' : '人员创建成功',
        content: `姓名：${formData.name}\n登录名：${formData.username}\n所属营地：${campLabel(formData.camp)}\n注销时间：${formData.expiryAt}${reuseRecord.value ? '' : `\n初始密码：${pwd}`}\n\n${reuseRecord.value ? '已复用历史记录，有效期序号已 +1，历史业务数据保留在该用户名下。' : '密码仅展示一次，关闭后无法再次查看，请立即转交本人。'}`,
        okText: '我已知悉',
      })
    } else {
      message.success('保存成功')
    }
  }, 800)
}

// ========== 操作列「更多」 ==========
// 分配角色（仅临时角色池内角色，整体覆盖）—— 独立小弹窗
const assignTarget = ref<TempPersonnelRow | null>(null)
const assignVisible = ref(false)
const assignForm = ref<string[]>([])
const assignError = ref('')

function openAssignRole(record: TempPersonnelRow | any) {
  assignTarget.value = record
  assignForm.value = [...record.roles]
  assignError.value = ''
  assignVisible.value = true
}

function saveAssignRole() {
  if (assignForm.value.length === 0) {
    assignError.value = '请至少选择一个角色'
    return
  }
  Modal.confirm({
    title: '保存角色分配',
    content: `确认为 ${assignTarget.value?.name} 整体覆盖为「${assignForm.value.map(roleLabel).join('、')}」？原角色将被替换。`,
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          assignVisible.value = false
          message.success('角色分配已保存')
          resolve(true)
        }, 500)
      })
    },
  })
}

// 手动注销
function onCancel(record: TempPersonnelRow | any) {
  Modal.confirm({
    title: '手动注销',
    content: `确认为 ${record.name}（${record.username}）注销账号？注销为终态，不提供复职，用户名将被释放、可被复用。`,
    okText: '确认注销',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          message.success('已注销，用户名已释放')
          selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
          resolve(true)
        }, 500)
      })
    },
  })
}

// 重置密码
function onResetPassword(record: TempPersonnelRow | any) {
  Modal.confirm({
    title: '重置密码',
    content: `确认重置 ${record.name} 的密码？`,
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true)
          Modal.info({
            title: '密码已重置',
            content: `姓名：${record.name}\n登录名：${record.username}\n新密码：Abc123456\n\n密码仅展示一次，关闭后无法再次查看，请立即转交本人。`,
            okText: '我已知悉',
          })
        }, 500)
      })
    },
  })
}

// 解锁
function onUnlock(record: TempPersonnelRow | any) {
  Modal.confirm({
    title: '解锁账号',
    content: `确认解锁 ${record.name} 的账号？解锁后状态由「锁定」回到「启用」。`,
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          message.success('解锁成功')
          resolve(true)
        }, 500)
      })
    },
  })
}

// ========== 角色配置弹窗 ==========
const rolePoolForm = ref<string[]>([...TEMP_ROLE_POOL])
const rolePoolSearch = ref('')

function openRolePool() {
  rolePoolForm.value = [...rolePool.value]
  rolePoolSearch.value = ''
  rolePoolVisible.value = true
}

function saveRolePool() {
  rolePoolLoading.value = true
  setTimeout(() => {
    rolePoolLoading.value = false
    // 整体覆盖全局临时角色池
    rolePool.value = [...rolePoolForm.value]
    rolePoolVisible.value = false
    // 已绑定角色但移出池的在期临时人员保留角色（引用完整性）；仅后续不可再选
    message.success('临时角色池已保存')
  }, 600)
}

/** 可过滤的角色列（配置弹窗：全量角色 + 搜索） */
const filteredAllRoles = computed(() => {
  const kw = rolePoolSearch.value.toLowerCase()
  return ALL_ROLES.filter((r) => !kw || r.label.toLowerCase().includes(kw))
})

// 角色池勾选切换
function togglePoolRole(roleValue: string) {
  const idx = rolePoolForm.value.indexOf(roleValue)
  if (idx >= 0) rolePoolForm.value.splice(idx, 1)
  else rolePoolForm.value.push(roleValue)
}

/** 全量角色中当前在期临时人员绑定的人数（用于角色池移除提示） */
function boundCount(roleValue: string) {
  return TEMP_PERSONNEL_ROWS.filter((r) => r.status !== '注销' && r.roles.includes(roleValue)).length
}

// ========== 最大有效期设置弹窗 ==========
function openMaxDays() {
  maxDaysValue.value = maxDays.value
  maxDaysVisible.value = true
}

const maxDaysValue = ref(30)
const maxDaysError = ref('')
function saveMaxDays() {
  const v = Number(maxDaysValue.value)
  if (!Number.isInteger(v) || v < 1 || v > 365) {
    maxDaysError.value = '请输入 1-365 的整数天数'
    return
  }
  maxDaysLoading.value = true
  setTimeout(() => {
    maxDaysLoading.value = false
    maxDays.value = v
    maxDaysVisible.value = false
    message.success(`最大有效期已设为 ${v} 天，仅影响后续新增`)
  }, 600)
}

// ========== 批量导入 ==========
function openImport() {
  importVisible.value = true
  importResults.value = { ok: [], fail: [] }
}

// 模拟上传并逐行校验
const importSource = ref('')
function doImport() {
  if (!importSource.value.trim()) {
    message.warning('请先粘贴导入内容')
    return
  }
  importLoading.value = true
  setTimeout(() => {
    importLoading.value = false
    // 演示：按行拆分模拟校验，展示逐行反馈结果
    importResults.value = {
      ok: [
        { row: '2', name: '伊萨', username: 'issa', pwd: 'Abc123456' },
        { row: '4', name: '纳赛尔', username: 'nasser', pwd: 'Xyz789012' },
      ],
      fail: [
        { row: 3, reason: '登录名 hassan 已存在在期临时人员，用户名占用' },
        { row: 5, reason: '角色 admin 不在临时角色池内，已拦截' },
        { row: 6, reason: '注销时间 2026-09-20 超出最大有效期（+30 天）' },
      ],
    }
  }, 800)
}

// ========== 详情辅助 ==========
const detailRecord = computed<TempPersonnelRow | null>(() => {
  const rec = TEMP_PERSONNEL_ROWS.find((r) => r.id === detailId.value) || null
  return rec
})
const detailId = ref('')

function onDrawerClose() {
  if (drawerLoading.value) return
  drawerVisible.value = false
}
</script>

<template>
  <PageContainer title="临时人员管理">
    <PanelCard>
      <!-- 筛选栏（PRD §5.1 / §5.2） -->
      <SearchBar :loading="loading" @reset="onReset" @search="onSearch">
        <a-form-item label="姓名/用户名" :colon="false" class="of-field">
          <a-input
            v-model:value="query.keyword"
            placeholder="请输入"
            style="width: 180px"
            :maxlength="64"
            @press-enter="onSearch"
          />
        </a-form-item>
        <a-form-item label="所属营地" :colon="false" class="of-field">
          <a-select
            v-model:value="query.camp"
            placeholder="全部"
            style="width: 160px"
            :options="[
              { label: '全部', value: '' },
              ...CAMP_OPTIONS.filter((c) => isAdmin || c.value === boundCamp),
            ]"
          />
        </a-form-item>
        <a-form-item label="状态" :colon="false" class="of-field">
          <a-select
            v-model:value="query.status"
            placeholder="全部"
            style="width: 130px"
            :options="[
              { label: '全部', value: '' },
              { label: '启用', value: '启用' },
              { label: '锁定', value: '锁定' },
              { label: '注销', value: '注销' },
            ]"
            @change="onStatusChange"
          />
        </a-form-item>
        <a-form-item :colon="false" class="of-field">
          <a-checkbox
            v-model:checked="showResigned"
            :disabled="query.status === '注销'"
          >
            显示已注销
          </a-checkbox>
        </a-form-item>
      </SearchBar>

      <!-- 工具栏（PRD §5.3） -->
      <div class="of-temp__toolbar">
        <div class="of-temp__toolbar-left">
          <a-space>
            <a-button
              v-if="isAdmin"
              class="of-btn-ghost"
              @click="openRolePool"
            >
              临时人员角色配置
            </a-button>
            <a-button
              v-if="isAdmin"
              class="of-btn-ghost"
              @click="openMaxDays"
            >
              最大有效期设置
            </a-button>
          </a-space>
        </div>
        <div class="of-temp__toolbar-right">
          <a-space>
            <a-button class="of-btn-ghost" @click="openImport">批量导入</a-button>
            <a-button class="of-btn-ghost" @click="message.success('导出成功')">导出</a-button>
            <a-button type="primary" @click="openCreate">新增</a-button>
          </a-space>
        </div>
      </div>

      <!-- 已选提示（勾选框列：已注销行不可勾选） -->
      <div v-if="selectedRowKeys.length > 0" class="of-temp__selected">
        <span class="of-temp__selected-text">已选 {{ selectedRowKeys.length }} 项</span>
        <span class="of-temp__selected-hint">已注销人员不支持批量操作</span>
        <a-button type="link" size="small" @click="selectedRowKeys = []">取消选择</a-button>
      </div>

      <!-- 表格（PRD §5.4） -->
      <a-table
        class="of-table"
        :columns="columns"
        :data-source="paged"
        :loading="loading"
        row-key="id"
        :row-class-name="rowClassName"
        :row-selection="{
          selectedRowKeys,
          onChange: (keys: Key[]) => { selectedRowKeys = keys },
          getCheckboxProps: (record: any) => ({
            disabled: record.status === '注销',
          }),
        }"
        :scroll="{ x: 1500 }"
        :pagination="{
          current: page.current,
          pageSize: page.pageSize,
          total: filtered.length,
          showTotal: (t: number) => `共${t}条`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (p: number, s: number) => { page.current = p; page.pageSize = s },
        }"
      >
        <template #bodyCell="{ column, record }">
          <!-- 姓名：居中，超宽截断 + Tooltip -->
          <template v-if="column.key === 'name'">
            <div style="text-align: center">
              <a-tooltip :title="record.name.length > 8 ? record.name : undefined">
                <span class="of-ellipsis">{{ record.name }}</span>
              </a-tooltip>
            </div>
          </template>

          <template v-if="column.key === 'username'">
            <div style="text-align: center">
              <a-tooltip :title="record.username.length > 10 ? record.username : undefined">
                <span class="of-ellipsis">{{ record.username }}</span>
              </a-tooltip>
            </div>
          </template>

          <!-- 岗位：字典缺项置灰提示；空值显示 -- -->
          <template v-if="column.key === 'position'">
            <div style="text-align: center">
              <template v-if="record.position">
                <a-tooltip :title="positionLabel(record.position) === record.position ? '岗位字典中无此项' : undefined">
                  <span :style="{ color: positionLabel(record.position) === record.position ? 'var(--of-text-tertiary)' : undefined }">
                    {{ positionLabel(record.position) }}
                  </span>
                </a-tooltip>
              </template>
              <template v-else>--</template>
            </div>
          </template>

          <!-- 所属营地：停用态置灰提示；空值 -- -->
          <template v-if="column.key === 'camp'">
            <div style="text-align: center">{{ campLabel(record.camp) }}</div>
          </template>

          <template v-if="column.key === 'phone'">
            <div style="text-align: center">{{ record.phone || '--' }}</div>
          </template>

          <!-- 角色：多角色顿号连接；超宽截断；空角色 -- 标橙 -->
          <template v-if="column.key === 'roles'">
            <div style="text-align: center">
              <span v-if="record.roles.length > 0" :style="{ color: '#ff9800' }">
                <a-tooltip :title="record.roles.map(roleLabel).join('、')">
                  <span v-if="record.roles.length <= 2">{{ record.roles.map(roleLabel).join('、') }}</span>
                  <span v-else>{{ record.roles.slice(0, 2).map(roleLabel).join('、') }} 等{{ record.roles.length }}个</span>
                </a-tooltip>
              </span>
              <span v-else style="color: #ff9800">--</span>
            </div>
          </template>

          <!-- 注销时间 -->
          <template v-if="column.key === 'expiryAt'">
            <div style="text-align: center">{{ record.expiryAt || '--' }}</div>
          </template>

          <template v-if="column.key === 'status'">
            <div style="text-align: center">
              <StatusTag
                :tone="
                  record.status === '启用' ? 'ok' :
                  record.status === '锁定' ? 'warn' : 'danger'
                "
              >
                {{ record.status }}
              </StatusTag>
            </div>
          </template>

          <!-- 有效期：第 N 次 -->
          <template v-if="column.key === 'tempPeriodSeq'">
            <div style="text-align: center">第 {{ record.tempPeriodSeq }} 次</div>
          </template>

          <!-- 操作（PRD §5.6 动态可见） -->
          <template v-if="column.key === 'action'">
            <a-button type="link" @click="openDetail(record)">详情</a-button>
            <a-button
              type="link"
              :disabled="record.status === '注销'"
              :title="record.status === '注销' ? '已注销人员不可编辑，请通过新增复用' : undefined"
              @click="record.status !== '注销' && openEdit(record)"
            >
              编辑
            </a-button>
            <a-dropdown v-if="record.status !== '注销'">
              <a-button type="link">更多</a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item v-if="record.status === '锁定'" @click="onUnlock(record)">
                    解锁
                  </a-menu-item>
                  <a-menu-item @click="onResetPassword(record)">
                    重置密码
                  </a-menu-item>
                  <a-menu-item @click="openAssignRole(record)">
                    分配角色
                  </a-menu-item>
                  <a-menu-item danger @click="onCancel(record)">
                    手动注销
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </PanelCard>

    <!-- ============ 新增/编辑/详情抽屉 ============ -->
    <a-drawer
      :open="drawerVisible"
      :title="drawerMode === 'create' ? '新增临时人员' : drawerMode === 'edit' ? '编辑临时人员' : '临时人员详情'"
      :width="640"
      :closable="!drawerLoading"
      :mask-closable="false"
      @close="onDrawerClose"
    >
      <!-- 保存失败顶部内联错误 -->
      <a-alert
        v-if="drawerSaveError"
        type="error"
        :message="drawerSaveError"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 详情抽屉：复用历次有效期记录展示 -->
      <template v-if="drawerMode === 'detail'">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="姓名">{{ formData.name }}</a-descriptions-item>
          <a-descriptions-item label="性别">{{ formData.gender }}</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ positionLabel(formData.position) || '--' }}</a-descriptions-item>
          <a-descriptions-item label="所属营地">{{ campLabel(formData.camp) }}</a-descriptions-item>
          <a-descriptions-item label="手机号">{{ formData.phone }}</a-descriptions-item>
          <a-descriptions-item label="邮箱">{{ formData.email || '--' }}</a-descriptions-item>
          <a-descriptions-item label="登录名">{{ formData.username }}</a-descriptions-item>
          <a-descriptions-item label="角色">{{ formData.roles.map(roleLabel).join('、') || '--' }}</a-descriptions-item>
          <a-descriptions-item label="注销时间">{{ formData.expiryAt }}</a-descriptions-item>
          <a-descriptions-item label="当前有效期">第 {{ detailRecord?.tempPeriodSeq }} 次</a-descriptions-item>
          <a-descriptions-item label="备注">{{ formData.remark || '--' }}</a-descriptions-item>
        </a-descriptions>

        <a-divider orientation="left">历次有效期记录</a-divider>
        <a-table
          class="of-table of-table--bare"
          :columns="PERIOD_COLS"
          :data-source="detailRecord?.periods || []"
          row-key="seq"
          size="small"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <div style="text-align: center">{{ record[column.key as keyof typeof record] }}</div>
          </template>
        </a-table>
      </template>

      <!-- 新增/编辑表单 -->
      <a-form v-else layout="vertical" class="of-temp__form">
        <a-divider orientation="left">基本信息</a-divider>

        <a-form-item
          label="姓名"
          :validate-status="formErrors.name ? 'error' : undefined"
          :help="formErrors.name"
          required
        >
          <a-input
            v-model:value="formData.name"
            placeholder="请输入姓名"
            :maxlength="32"
            @blur="onNameBlur"
          />
        </a-form-item>

        <a-form-item label="性别">
          <a-radio-group v-model:value="formData.gender">
            <a-radio value="男">男</a-radio>
            <a-radio value="女">女</a-radio>
            <a-radio value="未知">未知</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item
          label="岗位"
          :validate-status="undefined"
          help="临时人员岗位可选（与正式用户必填不同）"
        >
          <a-select
            v-model:value="formData.position"
            placeholder="请选择岗位"
            allow-clear
            :options="POSITION_OPTIONS"
            :disabled="POSITION_OPTIONS.length === 0"
          />
        </a-form-item>

        <a-form-item
          label="所属营地"
          :validate-status="formErrors.camp ? 'error' : undefined"
          :help="formErrors.camp"
          required
        >
          <a-select
            v-model:value="formData.camp"
            placeholder="请选择所属营地"
            :options="CAMP_OPTIONS"
            :disabled="!isAdmin"
          />
        </a-form-item>

        <a-form-item
          label="手机号"
          :validate-status="formErrors.phone ? 'error' : undefined"
          :help="formErrors.phone"
          required
        >
          <a-input
            v-model:value="formData.phone"
            placeholder="请输入手机号"
            :maxlength="20"
          />
        </a-form-item>

        <a-form-item
          label="邮箱"
          :validate-status="formErrors.email ? 'error' : undefined"
          :help="formErrors.email"
        >
          <a-input v-model:value="formData.email" placeholder="请输入邮箱" />
        </a-form-item>

        <a-form-item label="备注">
          <a-textarea
            v-model:value="formData.remark"
            placeholder="请输入备注"
            :maxlength="200"
            :rows="2"
            show-count
          />
        </a-form-item>

        <a-divider orientation="left">账号信息</a-divider>

        <a-form-item
          label="登录名"
          :validate-status="formErrors.username ? 'error' : undefined"
          :help="formErrors.username || usernameWarn"
          required
        >
          <a-input
            v-model:value="formData.username"
            placeholder="请输入登录名（失焦姓名字段自动生成拼音）"
            :maxlength="32"
            :disabled="drawerMode === 'edit' || !!reuseRecord"
            @blur="onUsernameBlur"
          />
          <div class="of-temp__hint" style="margin-top: 4px">
            {{ reuseRecord ? '复用已注销记录，登录名沿用不可修改' : '失焦姓名字段后自动生成拼音，可手动修改' }}
          </div>
        </a-form-item>

        <!-- 初始密码：仅新增时展示；复用时沿用不展示 -->
        <template v-if="drawerMode === 'create' && !reuseRecord">
          <a-form-item
            label="初始密码"
            :validate-status="formErrors.password ? 'error' : undefined"
            :help="formErrors.password"
            required
          >
            <a-radio-group v-model:value="formData.passwordMode">
              <a-radio value="auto">自动生成（Abc123456）</a-radio>
              <a-radio value="manual">管理员指定</a-radio>
            </a-radio-group>
            <a-input
              v-if="formData.passwordMode === 'manual'"
              v-model:value="formData.password"
              placeholder="8-32 位，含字母与数字"
              style="margin-top: 8px"
              :maxlength="32"
            />
            <div class="of-temp__hint" style="margin-top: 4px">
              账号创建成功后显示初始密码（仅显示一次）
            </div>
          </a-form-item>
        </template>
        <div v-else-if="reuseRecord" class="of-temp__hint" style="margin: 4px 0 16px">
          复用已注销记录，沿用原密码体系（不在此重设）
        </div>

        <a-form-item
          label="角色"
          :validate-status="formErrors.roles ? 'error' : undefined"
          :help="formErrors.roles"
          required
        >
          <a-select
            v-model:value="formData.roles"
            mode="multiple"
            placeholder="仅限临时角色池内角色"
            :options="poolRoleOptions"
            :disabled="rolePool.length === 0"
            :max-tag-count="2"
          />
          <div
            v-if="rolePool.length === 0"
            class="of-temp__hint"
            style="color: var(--of-color-error); margin-top: 4px"
          >
            临时角色池未配置，请联系主管理员
          </div>
        </a-form-item>

        <a-form-item
          label="注销时间"
          :validate-status="formErrors.expiryAt ? 'error' : undefined"
          :help="formErrors.expiryAt"
          required
        >
          <a-date-picker
            v-model:value="formData.expiryAt"
            value-format="YYYY-MM-DD 23:59:59"
            placeholder="请选择注销时间"
            style="width: 100%"
            :disabled-date="disableExpiryDate"
            @change="clearExpiryError"
          />
          <div class="of-temp__hint" style="margin-top: 4px">
            可选区间：今天 ～ 今天 +{{ maxDays }} 天（最大有效期 {{ maxDays }} 天），到期自动注销
          </div>
        </a-form-item>

        <a-form-item label="人员状态">
          <a-input :value="'启用'" disabled />
        </a-form-item>
      </a-form>

      <template v-if="drawerMode !== 'detail'" #footer>
        <div style="text-align: right">
          <a-space>
            <a-button :disabled="drawerLoading" @click="onDrawerClose">取消</a-button>
            <a-button type="primary" :loading="drawerLoading" @click="onSave">保存</a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>

    <!-- ============ 临时人员角色配置弹窗（主管理员） ============ -->
    <a-modal
      :open="rolePoolVisible"
      title="临时人员角色配置"
      :width="520"
      :closable="!rolePoolLoading"
      :mask-closable="false"
      @cancel="rolePoolVisible = false"
    >
      <div class="of-temp__pool-note">
        仅勾选的角色可被临时人员使用
      </div>
      <a-input
        v-model:value="rolePoolSearch"
        placeholder="搜索角色…"
        allow-clear
        style="margin-bottom: 12px"
      />
      <div class="of-temp__pool-list">
        <div v-for="role in filteredAllRoles" :key="role.value" class="of-temp__pool-item">
          <a-checkbox
            :checked="rolePoolForm.includes(role.value)"
            @change="togglePoolRole(role.value)"
          >
            {{ role.label }}
          </a-checkbox>
          <span v-if="boundCount(role.value) > 0" class="of-temp__pool-count">
            在期绑定 {{ boundCount(role.value) }} 人
          </span>
        </div>
        <a-empty v-if="filteredAllRoles.length === 0" description="无匹配角色" />
      </div>
      <template #footer>
        <a-button :disabled="rolePoolLoading" @click="rolePoolVisible = false">取消</a-button>
        <a-button type="primary" :loading="rolePoolLoading" @click="saveRolePool">保存</a-button>
      </template>
    </a-modal>

    <!-- ============ 最大有效期设置弹窗（主管理员） ============ -->
    <a-modal
      :open="maxDaysVisible"
      title="最大有效期设置"
      :width="420"
      :closable="!maxDaysLoading"
      :mask-closable="false"
      @cancel="maxDaysVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item
          label="最大有效期（天）"
          :validate-status="maxDaysError ? 'error' : undefined"
          :help="maxDaysError"
          required
        >
          <a-input-number
            v-model:value="maxDaysValue"
            :min="1"
            :max="365"
            :precision="0"
            style="width: 100%"
            @change="maxDaysError = ''"
          />
        </a-form-item>
      </a-form>
      <div class="of-temp__hint" style="color: var(--of-text-secondary)">
        不影响当前临时人员，只影响后续新增
      </div>
      <template #footer>
        <a-button :disabled="maxDaysLoading" @click="maxDaysVisible = false">取消</a-button>
        <a-button type="primary" :loading="maxDaysLoading" @click="saveMaxDays">保存</a-button>
      </template>
    </a-modal>

    <!-- ============ 批量导入弹窗 ============ -->
    <a-modal
      :open="importVisible"
      title="批量导入临时人员"
      :width="680"
      :footer="null"
      @cancel="importVisible = false"
    >
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="逐行校验，成功行已生效不回滚；失败行定位到行号并给出原因。登录名走复用判定，角色须在临时角色池内。"
      />
      <div style="margin-bottom: 8px">
        <a>
          <DownloadOutlined style="margin-right: 4px" />
          下载导入模板（姓名*, 登录名*, 岗位, 所属营地*, 手机号*, 角色*, 注销时间*, 备注）
        </a>
      </div>
      <a-textarea
        v-model:value="importSource"
        :rows="5"
        placeholder="粘贴导入内容，首行为表头，每行一条记录…"
      />
      <div style="margin-top: 8px">
        <a-space>
          <a-button type="primary" :loading="importLoading" @click="doImport">
            校验并导入
          </a-button>
        </a-space>
      </div>

      <template v-if="importResults.ok.length > 0 || importResults.fail.length > 0">
        <a-divider />
        <a-alert
          type="success"
          show-icon
          style="margin-bottom: 8px"
          :message="`成功 ${importResults.ok.length} 行，失败 ${importResults.fail.length} 行`"
        />
        <!-- 成功行：逐条展示新密码 -->
        <a-table
          v-if="importResults.ok.length > 0"
          class="of-table of-table--bare"
          :columns="IMPORT_OK_COLS"
          :data-source="importResults.ok"
          row-key="row"
          size="small"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <div style="text-align: center">{{ record[column.key as keyof typeof record] }}</div>
          </template>
        </a-table>
        <!-- 失败行分组 -->
        <a-table
          v-if="importResults.fail.length > 0"
          class="of-table of-table--bare"
          :columns="IMPORT_FAIL_COLS"
          :data-source="importResults.fail"
          row-key="row"
          size="small"
          :pagination="false"
          style="margin-top: 12px"
        >
          <template #bodyCell="{ column, record }">
            <div style="text-align: center">{{ record[column.key as keyof typeof record] }}</div>
          </template>
        </a-table>
      </template>
    </a-modal>

    <!-- ============ 分配角色弹窗（仅临时角色池内，整体覆盖） ============ -->
    <a-modal
      :open="assignVisible"
      :title="`分配角色 — ${assignTarget?.name ?? ''}`"
      :width="440"
      :closable="true"
      :mask-closable="false"
      @cancel="assignVisible = false"
    >
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="仅可在临时角色池内选择，保存后整体覆盖原角色集合。"
      />
      <a-form layout="vertical">
        <a-form-item
          :validate-status="assignError ? 'error' : undefined"
          :help="assignError"
          required
        >
          <a-select
            v-model:value="assignForm"
            mode="multiple"
            placeholder="请选择角色"
            :options="poolRoleOptions"
            :max-tag-count="3"
            :disabled="rolePool.length === 0"
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="assignVisible = false">取消</a-button>
        <a-button type="primary" @click="saveAssignRole">保存</a-button>
      </template>
    </a-modal>
  </PageContainer>
</template>

<script lang="ts">
/** 顶层常量列定义（独立于 setup 逻辑，供模板静态列使用） */
const PERIOD_COLS = [
  { title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center' as const },
  { title: '生效日期', dataIndex: 'startAt', key: 'startAt', width: 120, align: 'center' as const },
  { title: '注销时间', dataIndex: 'expiryAt', key: 'expiryAt', width: 160, align: 'center' as const },
  { title: '来源', dataIndex: 'source', key: 'source', width: 80, align: 'center' as const },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 160, align: 'center' as const },
]
const IMPORT_OK_COLS = [
  { title: '行号', dataIndex: 'row', key: 'row', width: 60, align: 'center' as const },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 100, align: 'center' as const },
  { title: '登录名', dataIndex: 'username', key: 'username', width: 140, align: 'center' as const },
  { title: '初始密码', dataIndex: 'pwd', key: 'pwd', width: 120, align: 'center' as const },
]
const IMPORT_FAIL_COLS = [
  { title: '行号', dataIndex: 'row', key: 'row', width: 60, align: 'center' as const },
  { title: '失败原因', dataIndex: 'reason', key: 'reason', width: 380, align: 'center' as const },
]

export default { name: 'TempPersonnelManagement' }
</script>

<style scoped lang="scss">
/* 已注销行：整行不透明度 60%（PRD §5.4，无需行级背景） */
.of-temp--resigned {
  opacity: 0.6;
}

.of-temp__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--of-spacing-4);

  &-left {
    display: flex;
    gap: var(--of-spacing-2);
  }
  &-right {
    display: flex;
    gap: var(--of-spacing-2);
  }
}

.of-btn-ghost {
  color: var(--of-text-primary);
  background: var(--of-bg-btn-default);
  border-color: transparent;

  &:hover {
    color: var(--of-text-primary);
    background: var(--of-bg-btn-default-hover);
    border-color: transparent;
  }
}

.of-temp__selected {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
  padding: 8px 0;
  margin-bottom: var(--of-spacing-3);
  border-bottom: var(--of-border-width) solid var(--of-border-base);

  &-text {
    color: var(--of-text-secondary);
    font-size: var(--of-font-size-sm);
  }
  &-hint {
    color: var(--of-text-tertiary);
    font-size: var(--of-font-size-xs);
  }
}

.of-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.of-temp__hint {
  color: var(--of-text-tertiary);
  font-size: 12px;
}

.of-temp__pool-note {
  margin-bottom: 12px;
  padding: 8px 12px;
  color: var(--of-text-secondary);
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--of-radius-sm);
  font-size: 12px;
}

.of-temp__pool-list {
  max-height: 320px;
  overflow-y: auto;
}

.of-temp__pool-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
  border-bottom: 1px solid var(--of-border-base);

  &:last-child {
    border-bottom: none;
  }
}

.of-temp__pool-count {
  color: var(--of-text-tertiary);
  font-size: 12px;
}

/* 表格去边框（弹窗内小表） */
.of-table--bare {
  :deep(.ant-table-thead > tr > th) {
    background: transparent;
  }
  :deep(.ant-table-cell) {
    background: transparent !important;
  }
}
</style>
