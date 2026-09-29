import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    redirect: '/system/region',
    children: [
      {
        path: 'system/region',
        name: 'RegionList',
        component: () => import('@/views/system/RegionList.vue'),
        meta: { module: 'system', title: '区域' },
      },
      {
        path: 'system/user',
        name: 'UserList',
        component: () => import('@/views/system/UserList.vue'),
        meta: { module: 'system', title: '用户' },
      },
      {
        path: 'business/gps-monitor',
        name: 'GpsMonitor',
        component: () => import('@/views/business/GpsMonitor.vue'),
        meta: { module: 'business', title: '实时监控' },
      },
      // 事件管理 —— PRD-事件管理-工作台 V1.0
      {
        path: 'business/incident-workbench',
        name: 'IncidentWorkbench',
        component: () => import('@/views/business/IncidentWorkbench.vue'),
        meta: { module: 'business', title: '事件工作台' },
      },
      {
        path: 'business/incident/:id',
        name: 'IncidentDetail',
        component: () => import('@/views/business/IncidentDetail.vue'),
        meta: { module: 'business', title: '事件详情', activeMenu: 'IncidentWorkbench' },
      },
      {
        path: 'business/incident-type-config',
        name: 'IncidentTypeConfig',
        component: () => import('@/views/business/IncidentTypeConfig.vue'),
        meta: { module: 'business', title: '事件类型配置' },
      },
      // 预警管理 —— PRD-预警管理-预警工作台 V1.0
      {
        path: 'business/alert-rule-config',
        name: 'AlertRuleConfig',
        component: () => import('@/views/business/AlertRuleConfig.vue'),
        meta: { module: 'business', title: '预警规则配置' },
      },
      {
        path: 'business/alert-workbench',
        name: 'AlertWorkbench',
        component: () => import('@/views/business/AlertWorkbench.vue'),
        meta: { module: 'business', title: '预警工作台' },
      },
      {
        path: 'business/alert-investigation/:id',
        name: 'AlertInvestigation',
        component: () => import('@/views/business/AlertInvestigation.vue'),
        meta: { module: 'business', title: '预警研判', activeMenu: 'AlertWorkbench' },
      },
      {
        path: 'business/personnel-info',
        name: 'PersonnelInfo',
        component: () => import('@/views/business/PersonnelInfo.vue'),
        meta: { module: 'business', title: '用户信息' },
      },
      {
        path: 'business/temp-personnel',
        name: 'TempPersonnelManagement',
        component: () => import('@/views/business/TempPersonnelManagement.vue'),
        meta: { module: 'business', title: '临时人员管理' },
      },
      {
        path: 'business/schedule-management',
        name: 'ScheduleManagement',
        component: () => import('@/views/business/ScheduleManagement.vue'),
        meta: { module: 'business', title: '排班管理' },
      },
      {
        path: 'business/camp-dept',
        name: 'CampDeptManagement',
        component: () => import('@/views/business/CampDeptManagement.vue'),
        meta: { module: 'business', title: '营地与部门' },
      },
      // 班组管理 —— 暂时隐藏，待后续恢复
      // {
      //   path: 'business/team-management',
      //   name: 'TeamManagement',
      //   component: () => import('@/views/business/TeamManagement.vue'),
      //   meta: { module: 'business', title: '班组管理' },
      // },
      {
        path: 'equipment/c-uav',
        name: 'CUavList',
        component: () => import('@/views/equipment/CUavList.vue'),
        meta: { module: 'business', title: 'C类无人机管理' },
      },
      {
        path: 'equipment/c-uav/:id',
        name: 'CUavDetail',
        component: () => import('@/views/equipment/CUavDetail.vue'),
        meta: { module: 'business', title: 'C类无人机详情', activeMenu: 'CUavList' },
      },
      {
        path: 'equipment/c-nest',
        name: 'CNestList',
        component: () => import('@/views/equipment/CNestList.vue'),
        meta: { module: 'business', title: 'C类机巢管理' },
      },
      {
        path: 'equipment/c-nest/:id',
        name: 'CNestDetail',
        component: () => import('@/views/equipment/CNestDetail.vue'),
        meta: { module: 'business', title: 'C类机巢详情', activeMenu: 'CNestList' },
      },
      {
        path: 'equipment/a-uav',
        name: 'AUavList',
        component: () => import('@/views/equipment/AUavList.vue'),
        meta: { module: 'business', title: 'A类无人机管理' },
      },
      {
        path: 'equipment/a-uav/:sn',
        name: 'AUavDetail',
        component: () => import('@/views/equipment/AUavDetail.vue'),
        meta: { module: 'business', title: 'A类无人机详情', activeMenu: 'AUavList' },
      },
      {
        path: 'equipment/anti-uav',
        name: 'AntiUavList',
        component: () => import('@/views/equipment/AntiUavList.vue'),
        meta: { module: 'business', title: '反无设���管理' },
      },
      {
        path: 'equipment/camera',
        name: 'CameraList',
        component: () => import('@/views/equipment/CameraList.vue'),
        meta: { module: 'business', title: '高点摄像头管理' },
      },
      {
        path: 'equipment/cctv',
        name: 'CctvList',
        component: () => import('@/views/equipment/CctvList.vue'),
        meta: { module: 'business', title: 'CCTV管理' },
      },
      {
        path: 'business/material-storage',
        name: 'MaterialStorageManagement',
        component: () => import('@/views/business/MaterialStorageManagement.vue'),
        meta: { module: 'business', title: '存放点管理' },
      },
      {
        path: 'business/material-inventory',
        name: 'MaterialInventory',
        component: () => import('@/views/business/MaterialInventory.vue'),
        meta: { module: 'business', title: '物资台账' },
      },
      // 实时监控中心（PC版）—— 占位路由，待原型开发
      {
        path: 'monitor/video',
        name: 'VideoMonitor',
        component: () => import('@/views/monitor/VideoMonitor.vue'),
        meta: { module: 'business', title: '视频监控' },
      },
      {
        path: 'monitor/uav',
        name: 'UavMonitor',
        component: () => import('@/views/monitor/UavMonitor.vue'),
        meta: { module: 'business', title: '无人机监控' },
      },
      {
        path: 'monitor/anti-uav',
        name: 'AntiUavMonitor',
        component: () => import('@/views/monitor/AntiUavMonitor.vue'),
        meta: { module: 'business', title: '反无监控' },
      },
      {
        path: 'monitor/uav-realtime',
        name: 'UavRealtimeMonitor',
        component: () => import('@/views/monitor/UavRealtimeMonitor.vue'),
        meta: { module: 'business', title: '无人机实时监控' },
      },
      {
        path: 'monitor/drone-command',
        name: 'DroneCommandCenter',
        component: () => import('@/views/monitor/DroneCommandCenter.vue'),
        meta: { module: 'business', title: '无人机监控中心' },
      },
      {
        path: 'monitor/a-uav-realtime',
        name: 'AUavRealtimeMonitor',
        component: () => import('@/views/monitor/AUavRealtimeMonitor.vue'),
        meta: { module: 'business', title: 'A类无人机实况' },
      },
      {
        path: 'monitor/c-uav-realtime',
        name: 'CUavRealtimeMonitor',
        component: () => import('@/views/monitor/CUavRealtimeMonitor.vue'),
        meta: { module: 'business', title: 'C类无人机实况' },
      },
      {
        path: 'monitor/counter-uas-realtime',
        name: 'CounterUasRealtimeMonitor',
        component: () => import('@/views/monitor/CounterUasRealtimeMonitor.vue'),
        meta: { module: 'business', title: '反无系统实况' },
      },
      {
        path: 'monitor/vehicle-realtime',
        name: 'VehicleRealtimeMonitor',
        component: () => import('@/views/monitor/VehicleRealtimeMonitor.vue'),
        meta: { module: 'business', title: '车辆实况' },
      },
      {
        path: 'counter-uas-records/detection',
        name: 'CounterUasDetectionRecords',
        component: () => import('@/views/counter-uas-records/DetectionRecords.vue'),
        meta: { module: 'business', title: '探测记录' },
      },
      {
        path: 'counter-uas-records/intrusion',
        name: 'CounterUasIntrusionRecords',
        component: () => import('@/views/counter-uas-records/IntrusionRecords.vue'),
        meta: { module: 'business', title: '入侵记录' },
      },
      {
        path: 'counter-uas-records/countermeasure',
        name: 'CounterUasCountermeasureRecords',
        component: () => import('@/views/counter-uas-records/CountermeasureRecords.vue'),
        meta: { module: 'business', title: '反制记录' },
      },
    ],
  },
  // 大屏 — 事件感知处置（PRD-大屏-事件感知处置-预警.md V1.0）
  {
    path: '/bigscreen/incident',
    name: 'BigscreenIncident',
    component: () => import('@/views/bigscreen/BigscreenIncident.vue'),
    meta: { module: 'bigscreen-incident', title: '事件感知处置' },
  },
  {
    path: '/debug/a-uav',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'AUavDebug',
        component: () => import('@/views/debug/AUavDebug.vue'),
        meta: { title: 'A类无人机演示控制台' },
      },
    ],
  },
  {
    path: '/style-guide',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'StyleGuide',
        component: () => import('@/views/StyleGuide.vue'),
        meta: { title: '设计规范总览' },
      },
    ],
  },
  {
    path: '/placeholder/:name',
    name: 'Placeholder',
    component: () => import('@/views/PlaceholderPage.vue'),
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  if (to.matched.length === 0) {
    next({ name: 'Placeholder', params: { name: String(to.name ?? to.path) } })
    return
  }
  next()
})