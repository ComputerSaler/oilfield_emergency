<script setup lang="ts">
/**
 * 预警工作台 —— 对应 PRD-预警管理-预警工作台 V1.0
 * 架构：列表页（PageContainer + PanelCard）→ 点击进入研判页（AlertInvestigation）
 * 两级结构：本页负责筛选/列表/Tab切换，研判页为独立路由
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  WarningOutlined,
  FilterOutlined,
  PlusOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PaperClipOutlined,
} from '@ant-design/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import PanelCard from '@/components/PanelCard.vue'
import {
  ALERT_RECORDS,
  getDeadlineInfo,
  SOURCE_LABEL,
  STATUS_LABEL,
  type AlertRecord,
  type AlertStatus,
  type AlertUrgency,
} from '@/mock/alertWorkbench'

const router = useRouter()

// ==================== 筛选状态 ====================

const activeTab = ref<'pending' | 'pending_verify' | 'pending_decision' | 'tracking' | 'ended'>('pending')

const query = ref({
  keyword: '',
  camp: [] as string[],
  source: [] as string[],
  categoryPaths: [] as string[][],   // cascader：[[大类], [大类, type_code]]
  urgency: undefined as AlertUrgency | undefined,   // 必须是 undefined，空字符串会让 placeholder 不显示
  dateRange: null as null | [any, any],
  endStatus: [] as string[],
  overdueOnly: false,
})

// ==================== 数据计算 ====================

/** Tab 计数 */
const tabCounts = computed(() => {
  const pending = ALERT_RECORDS.filter(r =>
    ['pending_verify', 'pending_decision'].includes(r.status) ||
    (r.status === 'tracking' && getDeadlineInfo(r).overdue)
  ).length
  const verify = ALERT_RECORDS.filter(r => r.status === 'pending_verify').length
  const decision = ALERT_RECORDS.filter(r => r.status === 'pending_decision').length
  const tracking = ALERT_RECORDS.filter(r => r.status === 'tracking').length
  const ended = ALERT_RECORDS.filter(r =>
    ['false_alarm', 'merged', 'resolved', 'escalated'].includes(r.status)
  ).length
  return { pending, verify, decision, tracking, ended }
})

/** 判断已结束预警在处理时是否已超时 */
function wasOverdue(record: AlertRecord): boolean {
  if (record.status === 'false_alarm' && record.verification_at) {
    const deadline = new Date(record.created_at).getTime() + record.verify_deadline_min * 60 * 1000
    return new Date(record.verification_at).getTime() > deadline
  }
  if (['resolved', 'escalated', 'merged'].includes(record.status) && record.decision_at && record.verification_at) {
    const deadline = new Date(record.verification_at).getTime() + record.decision_deadline_min * 60 * 1000
    return new Date(record.decision_at).getTime() > deadline
  }
  return false
}

/** 按 Tab 和筛选条件过滤 */
const filtered = computed(() => {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()

  let list = ALERT_RECORDS.filter(r => {
    switch (activeTab.value) {
      case 'pending':
        return ['pending_verify', 'pending_decision'].includes(r.status) ||
          (r.status === 'tracking' && getDeadlineInfo(r).overdue)
      case 'pending_verify': return r.status === 'pending_verify'
      case 'pending_decision': return r.status === 'pending_decision'
      case 'tracking': return r.status === 'tracking'
      case 'ended': {
        if (!['false_alarm', 'merged', 'resolved', 'escalated'].includes(r.status)) return false
        // 未设置时间范围时默认只显示近 7 天
        if (!query.value.dateRange) {
          return now - new Date(r.created_at).getTime() <= SEVEN_DAYS_MS
        }
        return true
      }
      default: return true
    }
  })

  if (query.value.keyword) {
    const kw = query.value.keyword.toLowerCase()
    list = list.filter(r =>
      r.alert_no.toLowerCase().includes(kw) ||
      r.alert_name.toLowerCase().includes(kw) ||
      r.camp_name.toLowerCase().includes(kw)
    )
  }
  if (query.value.camp.length)
    list = list.filter(r => query.value.camp.includes(r.camp_name))
  if (query.value.source.length)
    list = list.filter(r => query.value.source.includes(r.source_type))
  if (query.value.categoryPaths.length) {
    list = list.filter(r =>
      query.value.categoryPaths.some(path =>
        path.length === 1
          ? r.alert_category === path[0]
          : r.alert_category === path[0] && r.alert_type_code === path[1]
      )
    )
  }
  if (query.value.urgency) list = list.filter(r => r.urgency === query.value.urgency)
  if (query.value.dateRange) {
    const [start, end] = query.value.dateRange
    const startMs = start ? (start as any).valueOf() : 0
    const endMs = end ? (end as any).valueOf() + 86400000 : Infinity
    list = list.filter(r => {
      const t = new Date(r.created_at).getTime()
      return t >= startMs && t <= endMs
    })
  }
  if (activeTab.value === 'ended') {
    if (query.value.endStatus.length)
      list = list.filter(r => query.value.endStatus.includes(r.status))
    if (query.value.overdueOnly)
      list = list.filter(r => wasOverdue(r))
  }

  // 持续跟踪中 Tab：复核到期 → 跟踪时长降序（created_at 越早跟踪越久）
  if (activeTab.value === 'tracking') {
    return [...list].sort((a, b) => {
      const da = getDeadlineInfo(a)
      const db = getDeadlineInfo(b)
      if (da.overdue !== db.overdue) return da.overdue ? -1 : 1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }

  // 其余 Tab：紧急 > 超时 > 有关联 > 时间倒序
  return [...list].sort((a, b) => {
    const da = getDeadlineInfo(a)
    const db = getDeadlineInfo(b)
    if (a.urgency !== b.urgency) return a.urgency === 'urgent' ? -1 : 1
    if (da.overdue !== db.overdue) return da.overdue ? -1 : 1
    if (a.related_alert_ids.length !== b.related_alert_ids.length)
      return b.related_alert_ids.length - a.related_alert_ids.length
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

// ==================== 辅助 ====================

function onReset() {
  query.value = {
    keyword: '',
    camp: [],
    source: [],
    categoryPaths: [],
    urgency: undefined,
    dateRange: null,
    endStatus: [],
    overdueOnly: false,
  }
}

function onInvestigate(record: AlertRecord) {
  router.push({ name: 'AlertInvestigation', params: { id: record.alert_id } })
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

const CAMP_OPTIONS = ['Jaouro', 'Koulele', 'Dibeilla', 'Goumeri', 'Sokor']

// 类型级联数据（一级大类 → 二级具体类型）
const CATEGORY_CASCADER = [
  {
    value: '入侵', label: '入侵',
    children: [
      { value: 'area_intrusion', label: '区域入侵' },
      { value: 'fence_breach', label: '越界侦测' },
      { value: 'perimeter_loiter', label: '周界徘徊' },
    ],
  },
  {
    value: '无人机威胁', label: '无人机威胁',
    children: [
      { value: 'uav_intrusion', label: '无人机入侵' },
      { value: 'uav_recon', label: '无人机侦察' },
    ],
  },
  {
    value: '设备告警', label: '设备告警',
    children: [
      { value: 'device_offline', label: '设备离线' },
    ],
  },
  { value: '人员求助', label: '人员求助', children: [] },
  { value: '车辆异常', label: '车辆异常', children: [] },
  { value: '自然灾害', label: '自然灾害', children: [] },
  {
    value: '治安事件', label: '治安事件',
    children: [
      { value: 'suspicious_person', label: '可疑人员' },
    ],
  },
]

// 状态颜色映射
const statusColor: Record<AlertStatus, string> = {
  pending_verify: 'var(--of-color-primary)',
  pending_decision: '#faad14',
  tracking: '#9b7cff',
  false_alarm: 'var(--of-text-tertiary)',
  merged: 'var(--of-text-tertiary)',
  resolved: 'var(--of-color-success)',
  escalated: 'var(--of-color-error)',
}

// ==================== 代录预警弹窗 ====================

const showCreateModal = ref(false)
const createForm = ref({
  alert_name: '',
  alert_category: '',
  alert_type_code: '',
  urgency: 'normal' as AlertUrgency,
  camp_name: '',
  info_source: '',
})

function openCreateModal() {
  createForm.value = {
    alert_name: '',
    alert_category: '',
    alert_type_code: '',
    urgency: 'normal',
    camp_name: '',
    info_source: '',
  }
  showCreateModal.value = true
}

function onCreateSubmit() {
  // 原型中仅关闭弹窗，不做实际提交
  showCreateModal.value = false
}
</script>

<template>
  <PageContainer title="预警工作台">

    <!-- ═══ KPI 概览条 ═══════════════════════════════════════════ -->
    <div class="aw-kpi-bar">
      <div class="kpi-item kpi-danger">
        <div class="kpi-value">{{ tabCounts.pending }}</div>
        <div class="kpi-label">待处理</div>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item">
        <div class="kpi-value">{{ tabCounts.verify }}</div>
        <div class="kpi-label">待核实</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value">{{ tabCounts.decision }}</div>
        <div class="kpi-label">待决策</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value kpi-purple">{{ tabCounts.tracking }}</div>
        <div class="kpi-label">持续跟踪中</div>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item">
        <div class="kpi-value kpi-muted">{{ tabCounts.ended }}</div>
        <div class="kpi-label">今日已结束</div>
      </div>
    </div>

    <!-- ═══ 筛选栏 ═══════════════════════════════════════════════ -->
    <PanelCard padding="12px 16px">
      <div class="aw-filter-row">
        <a-input
          v-model:value="query.keyword"
          placeholder="搜索编号 / 名称 / 营地"
          allow-clear
          size="small"
          style="width: 200px"
        >
          <template #prefix><FilterOutlined style="color: var(--of-text-tertiary)" /></template>
        </a-input>

        <a-select
          v-model:value="query.camp"
          placeholder="营地"
          size="small"
          style="width: 140px"
          mode="multiple"
          :max-tag-count="1"
          allow-clear
        >
          <a-select-option v-for="c in CAMP_OPTIONS" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>

        <a-select
          v-model:value="query.source"
          placeholder="来源"
          size="small"
          style="width: 140px"
          mode="multiple"
          :max-tag-count="1"
          allow-clear
        >
          <a-select-option v-for="(label, key) in SOURCE_LABEL" :key="key" :value="key">{{ label }}</a-select-option>
        </a-select>

        <a-cascader
          v-model:value="query.categoryPaths"
          :options="CATEGORY_CASCADER"
          placeholder="类型"
          size="small"
          style="width: 150px"
          multiple
          :max-tag-count="1"
          :show-search="{ filter: (input: string, path: any[]) => path.some(o => o.label.includes(input)) }"
          allow-clear
        />

        <a-select v-model:value="query.urgency" placeholder="紧急程度" size="small" style="width: 110px" allow-clear>
          <a-select-option value="urgent">🔴 紧急</a-select-option>
          <a-select-option value="normal">⚪ 一般</a-select-option>
        </a-select>

        <a-range-picker
          v-model:value="(query.dateRange as any)"
          size="small"
          style="width: 220px"
          :placeholder="['开始日期', '结束日期']"
          allow-clear
        />

        <template v-if="activeTab === 'ended'">
          <a-select
            v-model:value="query.endStatus"
            placeholder="状态"
            size="small"
            style="width: 130px"
            mode="multiple"
            :max-tag-count="1"
            allow-clear
          >
            <a-select-option value="false_alarm">误报关闭</a-select-option>
            <a-select-option value="merged">已合并</a-select-option>
            <a-select-option value="resolved">已解除</a-select-option>
            <a-select-option value="escalated">已升级</a-select-option>
          </a-select>

          <a-checkbox v-model:checked="query.overdueOnly" class="overdue-check">
            仅看超时处理
          </a-checkbox>
        </template>

        <div class="filter-actions">
          <a-button size="small" @click="onReset">
            <template #icon><ReloadOutlined /></template>重置
          </a-button>
          <a-button type="primary" size="small" style="margin-left: 8px" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>代录预警
          </a-button>
          <a-button size="small" style="margin-left: 8px">
            <template #icon><DownloadOutlined /></template>导出
          </a-button>
        </div>
      </div>
    </PanelCard>

    <!-- ═══ Tab + 列表 ════════════════════════════════════════════ -->
    <PanelCard>
      <div class="aw-tabs">
        <div
          v-for="tab in [
            { key: 'pending',          label: '待处理',     count: tabCounts.pending },
            { key: 'pending_verify',   label: '待核实',     count: tabCounts.verify },
            { key: 'pending_decision', label: '待决策',     count: tabCounts.decision },
            { key: 'tracking',         label: '持续跟踪中', count: tabCounts.tracking },
            { key: 'ended',            label: '已结束',     count: tabCounts.ended },
          ]"
          :key="tab.key"
          class="aw-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key as any"
        >
          {{ tab.label }}
          <span class="tab-badge" :class="{ 'badge-danger': tab.key === 'pending' && tab.count > 0 }">
            {{ tab.count }}
          </span>
        </div>
      </div>

      <!-- 列表头 -->
      <div class="aw-list-header">
        <span class="col-urgency">紧急</span>
        <span class="col-info">预警信息</span>
        <span class="col-type">类型</span>
        <span class="col-source">来源</span>
        <span class="col-camp">营地</span>
        <span class="col-status">状态</span>
        <span class="col-deadline">时限</span>
        <span class="col-action">操作</span>
      </div>

      <!-- 列表体 -->
      <div class="aw-list-body">
        <div
          v-for="record in filtered"
          :key="record.alert_id"
          class="aw-row"
          :class="{
            'row-urgent': record.urgency === 'urgent',
            'row-overdue': getDeadlineInfo(record).overdue,
            'row-ended': ['false_alarm','merged','resolved','escalated'].includes(record.status),
          }"
          @click="onInvestigate(record)"
        >
          <!-- 紧急程度 -->
          <span class="col-urgency">
            <span class="urgency-dot" :class="record.urgency === 'urgent' ? 'dot-urgent' : 'dot-normal'" />
          </span>

          <!-- 预警信息（两行） -->
          <span class="col-info">
            <div class="info-name">
              {{ record.alert_name }}
              <span v-if="record.related_alert_ids.length" class="related-hint">
                <ExclamationCircleOutlined /> 疑似关联
              </span>
              <span v-if="record.trigger_count > 1" class="trigger-count">×{{ record.trigger_count }}</span>
              <span v-if="record.location_source === 'none'" class="location-tag">待定位</span>
            </div>
            <div class="info-meta">
              <span class="alert-no">{{ record.alert_no }}</span>
              <span class="dot-sep">·</span>
              <span>{{ relativeTime(record.created_at) }}</span>
            </div>
          </span>

          <!-- 来源 -->
          <span class="col-type">{{ record.alert_category }}</span>

          <!-- 来源 -->
          <span class="col-source">{{ SOURCE_LABEL[record.source_type] }}</span>

          <!-- 营地 -->
          <span class="col-camp">
            {{ record.camp_name }}
            <span v-if="record.camp_outside_meters" class="outside-hint">营地外 {{ record.camp_outside_meters }}m</span>
          </span>

          <!-- 状态 -->
          <span class="col-status">
            <span class="status-pill" :style="{ borderColor: statusColor[record.status], color: statusColor[record.status] }">
              {{ STATUS_LABEL[record.status] }}
            </span>
            <span v-if="record.verification_result" class="verify-result-hint">
              {{ record.verification_result === 'real' ? '已核实·真实' : '已核实·无法确认' }}
            </span>
          </span>

          <!-- 时限 -->
          <span class="col-deadline">
            <template v-if="!['false_alarm','merged','resolved','escalated'].includes(record.status)">
              <ClockCircleOutlined
                :style="{ color: getDeadlineInfo(record).overdue ? 'var(--of-color-error)' : getDeadlineInfo(record).minutesLeft <= 5 ? '#faad14' : 'var(--of-text-tertiary)' }"
              />
              <span
                class="deadline-text"
                :class="{
                  'deadline-overdue': getDeadlineInfo(record).overdue,
                  'deadline-warn': !getDeadlineInfo(record).overdue && getDeadlineInfo(record).minutesLeft <= 5,
                }"
              >{{ getDeadlineInfo(record).label }}</span>
            </template>
            <span v-else class="deadline-text" style="color: var(--of-text-quaternary)">—</span>
          </span>

          <!-- 操作 -->
          <span class="col-action" @click.stop>
            <a-button
              type="link"
              size="small"
              class="btn-investigate"
              @click="onInvestigate(record)"
            >研判</a-button>
          </span>
        </div>

        <!-- 空状态 -->
        <div v-if="filtered.length === 0" class="aw-empty">
          <WarningOutlined class="empty-icon" />
          <p>{{ activeTab === 'pending' ? '当前无待处理预警，系统运行正常' : '暂无符合条件的预警记录' }}</p>
        </div>
      </div>

      <!-- 结果统计 -->
      <div v-if="filtered.length > 0" class="aw-footer">
        共 {{ filtered.length }} 条记录
        <span v-if="activeTab === 'ended' && !query.dateRange" style="margin-left: 8px; color: var(--of-text-tertiary)">
          · 默认显示近 7 天
        </span>
      </div>
    </PanelCard>

    <!-- ═══ 代录预警弹窗 ════════════════════════════════════════════ -->
    <a-modal
      v-model:open="showCreateModal"
      title="代录预警"
      width="560px"
      :mask-closable="false"
      ok-text="提交"
      cancel-text="取消"
      @ok="onCreateSubmit"
    >
      <a-form layout="vertical" size="small" style="margin-top: 8px">
        <a-form-item label="预警名称">
          <a-input
            v-model:value="createForm.alert_name"
            placeholder="默认「营地·类型」，最多 32 个字符"
            :maxlength="32"
            show-count
            allow-clear
          />
        </a-form-item>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="预警类型">
              <a-cascader
                v-model:value="(createForm.alert_type_code as any)"
                :options="CATEGORY_CASCADER"
                placeholder="请选择类型"
                allow-clear
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="紧急程度">
              <a-radio-group v-model:value="createForm.urgency" button-style="solid" size="small">
                <a-radio-button value="urgent">🔴 紧急</a-radio-button>
                <a-radio-button value="normal">⚪ 一般</a-radio-button>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="营地归属">
              <a-select
                v-model:value="createForm.camp_name"
                placeholder="请选择营地"
                allow-clear
                style="width: 100%"
              >
                <a-select-option v-for="c in CAMP_OPTIONS" :key="c" :value="c">{{ c }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="位置">
              <a-input placeholder="可不填，标注「待定位」" allow-clear>
                <template #suffix>
                  <PaperClipOutlined style="color: var(--of-text-tertiary)" />
                </template>
              </a-input>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="信息来源说明（必填）">
          <a-textarea
            v-model:value="createForm.info_source"
            :rows="3"
            placeholder="例：张某某电话报告，对讲频道 X"
            :maxlength="200"
            show-count
            allow-clear
          />
        </a-form-item>

        <a-form-item label="附件（图片 / 视频，单文件 ≤ 100MB）">
          <a-upload
            list-type="picture"
            :before-upload="() => false"
            accept="image/*,video/*"
          >
            <a-button size="small">
              <template #icon><PlusOutlined /></template>
              上传附件
            </a-button>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>
  </PageContainer>
</template>

<style scoped lang="scss">
// ── KPI 概览条 ──────────────────────────────────────────────────
.aw-kpi-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--of-bg-card);
  padding: 12px 20px;

  .kpi-divider {
    width: 1px;
    height: 32px;
    background: var(--of-border-table);
    margin: 0 20px;
  }

  .kpi-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 72px;
    cursor: default;

    .kpi-value {
      font-size: 24px;
      font-weight: var(--of-font-weight-bold);
      line-height: 1;
      color: var(--of-color-accent-ice);
      font-variant-numeric: tabular-nums;
    }

    .kpi-label {
      font-size: var(--of-font-size-xs);
      color: var(--of-text-tertiary);
      margin-top: 4px;
    }

    &.kpi-danger .kpi-value { color: var(--of-color-error); }
    .kpi-purple { color: #9b7cff; }
    .kpi-muted { color: var(--of-text-tertiary); }
  }
}

// ── 筛选栏 ─────────────────────────────────────────────────────
.aw-filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--of-spacing-3);

  .filter-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
  }
}

.overdue-check {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
  white-space: nowrap;

  :deep(.ant-checkbox-inner) {
    background: transparent;
    border-color: var(--of-border-table);
  }
}

// ── Tab ─────────────────────────────────────────────────────────
.aw-tabs {
  display: flex;
  border-bottom: 1px solid var(--of-border-table);
  margin: 0 calc(-1 * var(--of-spacing-4));
  padding: 0 var(--of-spacing-4);
  gap: 0;

  .aw-tab {
    padding: 0 16px;
    height: 40px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--of-font-size-base);
    color: var(--of-text-tab-inactive);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.2s, border-color 0.2s;
    user-select: none;

    &:hover { color: var(--of-text-secondary); }

    &.active {
      color: var(--of-color-link);
      border-bottom-color: var(--of-color-primary);
    }

    .tab-badge {
      font-size: 11px;
      padding: 0 5px;
      height: 16px;
      line-height: 16px;
      border-radius: 8px;
      background: rgba(255,255,255,0.08);
      color: var(--of-text-tertiary);
      font-variant-numeric: tabular-nums;

      &.badge-danger {
        background: rgba(255,102,102,0.18);
        color: var(--of-color-error);
      }
    }
  }
}

// ── 列定义（共享宽度变量，header 和 row 保持一致） ────────────
%col-base { display: flex; align-items: center; flex-shrink: 0; }

.col-urgency  { @extend %col-base; width: 40px; justify-content: center; }
.col-info     { @extend %col-base; flex: 1; min-width: 0; flex-direction: column; align-items: flex-start; gap: 3px; }
.col-type     { @extend %col-base; width: 90px; color: var(--of-text-secondary); font-size: var(--of-font-size-xs); }
.col-source   { @extend %col-base; width: 110px; color: var(--of-text-tertiary); font-size: var(--of-font-size-xs); }
.col-camp     { @extend %col-base; width: 130px; flex-direction: column; align-items: flex-start; gap: 2px; }
.col-status   { @extend %col-base; width: 160px; flex-direction: column; align-items: flex-start; gap: 3px; }
.col-deadline { @extend %col-base; width: 130px; gap: 5px; }
.col-action   { @extend %col-base; width: 64px; justify-content: center; }

// ── 列表头 ──────────────────────────────────────────────────────
.aw-list-header {
  display: flex;
  align-items: center;
  padding: 0 var(--of-spacing-4);
  height: var(--of-table-head-height);
  background: var(--of-bg-table-head);
  margin: 12px calc(-1 * var(--of-spacing-4)) 0;
  font-size: var(--of-font-size-xs);
  font-weight: var(--of-font-weight-medium);
  color: var(--of-text-secondary);
}

// ── 列表体 ──────────────────────────────────────────────────────
.aw-list-body {
  margin: 0 calc(-1 * var(--of-spacing-4));
}

.aw-row {
  display: flex;
  align-items: center;
  padding: 0 var(--of-spacing-4);
  height: var(--of-table-row-height);
  border-bottom: 1px solid var(--of-border-table);
  cursor: pointer;
  transition: background 0.15s;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: transparent;
    transition: background 0.15s;
  }

  &:hover {
    background: var(--of-bg-row-hover);
    &::before { background: var(--of-color-primary); }
  }

  &.row-urgent::before { background: rgba(255,102,102,0.5); }
  &.row-overdue {
    background: rgba(255,102,102,0.04);
    &::before { background: var(--of-color-error); }
  }
  &.row-ended { opacity: 0.7; }
  &.row-ended:hover { opacity: 1; }
}

// ── 行内元素 ────────────────────────────────────────────────────
.urgency-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.dot-urgent {
    background: var(--of-color-error);
    box-shadow: 0 0 0 3px rgba(255,102,102,0.2);
    animation: pulse-dot 2s infinite;
  }

  &.dot-normal {
    background: var(--of-text-quaternary);
  }
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 3px rgba(255,102,102,0.2); }
  50% { box-shadow: 0 0 0 6px rgba(255,102,102,0.08); }
}

.info-name {
  font-size: var(--of-font-size-base);
  color: var(--of-text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.related-hint {
  font-size: 11px;
  color: #faad14;
  white-space: nowrap;
}

.trigger-count {
  font-size: 11px;
  padding: 0 5px;
  background: rgba(20,129,166,0.2);
  color: var(--of-color-link);
  border-radius: 3px;
}

.location-tag {
  font-size: 11px;
  padding: 0 5px;
  background: rgba(255,102,102,0.12);
  color: var(--of-color-error);
  border-radius: 3px;
}

.info-meta {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;

  .alert-no { font-family: monospace; letter-spacing: 0.02em; }
  .dot-sep { color: var(--of-text-quaternary); }
}

.outside-hint {
  display: block;
  font-size: 11px;
  color: #faad14;
  line-height: 1.2;
}

.status-pill {
  font-size: 11px;
  padding: 1px 7px;
  border: 1px solid;
  border-radius: 3px;
  white-space: nowrap;
}

.verify-result-hint {
  font-size: 11px;
  color: var(--of-text-tertiary);
}

.deadline-text {
  font-size: var(--of-font-size-xs);
  color: var(--of-text-tertiary);
  font-variant-numeric: tabular-nums;

  &.deadline-overdue { color: var(--of-color-error); font-weight: var(--of-font-weight-medium); }
  &.deadline-warn { color: #faad14; }
}

.btn-investigate {
  color: var(--of-color-link) !important;
  padding: 0 !important;
  font-size: var(--of-font-size-xs) !important;

  &:hover { color: var(--of-color-link-hover) !important; }
}

// ── 空状态 ──────────────────────────────────────────────────────
.aw-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: var(--of-text-tertiary);

  .empty-icon { font-size: 36px; opacity: 0.25; margin-bottom: 12px; }
  p { margin: 0; font-size: var(--of-font-size-base); }
}

// ── 底部统计 ────────────────────────────────────────────────────
.aw-footer {
  padding: 10px var(--of-spacing-4);
  font-size: var(--of-font-size-xs);
  color: var(--of-text-quaternary);
  border-top: 1px solid var(--of-border-table);
  margin: 0 calc(-1 * var(--of-spacing-4)) calc(-1 * var(--of-spacing-4));
}
</style>
