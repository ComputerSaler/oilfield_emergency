<script setup lang="ts">
/**
 * 用户管理 —— 复刻现有系统 系统管理/权限/用户 页
 * 结构差异：左侧部门树(340px) + 右侧查询栏 + 表格，双栏全流式
 */
import { computed, ref } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import { DEPT_TREE, USER_ROWS, type UserRow } from '@/mock/users'

const query = ref({ user: '', email: '' })
const loading = ref(false)
const page = ref({ current: 1, pageSize: 10 })
const expandedKeys = ref<string[]>(['WAPCO'])
const selectedDept = ref<string[]>([])

const columns: TableColumnsType = [
  { title: '用户', dataIndex: 'user', key: 'user' },
  { title: '部门', dataIndex: 'dept', key: 'dept' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '电话', dataIndex: 'phone', key: 'phone' },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '操作', key: 'action', width: 200 },
]

const filtered = computed(() =>
  USER_ROWS.filter((r) => {
    if (query.value.user && !r.user.includes(query.value.user)) return false
    if (query.value.email && !r.email.includes(query.value.email)) return false
    if (selectedDept.value.length && r.dept !== selectedDept.value[0]) return false
    return true
  }),
)

const paged = computed(() => {
  const start = (page.value.current - 1) * page.value.pageSize
  return filtered.value.slice(start, start + page.value.pageSize)
})

function onReset() {
  query.value = { user: '', email: '' }
  selectedDept.value = []
  page.value.current = 1
}
</script>

<template>
  <PageContainer title="用户">
    <div class="of-user">
      <PanelCard class="of-user__tree">
        <div class="of-user__tree-head">
          <span>菜单</span>
          <a-button type="link" size="small" @click="expandedKeys = ['WAPCO']">展开所有</a-button>
          <a-button type="link" size="small" @click="expandedKeys = []">收起所有</a-button>
        </div>
        <a-tree
          v-model:expanded-keys="expandedKeys"
          v-model:selected-keys="selectedDept"
          :tree-data="DEPT_TREE"
        />
      </PanelCard>

      <div class="of-user__main">
        <SearchBar :loading="loading" show-create @reset="onReset">
          <a-form-item label="用户" :colon="false" class="of-field">
            <a-input v-model:value="query.user" placeholder="请输入" style="width: 180px" />
          </a-form-item>
          <a-form-item label="邮箱" :colon="false" class="of-field">
            <a-input v-model:value="query.email" placeholder="请输入" style="width: 180px" />
          </a-form-item>
        </SearchBar>

        <DataTable
          :columns="columns"
          :data-source="paged"
          :loading="loading"
          :total="filtered.length"
          :current="page.current"
          :page-size="page.pageSize"
          :scroll-x="1100"
          @change="(p: number, s: number) => (page = { current: p, pageSize: s })"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'remark'">
              {{ (record as UserRow).remark || '--' }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link">详情</a-button>
              <a-button type="link">编辑</a-button>
              <a-button type="link">删除</a-button>
            </template>
          </template>
        </DataTable>
      </div>
    </div>
  </PageContainer>
</template>

<style scoped lang="scss">
.of-user {
  display: flex;
  gap: var(--of-spacing-4);
  align-items: flex-start;

  // 树栏定宽，主区吃满剩余（全流式）
  &__tree {
    flex: 0 0 340px;
    min-height: 600px;
  }

  &__tree-head {
    display: flex;
    gap: var(--of-spacing-2);
    align-items: center;
    margin-bottom: var(--of-spacing-4);
  }

  &__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--of-spacing-4);
    min-width: 0;
  }
}

.of-field {
  margin-bottom: 0;
}
</style>
