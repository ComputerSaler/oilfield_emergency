<script setup lang="ts">
/**
 * 数据表格 —— 规格：表头 55px/#223647、行高 65px、单元格 padding 16px 居中
 * 行分割线 #1B3640、行 hover #24333C、分页右下角
 * 全流式自适应：宽度 100%，列过多时横向滚动而非压缩
 */
import type { TableColumnsType } from 'ant-design-vue'

withDefaults(
  defineProps<{
    columns: TableColumnsType
    dataSource: unknown[]
    loading?: boolean
    total?: number
    current?: number
    pageSize?: number
    rowKey?: string
    scrollX?: number | string
    rowSelection?: any // 行选择配置
  }>(),
  { rowKey: 'id', current: 1, pageSize: 10, total: 0 },
)

const emit = defineEmits<{ change: [page: number, size: number] }>()
</script>

<template>
  <PanelCard>
    <a-table
      class="of-table"
      :columns="columns"
      :data-source="dataSource as Record<string, unknown>[]"
      :loading="loading"
      :row-key="rowKey"
      :row-selection="rowSelection"
      :scroll="scrollX ? { x: scrollX } : undefined"
      :pagination="{
        current,
        pageSize,
        total,
        showTotal: (t: number) => `共${t}条`,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        onChange: (p: number, s: number) => emit('change', p, s),
      }"
    >
      <template #bodyCell="slotProps">
        <slot name="bodyCell" v-bind="slotProps" />
      </template>
    </a-table>
  </PanelCard>
</template>

<style scoped lang="scss">
.of-table {
  :deep(.ant-table-thead > tr > th) {
    height: var(--of-table-head-height);
    padding: 16px !important;
    background: var(--of-bg-table-head);
    border-bottom: var(--of-border-width) solid var(--of-border-table);
    text-align: center !important;
    vertical-align: middle;
  }

  :deep(.ant-table-tbody > tr > td) {
    height: var(--of-table-row-height);
    padding: 16px !important;
    text-align: center !important;
    vertical-align: middle;
    border-bottom: var(--of-border-width) solid var(--of-border-table);
  }

  // 行 hover 规格 #24333C（--of-bg-row-hover）已移至 global.scss 统一处理。
  // 原因：global.scss 的 .ant-table-cell { background: transparent !important }
  // 会盖过此处不带 !important 的规则，导致 hover 只在同为 !important 的固定列上生效。
  // antd-vue 4.2.6 不读 rowHoverBg token（那是 React 版的名字），它按 colorFillAlter
  // 叠加 colorBgContainer 推导出 #212B33，与设计稿有偏差，故仍需我们自己给精确值。

  // 操作列链接色规格 #57C4F7
  :deep(.ant-btn-link) {
    padding: var(--of-spacing-1) var(--of-spacing-2);
  }
}
</style>
