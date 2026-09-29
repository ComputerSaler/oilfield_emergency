/** 区域 mock 数据 —— 取自现有系统真实列表（29 条，此处保留首页 10 条 + 补足） */
export interface RegionRow {
  id: string
  name: string
  risk: string | null
  banned: boolean
}

export const RISK_LEVELS = ['高2级', '极高2级', '中1级', '低1级'] as const

export const REGION_ROWS: RegionRow[] = [
  { id: '1', name: 'Plateau', risk: '高2级', banned: false },
  { id: '2', name: 'Oueme', risk: '高2级', banned: false },
  { id: '3', name: 'Mono', risk: '高2级', banned: false },
  { id: '4', name: 'Littoral', risk: '高2级', banned: false },
  { id: '5', name: 'Donga', risk: '高2级', banned: false },
  { id: '6', name: 'Maradi', risk: '极高2级', banned: false },
  { id: '7', name: 'Niamey', risk: '极高2级', banned: false },
  { id: '8', name: 'Agadez', risk: '极高2级', banned: false },
  { id: '9', name: 'Zinder', risk: '极高2级', banned: false },
  { id: '10', name: 'Diffa', risk: null, banned: true },
  { id: '11', name: 'Tahoua', risk: '极高2级', banned: false },
  { id: '12', name: 'Dosso', risk: '高2级', banned: false },
  { id: '13', name: 'Tillaberi', risk: '极高2级', banned: true },
  { id: '14', name: 'Borgou', risk: '中1级', banned: false },
  { id: '15', name: 'Collines', risk: '中1级', banned: false },
  { id: '16', name: 'Atacora', risk: '高2级', banned: false },
  { id: '17', name: 'Alibori', risk: '高2级', banned: false },
  { id: '18', name: 'Zou', risk: '低1级', banned: false },
  { id: '19', name: 'Couffo', risk: '低1级', banned: false },
  { id: '20', name: 'Atlantique', risk: '中1级', banned: false },
]
