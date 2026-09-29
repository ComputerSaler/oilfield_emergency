/** GPS 终端 mock —— 取自现有系统业务应用页真实终端编号 */
export interface Terminal {
  id: string
  name: string
  time: string
  online: boolean
}

const NAMES = [
  'BVS01-Security',
  'BVS03-Security',
  'BVS08-安保人员',
  'BVS11-安保人员',
  'BVS12-安保人员',
  'BVS13-安保人员',
  'BVS14-安保人员',
  'BVS15-安保人员',
  'BVS16-安保人员',
  'BVS17-安保人员',
  'BVS18-安保人员',
  'BVS19-安保人员',
  'BVS20-安保人员',
  'PS01-巡线员',
  'PS02-巡线员',
  'PS05D4-巡线车',
  'PS06D1-巡线车',
]

export const TERMINALS: Terminal[] = NAMES.map((name, i) => ({
  id: String(i + 1),
  name,
  time: `2026-07-26 05:3${i % 6}:${String(10 + i).padStart(2, '0')}`,
  online: false,
}))
