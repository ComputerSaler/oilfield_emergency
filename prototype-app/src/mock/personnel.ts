/** 用户信息 mock —— 对应 PRD-人员管理-用户信息 V2.5 */

export interface PersonnelRow {
  id: string
  name: string
  username: string
  aiuUsername?: string // AI+U平台用户名，非必填
  gender: '男' | '女' | '未知'
  position: string
  team: string
  camp: string
  phone: string
  email: string
  hireDate: string
  roles: string[]
  status: '启用' | '锁定' | '注销'
  isTemp: boolean // 是否临时人员
  remark: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  password?: string // 仅用于表单，不存储
}

/** 岗位字典 */
export const POSITION_OPTIONS = [
  { label: '安保队长', value: 'security_captain' },
  { label: '安保队员', value: 'security_guard' },
  { label: '驾驶员', value: 'driver' },
  { label: '医护', value: 'medic' },
  { label: '后勤主管', value: 'logistics_manager' },
  { label: '现场作业员', value: 'field_worker' },
  { label: '技术员', value: 'technician' },
]

/** 班组字典 */
export const TEAM_OPTIONS = [
  { label: 'A班', value: 'a' },
  { label: 'B班', value: 'b' },
  { label: 'C班', value: 'c' },
]

/** 营地字典 */
export const CAMP_OPTIONS = [
  { label: 'Koulele', value: 'koulele' },
  { label: 'Jaouro', value: 'jaouro' },
  { label: 'Dibeilla', value: 'dibeilla' },
]

/** 角色列表（简化版，实际来自系统管理） */
export const ROLE_OPTIONS = [
  { label: '系统管理员', value: 'admin' },
  { label: '安保队长', value: 'security_leader' },
  { label: '安保队员', value: 'security_member' },
  { label: '驾驶员', value: 'driver_role' },
  { label: '医护人员', value: 'medic_role' },
  { label: '普通员工', value: 'employee' },
]

/** 人员状态枚举 */
export const STATUS_OPTIONS = [
  { label: '启用', value: '启用' },
  { label: '锁定', value: '锁定' },
  { label: '注销', value: '注销' },
]

/** 人员列表数据 */
export const PERSONNEL_ROWS: PersonnelRow[] = [
  {
    id: 'p001',
    name: '张三',
    username: 'zhangsan',
    aiuUsername: 'zhangsan', // 默认与登录名一致
    gender: '男',
    position: 'security_captain',
    team: 'a',
    camp: 'koulele',
    phone: '+227 98765432',
    email: 'zhangsan@wapco.com',
    hireDate: '2024-01-15',
    roles: ['security_leader'],
    status: '启用',
    isTemp: false,
    remark: '',
    createdAt: '2024-01-15 10:30:00',
    updatedAt: '2026-08-01 14:20:00',
    lastLoginAt: '2026-08-06 09:15:00',
  },
  {
    id: 'p002',
    name: '李四',
    username: 'lisi',
    aiuUsername: 'lisi',
    gender: '男',
    position: 'driver',
    team: 'b',
    camp: 'jaouro',
    phone: '+227 91234567',
    email: 'lisi@wapco.com',
    hireDate: '2024-02-20',
    roles: ['driver_role'],
    status: '锁定',
    isTemp: false,
    remark: '休假中',
    createdAt: '2024-02-20 09:00:00',
    updatedAt: '2026-08-05 16:30:00',
    lastLoginAt: '2026-08-03 08:00:00',
  },
  {
    id: 'p003',
    name: '王五',
    username: 'wangwu',
    aiuUsername: '', // 演示为空的情况，单点登录时fallback到username
    gender: '男',
    position: 'medic',
    team: 'a',
    camp: 'dibeilla',
    phone: '+227 97654321',
    email: 'wangwu@wapco.com',
    hireDate: '2024-03-10',
    roles: ['medic_role'],
    status: '锁定',
    isTemp: false,
    remark: '',
    createdAt: '2024-03-10 11:00:00',
    updatedAt: '2026-08-06 07:45:00',
    lastLoginAt: '2026-08-06 07:30:00',
  },
  {
    id: 'p004',
    name: '赵六',
    username: 'zhaoliu',
    aiuUsername: 'zhaoliu',
    gender: '女',
    position: 'security_guard',
    team: 'b',
    camp: 'koulele',
    phone: '+227 98888888',
    email: 'zhaoliu@wapco.com',
    hireDate: '2024-04-05',
    roles: ['security_member'],
    status: '启用',
    isTemp: false,
    remark: '',
    createdAt: '2024-04-05 10:00:00',
    updatedAt: '2026-07-20 09:00:00',
    lastLoginAt: '2026-08-06 08:30:00',
  },
  {
    id: 'p005',
    name: '孙七',
    username: 'sunqi',
    aiuUsername: 'sunqi',
    gender: '男',
    position: 'field_worker',
    team: 'c',
    camp: 'jaouro',
    phone: '+227 96543210',
    email: 'sunqi@wapco.com',
    hireDate: '2023-12-01',
    roles: ['employee'],
    status: '注销',
    isTemp: false,
    remark: '已离场',
    createdAt: '2023-12-01 09:00:00',
    updatedAt: '2026-07-30 17:00:00',
    lastLoginAt: '2026-07-29 18:00:00',
  },
  {
    id: 'p006',
    name: '周八',
    username: 'zhouba',
    aiuUsername: 'zhouba',
    gender: '女',
    position: 'logistics_manager',
    team: 'a',
    camp: 'koulele',
    phone: '+227 99876543',
    email: 'zhouba@wapco.com',
    hireDate: '2024-01-20',
    roles: ['admin', 'employee'],
    status: '启用',
    isTemp: false,
    remark: '',
    createdAt: '2024-01-20 08:30:00',
    updatedAt: '2026-08-02 10:00:00',
    lastLoginAt: '2026-08-06 07:00:00',
  },
  {
    id: 'p007',
    name: '吴九',
    username: 'wujiu',
    aiuUsername: 'wujiu',
    gender: '男',
    position: 'technician',
    team: 'b',
    camp: 'dibeilla',
    phone: '+227 95432109',
    email: 'wujiu@wapco.com',
    hireDate: '2024-05-15',
    roles: ['employee'],
    status: '启用',
    isTemp: false,
    remark: '技术骨干',
    createdAt: '2024-05-15 09:30:00',
    updatedAt: '2026-08-04 15:20:00',
    lastLoginAt: '2026-08-05 17:00:00',
  },
  {
    id: 'p008',
    name: '郑十',
    username: 'zhengshi',
    aiuUsername: 'zhengshi',
    gender: '女',
    position: 'security_guard',
    team: 'a',
    camp: 'jaouro',
    phone: '+227 94321098',
    email: 'zhengshi@wapco.com',
    hireDate: '2024-06-01',
    roles: ['security_member'],
    status: '启用',
    isTemp: false,
    remark: '',
    createdAt: '2024-06-01 10:00:00',
    updatedAt: '2026-08-03 11:30:00',
    lastLoginAt: '2026-08-06 06:45:00',
  },
  {
    id: 'p009',
    name: 'John Smith',
    username: 'johnsmith',
    aiuUsername: 'john.smith@cnpc', // 演示特殊情况：AI+U用户名与登录名不一致
    gender: '男',
    position: 'technician',
    team: 'c',
    camp: 'koulele',
    phone: '+227 93210987',
    email: 'john.smith@wapco.com',
    hireDate: '2024-03-25',
    roles: ['employee'],
    status: '启用',
    isTemp: false,
    remark: '外籍技术顾问',
    createdAt: '2024-03-25 14:00:00',
    updatedAt: '2026-07-28 16:00:00',
    lastLoginAt: '2026-08-05 20:00:00',
  },
  {
    id: 'p010',
    name: '买买提·艾力',
    username: 'mmtal',
    aiuUsername: 'mmtal',
    gender: '男',
    position: 'driver',
    team: 'b',
    camp: 'dibeilla',
    phone: '+227 92109876',
    email: 'maimaiti@wapco.com',
    hireDate: '2024-04-10',
    roles: ['driver_role'],
    status: '启用',
    isTemp: false,
    remark: '',
    createdAt: '2024-04-10 09:00:00',
    updatedAt: '2026-08-01 08:00:00',
    lastLoginAt: '2026-08-06 05:30:00',
  },
  // 添加几条临时人员数据用于测试
  {
    id: 'p011',
    name: '临时工A',
    username: 'tempworkera',
    aiuUsername: 'tempworkera',
    gender: '男',
    position: 'field_worker',
    team: 'a',
    camp: 'koulele',
    phone: '+227 90000001',
    email: '',
    hireDate: '2026-08-01',
    roles: ['employee'],
    status: '启用',
    isTemp: true,
    remark: '临时用工',
    createdAt: '2026-08-01 08:00:00',
    updatedAt: '2026-08-01 08:00:00',
    lastLoginAt: '2026-08-06 10:00:00',
  },
  {
    id: 'p012',
    name: '访客B',
    username: 'visitorb',
    aiuUsername: 'visitorb',
    gender: '女',
    position: 'field_worker',
    team: 'b',
    camp: 'jaouro',
    phone: '+227 90000002',
    email: '',
    hireDate: '2026-08-10',
    roles: ['employee'],
    status: '启用',
    isTemp: true,
    remark: '短期访客',
    createdAt: '2026-08-10 09:00:00',
    updatedAt: '2026-08-10 09:00:00',
    lastLoginAt: null,
  },
]
