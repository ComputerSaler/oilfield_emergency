/** 用户 / 部门 mock —— 结构取自现有系统 系统管理/权限/用户 页 */
import type { TreeProps } from 'ant-design-vue'

export interface UserRow {
  id: string
  user: string
  dept: string
  email: string
  phone: string
  remark: string
}

export const DEPT_TREE: TreeProps['treeData'] = [
  {
    title: 'WAPCO',
    key: 'WAPCO',
    children: [
      { title: 'WAPCO-Niger', key: 'WAPCO-Niger' },
      { title: 'WAPCO-Benin', key: 'WAPCO-Benin' },
    ],
  },
]

export const USER_ROWS: UserRow[] = [
  { id: '1', user: 'liuxingfu@wapconb.com', dept: 'WAPCO', email: 'liuxingfu@wapconb.com', phone: '13987654321', remark: '' },
  { id: '2', user: 'wangpengfei@wapconb.com', dept: 'WAPCO', email: 'wangpengfei@wapconb.com', phone: '17762626262', remark: '' },
  { id: '3', user: 'zhangzhe@wapconb.com', dept: 'WAPCO', email: 'zhangzhe@wapconb.com', phone: '13800000002', remark: '' },
  { id: '4', user: 'nirier', dept: 'WAPCO-Niger', email: 'nirier@test.com', phone: '00000000001', remark: '' },
  { id: '5', user: 'zhaodongyang@wapconb.com', dept: 'WAPCO', email: 'zhaodongyang@wapconb.com', phone: '13900000000', remark: '' },
  { id: '6', user: 'beining', dept: 'WAPCO-Benin', email: 'beining@123.com', phone: '12587651245', remark: 'beining 测试账号' },
  { id: '7', user: 'zhangdongjie@wapconb.com', dept: 'WAPCO', email: 'zhangdongjie@wapconb.com', phone: '13900000002', remark: '' },
  { id: '8', user: 'wanjingbin@wapconb.com', dept: 'WAPCO', email: 'wanjingbin@wapconb.com', phone: '14587651243', remark: 'wanjingbin@wapconb.com' },
  { id: '9', user: 'zhangjiang@wapconb.com', dept: 'WAPCO', email: 'zhangjiang@wapconb.com', phone: '145876512471', remark: 'zhangjiang@wapconb.com' },
  { id: '10', user: 'lisi@wapconb.com', dept: 'WAPCO-Niger', email: 'lisi@wapconb.com', phone: '13500000010', remark: '' },
  { id: '11', user: 'wangwu@wapconb.com', dept: 'WAPCO-Benin', email: 'wangwu@wapconb.com', phone: '13500000011', remark: '' },
]
