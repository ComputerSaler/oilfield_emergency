<script setup lang="ts">
/**
 * 区域管理 —— 1:1 复刻现有系统 系统管理/基础数据/区域 页
 * 作为视觉基准页（参考页），后续列表页参照此模式
 */
import { computed, ref } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import { REGION_ROWS, RISK_LEVELS, type RegionRow } from '@/mock/regions'

const query = ref({ name: '', risk: undefined as string | undefined, banned: undefined as string | undefined })
const loading = ref(false)
const page = ref({ current: 1, pageSize: 10 })
const modalOpen = ref(false)
const editing = ref<RegionRow | null>(null)
const form = ref({ name: '', risk: undefined as string | undefined, banned: false })

const columns: TableColumnsType = [
  { title: '区域', dataIndex: 'name', key: 'name' },
  { title: '风险等级', dataIndex: 'risk', key: 'risk' },
  { title: '禁止进入', dataIndex: 'banned', key: 'banned' },
  { title: '操作', key: 'action', width: 160 },
]

const filtered = computed(() =>
  REGION_ROWS.filter((r) => {
    if (query.value.name && !r.name.toLowerCase().includes(query.value.name.toLowerCase())) return false
    if (query.value.risk && r.risk !== query.value.risk) return false
    if (query.value.banned && String(r.banned) !== query.value.banned) return false
    return true
  }),
)

const paged = computed(() => {
  const start = (page.value.current - 1) * page.value.pageSize
  return filtered.value.slice(start, start + page.value.pageSize)
})

function onSearch() {
  loading.value = true
  page.value.current = 1
  window.setTimeout(() => (loading.value = false), 300)
}

function onReset() {
  query.value = { name: '', risk: undefined, banned: undefined }
  page.value.current = 1
}

function onCreate() {
  editing.value = null
  form.value = { name: '', risk: undefined, banned: false }
  modalOpen.value = true
}

function onEdit(row: RegionRow) {
  editing.value = row
  form.value = { name: row.name, risk: row.risk ?? undefined, banned: row.banned }
  modalOpen.value = true
}
</script>

<template>
  <PageContainer title="区域">
    <SearchBar :loading="loading" show-create @search="onSearch" @reset="onReset" @create="onCreate">
      <a-form-item label="区域" :colon="false" class="of-field">
        <a-input v-model:value="query.name" placeholder="请输入" style="width: 210px" />
      </a-form-item>
      <a-form-item label="风险等级" :colon="false" class="of-field">
        <a-select
          v-model:value="query.risk"
          placeholder="请选择"
          allow-clear
          style="width: 170px"
          :options="RISK_LEVELS.map((r) => ({ value: r, label: r }))"
        />
      </a-form-item>
      <a-form-item label="禁止进入" :colon="false" class="of-field">
        <a-select
          v-model:value="query.banned"
          placeholder="请选择"
          allow-clear
          style="width: 170px"
          :options="[
            { value: 'true', label: '是' },
            { value: 'false', label: '否' },
          ]"
        />
      </a-form-item>
    </SearchBar>

    <DataTable
      :columns="columns"
      :data-source="paged"
      :loading="loading"
      :total="filtered.length"
      :current="page.current"
      :page-size="page.pageSize"
      @change="(p: number, s: number) => (page = { current: p, pageSize: s })"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'risk'">
          {{ (record as RegionRow).risk ?? '--' }}
        </template>
        <template v-else-if="column.key === 'banned'">
          <!-- 是==#FF6666，否=白色 -->
          <span :class="{ 'of-danger': (record as RegionRow).banned }">
            {{ (record as RegionRow).banned ? '是' : '否' }}
          </span>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" @click="onEdit(record as RegionRow)">编辑</a-button>
        </template>
      </template>
    </DataTable>

    <FormModal
      v-model:open="modalOpen"
      :title="editing ? '编辑' : '新增'"
      @ok="modalOpen = false"
    >
      <a-form-item label="名称" required :colon="false">
        <a-input v-model:value="form.name" />
      </a-form-item>
      <a-form-item label="风险等级" required :colon="false">
        <a-select
          v-model:value="form.risk"
          placeholder="请选择"
          :options="RISK_LEVELS.map((r) => ({ value: r, label: r }))"
        />
      </a-form-item>
      <a-form-item label="禁止进入" required :colon="false">
        <a-switch v-model:checked="form.banned" />
      </a-form-item>
    </FormModal>
  </PageContainer>
</template>

<style scoped lang="scss">
// 查询栏内表单项去掉默认下间距（查询栏标准为单行 64px）
.of-field {
  margin-bottom: 0;
}

.of-danger {
  color: var(--of-color-error);
}
</style>
