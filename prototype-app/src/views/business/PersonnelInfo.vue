<script setup lang="ts">
/**
 * 用户信息管理 —— 对应 PRD-人员管理-用户信息 V2.5
 * 架构：标准列表页（筛选栏 + 表格 + 新增/编辑抽屉）
 */
import { computed, ref, reactive } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import { pinyin } from 'pinyin-pro'
import {
  PERSONNEL_ROWS,
  POSITION_OPTIONS,
  CAMP_OPTIONS,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  type PersonnelRow,
} from '@/mock/personnel'

// ========== 状态管理 ==========
const query = ref({
  keyword: '', // 姓名/用户名
  position: '',
  camp: '',
  status: '',
})
const showResigned = ref(false) // 显示注销人员
const showTemp = ref(false) // 显示临时人员
const loading = ref(false)
const page = ref({ current: 1, pageSize: 20 })
const selectedRowKeys = ref<Key[]>([])

// 抽屉状态
const drawerVisible = ref(false)
const drawerMode = ref<'create' | 'edit' | 'detail'>('create')
const drawerLoading = ref(false)

// 表单数据
const formData = reactive<Partial<PersonnelRow>>({
  name: '',
  username: '',
  aiuUsername: '', // AI+U平台用户名
  gender: '未知',
  position: '',
  camp: '',
  phone: '',
  email: '',
  hireDate: '',
  roles: [],
  status: '启用',
  remark: '',
})

// ========== 表格列定义 ==========
const columns: TableColumnsType = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: 120, fixed: 'left', align: 'center' },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 140, align: 'center' },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 120, align: 'center' },
  { title: '所属营地', dataIndex: 'camp', key: 'camp', width: 180, align: 'center' },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140, align: 'center' },
  { title: '角色', dataIndex: 'roles', key: 'roles', width: 180, align: 'center' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100, align: 'center' },
  { title: '操作', key: 'action', width: 200, fixed: 'right', align: 'center' },
]

// ========== 数据过滤 ==========
const filtered = computed(() => {
  let result = PERSONNEL_ROWS

  // 筛选临时人员
  if (!showTemp.value) {
    result = result.filter((r) => !r.isTemp)
  }

  // 筛选注销人员
  if (!showResigned.value) {
    result = result.filter((r) => r.status !== '注销')
  }

  // 关键字筛选（姓名/登录名 OR关系）
  if (query.value.keyword) {
    const kw = query.value.keyword.toLowerCase()
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) ||
        r.username.toLowerCase().includes(kw),
    )
  }

  // 岗位筛选
  if (query.value.position) {
    result = result.filter((r) => r.position === query.value.position)
  }

  // 营地筛选
  if (query.value.camp) {
    result = result.filter((r) => r.camp === query.value.camp)
  }

  // 状态筛选
  if (query.value.status) {
    result = result.filter((r) => r.status === query.value.status)
  }

  return result
})

// 分页数据
const paged = computed(() => {
  // 按创建时间降序排序
  const sorted = [...filtered.value].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const start = (page.value.current - 1) * page.value.pageSize
  return sorted.slice(start, start + page.value.pageSize)
})

// ========== 交互处理 ==========
function onReset() {
  query.value = {
    keyword: '',
    position: '',
    camp: '',
    status: '',
  }
  showResigned.value = false
  showTemp.value = false
  page.value.current = 1
}

function onSearch() {
  page.value.current = 1
}

// 打开新增抽屉
function openCreate() {
  pinyinGenerated = false // 重置拼音生成标记
  drawerMode.value = 'create'
  Object.assign(formData, {
    name: '',
    username: '',
    aiuUsername: '', // AI+U平台用户名
    gender: '未知',
    position: '',
    camp: '',
    phone: '',
    email: '',
    hireDate: '',
    roles: [],
    status: '启用',
    remark: '',
    password: 'auto', // 初始密码选项
  })
  drawerVisible.value = true
}

// 打开编辑抽屉
function openEdit(record: any) {
  if (record.status === '注销') {
    message.warning('注销人员不可编辑，请先复职')
    return
  }
  drawerMode.value = 'edit'
  Object.assign(formData, { ...record })
  drawerVisible.value = true
}

// 打开详情抽屉
function openDetail(record: any) {
  drawerMode.value = 'detail'
  Object.assign(formData, { ...record })
  drawerVisible.value = true
}

// 保存表单
function onSave() {
  drawerLoading.value = true
  setTimeout(() => {
    drawerLoading.value = false
    drawerVisible.value = false
    message.success(drawerMode.value === 'create' ? '创建成功' : '保存成功')
    // 如果是新增，显示初始密码弹窗
    if (drawerMode.value === 'create') {
      Modal.info({
        title: '人员创建成功',
        content: `姓名：${formData.name}\n登录名：${formData.username}\n初始密码：Abc123456\n\n密码仅展示一次，关闭后无法再次查看，请立即转交本人。`,
        okText: '我已知悉',
      })
    }
  }, 800)
}

// 重置密码
function onResetPassword(record: any) {
  Modal.confirm({
    title: '重置密码',
    content: `确认重置 ${record.name} 的密码？`,
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true)
          Modal.info({
            title: '密码已重置',
            content: `姓名：${record.name}\n登录名：${record.username}\n新密码：Abc123456\n\n密码仅展示一次，关闭后无法再次查看，请立即转交本人。`,
            okText: '我已知悉',
          })
        }, 500)
      })
    },
  })
}

// 解锁
function onUnlock(record: any) {
  Modal.confirm({
    title: '解锁账号',
    content: `确认解锁 ${record.name} 的账号？`,
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          message.success('解锁成功')
          resolve(true)
        }, 500)
      })
    },
  })
}

// 注销
function onResign(record: any) {
  Modal.confirm({
    title: '注销账号',
    content: `确认为 ${record.name} 注销账号？注销后账号将永久停用。`,
    okText: '确认注销',
    okType: 'danger',
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          message.success('已注销账号')
          resolve(true)
        }, 500)
      })
    },
  })
}

// 复职
function onRehire(record: any) {
  Modal.confirm({
    title: '复职',
    content: `确认为 ${record.name} 办理复职？复职后账号状态将恢复为启用。`,
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          message.success('复职成功')
          resolve(true)
        }, 500)
      })
    },
  })
}

// 批量操作
function onBatchResetPassword() {
  Modal.confirm({
    title: '批量重置密码',
    content: `确认重置选中的 ${selectedRowKeys.value.length} 人的密码？`,
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          message.success('批量重置成功')
          selectedRowKeys.value = []
          resolve(true)
        }, 500)
      })
    },
  })
}

// 渲染辅助函数
function getPositionLabel(value: string) {
  return POSITION_OPTIONS.find(o => o.value === value)?.label || value
}

function getCampLabel(value: string) {
  return CAMP_OPTIONS.find(o => o.value === value)?.label || value
}

function getRoleLabels(values: string[]) {
  if (!values || values.length === 0) return '--'
  const labels = values.map(v => ROLE_OPTIONS.find(o => o.value === v)?.label || v)
  if (labels.length <= 2) return labels.join('、')
  return `${labels.slice(0, 2).join('、')} 等${labels.length}个`
}

// 生成拼音登录名（PRD §2 规则：汉字→拼音全拼，非汉字保留字母数字，空格与·删除，转小写）
// 示例：张三→zhangsan，John Smith→johnsmith
function generatePinyin(name: string) {
  if (!name) return ''
  // pinyin-pro 将汉字转为无声调拼音，非汉字字符原样透传
  const converted = pinyin(name, { toneType: 'none', separator: '' })
  // 去掉空格、· 及其他非字母数字字符，全部转小写，最多 32 位
  return converted.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32)
}

// 姓名失焦时生成拼音（同时填充到 username 和 aiuUsername）
let pinyinGenerated = false
function onNameBlur() {
  if (drawerMode.value === 'create' && !pinyinGenerated && formData.name) {
    const generated = generatePinyin(formData.name)
    // 如果 username 为空，填充拼音
    if (!formData.username) {
      formData.username = generated
    }
    // 如果 aiuUsername 为空，同步填充拼音
    if (!formData.aiuUsername) {
      formData.aiuUsername = generated
    }
    pinyinGenerated = true
  }
}

// 抽屉关闭时重置
function onDrawerClose() {
  drawerVisible.value = false
  pinyinGenerated = false
}
</script>

<template>
  <PageContainer title="用户信息">
    <PanelCard>
      <!-- 筛选栏 -->
      <SearchBar :loading="loading" show-create @reset="onReset" @search="onSearch" @create="openCreate">
        <a-form-item label="姓名/用户名" :colon="false" class="of-field">
          <a-input
            v-model:value="query.keyword"
            placeholder="请输入"
            style="width: 180px"
            @press-enter="onSearch"
          />
        </a-form-item>
        <a-form-item label="岗位" :colon="false" class="of-field">
          <a-select
            v-model:value="query.position"
            placeholder="全部"
            style="width: 140px"
            :options="[{ label: '全部', value: '' }, ...POSITION_OPTIONS]"
          />
        </a-form-item>
        <a-form-item label="所属营地" :colon="false" class="of-field">
          <a-select
            v-model:value="query.camp"
            placeholder="全部"
            style="width: 140px"
            :options="[{ label: '全部', value: '' }, ...CAMP_OPTIONS]"
          />
        </a-form-item>
        <a-form-item label="状态" :colon="false" class="of-field">
          <a-select
            v-model:value="query.status"
            placeholder="全部"
            style="width: 120px"
            :options="[{ label: '全部', value: '' }, ...STATUS_OPTIONS]"
          />
        </a-form-item>
        <a-form-item :colon="false" class="of-field">
          <a-checkbox v-model:checked="showTemp">显示临时人员</a-checkbox>
        </a-form-item>
        <a-form-item :colon="false" class="of-field">
          <a-checkbox v-model:checked="showResigned">显示注销人员</a-checkbox>
        </a-form-item>
      </SearchBar>

      <!-- 批量操作栏 -->
      <div v-if="selectedRowKeys.length > 0" class="of-personnel__batch">
        <span class="of-personnel__batch-text">已选 {{ selectedRowKeys.length }} 项</span>
        <a-button @click="onBatchResetPassword">批量重置密码</a-button>
        <a-button @click="selectedRowKeys = []">取消选择</a-button>
      </div>

      <!-- 表格 -->
      <a-table
        class="of-table"
        :columns="columns"
        :data-source="paged"
        :loading="loading"
        row-key="id"
        :row-selection="{
          selectedRowKeys,
          onChange: (keys: Key[]) => { selectedRowKeys = keys },
          getCheckboxProps: (record: any) => ({
            disabled: record.status === '注销',
          }),
        }"
        :scroll="{ x: 1300 }"
        :pagination="{
          current: page.current,
          pageSize: page.pageSize,
          total: filtered.length,
          showTotal: (t: number) => `共${t}条`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (p: number, s: number) => { page.current = p; page.pageSize = s },
        }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div style="text-align: center">{{ record.name }}</div>
          </template>

          <template v-if="column.key === 'username'">
            <div style="text-align: center">{{ record.username }}</div>
          </template>

          <template v-if="column.key === 'position'">
            <div style="text-align: center">{{ getPositionLabel(record.position) }}</div>
          </template>

          <template v-if="column.key === 'camp'">
            <div style="text-align: center">{{ getCampLabel(record.camp) }}</div>
          </template>

          <template v-if="column.key === 'phone'">
            <div style="text-align: center">{{ record.phone }}</div>
          </template>

          <template v-if="column.key === 'roles'">
            <div style="text-align: center">
              <span :style="{ color: record.roles.length === 0 ? '#ff9800' : undefined }">
                {{ getRoleLabels(record.roles) }}
              </span>
            </div>
          </template>

          <template v-if="column.key === 'status'">
            <div style="text-align: center">
              <StatusTag
                :tone="
                  record.status === '启用' ? 'ok' :
                  record.status === '锁定' ? 'warn' :
                  'danger'
                "
              >
                {{ record.status }}
              </StatusTag>
            </div>
          </template>

          <template v-if="column.key === 'action'">
            <a-button type="link" @click="openDetail(record)">详情</a-button>
            <a-button
              type="link"
              :disabled="record.status === '注销'"
              @click="openEdit(record)"
            >
              编辑
            </a-button>
            <a-dropdown>
              <a-button type="link">更多</a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item
                    v-if="record.status !== '注销'"
                    @click="onResetPassword(record)"
                  >
                    重置密码
                  </a-menu-item>
                  <a-menu-item
                    v-if="record.status === '锁定'"
                    @click="onUnlock(record)"
                  >
                    解锁
                  </a-menu-item>
                  <a-menu-item
                    v-if="record.status !== '注销'"
                    danger
                    @click="onResign(record)"
                  >
                    注销
                  </a-menu-item>
                  <a-menu-item
                    v-if="record.status === '注销'"
                    @click="onRehire(record)"
                  >
                    复职
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </PanelCard>

    <!-- 新增/编辑/详情抽屉 -->
    <a-drawer
      :open="drawerVisible"
      :title="drawerMode === 'create' ? '新增人员' : drawerMode === 'edit' ? '编辑人员' : '人员详情'"
      :width="640"
      :closable="!drawerLoading"
      :mask-closable="false"
      @close="onDrawerClose"
    >
      <a-form layout="vertical" :disabled="drawerMode === 'detail'">
        <a-divider orientation="left">基本信息</a-divider>

        <a-form-item label="姓名" required>
          <a-input
            v-model:value="formData.name"
            placeholder="请输入姓名"
            :maxlength="32"
            @blur="onNameBlur"
          />
        </a-form-item>

        <a-form-item label="性别">
          <a-radio-group v-model:value="formData.gender">
            <a-radio value="男">男</a-radio>
            <a-radio value="女">女</a-radio>
            <a-radio value="未知">未知</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="岗位" required>
          <a-select
            v-model:value="formData.position"
            placeholder="请选择岗位"
            :options="POSITION_OPTIONS"
          />
        </a-form-item>

        <a-form-item label="所属营地" required>
          <a-select
            v-model:value="formData.camp"
            placeholder="请选择营地"
            :options="CAMP_OPTIONS"
          />
        </a-form-item>

        <a-form-item label="手机号" required>
          <a-input
            v-model:value="formData.phone"
            placeholder="请输入手机号"
            :maxlength="20"
          />
        </a-form-item>

        <a-form-item label="邮箱">
          <a-input
            v-model:value="formData.email"
            placeholder="请输入邮箱"
          />
        </a-form-item>

        <a-form-item label="入职日期">
          <a-date-picker
            v-model:value="formData.hireDate"
            value-format="YYYY-MM-DD"
            placeholder="请选择入职日期"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="备注">
          <a-textarea
            v-model:value="formData.remark"
            placeholder="请输入备注"
            :maxlength="200"
            :rows="3"
            show-count
          />
        </a-form-item>

        <a-divider orientation="left">账号信息</a-divider>

        <a-form-item label="登录名" required>
          <a-input
            v-model:value="formData.username"
            placeholder="请输入登录名（自动从姓名生成拼音）"
            :maxlength="32"
            :disabled="drawerMode === 'edit'"
          />
          <div v-if="drawerMode === 'create'" style="color: #8c8c8c; font-size: 12px; margin-top: 4px">
            失焦姓名字段后自动生成拼音，可手动修改
          </div>
          <div v-else style="color: #8c8c8c; font-size: 12px; margin-top: 4px">
            登录名创建后不可修改
          </div>
        </a-form-item>

        <a-form-item label="AI+U平台用户名">
          <a-input
            v-model:value="formData.aiuUsername"
            placeholder="用于集团AI+U平台单点登录，默认与登录名一致"
          />
          <div style="color: #8c8c8c; font-size: 12px; margin-top: 4px">
            用于集团AI+U平台单点登录，默认与登录名一致。特殊情况下可修改为该用户在AI+U平台的实际用户名。
          </div>
        </a-form-item>

        <a-form-item v-if="drawerMode === 'create'" label="初始密码">
          <a-radio-group v-model:value="formData.password">
            <a-radio value="auto">自动生成（Abc123456）</a-radio>
          </a-radio-group>
          <div style="color: #8c8c8c; font-size: 12px; margin-top: 4px">
            账号创建成功后显示初始密码（仅显示一次）
          </div>
        </a-form-item>

        <a-form-item label="角色" required>
          <a-select
            v-model:value="formData.roles"
            mode="multiple"
            placeholder="请选择角色"
            :options="ROLE_OPTIONS"
            :max-tag-count="2"
          />
          <div style="color: #ff9800; font-size: 12px; margin-top: 4px">
            角色未配置时该人员无法登录平台
          </div>
        </a-form-item>
      </a-form>

      <template v-if="drawerMode !== 'detail'" #footer>
        <div style="text-align: right">
          <a-space>
            <a-button @click="onDrawerClose">取消</a-button>
            <a-button type="primary" :loading="drawerLoading" @click="onSave">保存</a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>
  </PageContainer>
</template>

<style scoped lang="scss">
.of-personnel__batch {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-3);
  padding: var(--of-spacing-3) 0;
  margin-bottom: var(--of-spacing-4);
  border-bottom: var(--of-border-width) solid var(--of-border-base);
}

.of-personnel__batch-text {
  color: var(--of-text-secondary);
  font-size: var(--of-font-size-sm);
}
</style>
