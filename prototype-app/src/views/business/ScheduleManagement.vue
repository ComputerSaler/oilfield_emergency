<script setup lang="ts">
/**
 * 排班管理 —— 对应 PRD-人员管理-排班管理 V1.0
 * 架构：三 Tab 结构（排班计划 + 值班记录 + 当前值班）
 */
import { ref, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { TableColumnsType } from 'ant-design-vue'
import { SCHEDULE_ROWS, CAMP_OPTIONS, type ScheduleRow } from '@/mock/schedule'
import { PERSONNEL_ROWS } from '@/mock/personnel'

// ========== 状态管理 ==========
const activeTab = ref('plan') // plan | history | current
const viewMode = ref<'calendar' | 'table'>('calendar') // 排班计划视图模式
const loading = ref(false)

// 日期范围选择（日历视图：按月翻页）
const currentMonth = ref(dayjs())

// 筛选条件
const query = ref({
  dateRange: undefined as any, // a-range-picker with value-format returns string[]
  userId: '',
  campId: '',
})

// 抽屉状态
const drawerVisible = ref(false)
const drawerMode = ref<'create' | 'edit'>('create')
const drawerLoading = ref(false)

// 表单数据
const formData = ref({
  dateRange: undefined as any, // 起止时间（可以是同一天）
  userIds: [] as string[], // 值班人员（多选）
  campIds: [] as string[], // 负责营地（多选）
  dutyResponsibility: '', // 值班职责（文本域）
})

// 分页
const page = ref({ current: 1, pageSize: 20 })

// ========== 计算属性 ==========
// 当前显示的日期范围（日历视图固定为当前月份）
const displayDateRange = computed(() => {
  return [
    currentMonth.value.startOf('month').format('YYYY-MM-DD'),
    currentMonth.value.endOf('month').format('YYYY-MM-DD')
  ]
})

// 过滤后的排班数据
const filteredSchedules = computed(() => {
  let result = SCHEDULE_ROWS

  // 排班计划 Tab：只显示今天及未来
  if (activeTab.value === 'plan') {
    const today = dayjs().format('YYYY-MM-DD')
    result = result.filter(r => r.scheduleDate >= today)

    // 日历视图：按当前月份过滤
    if (viewMode.value === 'calendar') {
      const [start, end] = displayDateRange.value
      result = result.filter(r => r.scheduleDate >= start && r.scheduleDate <= end)
    }
  }

  // 值班记录 Tab：只显示历史
  if (activeTab.value === 'history') {
    const today = dayjs().format('YYYY-MM-DD')
    result = result.filter(r => r.scheduleDate < today)
  }

  // 筛选条件（值班记录 Tab）
  if (activeTab.value === 'history') {
    if (query.value.dateRange && query.value.dateRange.length === 2) {
      const [start, end] = query.value.dateRange
      result = result.filter(r => r.scheduleDate >= start && r.scheduleDate <= end)
    }
    if (query.value.userId) {
      result = result.filter(r => r.userId === query.value.userId)
    }
    if (query.value.campId) {
      result = result.filter(r => r.campIds.includes(query.value.campId))
    }
  }

  return result
})

// 当前值班数据
const currentSchedules = computed(() => {
  const ranges: Record<string, [string, string]> = {
    today: [dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
    week: [dayjs().startOf('week').format('YYYY-MM-DD'), dayjs().endOf('week').format('YYYY-MM-DD')],
    nextWeek: [
      dayjs().add(1, 'week').startOf('week').format('YYYY-MM-DD'),
      dayjs().add(1, 'week').endOf('week').format('YYYY-MM-DD'),
    ],
  }
  const [start, end] = ranges[currentTimeRange.value] || ranges.today
  return SCHEDULE_ROWS.filter(r => r.scheduleDate >= start && r.scheduleDate <= end)
})

const currentTimeRange = ref<'today' | 'week' | 'nextWeek'>('today')

// 分页数据
const pagedSchedules = computed(() => {
  const start = (page.value.current - 1) * page.value.pageSize
  return filteredSchedules.value.slice(start, start + page.value.pageSize)
})

// ========== 交互处理 ==========
function onTabChange(key: string) {
  activeTab.value = key
  page.value.current = 1
}

function onReset() {
  query.value = { dateRange: undefined, userId: '', campId: '' }
  page.value.current = 1
}

function onSearch() {
  page.value.current = 1
}

// 打开新增抽屉
function openCreate(date?: string) {
  drawerMode.value = 'create'
  formData.value = {
    dateRange: date ? [date, date] : undefined,
    userIds: [],
    campIds: [],
    dutyResponsibility: '',
  }
  drawerVisible.value = true
}

// 日历格子「+N 更多」完整名单弹层（同一时刻只开一个）
const morePopoverDate = ref<string | null>(null)

function onMorePersonClick(record: ScheduleRow) {
  morePopoverDate.value = null
  openEdit(record)
}

// 月份切换
function prevMonth() {
  currentMonth.value = currentMonth.value.subtract(1, 'month')
}

function nextMonth() {
  currentMonth.value = currentMonth.value.add(1, 'month')
}

// 打开编辑抽屉
function openEdit(record: ScheduleRow) {
  drawerMode.value = 'edit'
  formData.value = {
    dateRange: [record.scheduleDate, record.scheduleDate],
    userIds: [record.userId],
    campIds: [...record.campIds],
    dutyResponsibility: record.dutyResponsibility,
  }
  drawerVisible.value = true
}

// 保存排班
function onSave() {
  drawerLoading.value = true
  setTimeout(() => {
    drawerLoading.value = false
    drawerVisible.value = false
    message.success(drawerMode.value === 'edit' ? '保存成功' : '添加成功')
  }, 500)
}

// 删除排班
function onDelete(record: ScheduleRow) {
  Modal.confirm({
    title: '删除排班',
    content: `确认删除 ${record.userName} 在 ${record.scheduleDate} 的排班记录？`,
    onOk: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          message.success('删除成功')
          resolve(true)
        }, 500)
      })
    },
  })
}

// 导出
function onExport() {
  message.success('导出成功')
}

// 表格列定义
const columns: TableColumnsType = [
  { title: '日期', dataIndex: 'scheduleDate', key: 'scheduleDate', width: 120, align: 'center' },
  { title: '值班人员', dataIndex: 'userName', key: 'userName', width: 120, align: 'center' },
  { title: '负责营地', dataIndex: 'campIds', key: 'campIds', width: 200, align: 'center' },
  { title: '值班职责', dataIndex: 'dutyResponsibility', key: 'dutyResponsibility', width: 200, align: 'center' },
  { title: '联系方式', dataIndex: 'phone', key: 'phone', width: 140, align: 'center' },
  { title: '操作', key: 'action', width: 160, fixed: 'right', align: 'center' },
]

const historyColumns: TableColumnsType = [
  { title: '日期', dataIndex: 'scheduleDate', key: 'scheduleDate', width: 120, align: 'center' },
  { title: '值班人员', dataIndex: 'userName', key: 'userName', width: 120, align: 'center' },
  { title: '负责营地', dataIndex: 'campIds', key: 'campIds', width: 200, align: 'center' },
  { title: '值班职责', dataIndex: 'dutyResponsibility', key: 'dutyResponsibility', width: 200, align: 'center' },
  { title: '联系方式', dataIndex: 'phone', key: 'phone', width: 140, align: 'center' },
]

// 人员选项
const personnelOptions = computed(() => {
  return PERSONNEL_ROWS
    .filter(p => p.status !== '注销')
    .map(p => ({ label: p.name, value: p.id }))
})

// 生成日历数据（月历）
const calendarData = computed(() => {
  const startDate = currentMonth.value.startOf('month')
  const endDate = currentMonth.value.endOf('month')

  const weeks: Array<Array<{date: string, inMonth: boolean, schedules: ScheduleRow[]}>> = []
  let current = startDate.startOf('week')
  const monthEnd = endDate.endOf('week')

  while (current.isBefore(monthEnd) || current.isSame(monthEnd, 'day')) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const dateStr = current.format('YYYY-MM-DD')
      const inMonth = current.month() === startDate.month()
      const schedules = filteredSchedules.value.filter(s => s.scheduleDate === dateStr)
      week.push({ date: dateStr, inMonth, schedules })
      current = current.add(1, 'day')
    }
    weeks.push(week)
  }

  return weeks
})

// 格式化日期，带中文星期
function formatDateWithWeekday(dateStr: string) {
  const d = dayjs(dateStr)
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${d.format('YYYY-MM-DD')} ${weekdays[d.day()]}`
}
</script>

<template>
  <PageContainer title="排班管理">
    <PanelCard>
      <a-tabs v-model:activeKey="activeTab" @change="(key: any) => onTabChange(key)">
        <!-- 排班计划 Tab -->
        <a-tab-pane key="plan" tab="排班计划">
          <!-- 顶部操作栏 -->
          <div class="of-schedule__toolbar">
            <a-radio-group v-model:value="viewMode" button-style="solid">
              <a-radio-button value="calendar">日历视图</a-radio-button>
              <a-radio-button value="table">表格视图</a-radio-button>
            </a-radio-group>

            <div style="flex: 1"></div>

            <a-button type="primary" @click="openCreate()">新增排班</a-button>
          </div>

          <!-- 日历视图 -->
          <div v-if="viewMode === 'calendar'" class="of-schedule__calendar">
            <div class="of-schedule__calendar-header">
              <a-button @click="prevMonth">&lt; 上月</a-button>
              <span class="of-schedule__calendar-title">{{ currentMonth.format('YYYY 年 M 月') }}</span>
              <a-button @click="nextMonth">下月 &gt;</a-button>
            </div>
            <div class="of-schedule__calendar-weekdays">
              <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="of-schedule__weekday">
                {{ day }}
              </div>
            </div>
            <div class="of-schedule__calendar-body">
              <div v-for="(week, wIdx) in calendarData" :key="wIdx" class="of-schedule__week">
                <div
                  v-for="(cell, dIdx) in week"
                  :key="dIdx"
                  class="of-schedule__day"
                  :class="{ 'of-schedule__day--out': !cell.inMonth }"
                  @click="openCreate(cell.date)"
                >
                  <div class="of-schedule__day-num">{{ dayjs(cell.date).date() }}</div>
                  <div class="of-schedule__day-schedules">
                    <template v-if="cell.schedules.length === 0">
                      <span class="of-schedule__empty">未排班</span>
                    </template>
                    <template v-else-if="cell.schedules.length <= 3">
                      <a-tooltip
                        v-for="s in cell.schedules"
                        :key="s.id"
                        :title="s.userStatus === '注销' ? `${s.userName}已注销，建议调整排班` : ''"
                      >
                        <div
                          class="of-schedule__person"
                          :class="{ 'of-schedule__person--resigned': s.userStatus === '注销' }"
                          @click.stop="openEdit(s)"
                        >
                          {{ s.userName }}
                        </div>
                      </a-tooltip>
                    </template>
                    <template v-else>
                      <a-tooltip
                        v-for="s in cell.schedules.slice(0, 2)"
                        :key="s.id"
                        :title="s.userStatus === '注销' ? `${s.userName}已注销，建议调整排班` : ''"
                      >
                        <div
                          class="of-schedule__person"
                          :class="{ 'of-schedule__person--resigned': s.userStatus === '注销' }"
                          @click.stop="openEdit(s)"
                        >
                          {{ s.userName }}
                        </div>
                      </a-tooltip>
                      <a-popover
                        trigger="click"
                        placement="rightTop"
                        :open="morePopoverDate === cell.date"
                        @openChange="(v: boolean) => (morePopoverDate = v ? cell.date : null)"
                      >
                        <template #title>
                          <span class="of-schedule__more-title">
                            {{ dayjs(cell.date).format('M 月 D 日') }} 值班人员（{{ cell.schedules.length }}）
                          </span>
                        </template>
                        <template #content>
                          <div class="of-schedule__more-list">
                            <a-tooltip
                              v-for="s in cell.schedules"
                              :key="s.id"
                              :title="s.userStatus === '注销' ? `${s.userName}已注销，建议调整排班` : ''"
                            >
                              <div
                                class="of-schedule__person"
                                :class="{ 'of-schedule__person--resigned': s.userStatus === '注销' }"
                                @click.stop="onMorePersonClick(s)"
                              >
                                {{ s.userName }}
                              </div>
                            </a-tooltip>
                          </div>
                        </template>
                        <div class="of-schedule__more" @click.stop>+{{ cell.schedules.length - 2 }} 更多</div>
                      </a-popover>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 表格视图 -->
          <a-table
            v-else
            class="of-table"
            :columns="columns"
            :data-source="pagedSchedules"
            :loading="loading"
            row-key="id"
            :scroll="{ x: 900 }"
            :pagination="{
              current: page.current,
              pageSize: page.pageSize,
              total: filteredSchedules.length,
              showTotal: (t: number) => `共${t}条`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              onChange: (p: number, s: number) => { page.current = p; page.pageSize = s },
            }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'userName'">
                <span :style="{ color: (record as ScheduleRow).userStatus === '注销' ? '#ff4d4f' : undefined }">
                  {{ (record as ScheduleRow).userName }}
                  <a-tag v-if="(record as ScheduleRow).userStatus === '注销'" color="error" style="margin-left: 4px">已注销</a-tag>
                </span>
              </template>
              <template v-else-if="column.key === 'campIds'">
                <template v-if="(record as ScheduleRow).campIds.length > 0">
                  <a-tag v-for="campId in (record as ScheduleRow).campIds" :key="campId" style="margin: 2px;">
                    {{ CAMP_OPTIONS.find(c => c.value === campId)?.label || campId }}
                  </a-tag>
                </template>
                <span v-else style="color: var(--of-text-quaternary)">-</span>
              </template>
              <template v-else-if="column.key === 'dutyResponsibility'">
                <a-tooltip v-if="(record as ScheduleRow).dutyResponsibility" :title="(record as ScheduleRow).dutyResponsibility">
                  <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ (record as ScheduleRow).dutyResponsibility }}
                  </div>
                </a-tooltip>
                <span v-else style="color: var(--of-text-quaternary)">-</span>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button type="link" @click="openEdit(record as ScheduleRow)">编辑</a-button>
                <a-button type="link" danger @click="onDelete(record as ScheduleRow)">删除</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 值班记录 Tab（隐藏但保留代码） -->
        <a-tab-pane key="history" tab="值班记录" v-if="false">
          <SearchBar :loading="loading" @reset="onReset" @search="onSearch">
            <a-form-item label="日期范围" :colon="false" class="of-field">
              <a-range-picker
                v-model:value="query.dateRange"
                value-format="YYYY-MM-DD"
                :placeholder="['开始日期', '结束日期']"
                style="width: 240px"
              />
            </a-form-item>
            <a-form-item label="人员" :colon="false" class="of-field">
              <a-select
                v-model:value="query.userId"
                placeholder="全部"
                style="width: 160px"
                :options="[{ label: '全部', value: '' }, ...personnelOptions]"
                show-search
                :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
              />
            </a-form-item>
            <a-form-item label="营地" :colon="false" class="of-field">
              <a-select
                v-model:value="query.campId"
                placeholder="全部"
                style="width: 160px"
                :options="[{ label: '全部', value: '' }, ...CAMP_OPTIONS]"
              />
            </a-form-item>
          </SearchBar>

          <div style="margin-bottom: 16px; text-align: right">
            <a-button type="primary" @click="onExport">导出 Excel</a-button>
          </div>

          <PanelCard>
            <a-table
              class="of-table"
              :columns="historyColumns"
              :data-source="pagedSchedules"
              :loading="loading"
              row-key="id"
              :scroll="{ x: 900 }"
              :pagination="{
                current: page.current,
                pageSize: page.pageSize,
                total: filteredSchedules.length,
                showTotal: (t: number) => `共${t}条`,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                onChange: (p: number, s: number) => { page.current = p; page.pageSize = s },
              }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'campIds'">
                  <template v-if="(record as ScheduleRow).campIds.length > 0">
                    <a-tag v-for="campId in (record as ScheduleRow).campIds" :key="campId" style="margin: 2px;">
                      {{ CAMP_OPTIONS.find(c => c.value === campId)?.label || campId }}
                    </a-tag>
                  </template>
                  <span v-else style="color: var(--of-text-quaternary)">-</span>
                </template>
                <template v-else-if="column.key === 'dutyResponsibility'">
                  <a-tooltip v-if="(record as ScheduleRow).dutyResponsibility" :title="(record as ScheduleRow).dutyResponsibility">
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {{ (record as ScheduleRow).dutyResponsibility }}
                    </div>
                  </a-tooltip>
                  <span v-else style="color: var(--of-text-quaternary)">-</span>
                </template>
              </template>
            </a-table>
          </PanelCard>
        </a-tab-pane>

        <!-- 当前值班 Tab -->
        <a-tab-pane key="current" tab="当前值班">
          <div class="of-schedule__current-toolbar">
            <a-radio-group v-model:value="currentTimeRange" button-style="solid">
              <a-radio-button value="today">今天</a-radio-button>
              <a-radio-button value="week">本周</a-radio-button>
              <a-radio-button value="nextWeek">下周</a-radio-button>
            </a-radio-group>
          </div>

          <div class="of-schedule__current-list">
            <template v-if="currentSchedules.length === 0">
              <a-empty description="该时间段无值班安排" />
            </template>
            <template v-else>
              <div
                v-for="date in [...new Set(currentSchedules.map(s => s.scheduleDate))].sort()"
                :key="date"
                class="of-schedule__current-group"
              >
                <div class="of-schedule__current-date">
                  {{ formatDateWithWeekday(date) }}
                  <template v-if="date === dayjs().format('YYYY-MM-DD')">（今天）</template>
                </div>
                <div class="of-schedule__current-cards">
                  <div
                    v-for="schedule in currentSchedules.filter(s => s.scheduleDate === date)"
                    :key="schedule.id"
                    class="of-schedule__current-card"
                  >
                    <div class="of-schedule__current-name">{{ schedule.userName }}</div>
                    <div class="of-schedule__current-info">
                      <template v-if="schedule.campIds.length > 0">
                        <span style="margin-right: 8px;">负责营地：</span>
                        <a-tag v-for="campId in schedule.campIds" :key="campId" style="margin: 2px;" size="small">
                          {{ CAMP_OPTIONS.find(c => c.value === campId)?.label || campId }}
                        </a-tag>
                      </template>
                      <span v-else style="color: var(--of-text-quaternary)">未设置负责营地</span>
                    </div>
                    <div class="of-schedule__current-info">
                      <span v-if="schedule.dutyResponsibility">职责：{{ schedule.dutyResponsibility }}</span>
                      <span v-else style="color: var(--of-text-quaternary)">未设置职责</span>
                    </div>
                    <div class="of-schedule__current-phone">联系方式：{{ schedule.phone }}</div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </a-tab-pane>
      </a-tabs>
    </PanelCard>

    <!-- 新增/编辑抽屉 -->
    <a-drawer
      :open="drawerVisible"
      :title="drawerMode === 'create' ? '新增排班' : '编辑排班'"
      :width="640"
      :closable="!drawerLoading"
      :mask-closable="false"
      @close="drawerVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="起止时间" required>
          <a-range-picker
            v-model:value="formData.dateRange"
            value-format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
            style="width: 100%"
          />
          <template #extra>
            <span style="color: #666; font-size: 12px;">
              可选择同一天（单日排班）或多天（批量排班）
            </span>
          </template>
        </a-form-item>

        <a-form-item label="值班人员" required>
          <a-select
            v-model:value="formData.userIds"
            mode="multiple"
            placeholder="请选择人员（可多选）"
            :options="personnelOptions"
            show-search
            :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
          />
          <template #extra>
            <span style="color: #666; font-size: 12px;">
              将为每个选中的人员在起止时间内的每一天创建排班记录
            </span>
          </template>
        </a-form-item>

        <a-form-item label="负责营地" required>
          <a-select
            v-model:value="formData.campIds"
            mode="multiple"
            placeholder="请选择营地（可多选）"
            :options="CAMP_OPTIONS"
          />
          <template #extra>
            <span style="color: #666; font-size: 12px;">
              值班人员负责的营地范围
            </span>
          </template>
        </a-form-item>

        <a-form-item label="值班职责">
          <a-textarea
            v-model:value="formData.dutyResponsibility"
            placeholder="请输入值班职责（可选）"
            :rows="4"
            :maxlength="500"
            show-count
          />
          <template #extra>
            <span style="color: #666; font-size: 12px;">
              例如：负责营地安全巡查，监控门禁系统运行
            </span>
          </template>
        </a-form-item>
      </a-form>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <a-button @click="drawerVisible = false" :disabled="drawerLoading">取消</a-button>
          <a-button type="primary" :loading="drawerLoading" @click="onSave">保存</a-button>
        </div>
      </template>
    </a-drawer>
  </PageContainer>
</template>

<style scoped lang="scss">
.of-schedule {
  &__toolbar {
    display: flex;
    gap: var(--of-spacing-3);
    align-items: center;
    margin-bottom: var(--of-spacing-4);
  }

  // 日历视图
  &__calendar {
    background: var(--of-bg-card);
    border-radius: var(--of-radius-none);
    padding: var(--of-spacing-4);
  }

  &__calendar-header {
    display: flex;
    gap: var(--of-spacing-3);
    align-items: center;
    justify-content: center;
    margin-bottom: var(--of-spacing-4);
  }

  &__calendar-title {
    font-size: var(--of-font-size-lg);
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-primary);
    min-width: 140px;
    text-align: center;
  }

  &__calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--of-border-table);
    margin-bottom: 1px;
  }

  &__weekday {
    background: var(--of-bg-table-head);
    padding: var(--of-spacing-2);
    text-align: center;
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-secondary);
  }

  &__calendar-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--of-border-table);
  }

  &__week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--of-border-table);
  }

  &__day {
    background: var(--of-bg-card);
    min-height: 100px;
    padding: var(--of-spacing-2);
    cursor: pointer;
    transition: background var(--of-transition-base);

    &:hover {
      background: var(--of-bg-row-hover);
    }

    &--out {
      opacity: 0.3;
    }
  }

  &__day-num {
    font-size: var(--of-font-size-base);
    color: var(--of-text-primary);
    margin-bottom: var(--of-spacing-1);
  }

  &__day-schedules {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__empty {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
  }

  &__person {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-primary);
    padding: 2px 6px;
    background: rgba(109, 210, 232, 0.12);
    border-radius: var(--of-radius-sm);
    cursor: pointer;

    &:hover {
      background: rgba(109, 210, 232, 0.22);
    }

    &--resigned {
      color: var(--of-color-error);
      text-decoration: line-through;
    }
  }

  &__more {
    font-size: var(--of-font-size-xs);
    color: var(--of-color-link);
    padding: 2px 6px;
    cursor: pointer;

    &:hover {
      color: var(--of-color-link-hover);
    }
  }

  &__more-title {
    font-size: var(--of-font-size-sm);
  }

  &__more-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 160px;
    max-height: 280px;
    overflow-y: auto;
  }

  // 当前值班
  &__current-toolbar {
    margin-bottom: var(--of-spacing-4);
  }

  &__current-list {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-5);
  }

  &__current-group {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-3);
  }

  &__current-date {
    font-size: var(--of-font-size-lg);
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-primary);
    padding-bottom: var(--of-spacing-2);
    border-bottom: 1px solid var(--of-border-table);
  }

  &__current-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--of-spacing-3);
  }

  &__current-card {
    background: var(--of-bg-card);
    padding: var(--of-spacing-4);
    border-radius: var(--of-radius-base);
    border: 1px solid var(--of-border-table);
  }

  &__current-name {
    font-size: var(--of-font-size-base);
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-primary);
    margin-bottom: var(--of-spacing-2);
  }

  &__current-info {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-secondary);
    margin-bottom: var(--of-spacing-1);
  }

  &__current-phone {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-tertiary);
  }
}

.of-field {
  margin-bottom: 0;
}
</style>

