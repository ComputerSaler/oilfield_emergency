/**
 * 营地与部门 Mock 数据
 * 对应 PRD-人员管理-营地与部门 V1.0
 */

export interface CampNode {
  id: string
  name: string
  leader: string
  contact: string
  remark: string
  hasBoundary: boolean
  status: '启用' | '停用'
  createdAt: string
  updatedAt: string
}

export interface DeptNode {
  id: string
  campId: string
  parentId: string | null
  name: string
  leader: string
  contact: string
  description: string
  status: '启用' | '停用'
  createdAt: string
  updatedAt: string
}

// 5个营地
export const CAMP_NODES: CampNode[] = [
  {
    id: 'camp-1',
    name: 'Bravia 营地',
    leader: '张建国',
    contact: '+227 1234 5678',
    remark: '主生产营地，位于布拉维亚油田核心区',
    hasBoundary: true,
    status: '启用',
    createdAt: '2026-01-15 10:00:00',
    updatedAt: '2026-07-20 14:30:00',
  },
  {
    id: 'camp-2',
    name: 'Niamey 营地',
    leader: '李明华',
    contact: '+227 2345 6789',
    remark: '首都尼亚美办公区',
    hasBoundary: true,
    status: '启用',
    createdAt: '2026-01-15 10:10:00',
    updatedAt: '2026-06-10 09:20:00',
  },
  {
    id: 'camp-3',
    name: 'Agadem 营地',
    leader: '王强',
    contact: '+227 3456 7890',
    remark: '阿加德姆油田作业区',
    hasBoundary: false,
    status: '启用',
    createdAt: '2026-01-15 10:20:00',
    updatedAt: '2026-05-15 16:45:00',
  },
  {
    id: 'camp-4',
    name: 'Diffa 营地',
    leader: '赵军',
    contact: '+227 4567 8901',
    remark: '迪法地区物资中转站',
    hasBoundary: false,
    status: '启用',
    createdAt: '2026-01-15 10:30:00',
    updatedAt: '2026-04-22 11:00:00',
  },
  {
    id: 'camp-5',
    name: 'Zinder 营地',
    leader: '刘建设',
    contact: '+227 5678 9012',
    remark: '津德尔后勤保障基地',
    hasBoundary: true,
    status: '启用',
    createdAt: '2026-01-15 10:40:00',
    updatedAt: '2026-03-18 13:15:00',
  },
]

// 部门（一级+二级）
export const DEPT_NODES: DeptNode[] = [
  // Bravia 营地 - 安保部
  {
    id: 'dept-1-1',
    campId: 'camp-1',
    parentId: null,
    name: '安保部',
    leader: '孙卫东',
    contact: '+227 1234 0001',
    description: '负责营地安全保卫、门禁管理、巡逻值守',
    status: '启用',
    createdAt: '2026-01-16 09:00:00',
    updatedAt: '2026-07-01 10:20:00',
  },
  {
    id: 'dept-1-1-1',
    campId: 'camp-1',
    parentId: 'dept-1-1',
    name: '门禁管理科',
    leader: '周明',
    contact: '+227 1234 0011',
    description: '营地出入口管理、人员车辆登记',
    status: '启用',
    createdAt: '2026-01-16 09:10:00',
    updatedAt: '2026-06-15 14:00:00',
  },
  {
    id: 'dept-1-1-2',
    campId: 'camp-1',
    parentId: 'dept-1-1',
    name: '巡逻队',
    leader: '吴大勇',
    contact: '+227 1234 0012',
    description: '营地巡逻、突发事件处置',
    status: '启用',
    createdAt: '2026-01-16 09:20:00',
    updatedAt: '2026-05-20 11:30:00',
  },
  // Bravia 营地 - 后勤部
  {
    id: 'dept-1-2',
    campId: 'camp-1',
    parentId: null,
    name: '后勤部',
    leader: '郑晓丽',
    contact: '+227 1234 0002',
    description: '餐饮、住宿、物资采购与供应',
    status: '启用',
    createdAt: '2026-01-16 09:30:00',
    updatedAt: '2026-06-20 15:45:00',
  },
  {
    id: 'dept-1-2-1',
    campId: 'camp-1',
    parentId: 'dept-1-2',
    name: '餐饮管理科',
    leader: '冯厨师',
    contact: '+227 1234 0021',
    description: '员工餐厅运营、食品安全管理',
    status: '启用',
    createdAt: '2026-01-16 09:40:00',
    updatedAt: '2026-04-10 09:00:00',
  },
  // Bravia 营地 - 工程部
  {
    id: 'dept-1-3',
    campId: 'camp-1',
    parentId: null,
    name: '工程部',
    leader: '韩工',
    contact: '+227 1234 0003',
    description: '工程建设、设施维护、技术支持',
    status: '启用',
    createdAt: '2026-01-16 10:00:00',
    updatedAt: '2026-07-10 16:30:00',
  },

  // Niamey 营地 - 行政办公室
  {
    id: 'dept-2-1',
    campId: 'camp-2',
    parentId: null,
    name: '行政办公室',
    leader: '曹主任',
    contact: '+227 2345 0001',
    description: '行政事务、文档管理、对外协调',
    status: '启用',
    createdAt: '2026-01-17 09:00:00',
    updatedAt: '2026-06-25 10:00:00',
  },
  {
    id: 'dept-2-2',
    campId: 'camp-2',
    parentId: null,
    name: '财务部',
    leader: '许会计',
    contact: '+227 2345 0002',
    description: '财务核算、资金管理、成本控制',
    status: '启用',
    createdAt: '2026-01-17 09:10:00',
    updatedAt: '2026-05-30 14:20:00',
  },

  // Agadem 营地 - 生产部
  {
    id: 'dept-3-1',
    campId: 'camp-3',
    parentId: null,
    name: '生产部',
    leader: '田经理',
    contact: '+227 3456 0001',
    description: '油田开采作业、生产调度',
    status: '启用',
    createdAt: '2026-01-18 09:00:00',
    updatedAt: '2026-07-05 11:00:00',
  },
  {
    id: 'dept-3-2',
    campId: 'camp-3',
    parentId: null,
    name: 'HSE部',
    leader: '安主管',
    contact: '+227 3456 0002',
    description: '健康安全环保管理、风险防控',
    status: '启用',
    createdAt: '2026-01-18 09:10:00',
    updatedAt: '2026-06-12 15:30:00',
  },

  // Diffa 营地 - 物资部
  {
    id: 'dept-4-1',
    campId: 'camp-4',
    parentId: null,
    name: '物资部',
    leader: '储主任',
    contact: '+227 4567 0001',
    description: '物资采购、仓储管理、物流调配',
    status: '启用',
    createdAt: '2026-01-19 09:00:00',
    updatedAt: '2026-05-28 13:40:00',
  },

  // Zinder 营地 - 运输队
  {
    id: 'dept-5-1',
    campId: 'camp-5',
    parentId: null,
    name: '运输队',
    leader: '马队长',
    contact: '+227 5678 0001',
    description: '车辆调度、物资运输、司机管理',
    status: '启用',
    createdAt: '2026-01-20 09:00:00',
    updatedAt: '2026-06-18 10:50:00',
  },
  {
    id: 'dept-5-2',
    campId: 'camp-5',
    parentId: null,
    name: '维修中心',
    leader: '罗师傅',
    contact: '+227 5678 0002',
    description: '设备维修、车辆保养、工具管理',
    status: '启用',
    createdAt: '2026-01-20 09:10:00',
    updatedAt: '2026-04-25 12:00:00',
  },
]

// 构建组织树结构（前端用）
export interface OrgTreeNode {
  key: string
  title: string
  type: 'camp' | 'dept1' | 'dept2'
  data: CampNode | DeptNode
  children?: OrgTreeNode[]
}

export function buildOrgTree(includeDisabled = false): OrgTreeNode[] {
  const camps = includeDisabled
    ? CAMP_NODES
    : CAMP_NODES.filter((c) => c.status === '启用')
  const depts = includeDisabled
    ? DEPT_NODES
    : DEPT_NODES.filter((d) => d.status === '启用')

  return camps.map((camp) => {
    // 该营地的一级部门
    const level1Depts = depts.filter((d) => d.campId === camp.id && !d.parentId)

    const children: OrgTreeNode[] = level1Depts.map((dept1) => {
      // 该一级部门的二级部门
      const level2Depts = depts.filter((d) => d.parentId === dept1.id)
      const dept1Children: OrgTreeNode[] = level2Depts.map((dept2) => ({
        key: dept2.id,
        title: dept2.name + (dept2.status === '停用' ? '（已停用）' : ''),
        type: 'dept2',
        data: dept2,
      }))

      return {
        key: dept1.id,
        title: dept1.name + (dept1.status === '停用' ? '（已停用）' : ''),
        type: 'dept1' as const,
        data: dept1,
        children: dept1Children.length ? dept1Children : undefined,
      }
    })

    return {
      key: camp.id,
      title: camp.name + (camp.status === '停用' ? '（已停用）' : ''),
      type: 'camp' as const,
      data: camp,
      children: children.length ? children : undefined,
    }
  })
}
