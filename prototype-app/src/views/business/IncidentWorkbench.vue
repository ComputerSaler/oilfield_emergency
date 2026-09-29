<script setup lang="ts">
/**
 * 事件工作台 —— 对应 PRD-事件管理-工作台 V1.0
 * 架构：列表页（PageContainer + PanelCard）→ 点击进入详情页（IncidentDetail）
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ExclamationCircleOutlined,
  FilterOutlined,
  PlusOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import PanelCard from '@/components/PanelCard.vue'
import {
  INCIDENT_RECORDS,
  getLevelDeadlineInfo,
  getTasksForIncident,
  getTaskSummary,
  getPendingProposal,
  STATUS_LABEL,
  LEVEL_COLOR,
  STATUS_COLOR,
  CAMP_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  ONGOING_STATUSES,
  TERMINAL_STATUSES,
  type IncidentRecord,
} from '@/mock/incidentWorkbench'

const router = useRouter()

// ==================== Tab 定义 ====================

type TabKey = 'all' | 'pending_level' | 'active' | 'ended'

const activeTab = ref<TabKey>('all')

// ==================== 筛选状态 ====================

const query = ref({
  keyword: '',
  camp: [] as string[],
  type: [] as string[],
  level: [] as string[],
  status: [] as string[],
  urgency: '' as 'urgent' | 'normal' | '',
  dateRange: null as null | [any, any],
})

// ==================== KPI 计算 ====================

const kpiCounts = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  const pendingLevel = INCIDENT_RECORDS.filter(r => r.status === 'pending_level').length
  const active = INCIDENT_RECORDS.filter(r =>
    ONGOING_STATUSES.includes(r.status)
  ).length
  const todayNew = INCIDENT_RECORDS.filter(r =>
    new Date(r.created_at).getTime() >= todayMs
  ).length
  const todayClosed = INCIDENT_RECORDS.filter(r =>
    ['closed', 'cancelled'].includes(r.status) &&
    new Date(r.updated_at).getTime() >= todayMs
  ).length
  const overdue = INCIDENT_RECORDS.filter(r =>
    getLevelDeadlineInfo(r).overdue
  ).length

  return { pendingLevel, active, todayNew, todayClosed, overdue }
})

// ==================== Tab 计数 ====================

const tabCounts = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  return {
    all: INCIDENT_RECORDS.length,
    pending_level: INCIDENT_RECORDS.filter(r => r.status === 'pending_level').length,
    active: INCIDENT_RECORDS.filter(r =>
      ONGOING_STATUSES.includes(r.status)
    ).length,
    ended: INCIDENT_RECORDS.filter(r => {
      if (!TERMINAL_STATUSES.includes(r.status)) return false
      return new Date(r.updated_at).getTime() >= todayMs
    }).length,
  }
})

// ==================== 过滤 + 排序 ====================

const filtered = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  let list = INCIDENT_RECORDS.filter(r => {
    switch (activeTab.value) {
      case 'pending_level': return r.status === 'pending_level'
      case 'active': return ONGOING_STATUSES.includes(r.status)
      case 'ended':
        if (!TERMINAL_STATUSES.includes(r.status)) return false
        if (!query.value.dateRange) return new Date(r.updated_at).getTime() >= todayMs
        return true
      default: return true
    }
  })

  if (query.value.keyword) {
    const kw = query.value.keyword.toLowerCase()
    list = list.filter(r =>
      r.incident_no.toLowerCase().includes(kw) ||
      r.title.toLowerCase().includes(kw) ||
      r.camp_name.toLowerCase().includes(kw)
    )
  }
  if (query.value.camp.length)
    list = list.filter(r => query.value.camp.includes(r.camp_name))
  if (query.value.type.length)
    list = list.filter(r => query.value.type.includes(r.incident_type_code))
  if (query.value.level.length)
    list = list.filter(r => r.level && query.value.level.includes(r.level))
  if (query.value.status.length)
    list = list.filter(r => query.value.status.includes(r.status))
  if (query.value.urgency)
    list = list.filter(r => r.urgency === query.value.urgency)
  if (query.value.dateRange) {
    const [start, end] = query.value.dateRange
    const startMs = start ? (start as any).valueOf() : 0
    const endMs = end ? (end as any).valueOf() + 86400000 : Infinity
    list = list.filter(r => {
      const t = new Date(r.created_at).getTime()
      return t >= startMs && t <= endMs
    })
  }

  // 排序：超时 > 紧急 > 等级高 > 时间新
  return [...list].sort((a, b) => {
    const da = getLevelDeadlineInfo(a)
    const db = getLevelDeadlineInfo(b)
    if (da.overdue !== db.overdue) return da.overdue ? -1 : 1
    if (a.urgency !== b.urgency) return a.urgency === 'urgent' ? -1 : 1
    const levelOrder: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, null: 4 }
    const la = levelOrder[a.level ?? 'null'] ?? 4
    const lb = levelOrder[b.level ?? 'null'] ?? 4
    if (la !== lb) return la - lb
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

// ==================== 辅助函数 ====================

function onReset() {
  query.value = {
    keyword: '', camp: [], type: [], level: [], status: [], urgency: '', dateRange: null,
  }
}

function onDetail(record: IncidentRecord) {
  router.push({ name: 'IncidentDetail', params: { id: record.incident_id } })
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

// ==================== 新建事件弹窗 ====================

const showCreateModal = ref(false)
const createForm = ref({
  title: '',
  incident_type_code: '',
  urgency: 'normal' as 'urgent' | 'normal',
  camp_name: '',
  description: '',
})

function openCreateModal() {
  createForm.value = { title: '', incident_type_code: '', urgency: 'normal', camp_name: '', description: '' }
  showCreateModal.value = true
}
function onCreateSubmit() {
  showCreateModal.value = false
}
</script>

<template>
  <PageContainer title="事件工作台">

    <!-- ═══ KPI 统计条 ══════════════════════════════════════════════ -->
    <div class="iw-kpi-bar">
      <div class="kpi-item" :class="{ 'kpi-warn': kpiCounts.pendingLevel > 0 }">
        <div class="kpi-value">{{ kpiCounts.pendingLevel }}</div>
        <div class="kpi-label">待评级</div>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item">
        <div class="kpi-value kpi-primary">{{ kpiCounts.active }}</div>
        <div class="kpi-label">进行中</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value">{{ kpiCounts.todayNew }}</div>
        <div class="kpi-label">今日新增</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value kpi-muted">{{ kpiCounts.todayClosed }}</div>
        <div class="kpi-label">今日关闭</div>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item" :class="{ 'kpi-danger': kpiCounts.overdue > 0 }">
        <div class="kpi-value">{{ kpiCounts.overdue }}</div>
        <div class="kpi-label">评级超时</div>
      </div>
    </div>

    <!-- ═══ 筛选栏 ═══════════════════════════════════════════════════ -->
    <PanelCard padding="12px 16px">
      <div class="iw-filter-row">
        <a-input
          v-model:value="query.keyword"
          placeholder="搜索编号 / 标题 / 营地"
          allow-clear size="small" style="width: 200px"
        >
          <template #prefix><FilterOutlined style="color: var(--of-text-tertiary)" /></template>
        </a-input>

        <a-select
          v-model:value="query.camp" placeholder="营地" size="small"
          style="width: 130px" mode="multiple" :max-tag-count="1" allow-clear
        >
          <a-select-option v-for="c in CAMP_OPTIONS" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>

        <a-select
          v-model:value="query.type" placeholder="事件类型" size="small"
          style="width: 130px" mode="multiple" :max-tag-count="1" allow-clear
        >
          <a-select-option v-for="t in INCIDENT_TYPE_OPTIONS" :key="t.value" :value="t.value">
            {{ t.label }}
          </a-select-option>
        </a-select>

        <a-select
          v-model:value="query.level" placeholder="等级" size="small"
          style="width: 120px" mode="multiple" :max-tag-count="2" allow-clear
        >
          <a-select-option value="I">Ⅰ级</a-select-option>
          <a-select-option value="II">Ⅱ级</a-select-option>
          <a-select-option value="III">Ⅲ级</a-select-option>
          <a-select-option value="IV">Ⅳ级</a-select-option>
        </a-select>

        <a-select
          v-model:value="query.status" placeholder="状态" size="small"
          style="width: 130px" mode="multiple" :max-tag-count="1" allow-clear
        >
          <a-select-option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">
            {{ label }}
          </a-select-option>
        </a-select>

        <a-select v-model:value="query.urgency" placeholder="紧急程度" size="small"
          style="width: 110px" allow-clear>
          <a-select-option value="urgent">🔴 紧急</a-select-option>
          <a-select-option value="normal">⚪ 一般</a-select-option>
        </a-select>

        <a-range-picker
          v-model:value="(query.dateRange as any)" size="small"
          style="width: 220px" :placeholder="['开始日期', '结束日期']" allow-clear
        />

        <div class="filter-actions">
          <a-button size="small" @click="onReset">
            <template #icon><ReloadOutlined /></template>重置
          </a-button>
          <a-button type="primary" size="small" style="margin-left: 8px" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>新建事件
          </a-button>
          <a-button size="small" style="margin-left: 8px">
            <template #icon><DownloadOutlined /></template>导出
          </a-button>
        </div>
      </div>
    </PanelCard>

    <!-- ═══ Tab + 列表 ════════════════════════════════════════════════ -->
    <PanelCard>
      <div class="iw-tabs">
        <div
          v-for="tab in [
            { key: 'all',           label: '全部',       count: tabCounts.all },
            { key: 'pending_level', label: '待评级',     count: tabCounts.pending_level },
            { key: 'active',        label: '进行中',     count: tabCounts.active },
            { key: 'ended',         label: '今日已结束', count: tabCounts.ended },
          ]"
          :key="tab.key"
          class="iw-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key as TabKey"
        >
          {{ tab.label }}
          <span
            class="tab-badge"
            :class="{
              'badge-warn': tab.key === 'pending_level' && tab.count > 0,
              'badge-primary': tab.key === 'active' && tab.count > 0,
            }"
          >{{ tab.count }}</span>
        </div>
      </div>

      <!-- 列表头 -->
      <div class="iw-list-header">
        <span class="col-level">等级</span>
        <span class="col-info">事件信息</span>
        <span class="col-type">类型</span>
        <span class="col-camp">营地</span>
        <span class="col-status">状态</span>
        <span class="col-task">处置任务</span>
        <span class="col-deadline">评级时限</span>
        <span class="col-action">操作</span>
      </div>

      <!-- 列表体 -->
      <div class="iw-list-body">
        <template v-if="filtered.length === 0">
          <div class="iw-empty">
            <ExclamationCircleOutlined style="font-size: 32px; color: var(--of-text-tertiary)" />
            <div style="margin-top: 8px; color: var(--of-text-tertiary)">暂无事件记录</div>
          </div>
        </template>

        <div
          v-for="record in filtered"
          :key="record.incident_id"
          class="iw-row"
          :class="{
            'row-urgent': record.urgency === 'urgent',
            'row-overdue': getLevelDeadlineInfo(record).overdue,
            'row-ended': TERMINAL_STATUSES.includes(record.status),
          }"
          @click="onDetail(record)"
        >
          <!-- 等级色块 -->
          <span class="col-level">
            <span
              class="level-badge"
              :style="{ background: record.level ? LEVEL_COLOR[record.level] : 'var(--of-text-quaternary)' }"
            >
              {{ record.level ? `Ⅰ Ⅱ Ⅲ Ⅳ`.split(' ')[['I','II','III','IV'].indexOf(record.level)] : '?' }}
            </span>
          </span>

          <!-- 事件信息（三行） -->
          <span class="col-info">
            <div class="info-row1">
              <span class="incident-no">{{ record.incident_no }}</span>
              <span class="incident-title">{{ record.title }}</span>
              <span
                class="urgency-dot"
                :class="record.urgency === 'urgent' ? 'dot-urgent' : 'dot-normal'"
                :title="record.urgency === 'urgent' ? '紧急' : '一般'"
              />
            </div>
            <div class="info-row2">
              <span class="info-meta">
                {{ record.camp_name }}营地
              </span>
              <span class="info-sep">·</span>
              <span class="info-meta">
                <template v-if="record.source === 'alert_escalation' && record.source_alert_nos.length > 0">
                  来自预警 {{ record.source_alert_nos[0] }}
                  <span v-if="record.source_alert_nos.length > 1" class="more-alerts">
                    +{{ record.source_alert_nos.length - 1 }}
                  </span>
                </template>
                <template v-else>手工录入</template>
              </span>
              <span class="info-sep">·</span>
              <span class="info-time" :title="record.created_at">{{ relativeTime(record.created_at) }}</span>
            </div>
          </span>

          <!-- 类型 -->
          <span class="col-type">
            <span class="type-tag">{{ record.incident_type_name }}</span>
          </span>

          <!-- 营地 -->
          <span class="col-camp">{{ record.camp_name }}</span>

          <!-- 状态 -->
          <span class="col-status">
            <span
              class="status-tag"
              :style="{ color: STATUS_COLOR[record.status], borderColor: STATUS_COLOR[record.status] }"
            >
              {{ STATUS_LABEL[record.status] }}
            </span>
            <template v-if="getPendingProposal(record)">
              <br />
              <span class="emergency-badge">待审批</span>
            </template>
          </span>

          <!-- 处置任务摘要 -->
          <span class="col-task">
            <span v-if="getTasksForIncident(record.incident_id).length > 0" class="task-summary">
              {{ getTaskSummary(record.incident_id) }}
            </span>
            <span v-else class="task-none">—</span>
          </span>

          <!-- 评级时限 -->
          <span class="col-deadline">
            <template v-if="record.status === 'pending_level'">
              <span
                class="deadline-tag"
                :class="getLevelDeadlineInfo(record).overdue ? 'deadline-overdue' : 'deadline-ok'"
              >
                <ClockCircleOutlined />
                {{ getLevelDeadlineInfo(record).label }}
              </span>
            </template>
            <span v-else class="task-none">—</span>
          </span>

          <!-- 操作 -->
          <span class="col-action" @click.stop>
            <a class="action-link" @click="onDetail(record)">查看详情 →</a>
          </span>
        </div>
      </div>
    </PanelCard>

    <!-- ═══ 新建事件弹窗 ═════════════════════════════════════════════ -->
    <a-modal
      v-model:open="showCreateModal"
      title="新建事件"
      :width="560"
      ok-text="创建事件"
      cancel-text="取消"
      @ok="onCreateSubmit"
    >
      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="事件标题" required>
          <a-input v-model:value="createForm.title" placeholder="请输入事件标题" />
        </a-form-item>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
          <a-form-item label="事件类型" required>
            <a-select v-model:value="createForm.incident_type_code" placeholder="请选择">
              <a-select-option v-for="t in INCIDENT_TYPE_OPTIONS" :key="t.value" :value="t.value">
                {{ t.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="紧急程度" required>
            <a-select v-model:value="createForm.urgency">
              <a-select-option value="urgent">紧急</a-select-option>
              <a-select-option value="normal">一般</a-select-option>
            </a-select>
          </a-form-item>
        </div>
        <a-form-item label="发生营地" required>
          <a-select v-model:value="createForm.camp_name" placeholder="请选择营地">
            <a-select-option v-for="c in CAMP_OPTIONS" :key="c" :value="c">{{ c }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="事件描述">
          <a-textarea
            v-model:value="createForm.description"
            placeholder="描述事件经过、发现时间、现场情况等"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

  </PageContainer>
</template>

<style scoped lang="scss">
// ── KPI 统计条 ──────────────────────────────────────────────────────
.iw-kpi-bar {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-2);
  padding: var(--of-spacing-3) var(--of-spacing-4);
  background: var(--of-bg-card);
  margin-bottom: var(--of-spacing-4);

  .kpi-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 72px;
    padding: var(--of-spacing-2) var(--of-spacing-3);
    border-radius: var(--of-radius-base);
    transition: background var(--of-transition-base);

    &.kpi-warn {
      background: rgba(250, 173, 20, 0.12);
      .kpi-value { color: #faad14; }
    }
    &.kpi-danger {
      background: rgba(255, 77, 79, 0.12);
      .kpi-value { color: var(--of-color-error); }
    }
  }

  .kpi-value {
    font-size: var(--of-font-size-stat);
    font-weight: var(--of-font-weight-bold);
    line-height: var(--of-line-height-stat);
    color: var(--of-text-primary);
    font-variant-numeric: tabular-nums;

    &.kpi-primary { color: var(--of-color-primary); }
    &.kpi-muted { color: var(--of-text-tertiary); }
  }

  .kpi-label {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-tertiary);
    line-height: var(--of-line-height-xs);
    margin-top: 2px;
  }

  .kpi-divider {
    width: 1px;
    height: 36px;
    background: var(--of-border-table);
    margin: 0 var(--of-spacing-2);
  }
}

// ── 筛选栏 ────────────────────────────────────────────────────────
.iw-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--of-spacing-2);

  .filter-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
  }
}

// ── Tab 导航 ──────────────────────────────────────────────────────
.iw-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--of-border-table);
  margin-bottom: 0;

  .iw-tab {
    padding: 10px 20px;
    font-size: var(--of-font-size-base);
    color: var(--of-text-tab-inactive);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color var(--of-transition-base), border-color var(--of-transition-base);
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover { color: var(--of-text-primary); }
    &.active {
      color: var(--of-color-accent-cyan);
      border-bottom-color: var(--of-color-accent-cyan);
    }

    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      background: rgba(255, 255, 255, 0.1);
      color: var(--of-text-tertiary);

      &.badge-warn { background: rgba(250, 173, 20, 0.25); color: #faad14; }
      &.badge-primary { background: rgba(20, 129, 166, 0.25); color: var(--of-color-primary); }
    }
  }
}

// ── 列表头 ────────────────────────────────────────────────────────
.iw-list-header {
  display: grid;
  grid-template-columns: 48px 1fr 100px 80px 110px 160px 110px 90px;
  padding: 0 var(--of-spacing-4);
  height: var(--of-table-head-height);
  align-items: center;
  background: var(--of-bg-table-head);
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
  font-weight: var(--of-font-weight-medium);
  letter-spacing: 0.02em;

  span { padding: 0 var(--of-spacing-1); }
}

// ── 列表体 ────────────────────────────────────────────────────────
.iw-list-body {
  .iw-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 0;
  }
}

.iw-row {
  display: grid;
  grid-template-columns: 48px 1fr 100px 80px 110px 160px 110px 90px;
  padding: var(--of-spacing-3) var(--of-spacing-4);
  align-items: center;
  border-bottom: 1px solid var(--of-border-table);
  cursor: pointer;
  transition: background var(--of-transition-base);

  &:hover { background: var(--of-bg-row-hover); }
  &:last-child { border-bottom: none; }

  &.row-overdue {
    border-left: 2px solid var(--of-color-error);
  }
  &.row-urgent:not(.row-overdue) {
    border-left: 2px solid #fa8c16;
  }
  &.row-ended {
    opacity: 0.65;
  }

  > span {
    padding: 0 var(--of-spacing-1);
    font-size: var(--of-font-size-base);
    color: var(--of-text-primary);
  }
}

// 等级色块
.level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: var(--of-font-weight-bold);
  color: #fff;
}

// 事件信息列
.col-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.info-row1 {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-2);
  white-space: nowrap;
  overflow: hidden;

  .incident-no {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-tertiary);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .incident-title {
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .urgency-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    &.dot-urgent { background: var(--of-color-error); }
    &.dot-normal { background: var(--of-text-quaternary); }
  }
}

.info-row2 {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--of-font-size-xs);

  .info-meta { color: var(--of-text-tertiary); }
  .info-sep { color: var(--of-border-table); }
  .info-time { color: var(--of-text-quaternary); }

  .more-alerts {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    height: 14px;
    border-radius: 7px;
    background: rgba(20, 129, 166, 0.2);
    color: var(--of-color-primary);
    font-size: 10px;
    margin-left: 2px;
  }
}

// 类型标签
.type-tag {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
}

// 状态标签
.status-tag {
  font-size: var(--of-font-size-xs);
  border: 1px solid;
  padding: 1px 7px;
  border-radius: 3px;
  white-space: nowrap;
}

.emergency-badge {
  font-size: 10px;
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.12);
  border: 1px solid rgba(255, 77, 79, 0.3);
  padding: 1px 5px;
  border-radius: 3px;
  margin-top: 3px;
  display: inline-block;
}

// 处置任务摘要
.task-summary {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
  line-height: 18px;
}
.task-none { color: var(--of-text-quaternary); }

// 评级时限
.deadline-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--of-font-size-xs);
  padding: 2px 7px;
  border-radius: 3px;

  &.deadline-overdue {
    background: rgba(255, 77, 79, 0.12);
    color: var(--of-color-error);
  }
  &.deadline-ok {
    background: rgba(250, 173, 20, 0.1);
    color: #faad14;
  }
}

// 操作列
.action-link {
  font-size: var(--of-font-size-xs);
  color: var(--of-color-link);
  white-space: nowrap;
  &:hover { color: var(--of-color-link-hover); }
}

// ── 列对齐 ────────────────────────────────────────────────────────
.col-level   { display: flex; align-items: center; justify-content: center; }
.col-camp    { color: var(--of-text-secondary) !important; font-size: var(--of-font-size-xs) !important; }
.col-action  { display: flex; align-items: center; }
</style>
