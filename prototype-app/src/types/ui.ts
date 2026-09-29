/** 跨组件共享类型（供自动引入的组件在 props 上复用） */

/** StatCard 单元项 */
export interface StatItem {
  label: string
  value: number | string
  /** 语义色：默认 ice，告警类用 error */
  tone?: 'ice' | 'error' | 'link'
}

/** a-table #bodyCell 插槽入参 */
export interface BodyCellSlot {
  column: { key?: string | number; dataIndex?: string }
  record: Record<string, unknown>
  index: number
  text: unknown
}
