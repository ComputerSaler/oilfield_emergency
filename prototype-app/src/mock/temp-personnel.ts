/** 临时人员管理 mock —— 对应 PRD-人员管理-临时人员管理 V1.0 */

/** 历次有效期记录（详情抽屉展示） */
export interface TempPeriodRecord {
  seq: number // 有效期序号
  startAt: string // 生效日期
  expiryAt: string // 注销时间
  source: 'new' | 'reuse' // 建号来源：全新新增 / 复用
  remark: string
}

export interface TempPersonnelRow {
  id: string
  name: string
  username: string
  gender: '男' | '女' | '未知'
  isTemp: true
  position: string
  camp: string
  phone: string
  email: string
  roles: string[]
  status: '启用' | '锁定' | '注销'
  /** 注销时间（临时人员必填） */
  expiryAt: string
  /** 当前有效期序号 */
  tempPeriodSeq: number
  remark: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  /** 历次有效期记录（详情展示） */
  periods: TempPeriodRecord[]
}

/** 全量角色列表（来自系统管理→角色管理，角色配置弹窗候选项） */
export const ALL_ROLES = [
  { label: '系统管理员', value: 'admin' },
  { label: '安保队长', value: 'security_leader' },
  { label: '安保队员', value: 'security_member' },
  { label: '驾驶员', value: 'driver_role' },
  { label: '医护人员', value: 'medic_role' },
  { label: '普通员工', value: 'employee' },
  { label: '访客', value: 'visitor' },
  { label: 'SOS上报员', value: 'sos_reporter' },
]

/** 当前临时角色池（主管理员配置，仅池内角色可授予临时人员） */
export let TEMP_ROLE_POOL: string[] = ['visitor', 'sos_reporter', 'employee']

/** 当前最大有效期（天，主管理员配置） */
export let TEMP_MAX_DAYS: number = 30

/** 岗位字典（正式用户必填，临时人员非必填） */
export const POSITION_OPTIONS = [
  { label: '安保队长', value: 'security_captain' },
  { label: '安保队员', value: 'security_guard' },
  { label: '驾驶员', value: 'driver' },
  { label: '医护', value: 'medic' },
  { label: '后勤主管', value: 'logistics_manager' },
  { label: '现场作业员', value: 'field_worker' },
]

/** 营地字典（仅启用态；营地操作员仅可见本人营地） */
export const CAMP_OPTIONS = [
  { label: 'Koulele', value: 'koulele' },
  { label: 'Jaouro', value: 'jaouro' },
  { label: 'Dibeilla', value: 'dibeilla' },
]

/** 当前操作员等级（原型演示：主管理员视角 / 营地操作员视角可切换） */
export const OPERATOR_LEVEL = {
  /** 是否为主管理员（false 时隐藏角色配置与最大有效期按钮、营地锁定本人） */
  isAdmin: true,
  /** 营地操作员所属营地（isAdmin=false 时新增锁定该营地） */
  boundCamp: 'koulele',
}

/** 临时人员列表数据 */
export const TEMP_PERSONNEL_ROWS: TempPersonnelRow[] = [
  {
    id: 't001',
    name: '哈桑',
    username: 'hassan',
    gender: '男',
    isTemp: true,
    position: '',
    camp: 'koulele',
    phone: '+227 98765432',
    email: 'hassan@example.com',
    roles: ['visitor'],
    status: '启用',
    expiryAt: '2026-08-30 23:59:59',
    tempPeriodSeq: 2,
    remark: '合作方技术支援，来访 D+15',
    createdAt: '2026-08-15 10:30:00',
    updatedAt: '2026-08-15 10:30:00',
    lastLoginAt: '2026-08-15 16:20:00',
    periods: [
      { seq: 1, startAt: '2026-05-12', expiryAt: '2026-06-11 23:59:59', source: 'new', remark: '首次来访' },
      { seq: 2, startAt: '2026-08-15', expiryAt: '2026-08-30 23:59:59', source: 'reuse', remark: '本次到访复用' },
    ],
  },
  {
    id: 't002',
    name: '阿卜杜',
    username: 'abdou',
    gender: '男',
    isTemp: true,
    position: 'field_worker',
    camp: 'jaouro',
    phone: '+227 91234567',
    email: 'abdou@example.com',
    roles: ['sos_reporter'],
    status: '锁定',
    expiryAt: '2026-08-22 23:59:59',
    tempPeriodSeq: 1,
    remark: '现场作业外包人员',
    createdAt: '2026-08-08 09:00:00',
    updatedAt: '2026-08-15 22:11:00',
    lastLoginAt: '2026-08-15 22:10:00',
    periods: [
      { seq: 1, startAt: '2026-08-08', expiryAt: '2026-08-22 23:59:59', source: 'new', remark: '首次建号' },
    ],
  },
  {
    id: 't003',
    name: '贾巴尔',
    username: 'jabbar',
    gender: '男',
    isTemp: true,
    position: '',
    camp: 'dibeilla',
    phone: '+227 97654321',
    email: 'jabbar@example.com',
    roles: ['visitor'],
    status: '注销',
    expiryAt: '2026-08-10 23:59:59',
    tempPeriodSeq: 1,
    remark: '上次到访已离场',
    createdAt: '2026-07-28 14:00:00',
    updatedAt: '2026-08-10 23:59:59',
    lastLoginAt: '2026-08-06 09:00:00',
    periods: [
      { seq: 1, startAt: '2026-07-28', expiryAt: '2026-08-10 23:59:59', source: 'new', remark: '首次到访' },
    ],
  },
  {
    id: 't004',
    name: '让·皮埃尔',
    username: 'jeanpierre',
    gender: '男',
    isTemp: true,
    position: 'technician',
    camp: 'koulele',
    phone: '+227 96543210',
    email: 'jeanpierre@example.com',
    roles: ['employee'],
    status: '注销',
    expiryAt: '2026-08-01 23:59:59',
    tempPeriodSeq: 1,
    remark: '设备调试顾问，已离场',
    createdAt: '2026-07-15 11:00:00',
    updatedAt: '2026-08-01 23:59:59',
    lastLoginAt: null,
    periods: [
      { seq: 1, startAt: '2026-07-15', expiryAt: '2026-08-01 23:59:59', source: 'new', remark: '设备调试期' },
    ],
  },
  {
    id: 't005',
    name: '玛丽亚姆',
    username: 'mariam',
    gender: '女',
    isTemp: true,
    position: 'medic',
    camp: 'jaouro',
    phone: '+227 95432109',
    email: 'mariam@example.com',
    roles: ['sos_reporter'],
    status: '启用',
    expiryAt: '2026-09-05 23:59:59',
    tempPeriodSeq: 1,
    remark: '医疗援助志愿者',
    createdAt: '2026-08-12 15:30:00',
    updatedAt: '2026-08-12 15:30:00',
    lastLoginAt: null,
    periods: [
      { seq: 1, startAt: '2026-08-12', expiryAt: '2026-09-05 23:59:59', source: 'new', remark: '志愿医务支援' },
    ],
  },
]

/** 正式人员用户名（用于正式人员占用预检/判定，防止与临时人员重名） */
export const FORMAL_USERNAMES = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'sunqi', 'zhouba']

/** 营地将停用模拟：Dibeilla 置为停用态时用于列置灰演示（原型默认为启用） */
export const DISABLED_CAMPS: string[] = []
