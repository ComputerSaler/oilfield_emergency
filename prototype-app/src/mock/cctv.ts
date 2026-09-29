/**
 * CCTV 管理 Mock 数据
 * 对应 PRD: 装备管理 · CCTV 管理 v1.0
 */

/**
 * CCTV 设备数据结构（PRD §4.1）
 * - 所有主数据字段（id/name/camp/site/server/ip/online）来自第三方视频平台
 * - 平台只读，严禁提供增删改入口（PRD §3.1 只读铁律）
 * - 经纬度为平台扩展字段，可通过「标记位置」功能编辑
 */
export interface CctvDevice {
  // ========== 三方系统只读字段 ==========
  /** 设备唯一标识符（主键）*/
  id: string
  /** 设备名称，如"东南角监控01" */
  name: string
  /** 营地ID */
  campId: string
  /** 营地名称，如"Agadem营地" */
  campName: string
  /** 站点名称（营地下的子区域），如"井场A""宿舍区" */
  siteName: string
  /** 服务器名称（NVR/DVR），如"NVR-01" */
  serverName: string
  /** IP地址，如"192.168.1.100" */
  ipAddress: string
  /** 在线状态：true=在线，false=离线 */
  online: boolean

  // ========== 平台扩展字段 ==========
  /** 经纬度坐标（可选，未标记时为 undefined）*/
  location?: {
    latitude: number
    longitude: number
  }
}

/**
 * Mock 数据：CCTV 设备列表
 * - 数据来源：第三方视频平台 → 中台转发 → 平台
 * - 平台无新增/编辑/删除能力（PRD §1.4）
 * - 原型阶段包含 15-20 条数据，覆盖多种场景
 */
export const MOCK_CCTV_DEVICES: CctvDevice[] = [
  // ============================ WAPCO总部营地 ============================
  {
    id: 'cctv_001_wapco_gate_main',
    name: '总部大门主摄像头',
    campId: 'camp_wapco',
    campName: 'WAPCO总部营地',
    siteName: '营地大门',
    serverName: 'NVR-WAPCO-01',
    ipAddress: '192.168.10.101',
    online: true,
    location: { latitude: 13.5135, longitude: 2.1142 },
  },
  {
    id: 'cctv_002_wapco_gate_side',
    name: '总部大门侧摄像头',
    campId: 'camp_wapco',
    campName: 'WAPCO总部营地',
    siteName: '营地大门',
    serverName: 'NVR-WAPCO-01',
    ipAddress: '192.168.10.102',
    online: true,
    location: { latitude: 13.5136, longitude: 2.1143 },
  },
  {
    id: 'cctv_003_wapco_parking',
    name: '总部停车场监控',
    campId: 'camp_wapco',
    campName: 'WAPCO总部营地',
    siteName: '停车场',
    serverName: 'NVR-WAPCO-02',
    ipAddress: '192.168.10.103',
    online: false,
    location: { latitude: 13.5138, longitude: 2.1140 },
  },
  {
    id: 'cctv_004_wapco_canteen',
    name: '总部食堂入口',
    campId: 'camp_wapco',
    campName: 'WAPCO总部营地',
    siteName: '食堂区',
    serverName: 'NVR-WAPCO-02',
    ipAddress: '192.168.10.104',
    online: true,
  },

  // ============================ CPF生产营地 ============================
  {
    id: 'cctv_005_cpf_gate',
    name: 'CPF营地大门',
    campId: 'camp_cpf',
    campName: 'CPF生产营地',
    siteName: '营地大门',
    serverName: 'NVR-CPF-01',
    ipAddress: '192.168.20.101',
    online: true,
    location: { latitude: 13.5140, longitude: 2.1125 },
  },
  {
    id: 'cctv_006_cpf_control_room',
    name: 'CPF控制室外围',
    campId: 'camp_cpf',
    campName: 'CPF生产营地',
    siteName: '中控室',
    serverName: 'NVR-CPF-01',
    ipAddress: '192.168.20.102',
    online: true,
    location: { latitude: 13.5141, longitude: 2.1126 },
  },
  {
    id: 'cctv_007_cpf_warehouse',
    name: 'CPF物资仓库',
    campId: 'camp_cpf',
    campName: 'CPF生产营地',
    siteName: '物资仓库',
    serverName: 'NVR-CPF-02',
    ipAddress: '192.168.20.103',
    online: false,
  },
  {
    id: 'cctv_008_cpf_perimeter_east',
    name: 'CPF东侧周界',
    campId: 'camp_cpf',
    campName: 'CPF生产营地',
    siteName: '周界巡逻',
    serverName: 'NVR-CPF-03',
    ipAddress: '192.168.20.104',
    online: true,
    location: { latitude: 13.5139, longitude: 2.1128 },
  },

  // ============================ 钻井营地A ============================
  {
    id: 'cctv_009_drilling_a_helipad',
    name: '钻井A停机坪',
    campId: 'camp_drilling_a',
    campName: '钻井营地A',
    siteName: '停机坪',
    serverName: 'NVR-DRILL-A-01',
    ipAddress: '192.168.30.101',
    online: true,
    location: { latitude: 13.5150, longitude: 2.1120 },
  },
  {
    id: 'cctv_010_drilling_a_well',
    name: '钻井A井口监控',
    campId: 'camp_drilling_a',
    campName: '钻井营地A',
    siteName: '井口区',
    serverName: 'NVR-DRILL-A-01',
    ipAddress: '192.168.30.102',
    online: true,
    location: { latitude: 13.5151, longitude: 2.1121 },
  },
  {
    id: 'cctv_011_drilling_a_dormitory',
    name: '钻井A宿舍区',
    campId: 'camp_drilling_a',
    campName: '钻井营地A',
    siteName: '宿舍区',
    serverName: 'NVR-DRILL-A-02',
    ipAddress: '192.168.30.103',
    online: false,
  },

  // ============================ Koulele营地 ============================
  {
    id: 'cctv_012_koulele_gate',
    name: 'Koulele营地大门',
    campId: 'camp_koulele',
    campName: 'Koulele营地',
    siteName: '营地大门',
    serverName: 'NVR-KOULELE-01',
    ipAddress: '192.168.40.101',
    online: true,
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: 'cctv_013_koulele_office',
    name: 'Koulele办公区',
    campId: 'camp_koulele',
    campName: 'Koulele营地',
    siteName: '办公区',
    serverName: 'NVR-KOULELE-01',
    ipAddress: '192.168.40.102',
    online: false,
  },

  // ============================ Dibeilla营地 ============================
  {
    id: 'cctv_014_dibeilla_perimeter',
    name: 'Dibeilla周界监控',
    campId: 'camp_dibeilla',
    campName: 'Dibeilla营地',
    siteName: '周界巡逻',
    serverName: 'NVR-DIBEILLA-01',
    ipAddress: '192.168.50.101',
    online: true,
    location: { latitude: 13.01792, longitude: 16.268188 },
  },
  {
    id: 'cctv_015_dibeilla_storage',
    name: 'Dibeilla物资存放点',
    campId: 'camp_dibeilla',
    campName: 'Dibeilla营地',
    siteName: '物资仓库',
    serverName: 'NVR-DIBEILLA-01',
    ipAddress: '192.168.50.102',
    online: true,
  },

  // ============================ Goumeri营地 ============================
  {
    id: 'cctv_016_goumeri_gate',
    name: 'Goumeri营地入口',
    campId: 'camp_goumeri',
    campName: 'Goumeri营地',
    siteName: '营地大门',
    serverName: 'NVR-GOUMERI-01',
    ipAddress: '192.168.60.101',
    online: false,
  },
  {
    id: 'cctv_017_goumeri_field',
    name: 'Goumeri井场监控',
    campId: 'camp_goumeri',
    campName: 'Goumeri营地',
    siteName: '井场B',
    serverName: 'NVR-GOUMERI-01',
    ipAddress: '192.168.60.102',
    online: true,
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
]
