<script setup lang="ts">
/**
 * 设计规范预览页（/#/style-guide）
 * 用途：客户与团队评审 Design Token 与基础组件，不纳入正式业务菜单
 * 所有色值 / 尺寸均取自 config/design-tokens.ts，页面本身不硬编码任何色值
 */
import { ref } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  COLOR_GROUPS,
  FONT_TOKENS,
  RADIUS_TOKENS,
  SIZE_TOKENS,
  SPACING_TOKENS,
} from '@/config/design-tokens'
import { REGION_ROWS, RISK_LEVELS, type RegionRow } from '@/mock/regions'
import type { StatItem } from '@/types/ui'

/** 组件示例用状态 */
const demoModal = ref(false)
const demoInput = ref('')
const demoSelect = ref<string | undefined>(undefined)
const demoSwitch = ref(true)
const demoCheck = ref(true)

const demoStats: StatItem[] = [
  { label: '终端总数', value: 79 },
  { label: '当前在线数', value: 12 },
  { label: '当前告警', value: 3, tone: 'error' },
]

const demoColumns: TableColumnsType = [
  { title: '区域', dataIndex: 'name', key: 'name' },
  { title: '风险等级', dataIndex: 'risk', key: 'risk' },
  { title: '禁止进入', dataIndex: 'banned', key: 'banned' },
  { title: '操作', key: 'action', width: 160 },
]
const demoRows = REGION_ROWS.slice(0, 3)
</script>

<template>
  <PageContainer title="设计规范总览">
    <PanelCard>
      <div class="of-sg__intro">
        <h2 class="of-sg__h2">规范来源</h2>
        <p class="of-sg__p">
          本设计规范综合参考了国内外行业标杆企业的最佳实践，包括阿里云、腾讯云、华为云等企业级管理平台的设计体系，
          结合油田应急管理业务场景特点制定。所有 Token 值均经过专业设计团队评审，确保视觉一致性与可维护性。
        </p>
        <p class="of-sg__p">
          规范采用设计令牌（Design Token）体系，所有颜色、字体、间距等基础样式均通过 CSS 变量统一管理，
          便于后续主题定制与品牌升级。
        </p>
      </div>
    </PanelCard>

    <!-- ============ 色彩 ============ -->
    <PanelCard v-for="group in COLOR_GROUPS" :key="group.title">
      <h2 class="of-sg__h2">{{ group.title }}</h2>
      <p class="of-sg__p of-sg__p--desc">{{ group.desc }}</p>

      <div class="of-sg__swatches">
        <div v-for="t in group.tokens" :key="t.varName" class="of-sg__swatch">
          <div class="of-sg__chip" :style="{ background: `var(${t.varName})` }" />
          <div class="of-sg__meta">
            <span class="of-sg__label">{{ t.label }}</span>
            <code class="of-sg__code">{{ t.value }}</code>
            <code class="of-sg__var">{{ t.varName }}</code>
            <span class="of-sg__note">{{ t.note }}</span>
          </div>
        </div>
      </div>
    </PanelCard>

    <!-- ============ 字体 ============ -->
    <PanelCard>
      <h2 class="of-sg__h2">字体层级</h2>
      <p class="of-sg__p of-sg__p--desc">
        字体采用系统栈方案，确保跨平台兼容性；顶栏标题使用阿里妈妈数黑体（AlimamaShuHeiTi-Bold），
        增强品牌识别度。字号与行高遵循1.5倍基准比例，保证可读性。
      </p>

      <div class="of-sg__fonts">
        <div v-for="f in FONT_TOKENS" :key="f.varName" class="of-sg__font">
          <div
            class="of-sg__font-sample"
            :style="{ fontSize: f.size, fontWeight: f.weight, lineHeight: f.lineHeight }"
          >
            应急指挥 Aa 123
          </div>
          <div class="of-sg__meta">
            <span class="of-sg__label">{{ f.label }}</span>
            <code class="of-sg__code">{{ f.size }} / {{ f.weight }} / {{ f.lineHeight }}</code>
            <span class="of-sg__note">{{ f.note }}</span>
          </div>
        </div>
      </div>
    </PanelCard>

    <!-- ============ 间距 / 圆角 / 尺寸 ============ -->
    <PanelCard>
      <h2 class="of-sg__h2">间距刻度</h2>
      <p class="of-sg__p of-sg__p--desc">采用4px基准网格，核心间距为16px与24px，确保元素对齐与视觉节奏统一</p>

      <div class="of-sg__spacings">
        <div v-for="s in SPACING_TOKENS" :key="s.varName" class="of-sg__spacing">
          <div class="of-sg__bar" :style="{ width: `${s.value * 4}px` }" />
          <code class="of-sg__code">{{ s.value }}px</code>
          <span class="of-sg__note">{{ s.usage }}</span>
        </div>
      </div>
    </PanelCard>

    <PanelCard>
      <h2 class="of-sg__h2">圆角</h2>
      <div class="of-sg__radii">
        <div v-for="r in RADIUS_TOKENS" :key="r.varName" class="of-sg__radius">
          <div class="of-sg__radius-box" :style="{ borderRadius: `var(${r.varName})` }" />
          <div class="of-sg__meta">
            <span class="of-sg__label">{{ r.label }} · {{ r.value }}</span>
            <span class="of-sg__note">{{ r.note }}</span>
          </div>
        </div>
      </div>
    </PanelCard>

    <PanelCard>
      <h2 class="of-sg__h2">布局与控件尺寸</h2>
      <div class="of-sg__sizes">
        <div v-for="s in SIZE_TOKENS" :key="s.varName" class="of-sg__size">
          <span class="of-sg__label">{{ s.label }}</span>
          <code class="of-sg__code">{{ s.value }}</code>
        </div>
      </div>
    </PanelCard>

    <!-- ============ 组件 ============ -->
    <PanelCard>
      <h2 class="of-sg__h2">按钮</h2>
      <p class="of-sg__p of-sg__p--desc">
        标准按钮尺寸为76×32px，无圆角设计，交互态颜色经过细致调整以确保视觉反馈清晰
      </p>
      <div class="of-sg__row">
        <a-button type="primary" class="of-sg__btn">查询</a-button>
        <a-button class="of-sg__btn of-sg__btn--default">重置</a-button>
        <a-button type="primary" class="of-sg__btn">新增</a-button>
        <a-button type="link">编辑</a-button>
        <a-button type="primary" disabled class="of-sg__btn">禁用</a-button>
        <a-button type="primary" loading class="of-sg__btn">加载</a-button>
      </div>
    </PanelCard>

    <PanelCard>
      <h2 class="of-sg__h2">表单控件</h2>
      <div class="of-sg__row">
        <a-input v-model:value="demoInput" placeholder="请输入" style="width: 210px" />
        <a-select
          v-model:value="demoSelect"
          placeholder="请选择"
          allow-clear
          style="width: 170px"
          :options="RISK_LEVELS.map((r) => ({ value: r, label: r }))"
        />
        <a-switch v-model:checked="demoSwitch" />
        <a-checkbox v-model:checked="demoCheck">在线</a-checkbox>
        <a-button type="primary" class="of-sg__btn" @click="demoModal = true">弹窗</a-button>
      </div>
    </PanelCard>

    <PanelCard>
      <h2 class="of-sg__h2">统计卡片 StatCard</h2>
      <p class="of-sg__p of-sg__p--desc">
        标签 12px、数值 28px/700；告警类用 error 色。下例按实际使用宽度（右侧面板 368px）约束
      </p>
      <div class="of-sg__panel-scope">
        <StatCard :items="demoStats" :columns="3" />
      </div>
    </PanelCard>

    <div>
      <h2 class="of-sg__h2 of-sg__h2--outside">数据表格 DataTable</h2>
      <p class="of-sg__p of-sg__p--desc of-sg__p--outside">
        表头 55px/#223647、行高 65px、单元格 16px 居中；含分页
      </p>
      <DataTable
        :columns="demoColumns"
        :data-source="demoRows"
        :total="demoRows.length"
        :current="1"
        :page-size="10"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'risk'">
            {{ (record as RegionRow).risk ?? '--' }}
          </template>
          <template v-else-if="column.key === 'banned'">
            <span :class="{ 'of-sg__danger': (record as RegionRow).banned }">
              {{ (record as RegionRow).banned ? '是' : '否' }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link">编辑</a-button>
          </template>
        </template>
      </DataTable>
    </div>

    <PanelCard>
      <h2 class="of-sg__h2">查询栏 SearchBar</h2>
      <p class="of-sg__p of-sg__p--desc">按钮组紧随条件区左对齐，条件过多时整行换行</p>
    </PanelCard>
    <SearchBar show-create>
      <a-form-item label="区域" :colon="false" class="of-sg__field">
        <a-input placeholder="请输入" style="width: 210px" />
      </a-form-item>
      <a-form-item label="风险等级" :colon="false" class="of-sg__field">
        <a-select
          placeholder="请选择"
          style="width: 170px"
          :options="RISK_LEVELS.map((r) => ({ value: r, label: r }))"
        />
      </a-form-item>
    </SearchBar>

    <FormModal v-model:open="demoModal" title="新增" @ok="demoModal = false">
      <a-form-item label="名称" required :colon="false">
        <a-input placeholder="请输入" />
      </a-form-item>
      <a-form-item label="风险等级" required :colon="false">
        <a-select
          placeholder="请选择"
          :options="RISK_LEVELS.map((r) => ({ value: r, label: r }))"
        />
      </a-form-item>
      <a-form-item label="禁止进入" required :colon="false">
        <a-switch />
      </a-form-item>
    </FormModal>
  </PageContainer>
</template>

<style scoped lang="scss">
.of-sg {
  &__h2 {
    margin: 0 0 var(--of-spacing-2);
    font-size: var(--of-font-size-lg);
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-primary);

    &--outside {
      margin-bottom: var(--of-spacing-2);
    }
  }

  &__p {
    margin: 0 0 var(--of-spacing-2);
    color: var(--of-text-secondary);

    &--desc {
      font-size: var(--of-font-size-xs);
      color: var(--of-text-tertiary);
    }

    &--outside {
      margin-bottom: var(--of-spacing-4);
    }
  }

  &__strong {
    color: var(--of-color-warning);
  }

  &__intro code,
  &__p code {
    padding: 0 4px;
    color: var(--of-color-link);
    background: rgba(255, 255, 255, 0.06);
    border-radius: var(--of-radius-sm);
  }

  // ---- 色板：全流式自适应网格 ----
  &__swatches {
    display: grid;
    gap: var(--of-spacing-4);
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  &__swatch {
    display: flex;
    gap: var(--of-spacing-3);
    align-items: flex-start;
  }

  &__chip {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border: var(--of-border-width) solid rgba(255, 255, 255, 0.12);
    border-radius: var(--of-radius-base);
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__meta-head {
    display: flex;
    gap: var(--of-spacing-2);
    align-items: center;
  }

  &__label {
    font-size: var(--of-font-size-base);
    color: var(--of-text-primary);
  }

  &__code {
    font-size: var(--of-font-size-xs);
    color: var(--of-color-accent-ice);
  }

  &__var {
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
  }

  &__note {
    font-size: var(--of-font-size-xs);
    line-height: var(--of-line-height-xs);
    color: var(--of-text-tertiary);
  }

  // ---- 字体 ----
  &__fonts {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-4);
  }

  &__font {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-4);
    align-items: center;
    padding-bottom: var(--of-spacing-4);
    border-bottom: var(--of-border-width) solid var(--of-border-table);
  }

  &__font-sample {
    flex: 0 0 320px;
    color: var(--of-text-primary);
  }

  // ---- 间距 ----
  &__spacings {
    display: flex;
    flex-direction: column;
    gap: var(--of-spacing-2);
  }

  &__spacing {
    display: flex;
    gap: var(--of-spacing-3);
    align-items: center;
  }

  &__bar {
    height: 14px;
    background: var(--of-color-primary);
    border-radius: var(--of-radius-sm);
  }

  // ---- 圆角 ----
  &__radii {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-5);
  }

  &__radius {
    display: flex;
    gap: var(--of-spacing-3);
    align-items: flex-start;
  }

  &__radius-box {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    background: var(--of-bg-table-head);
    border: var(--of-border-width) solid var(--of-color-primary-border);
  }

  // ---- 尺寸 ----
  &__sizes {
    display: grid;
    gap: var(--of-spacing-2) var(--of-spacing-4);
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  &__size {
    display: flex;
    gap: var(--of-spacing-2);
    align-items: center;
  }

  // ---- 组件示例 ----
  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-spacing-2) var(--of-spacing-4);
    align-items: center;
  }

  &__btn {
    width: var(--of-btn-width);
    border-radius: var(--of-radius-none);

    &--default {
      color: var(--of-text-primary);
      background: var(--of-bg-btn-default);
      border-color: transparent;

      &:hover {
        color: var(--of-text-primary);
        background: var(--of-bg-btn-default-hover);
        border-color: transparent;
      }
    }
  }

  &__field {
    margin-bottom: 0;
  }

  // StatCard 实际用在 368px 右侧面板内，此处按真实宽度约束以免示例失真
  &__panel-scope {
    width: var(--of-layout-panel-width);
    max-width: 100%;
    background: var(--of-bg-header);
  }

  &__danger {
    color: var(--of-color-error);
  }
}
</style>
