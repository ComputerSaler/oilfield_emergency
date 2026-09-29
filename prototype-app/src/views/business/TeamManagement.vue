<script setup lang="ts">
/**
 * 班组管理 —— 对应 PRD-人员管理-班组管理 V1.0
 * 架构：主从表（上方班组列表 + 下方成员表格）
 */
import { ref, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import PageContainer from '@/components/PageContainer.vue'
import PanelCard from '@/components/PanelCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import { TEAM_ROWS, getTeamMembers, type TeamRow, type TeamMember } from '@/mock/team'
import { CAMP_NODES, DEPT_NODES } from '@/mock/organization'
import { PERSONNEL_ROWS } from '@/mock/personnel'

// ========== 状态管理 ==========
const query = ref({
  name: '',
  status: '',
})
const showDisabled = ref(false)
const loading = ref(false)
const page = ref({ current: 1, pageSize: 20 })

// 选中的班组
const selectedTeamId = ref<string>('')

// 成员表格
const memberPage = ref({ current: 1, pageSize: 20 })
const selectedMemberKeys = ref<Key[]>([])

// 抽屉状态
const drawerVisible = ref(false)
const drawerMode = ref<'create' | 'edit'>('create')
const drawerLoading = ref(false)

// 人员选择器
const pickerVisible = ref(false)
const pickerLoading = ref(false)
const pickerQuery = ref({
  keyword: '',
  campId: '',
  deptId: '',
})
const pickerPage = ref({ current: 1, pageSize: 20 })
const pickedPersonIds = ref<string[]>([])

// 表单数据
const formData = ref({
  name: '',
  description: '',
})

// ========== 班组列表 ==========
const teamColumns: TableColumnsType = [
  { title: '班组名称', dataIndex: 'name', key: 'name', width: 150, align: 'center' },
  { title: '成员数', dataIndex: 'memberCount', key: 'memberCount', width: 80, align: 'center' },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, align: 'left' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80, align: 'center' },
  { title: '操作', key: 'action', width: 200, fixed: 'right', align: 'center' },
]

const filteredTeams = computed(() => {
  let result = TEAM_ROWS

  if (!showDisabled.value) {
    result = result.filter((t) => t.status === '启用')
  }

  if (query.value.name) {
    result = result.filter((t) => t.name.includes(query.value.name))
  }

  if (query.value.status) {
    result = result.filter((t) => t.status === query.value.status)
  }

  return result
})

const pagedTeams = computed(() => {
  const sorted = [...filteredTeams.value].sort((a, b) => a.sortOrder - b.sortOrder)
  const start = (page.value.current - 1) * page.value.pageSize
  return sorted.slice(start, start + page.value.pageSize)
})

// ========== 成员列表 ==========
const memberColumns: TableColumnsType = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: 120, align: 'center' },
  { title: '工号', dataIndex: 'employeeNo', key: 'employeeNo', width: 120, align: 'center' },
  { title: '所属营地', dataIndex: 'campName', key: 'campName', width: 150, align: 'center' },
  { title: '所属部门', dataIndex: 'deptName', key: 'deptName', width: 180, align: 'center' },
  { title: '联系方式', dataIndex: 'phone', key: 'phone', width: 150, align: 'center' },
  { title: '操作', key: 'action', width: 80, fixed: 'right', align: 'center' },
]

const selectedTeam = computed(() => {
  return TEAM_ROWS.find((t) => t.id === selectedTeamId.value)
})

const members = computed(() => {
  if (!selectedTeamId.value) return []
  return getTeamMembers(selectedTeamId.value)
})

const pagedMembers = computed(() => {
  const start = (memberPage.value.current - 1) * memberPage.value.pageSize
  return members.value.slice(start, start + memberPage.value.pageSize)
})

// ========== 交互处理 ==========
function onReset() {
  query.value = { name: '', status: '' }
  showDisabled.value = false
  page.value.current = 1
}

function onSearch() {
  page.value.current = 1
}

function onSelectTeam(record: TeamRow) {
  if (selectedTeamId.value === record.id) {
    // 取消选中
    selectedTeamId.value = ''
  } else {
    selectedTeamId.value = record.id
    selectedMemberKeys.value = []
    memberPage.value.current = 1
  }
}

// 新增班组
function openCreate() {
  drawerMode.value = 'create'
  formData.value = {
    name: '',
    description: '',
  }
  drawerVisible.value = true
}

// 编辑班组
function openEdit(record: TeamRow) {
  drawerMode.value = 'edit'
  formData.value = {
    name: record.name,
    description: record.description,
  }
  drawerVisible.value = true
}

// 保存
function onSave() {
  drawerLoading.value = true
  setTimeout(() => {
    drawerLoading.value = false
    drawerVisible.value = false
    message.success(drawerMode.value === 'create' ? '新增成功' : '保存成功')
  }, 800)
}

// 停用/启用
function toggleStatus(record: TeamRow) {
  const action = record.status === '启用' ? '停用' : '启用'
  Modal.confirm({
    title: `确认${action}`,
    content: `确认${action}「${record.name}」？`,
    onOk() {
      message.success(`${action}成功`)
    },
  })
}

// 删除班组
function deleteTeam(record: TeamRow) {
  if (record.memberCount > 0) {
    message.error(`该班组下有 ${record.memberCount} 名成员，请先移除全部成员后再删除`)
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确认删除班组「${record.name}」？删除后无法恢复。`,
    okType: 'danger',
    onOk() {
      message.success('删除成功')
      if (selectedTeamId.value === record.id) {
        selectedTeamId.value = ''
      }
    },
  })
}

// 添加成员
function openPicker() {
  if (!selectedTeam.value) {
    message.warning('请先选择一个班组')
    return
  }
  if (selectedTeam.value.status === '停用') {
    message.warning('班组已停用，请先启用后再添加成员')
    return
  }
  pickerQuery.value = { keyword: '', campId: '', deptId: '' }
  pickedPersonIds.value = []
  pickerPage.value.current = 1
  pickerVisible.value = true
}

// 人员选择器候选列表
const candidatePersons = computed(() => {
  let result = PERSONNEL_ROWS.filter((p) => p.status !== '注销')

  if (pickerQuery.value.keyword) {
    const kw = pickerQuery.value.keyword.toLowerCase()
    result = result.filter(
      (p) => p.name.toLowerCase().includes(kw) || p.username.toLowerCase().includes(kw)
    )
  }

  if (pickerQuery.value.campId) {
    result = result.filter((p) => p.camp === CAMP_NODES.find((c) => c.id === pickerQuery.value.campId)?.name)
  }

  if (pickerQuery.value.deptId) {
    result = result.filter((p) => p.deptId === pickerQuery.value.deptId)
  }

  return result
})

const pagedCandidates = computed(() => {
  const start = (pickerPage.value.current - 1) * pickerPage.value.pageSize
  return candidatePersons.value.slice(start, start + pickerPage.value.pageSize)
})

// 已是成员的人员ID集合
const existingMemberIds = computed(() => {
  return new Set(members.value.map((m) => m.personId))
})

// 候选人是否已是成员
function isMember(personId: string) {
  return existingMemberIds.value.has(personId)
}

// 提交添加成员
function submitAddMembers() {
  if (pickedPersonIds.value.length === 0) {
    message.warning('请至少选择一名人员')
    return
  }
  if (pickedPersonIds.value.length > 200) {
    message.error('单次最多添加 200 人，请分批操作')
    return
  }
  pickerLoading.value = true
  setTimeout(() => {
    pickerLoading.value = false
    pickerVisible.value = false
    message.success(`成功添加 ${pickedPersonIds.value.length} 名成员`)
    pickedPersonIds.value = []
  }, 1000)
}

// 移除成员
function removeMember(member: TeamMember) {
  Modal.confirm({
    title: '确认移除',
    content: `确认将「${member.name}」从「${selectedTeam.value?.name}」中移除？`,
    onOk() {
      message.success('移除成功')
    },
  })
}

// 批量移除
function batchRemove() {
  if (selectedMemberKeys.value.length === 0) {
    message.warning('请先勾选要移除的成员')
    return
  }
  Modal.confirm({
    title: '确认批量移除',
    content: `确认将选中的 ${selectedMemberKeys.value.length} 名成员从「${selectedTeam.value?.name}」中移除？`,
    onOk() {
      message.success(`成功移除 ${selectedMemberKeys.value.length} 名成员`)
      selectedMemberKeys.value = []
    },
  })
}

// 清空已选
function clearPicked() {
  if (pickedPersonIds.value.length === 0) return
  Modal.confirm({
    title: '确认清空',
    content: `已选择 ${pickedPersonIds.value.length} 人尚未保存，确认清空？`,
    onOk() {
      pickedPersonIds.value = []
    },
  })
}

// 获取人员详情
function getPersonById(personId: string) {
  return PERSONNEL_ROWS.find((p) => p.id === personId)
}
</script>

<template>
  <PageContainer title="班组管理">
    <div class="of-team">
      <!-- 班组列表区 -->
      <div class="of-team__list-section">
        <!-- 筛选栏 -->
        <SearchBar :loading="loading" show-create @reset="onReset" @search="onSearch" @create="openCreate">
          <a-form-item label="班组名称" :colon="false" class="of-field">
            <a-input
              v-model:value="query.name"
              placeholder="请输入班组名称"
              style="width: 200px"
              allow-clear
            />
          </a-form-item>
          <a-form-item label="状态" :colon="false" class="of-field">
            <a-select v-model:value="query.status" placeholder="全部" style="width: 120px" allow-clear>
              <a-select-option value="">全部</a-select-option>
              <a-select-option value="启用">启用</a-select-option>
              <a-select-option value="停用">停用</a-select-option>
            </a-select>
          </a-form-item>
          <a-checkbox v-model:checked="showDisabled" style="white-space: nowrap;">显示已停用</a-checkbox>
        </SearchBar>

        <!-- 表格 -->
        <PanelCard>
          <a-table
            class="of-table"
            :columns="teamColumns"
            :data-source="pagedTeams"
            :loading="loading"
            :pagination="{
              current: page.current,
              pageSize: page.pageSize,
              total: filteredTeams.length,
              showSizeChanger: false,
            }"
            :row-class-name="(record: TeamRow) => selectedTeamId === record.id ? 'row-selected' : ''"
            row-key="id"
            size="small"
            bordered
            @change="(pagination: any) => { page.current = pagination.current; page.pageSize = pagination.pageSize }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <a @click="onSelectTeam(record as TeamRow)">{{ (record as TeamRow).name }}</a>
              </template>
              <template v-else-if="column.key === 'memberCount'">
                {{ (record as TeamRow).memberCount >= 100 ? '100+' : (record as TeamRow).memberCount }}
              </template>
              <template v-else-if="column.key === 'description'">
                {{ (record as TeamRow).description || '--' }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="(record as TeamRow).status === '启用' ? 'green' : 'gray'">
                  {{ (record as TeamRow).status }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space size="small">
                  <a @click="openEdit(record as TeamRow)">编辑</a>
                  <a v-if="(record as TeamRow).status === '启用'" @click="toggleStatus(record as TeamRow)">停用</a>
                  <a v-else @click="toggleStatus(record as TeamRow)">启用</a>
                  <a
                    v-if="(record as TeamRow).memberCount === 0"
                    style="color: #ff4d4f"
                    @click="deleteTeam(record as TeamRow)"
                  >
                    删除
                  </a>
                </a-space>
              </template>
            </template>
          </a-table>
        </PanelCard>
      </div>

      <!-- 成员区 -->
      <div class="of-team__member-section">
        <PanelCard>
          <div class="of-team__member-header">
            <h3 class="of-team__member-title">
              班组成员
              <span v-if="selectedTeam">
                — {{ selectedTeam.name }}（{{ selectedTeam.memberCount }}人）
              </span>
            </h3>
          </div>

          <!-- 未选中班组 -->
          <a-empty
            v-if="!selectedTeamId"
            description="请从上方选择一个班组查看其成员"
          />

          <!-- 已选中班组 -->
          <div v-else>
            <!-- 操作栏 -->
            <div class="of-team__member-toolbar">
              <a-space>
                <a-button
                  type="primary"
                  @click="openPicker"
                  :disabled="selectedTeam?.status === '停用'"
                >
                  添加成员
                </a-button>
                <a-button
                  danger
                  :disabled="selectedMemberKeys.length === 0"
                  @click="batchRemove"
                >
                  批量移除
                </a-button>
              </a-space>
            </div>

            <!-- 成员表格 -->
            <a-table
              v-if="members.length > 0"
              class="of-table"
              :columns="memberColumns"
              :data-source="pagedMembers"
              :row-selection="{
                selectedRowKeys: selectedMemberKeys,
                onChange: (keys: Key[]) => (selectedMemberKeys = keys),
              }"
              :pagination="{
                current: memberPage.current,
                pageSize: memberPage.pageSize,
                total: members.length,
                showSizeChanger: false,
              }"
              row-key="id"
              size="small"
              bordered
              @change="(pagination: any) => { memberPage.current = pagination.current; memberPage.pageSize = pagination.pageSize }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'name'">
                  {{ (record as TeamMember).name }}
                  <a-tag v-if="(record as TeamMember).status === '注销'" color="gray" size="small">已注销</a-tag>
                </template>
                <template v-else-if="column.key === 'employeeNo'">
                  {{ (record as TeamMember).employeeNo || '--' }}
                </template>
                <template v-else-if="column.key === 'deptName'">
                  {{ (record as TeamMember).deptName || '--' }}
                </template>
                <template v-else-if="column.key === 'phone'">
                  {{ (record as TeamMember).phone || '--' }}
                </template>
                <template v-else-if="column.key === 'action'">
                  <a style="color: #ff4d4f" @click="removeMember(record as TeamMember)">移除</a>
                </template>
              </template>
            </a-table>
            <a-empty v-else description="该班组暂无成员，点击「添加成员」按钮加入人员" />
          </div>
        </PanelCard>
      </div>
    </div>

    <!-- 新增/编辑班组抽屉 -->
    <a-drawer
      :open="drawerVisible"
      :title="drawerMode === 'create' ? '新增班组' : '编辑班组'"
      width="480"
      @close="drawerVisible = false"
    >
      <a-form layout="vertical" :model="formData">
        <a-form-item label="班组名称" required>
          <a-input v-model:value="formData.name" placeholder="请输入班组名称" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入描述"
            :rows="4"
            :maxlength="200"
            show-count
          />
        </a-form-item>
      </a-form>

      <template #footer>
        <a-space>
          <a-button @click="drawerVisible = false">取消</a-button>
          <a-button type="primary" :loading="drawerLoading" @click="onSave">保存</a-button>
        </a-space>
      </template>
    </a-drawer>

    <!-- 人员选择器 -->
    <a-modal
      :open="pickerVisible"
      :title="`添加成员 — ${selectedTeam?.name}`"
      width="900px"
      @cancel="pickerVisible = false"
      @ok="submitAddMembers"
    >
      <!-- 筛选栏 -->
      <div class="picker-filter">
        <a-space wrap>
          <span>姓名/工号：</span>
          <a-input
            v-model:value="pickerQuery.keyword"
            placeholder="请输入"
            style="width: 150px"
            allow-clear
          />
          <span>营地：</span>
          <a-select
            v-model:value="pickerQuery.campId"
            placeholder="全部"
            style="width: 150px"
            allow-clear
          >
            <a-select-option value="">全部</a-select-option>
            <a-select-option
              v-for="camp in CAMP_NODES.filter((c) => c.status === '启用')"
              :key="camp.id"
              :value="camp.id"
            >
              {{ camp.name }}
            </a-select-option>
          </a-select>
          <span>部门：</span>
          <a-select
            v-model:value="pickerQuery.deptId"
            placeholder="全部"
            style="width: 150px"
            allow-clear
          >
            <a-select-option value="">全部</a-select-option>
            <a-select-option
              v-for="dept in DEPT_NODES.filter((d) => d.status === '启用')"
              :key="dept.id"
              :value="dept.id"
            >
              {{ dept.name }}
            </a-select-option>
          </a-select>
          <a-button type="primary" size="small">搜索</a-button>
        </a-space>
      </div>

      <!-- 左右分栏 -->
      <div class="picker-content">
        <!-- 待选人员 -->
        <div class="picker-left">
          <div class="picker-section-title">待选人员</div>
          <div class="picker-list">
            <a-checkbox-group v-model:value="pickedPersonIds" style="width: 100%">
              <div
                v-for="person in pagedCandidates"
                :key="person.id"
                class="picker-item"
                :class="{ disabled: isMember(person.id) }"
              >
                <a-checkbox
                  :value="person.id"
                  :disabled="isMember(person.id)"
                >
                  {{ person.name }} | {{ person.camp }} | {{ person.deptName || '无部门' }}
                </a-checkbox>
                <span v-if="isMember(person.id)" class="member-tag">已是成员</span>
              </div>
            </a-checkbox-group>
          </div>
          <div class="picker-pagination">
            <a-pagination
              v-model:current="pickerPage.current"
              :page-size="pickerPage.pageSize"
              :total="candidatePersons.length"
              :show-size-changer="false"
              size="small"
            />
          </div>
        </div>

        <!-- 已选人员 -->
        <div class="picker-right">
          <div class="picker-section-title">
            已选人员（{{ pickedPersonIds.length }}）
            <a v-if="pickedPersonIds.length > 0" @click="clearPicked">清空全部</a>
          </div>
          <div class="picker-selected">
            <div
              v-for="personId in pickedPersonIds"
              :key="personId"
              class="selected-item"
            >
              {{ getPersonById(personId)?.name }} {{ getPersonById(personId)?.camp }}
              <a @click="pickedPersonIds = pickedPersonIds.filter((id) => id !== personId)">×</a>
            </div>
            <a-empty
              v-if="pickedPersonIds.length === 0"
              description="暂未选择"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <a-space>
          <a-button @click="pickerVisible = false">取消</a-button>
          <a-button
            type="primary"
            :loading="pickerLoading"
            :disabled="pickedPersonIds.length === 0 || pickedPersonIds.length > 200"
            @click="submitAddMembers"
          >
            确定（{{ pickedPersonIds.length }}）
          </a-button>
        </a-space>
      </template>
    </a-modal>
  </PageContainer>
</template>

<style scoped lang="scss">
.of-team {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-4);

  &__list-section {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-4);
  }

  &__member-section {
    flex: 1;
    min-height: 400px;
  }

  &__member-header {
    margin-bottom: var(--of-spacing-4);
  }

  &__member-title {
    margin: 0;
    font-size: var(--of-font-size-lg);
    font-weight: var(--of-font-weight-medium);
  }

  &__member-toolbar {
    margin-bottom: var(--of-spacing-4);
  }
}

:deep(.row-selected) {
  background-color: var(--of-bg-selected);
}

// 筛选栏表单项对齐
.of-field {
  margin-bottom: 0;
}

// 人员选择器样式
.picker-filter {
  margin-bottom: var(--of-spacing-4);
  padding-bottom: var(--of-spacing-4);
  border-bottom: var(--of-border-width) solid var(--of-border-base);
}

.picker-content {
  display: flex;
  gap: var(--of-spacing-4);
  height: 400px;
}

.picker-left,
.picker-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: var(--of-border-width) solid var(--of-border-base);
  border-radius: var(--of-radius-base);
  overflow: hidden;
}

.picker-section-title {
  padding: var(--of-spacing-3) var(--of-spacing-4);
  background: var(--of-bg-muted);
  border-bottom: var(--of-border-width) solid var(--of-border-base);
  font-weight: var(--of-font-weight-medium);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--of-spacing-2);
}

.picker-item {
  padding: var(--of-spacing-2) var(--of-spacing-3);
  border-bottom: var(--of-border-width) solid var(--of-border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;

  &.disabled {
    background: var(--of-bg-muted);
    color: var(--of-text-tertiary);
  }
}

.member-tag {
  font-size: var(--of-font-size-sm);
  color: var(--of-text-tertiary);
}

.picker-pagination {
  padding: var(--of-spacing-3) var(--of-spacing-4);
  border-top: var(--of-border-width) solid var(--of-border-base);
  display: flex;
  justify-content: center;
}

.picker-selected {
  flex: 1;
  overflow-y: auto;
  padding: var(--of-spacing-2);
}

.selected-item {
  padding: var(--of-spacing-2) var(--of-spacing-3);
  background: var(--of-bg-muted);
  border-radius: var(--of-radius-base);
  margin-bottom: var(--of-spacing-2);
  display: flex;
  justify-content: space-between;
  align-items: center;

  a {
    color: var(--of-color-danger);
    font-size: 16px;
    font-weight: bold;
  }
}
</style>
