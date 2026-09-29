/**
 * Ant Design Vue 4.x 主题配置
 * 将 Design Token 映射为 antd v5 Token 体系（CSS-in-JS）
 * 基于项目设计规范制定（2026-07-26）
 */
import { theme as antdTheme } from 'ant-design-vue'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

/** 标准色值（与 styles/_tokens.scss 保持单一来源，勿各自改） */
export const RAW = {
  primary: '#1481A6',
  primaryHover: '#2A9CC2', // 推导
  primaryActive: '#0F6683', // 推导
  link: '#57C4F7',
  error: '#FF6666',
  success: '#52C41A', // 推导值
  warning: '#FAAD14', // 推导值
  bgHeader: '#1E262F',
  bgSider: '#1C2630',
  bgBody: '#16202A',
  bgCard: '#18222B',
  bgTableHead: '#223647',
  bgRowHover: '#24333C',
  bgBtnDefault: '#3D4A59',
  bgSelect: '#363D45',
  bgModal: 'rgba(30,38,47,0.85)',
  bgModalHeader: '#182028',
  menuSelected: '#166582',
  borderTable: '#1B3640',
  borderModal: '#2F4852',
  borderInput: 'rgba(87,196,247,0.3)',
} as const

/**
 * 注：ant-design-vue 4.2.6 对 ThemeConfig['components'] 的类型定义偏窄，
 * 未收录各组件的 component token（headerBg / darkItemBg / itemActiveBg 等），
 * 但运行时完全生效。故此处对 components 块做一次断言，token 块保持强类型。
 */
export const antdThemeConfig: ThemeConfig = {
  // 现有系统为暗色单主题
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: RAW.primary,
    colorInfo: RAW.link,
    colorLink: RAW.link,
    colorError: RAW.error,
    colorSuccess: RAW.success,
    colorWarning: RAW.warning,

    // 全局圆角 4px（antd v5 默认 6px，必须覆写）
    borderRadius: 4,
    borderRadiusLG: 4,
    borderRadiusSM: 2,

    // 标准控件高度 32px、正文 14px/22px
    controlHeight: 32,
    fontSize: 14,
    lineHeight: 22 / 14,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",

    colorBgLayout: RAW.bgBody,
    colorBgContainer: RAW.bgCard,
    colorBgElevated: RAW.bgModalHeader,
    colorBorderSecondary: RAW.borderTable,
    colorTextBase: '#FFFFFF',
  },
  components: {
    Layout: {
      headerBg: RAW.bgHeader,
      headerHeight: 52,
      headerPadding: '0 17px',
      bodyBg: RAW.bgBody,
      siderBg: RAW.bgSider,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: RAW.menuSelected,
      darkItemColor: 'rgba(255,255,255,0.65)',
      darkItemSelectedColor: '#FFFFFF',
      itemHeight: 40,
      itemBorderRadius: 4,
      itemMarginBlock: 4,
      itemMarginInline: 0,
      collapsedWidth: 48,
    },
    Table: {
      headerBg: RAW.bgTableHead,
      headerColor: '#FFFFFF',
      headerSplitColor: 'transparent',
      borderColor: RAW.borderTable,
      rowHoverBg: RAW.bgRowHover,
      cellPaddingBlock: 16,
      cellPaddingInline: 16,
      // 必须是不透明实色：antd-vue 4.2.6 的 Table 把行 hover / 表头 / 排序底色
      // 一律算成 colorFillAlter(rgba(255,255,255,.04)) 叠加到 colorBgContainer 之上。
      // 若此处为 transparent，叠加结果退化为纯白 #FFFFFF —— 行 hover 会变白底白字。
      // 同时 tableBg 也取自此值，固定列需要它不透明才能遮住横向滚动的内容。
      // 表格外层透明由 global.scss 的 .ant-table 兜底，不靠这个 token。
      colorBgContainer: RAW.bgCard,
    },
    Modal: {
      contentBg: RAW.bgModal,
      headerBg: RAW.bgModalHeader,
      titleFontSize: 16,
      titleColor: '#FFFFFF',
      footerBg: 'transparent',
    },
    Input: {
      colorBgContainer: 'transparent',
      colorBorder: RAW.borderInput,
      colorTextPlaceholder: '#BFBFBF',
      paddingInline: 11,
    },
    Select: {
      colorBgContainer: RAW.bgSelect,
      colorBorder: 'transparent',
      colorTextPlaceholder: '#BFBFBF',
    },
    Pagination: {
      itemActiveBg: 'rgba(20,129,166,0.7)',
      colorText: 'rgba(255,255,255,0.5)',
    },
    Form: {
      labelColor: 'rgba(255,255,255,0.8)',
      itemMarginBottom: 24,
      verticalLabelPadding: '0 0 4px',
    },
  } as ThemeConfig['components'],
}
