/**
 * 班组管理 Mock 数据
 * 对应 PRD-人员管理-班组管理 V1.0
 */

export interface TeamRow {
  id: string
  name: string
  description: string
  memberCount: number
  status: '启用' | '停用'
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  personId: string
  name: string
  employeeNo: string
  campName: string
  deptName: string
  phone: string
  status: '启用' | '锁定' | '注销'
  joinedAt: string
}

// 班组列表
export const TEAM_ROWS: TeamRow[] = [
  {
    id: 'team-1',
    name: 'A班',
    description: '日班轮值，负责白天06:00-18:00值守',
    memberCount: 12,
    status: '启用',
    sortOrder: 1,
    createdAt: '2026-01-20 09:00:00',
    updatedAt: '2026-07-15 10:30:00',
  },
  {
    id: 'team-2',
    name: 'B班',
    description: '夜班轮值，负责夜间18:00-06:00值守',
    memberCount: 9,
    status: '启用',
    sortOrder: 2,
    createdAt: '2026-01-20 09:10:00',
    updatedAt: '2026-07-10 14:20:00',
  },
  {
    id: 'team-3',
    name: 'C班',
    description: '周末轮值，负责周六日及节假日值守',
    memberCount: 11,
    status: '启用',
    sortOrder: 3,
    createdAt: '2026-01-20 09:20:00',
    updatedAt: '2026-06-28 16:45:00',
  },
  {
    id: 'team-4',
    name: '机动班',
    description: '应急机动力量，随时待命处置突发事件',
    memberCount: 5,
    status: '启用',
    sortOrder: 4,
    createdAt: '2026-01-20 09:30:00',
    updatedAt: '2026-07-20 11:00:00',
  },
  {
    id: 'team-5',
    name: '夜巡组',
    description: '夜间巡逻专班',
    memberCount: 0,
    status: '停用',
    sortOrder: 5,
    createdAt: '2026-02-10 10:00:00',
    updatedAt: '2026-05-15 09:30:00',
  },
]

// 班组成员（A班示例）
export const TEAM_MEMBERS: TeamMember[] = [
  // A班成员
  {
    id: 'tm-1',
    teamId: 'team-1',
    personId: 'p-1',
    name: '张三',
    employeeNo: '202601001',
    campName: 'Bravia 营地',
    deptName: '安保部',
    phone: '+227 123 4567',
    status: '启用',
    joinedAt: '2026-01-21 10:00:00',
  },
  {
    id: 'tm-2',
    teamId: 'team-1',
    personId: 'p-2',
    name: '李四',
    employeeNo: '202601002',
    campName: 'Bravia 营地',
    deptName: '后勤部',
    phone: '+227 234 5678',
    status: '启用',
    joinedAt: '2026-01-21 10:05:00',
  },
  {
    id: 'tm-3',
    teamId: 'team-1',
    personId: 'p-3',
    name: '王五',
    employeeNo: '202601003',
    campName: 'Niamey 营地',
    deptName: '行政办公室',
    phone: '+227 345 6789',
    status: '启用',
    joinedAt: '2026-01-21 10:10:00',
  },
  {
    id: 'tm-4',
    teamId: 'team-1',
    personId: 'p-4',
    name: '赵六',
    employeeNo: '202601004',
    campName: 'Bravia 营地',
    deptName: '安保部',
    phone: '+227 456 7890',
    status: '启用',
    joinedAt: '2026-01-21 10:15:00',
  },
  {
    id: 'tm-5',
    teamId: 'team-1',
    personId: 'p-5',
    name: '孙七',
    employeeNo: '202601005',
    campName: 'Agadem 营地',
    deptName: '生产部',
    phone: '+227 567 8901',
    status: '启用',
    joinedAt: '2026-01-22 09:00:00',
  },
  {
    id: 'tm-6',
    teamId: 'team-1',
    personId: 'p-6',
    name: '周八',
    employeeNo: '202601006',
    campName: 'Bravia 营地',
    deptName: '工程部',
    phone: '+227 678 9012',
    status: '启用',
    joinedAt: '2026-01-22 09:10:00',
  },
  {
    id: 'tm-7',
    teamId: 'team-1',
    personId: 'p-7',
    name: '吴九',
    employeeNo: '202601007',
    campName: 'Diffa 营地',
    deptName: '物资部',
    phone: '+227 789 0123',
    status: '启用',
    joinedAt: '2026-01-22 09:20:00',
  },
  {
    id: 'tm-8',
    teamId: 'team-1',
    personId: 'p-8',
    name: '郑十',
    employeeNo: '202601008',
    campName: 'Bravia 营地',
    deptName: '安保部',
    phone: '+227 890 1234',
    status: '启用',
    joinedAt: '2026-01-23 08:00:00',
  },
  {
    id: 'tm-9',
    teamId: 'team-1',
    personId: 'p-9',
    name: '冯十一',
    employeeNo: '202601009',
    campName: 'Zinder 营地',
    deptName: '运输队',
    phone: '+227 901 2345',
    status: '启用',
    joinedAt: '2026-01-23 08:10:00',
  },
  {
    id: 'tm-10',
    teamId: 'team-1',
    personId: 'p-10',
    name: '陈十二',
    employeeNo: '202601010',
    campName: 'Bravia 营地',
    deptName: '后勤部',
    phone: '+227 012 3456',
    status: '启用',
    joinedAt: '2026-01-23 08:20:00',
  },
  {
    id: 'tm-11',
    teamId: 'team-1',
    personId: 'p-11',
    name: '楚十三',
    employeeNo: '202601011',
    campName: 'Niamey 营地',
    deptName: '财务部',
    phone: '+227 123 4560',
    status: '锁定',
    joinedAt: '2026-01-24 09:00:00',
  },
  {
    id: 'tm-12',
    teamId: 'team-1',
    personId: 'p-12',
    name: '魏十四',
    employeeNo: '202601012',
    campName: 'Bravia 营地',
    deptName: '安保部',
    phone: '+227 234 5601',
    status: '注销',
    joinedAt: '2026-01-24 09:10:00',
  },

  // B班成员（示例9人）
  {
    id: 'tm-13',
    teamId: 'team-2',
    personId: 'p-13',
    name: '韩夜1',
    employeeNo: '202601101',
    campName: 'Bravia 营地',
    deptName: '安保部',
    phone: '+227 345 6012',
    status: '启用',
    joinedAt: '2026-01-25 10:00:00',
  },
  {
    id: 'tm-14',
    teamId: 'team-2',
    personId: 'p-14',
    name: '蒋夜2',
    employeeNo: '202601102',
    campName: 'Bravia 营地',
    deptName: '安保部',
    phone: '+227 456 7123',
    status: '启用',
    joinedAt: '2026-01-25 10:10:00',
  },
  {
    id: 'tm-15',
    teamId: 'team-2',
    personId: 'p-15',
    name: '沈夜3',
    employeeNo: '202601103',
    campName: 'Agadem 营地',
    deptName: 'HSE部',
    phone: '+227 567 8234',
    status: '启用',
    joinedAt: '2026-01-25 10:20:00',
  },
  {
    id: 'tm-16',
    teamId: 'team-2',
    personId: 'p-16',
    name: '诸夜4',
    employeeNo: '202601104',
    campName: 'Bravia 营地',
    deptName: '安保部',
    phone: '+227 678 9345',
    status: '启用',
    joinedAt: '2026-01-26 09:00:00',
  },
  {
    id: 'tm-17',
    teamId: 'team-2',
    personId: 'p-17',
    name: '卫夜5',
    employeeNo: '202601105',
    campName: 'Niamey 营地',
    deptName: '行政办公室',
    phone: '+227 789 0456',
    status: '启用',
    joinedAt: '2026-01-26 09:10:00',
  },
  {
    id: 'tm-18',
    teamId: 'team-2',
    personId: 'p-18',
    name: '蒋夜6',
    employeeNo: '202601106',
    campName: 'Bravia 营地',
    deptName: '后勤部',
    phone: '+227 890 1567',
    status: '启用',
    joinedAt: '2026-01-26 09:20:00',
  },
  {
    id: 'tm-19',
    teamId: 'team-2',
    personId: 'p-19',
    name: '禹夜7',
    employeeNo: '202601107',
    campName: 'Zinder 营地',
    deptName: '维修中心',
    phone: '+227 901 2678',
    status: '启用',
    joinedAt: '2026-01-27 08:00:00',
  },
  {
    id: 'tm-20',
    teamId: 'team-2',
    personId: 'p-20',
    name: '狄夜8',
    employeeNo: '202601108',
    campName: 'Bravia 营地',
    deptName: '安保部',
    phone: '+227 012 3789',
    status: '启用',
    joinedAt: '2026-01-27 08:10:00',
  },
  {
    id: 'tm-21',
    teamId: 'team-2',
    personId: 'p-21',
    name: '米夜9',
    employeeNo: '202601109',
    campName: 'Diffa 营地',
    deptName: '物资部',
    phone: '+227 123 4890',
    status: '启用',
    joinedAt: '2026-01-27 08:20:00',
  },

  // C班和机动班略（实际使用时会有完整数据）
]

// 根据班组ID获取成员
export function getTeamMembers(teamId: string): TeamMember[] {
  return TEAM_MEMBERS.filter((m) => m.teamId === teamId)
}
