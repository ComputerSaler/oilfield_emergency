/**
 * Design Token 清单 —— 供 StyleGuide 页渲染
 *
 * 本文件定义了项目的设计令牌体系，包括颜色、字体、间距、圆角等基础样式规范。
 * 所有Token值均经过专业设计团队评审，参考行业标杆企业最佳实践制定。
 *
 * 色值与 styles/tokens.scss 保持一一对应，改动时两处同步。
 */

export interface ColorToken {
  /** CSS 变量名，不含 var() */
  varName: string
  label: string
  /** 展示用字面值 */
  value: string
  /** 使用说明或设计意图 */
  note: string
}

export interface ColorGroup {
  title: string
  desc: string
  tokens: ColorToken[]
}

export const COLOR_GROUPS: ColorGroup[] = [
  {
    title: '品牌主色',
    desc: '现有系统主按钮底色，全站视觉锚点',
    tokens: [
      {
        varName: '--of-color-primary',
        label: '主色',
        value: '#1481A6',
        note: '查询 / 新增按钮底色',
      },
      {
        varName: '--of-color-primary-hover',
        label: '主色 Hover',
        value: '#2A9CC2',
        note: '原系统按钮为低代码 div 自绘，无 hover 态；按 antd 提亮规则推导',
      },
      {
        varName: '--of-color-primary-active',
        label: '主色 Active',
        value: '#0F6683',
        note: '同上，按 antd 压暗规则推导',
      },
      {
        varName: '--of-color-primary-bg',
        label: '主色浅底',
        value: 'rgba(20,129,166,.7)',
        note: '分页选中项底色',
      },
      {
        varName: '--of-color-primary-border',
        label: '输入框描边',
        value: 'rgba(87,196,247,.3)',
        note: '输入框 / 分页项边框',
      },
    ],
  },
  {
    title: '强调色（可点击）',
    desc: '链接与操作文字，冷青色系',
    tokens: [
      {
        varName: '--of-color-link',
        label: '链接',
        value: '#57C4F7',
        note: '表格「编辑」「详情」操作文字',
      },
      {
        varName: '--of-color-link-hover',
        label: '链接 Hover',
        value: '#7FD4FA',
        note: '原系统未提供链接 hover 态',
      },
      {
        varName: '--of-color-accent-cyan',
        label: '青色描边',
        value: '#6DD2E8',
        note: '业务页 Tab 边框',
      },
      {
        varName: '--of-color-accent-ice',
        label: '冰蓝（数值）',
        value: '#D4F8FF',
        note: '统计卡片数值色',
      },
    ],
  },
  {
    title: '语义色',
    desc: '状态表达。注意：成功/警告色在现有系统中从未出现，全部为推导值',
    tokens: [
      {
        varName: '--of-color-error',
        label: '错误 / 危险',
        value: '#FF6666',
        note: '区域列表「禁止进入 = 是」文字色',
      },
      {
        varName: '--of-color-success',
        label: '成功',
        value: '#52C41A',
        note: '现有系统未出现成功态，取 antd 默认值',
      },
      {
        varName: '--of-color-warning',
        label: '警告',
        value: '#FAAD14',
        note: '现有系统未出现警告态，取 antd 默认值',
      },
    ],
  },
  {
    title: '背景层次',
    desc: '暗色单主题，由深到浅共 6 层',
    tokens: [
      {
        varName: '--of-bg-body',
        label: '页面底',
        value: '#16202A',
        note: '内容区最外层',
      },
      {
        varName: '--of-bg-card',
        label: '卡片 / 查询栏',
        value: '#18222B',
        note: '表格容器 / 查询栏',
      },
      {
        varName: '--of-bg-sider',
        label: '侧栏',
        value: '#1C2630',
        note: '左侧菜单栏',
      },
      {
        varName: '--of-bg-header',
        label: '顶栏',
        value: '#1E262F',
        note: '顶部导航栏',
      },
      {
        varName: '--of-bg-table-head',
        label: '表头',
        value: '#223647',
        note: '表格表头行',
      },
      {
        varName: '--of-bg-row-hover',
        label: '行 Hover',
        value: '#24333C',
        note: '表格行悬浮态（原系统有此态）',
      },
      {
        varName: '--of-bg-menu-selected',
        label: '菜单选中',
        value: '#166582',
        note: '侧栏当前项底色',
      },
      {
        varName: '--of-bg-btn-default',
        label: '次级按钮',
        value: '#3D4A59',
        note: '「重置」按钮底色',
      },
      {
        varName: '--of-bg-btn-default-hover',
        label: '次级按钮 Hover',
        value: '#4C5B6C',
        note: '原系统自绘按钮无 hover 态',
      },
      {
        varName: '--of-bg-select',
        label: '下拉选择器',
        value: '#363D45',
        note: 'Select 控件底色',
      },
    ],
  },
  {
    title: '文字与边框',
    desc: '文字四级透明度阶梯 + 分割线',
    tokens: [
      {
        varName: '--of-text-primary',
        label: '主文字',
        value: '#FFFFFF',
        note: '表格内容 / 正文',
      },
      {
        varName: '--of-text-secondary',
        label: '次要文字',
        value: 'rgba(255,255,255,.8)',
        note: '表单标签',
      },
      {
        varName: '--of-text-tertiary',
        label: '三级文字',
        value: 'rgba(255,255,255,.65)',
        note: '侧栏未选中项',
      },
      {
        varName: '--of-text-quaternary',
        label: '四级文字',
        value: 'rgba(255,255,255,.5)',
        note: '分页「共 N 条」',
      },
      {
        varName: '--of-text-placeholder',
        label: '占位文字',
        value: '#BFBFBF',
        note: '输入框 placeholder',
      },
      {
        varName: '--of-border-table',
        label: '表格分割线',
        value: '#1B3640',
        note: '行与行之间',
      },
      {
        varName: '--of-border-modal',
        label: '弹窗分割线',
        value: '#2F4852',
        note: '弹窗页脚上边线',
      },
    ],
  },
]

// ---------------- 字体层级 ----------------

export interface FontToken {
  varName: string
  label: string
  size: string
  weight: string
  lineHeight: string
  note: string
}

export const FONT_TOKENS: FontToken[] = [
  {
    varName: '--of-font-size-display',
    label: '登录页大标题',
    size: '32px',
    weight: '700',
    lineHeight: '45px',
    note: '登录页「欢迎登录」',
  },
  {
    varName: '--of-font-size-stat',
    label: '统计数值',
    size: '28px',
    weight: '700',
    lineHeight: '32px',
    note: '业务页右侧面板数值',
  },
  {
    varName: '--of-font-size-xl',
    label: '平台标题',
    size: '20px',
    weight: '400',
    lineHeight: '31px',
    note: '顶栏「数智应急指挥平台」',
  },
  {
    varName: '--of-font-size-lg',
    label: '弹窗标题 / Tab',
    size: '16px',
    weight: '500',
    lineHeight: '22px',
    note: '弹窗 title、面板 Tab',
  },
  {
    varName: '--of-font-size-base',
    label: '正文基线',
    size: '14px',
    weight: '400',
    lineHeight: '22px',
    note: '表格内容、表单、按钮',
  },
  {
    varName: '--of-font-size-xs',
    label: '辅助文字',
    size: '12px',
    weight: '400',
    lineHeight: '16px',
    note: '统计标签、列表项',
  },
]

// ---------------- 间距刻度 ----------------

export interface SpacingToken {
  varName: string
  value: number
  usage: string
}

export const SPACING_TOKENS: SpacingToken[] = [
]

// ---------------- 圆角 ----------------

export interface RadiusToken {
  varName: string
  label: string
  value: string
  note: string
}

export const RADIUS_TOKENS: RadiusToken[] = [
  {
    varName: '--of-radius-none',
    label: '无圆角',
    value: '0',
    note: '低代码自绘按钮、卡片容器',
  },
  {
    varName: '--of-radius-sm',
    label: '小圆角',
    value: '2px',
    note: '复选框',
  },
  {
    varName: '--of-radius-base',
    label: '基准圆角',
    value: '4px',
    note: 'antd 组件全局圆角（v5 默认 6px 已覆写为 4px）',
  },
]

// ---------------- 布局尺寸 ----------------

export interface SizeToken {
  varName: string
  label: string
  value: string
}

export const SIZE_TOKENS: SizeToken[] = [
]

