/**
 * 导航配置 —— 菜单结构按照业务模块划分
 *
 * 顶栏结构（6个，2026-08-15 grilling 确认）：
 *   安防态势（大屏，默认落地页）/ 安防建设总览（大屏）/ 实时监控中心（大屏）/ 事件感知处置（大屏）
 *   业务应用（PC后台，含侧栏）/ 系统管理（PC后台，含侧栏）
 *
 * 注：PC版实时监控中心（视频监控/无人机监控/反无监控）挂在业务应用侧栏，
 *     与大屏版"实时监控中心"是不同入口，避免命名混淆。
 *     统计分析暂含在业务应用侧栏，独立为顶栏待内容确定后再定。
 */
import type { Component } from 'vue'
import {
  AlertOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  GlobalOutlined,
  MedicineBoxOutlined,
  RadarChartOutlined,
  SettingOutlined,
  ToolOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue'

export interface NavItem {
  key: string
  label: string
  icon?: Component
  /** 点击一级模块后跳转的默认路由 name */
  defaultRoute?: string
}

export interface MenuNode {
  key: string
  label: string
  icon?: Component
  children?: MenuNode[]
}

/** 顶栏一级模块（2026-08-15 确认，共6个） */
export const PRIMARY_NAV: NavItem[] = [
  // 四个大屏（全屏独立，无侧栏）
  { key: 'bigscreen-situation', label: '安防态势', icon: GlobalOutlined, defaultRoute: 'BigscreenSituation' },
  { key: 'bigscreen-construction', label: '安防建设总览', icon: DesktopOutlined, defaultRoute: 'BigscreenConstruction' },
  { key: 'bigscreen-monitor', label: '实时监控中心', icon: EyeOutlined, defaultRoute: 'BigscreenMonitor' },
  { key: 'bigscreen-incident', label: '事件感知处置', icon: RadarChartOutlined, defaultRoute: 'BigscreenIncident' },
  // PC 后台（含侧栏）
  { key: 'business', label: '业务应用', icon: AppstoreOutlined, defaultRoute: 'PersonnelInfo' },
  { key: 'system', label: '系统管理', icon: SettingOutlined, defaultRoute: 'RegionList' },
]

/** 侧栏菜单：key 必须与路由 name 一致 */
export const SIDE_MENUS: Record<string, MenuNode[]> = {
  business: [
    // 预警管理（PRD-预警管理-预警工作台 V1.0）
    {
      key: 'alertManagement',
      label: '预警管理',
      icon: AlertOutlined,
      children: [
        { key: 'AlertWorkbench', label: '预警工作台' },
        { key: 'AlertRuleConfig', label: '预警规则配置' },
      ],
    },
    // 事件管理（PRD-事件管理-工作台 V1.0）
    {
      key: 'incidentManagement',
      label: '事件管理',
      icon: ExclamationCircleOutlined,
      children: [
        { key: 'IncidentWorkbench', label: '事件工作台' },
        { key: 'IncidentTypeConfig', label: '事件类型配置' },
      ],
    },
    // 人员管理（N16 功能点明细 2）
    {
      key: 'personnel',
      label: '人员管理',
      icon: TeamOutlined,
      children: [
        { key: 'PersonnelInfo', label: '用户信息' },
        { key: 'TempPersonnelManagement', label: '临时人员管理' },
        { key: 'ScheduleManagement', label: '排班管理' },
        { key: 'CampDeptManagement', label: '营地管理' },
        // { key: 'TeamManagement', label: '班组管理' }, // 暂时隐藏，待后续恢复
      ],
    },
    // 装备管理：8 类设备各自独立页面（N16 功能点明细 1）
    {
      key: 'equipment',
      label: '装备管理',
      icon: ToolOutlined,
      children: [
        { key: 'AntiUavList', label: '反无设备管理' },
        { key: 'CameraList', label: '高点摄像头管理' },
        { key: 'CctvList', label: 'CCTV管理' },
        { key: 'CUavList', label: 'C类无人机管理' },
        { key: 'CNestList', label: 'C类机巢管理' },
        { key: 'AUavList', label: 'A类无人机管理' },
        { key: 'RadarOpticList', label: '雷达光电管理（待确认）' },
        { key: 'VehicleList', label: '车辆管理（待确认）' },
        { key: 'HandheldList', label: '手持机终端管理（待确认）' },
      ],
    },
    {
      key: 'realtimeMonitor',
      label: '实时监控中心',
      icon: VideoCameraOutlined,
      children: [
        { key: 'VideoMonitor', label: '视频监控' },
        { key: 'UavMonitor', label: '无人机监控' },
        { key: 'UavRealtimeMonitor', label: '无人机实时监控' },
        { key: 'DroneCommandCenter', label: '无人机监控中心' },
        { key: 'AntiUavMonitor', label: '反无监控' },
        { key: 'AUavRealtimeMonitor', label: 'A类无人机实况' },
        { key: 'CUavRealtimeMonitor', label: 'C类无人机实况' },
        { key: 'CounterUasRealtimeMonitor', label: '反无系统实况' },
        { key: 'VehicleRealtimeMonitor', label: '车辆实况' },
      ],
    },
    {
      key: 'emergencyMaterial',
      label: '应急物资管理',
      icon: MedicineBoxOutlined,
      children: [
        { key: 'MaterialStorageManagement', label: '存放点管理' },
        { key: 'MaterialInventory', label: '物资台账' },
      ],
    },
    {
      key: 'counterUasRecords',
      label: '反无记录',
      icon: FileTextOutlined,
      children: [
        { key: 'CounterUasDetectionRecords', label: '探测记录' },
        { key: 'CounterUasIntrusionRecords', label: '入侵记录' },
        { key: 'CounterUasCountermeasureRecords', label: '反制记录' },
      ],
    },
  ],
  // 大屏顶栏无侧栏，占位防止 key 查找报错
  'bigscreen-situation': [],
  'bigscreen-construction': [],
  'bigscreen-monitor': [],
  'bigscreen-incident': [],
  system: [
    {
      key: 'basic',
      label: '基础数据',
      icon: DatabaseOutlined,
      children: [
        { key: 'RegionList', label: '区域' },
        { key: 'ResourceCategory', label: '资源类别' },
        { key: 'PlaceList', label: '场所' },
      ],
    },
    {
      key: 'auth',
      label: '权限',
      icon: SettingOutlined,
      children: [
        { key: 'MenuList', label: '菜单' },
        { key: 'RoleList', label: '角色' },
        { key: 'DeptList', label: '部门' },
        { key: 'UserList', label: '用户' },
      ],
    },
  ],
}

