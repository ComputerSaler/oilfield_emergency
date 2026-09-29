/**
 * 高点摄像头管理 Mock 数据
 * 对应 PRD: 装备管理 · 高点摄像头管理 v1.0
 */

/**
 * 摄像头通道数据结构（PRD 2 术语定义）
 * - 通道（Channel）是第三方视频系统中一个可独立寻址的视频码流单元
 * - 一台双光谱高点摄像头通常注册为两条独立通道（可见光 + 热成像）
 * - 通道与物理设备的归并关系由中台提供，平台不做推导
 */
export interface CameraChannel {
  /** 编号：全局唯一标识符，主键 */
  id: string
  /** 名称：通道在第三方视频系统中的注册名称 */
  name: string
  /** 在线状态：由中台判定并推送，平台只读 */
  online: boolean
  /** 所属营地ID：由中台提供，用于设备归并 */
  campId: string
  /** 所属营地名称：由中台提供 */
  campName: string
  /** 设备组标识：由中台提供或前端按规则推导，用于将多个通道归并为一个物理设备 */
  deviceGroup?: string
  /** 位置信息：经纬度 */
  location?: {
    latitude: number
    longitude: number
  }
}

/**
 * Mock 数据：高点摄像头通道列表
 * - 数据来源：第三方视频系统 → 中台转发 → 平台
 * - 平台无新增/编辑/删除能力（PRD 1.4）
 * - 原型阶段简化：按名称前缀分组归并为物理设备
 */
export const MOCK_CAMERA_CHANNELS: CameraChannel[] = [
  // ============================ 现场真实数据（优先展示）============================
  {
    id: '205qy8h7uwh5yijo43q89uqt45h',
    name: '可见光通道',
    online: false,
    campId: 'camp_koulele',
    campName: 'Koulele 营地',
    deviceGroup: 'Koulele高点（现场）',
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: '20f47qyh384fhq24837ha',
    name: '热成像通道',
    online: false,
    campId: 'camp_koulele',
    campName: 'Koulele 营地',
    deviceGroup: 'Koulele高点（现场）',
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: 'd2j0j20dj9ht8923r1r',
    name: '热成像通道',
    online: false,
    campId: 'camp_dibeilla',
    campName: 'Dibeilla 营地',
    deviceGroup: 'Dibeilla高点（现场）',
    location: { latitude: 13.01792, longitude: 16.268188 },
  },
  {
    id: 'acm39q85uancxn9W9',
    name: '可见光通道',
    online: false,
    campId: 'camp_dibeilla',
    campName: 'Dibeilla 营地',
    deviceGroup: 'Dibeilla高点（现场）',
    location: { latitude: 13.01792, longitude: 16.268188 },
  },
  {
    id: '67a42c1d6a946cfa834bde01',
    name: '热成像通道',
    online: false,
    campId: 'camp_jaouro',
    campName: 'Jaouro 营地',
    deviceGroup: 'Jaouro高点（现场）',
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: '67a42c2e6a946cfa834bde03',
    name: '可见光通道',
    online: false,
    campId: 'camp_jaouro',
    campName: 'Jaouro 营地',
    deviceGroup: 'Jaouro高点（现场）',
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: 'so93qfag819301u321',
    name: '热成像通道',
    online: false,
    campId: 'camp_sokor',
    campName: 'Sokor 营地',
    deviceGroup: 'Sokor高点（现场）',
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: 'so94y3qerhg5q37ysu46qy',
    name: '可见光通道',
    online: false,
    campId: 'camp_sokor',
    campName: 'Sokor 营地',
    deviceGroup: 'Sokor高点（现场）',
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: '89j4ngvq348y954gq233f',
    name: '可见光通道',
    online: false,
    campId: 'camp_goumeri',
    campName: 'Goumeri 营地',
    deviceGroup: 'Goumeri高点（现场）',
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: 'u8j945h8g2h43r4gd233d',
    name: '热成像通道',
    online: false,
    campId: 'camp_goumeri',
    campName: 'Goumeri 营地',
    deviceGroup: 'Goumeri高点（现场）',
    location: { latitude: 13.314151, longitude: 15.691731 },
  },
  {
    id: '3a8f92be1c7d4e9ab2f5c6d8e1a3b4c5',
    name: '东南角高点-可见光',
    online: true,
    campId: 'camp_wapco',
    campName: 'WAPCO总部营地',
    deviceGroup: '东南角高点',
    location: { latitude: 13.5135, longitude: 2.1142 },
  },
  {
    id: '4b9g03cf2d8e5f0bc3g6d9e2b4c6d7e8',
    name: '东南角高点-热成像',
    online: true,
    campId: 'camp_wapco',
    campName: 'WAPCO总部营地',
    deviceGroup: '东南角高点',
    location: { latitude: 13.5135, longitude: 2.1142 },
  },
  {
    id: '5c0h14dg3e9f6g1cd4h7e0f3c5d7e8f9',
    name: '西北角高点-可见光',
    online: true,
    campId: 'camp_wapco',
    campName: 'WAPCO总部营地',
    deviceGroup: '西北角高点',
    location: { latitude: 13.5145, longitude: 2.1108 },
  },
  {
    id: '6d1i25eh4f0g7h2de5i8f1g4d6e8f9g0',
    name: '西北角高点-热成像',
    online: false,
    campId: 'camp_wapco',
    campName: 'WAPCO总部营地',
    deviceGroup: '西北角高点',
    location: { latitude: 13.5145, longitude: 2.1108 },
  },
  {
    id: '7e2j36fi5g1h8i3ef6j9g2h5e7f9g0h1',
    name: '营地大门-可见光',
    online: true,
    campId: 'camp_cpf',
    campName: 'CPF生产营地',
    deviceGroup: '营地大门',
    location: { latitude: 13.5140, longitude: 2.1125 },
  },
  {
    id: '8f3k47gj6h2i9j4fg7k0h3i6f8g0h1i2',
    name: '营地大门-热成像',
    online: true,
    campId: 'camp_cpf',
    campName: 'CPF生产营地',
    deviceGroup: '营地大门',
    location: { latitude: 13.5140, longitude: 2.1125 },
  },
  {
    id: '9g4l58hk7i3j0k5gh8l1i4j7g9h1i2j3',
    name: '周界巡航-可见光',
    online: true,
    campId: 'camp_cpf',
    campName: 'CPF生产营地',
    deviceGroup: '周界巡航',
    location: { latitude: 13.5138, longitude: 2.1130 },
  },
  {
    id: '0h5m69il8j4k1l6hi9m2j5k8h0i2j3k4',
    name: '周界巡航-热成像',
    online: false,
    campId: 'camp_cpf',
    campName: 'CPF生产营地',
    deviceGroup: '周界巡航',
    location: { latitude: 13.5138, longitude: 2.1130 },
  },
  {
    id: '1i6n70jm9k5l2m7ij0n3k6l9i1j3k4l5',
    name: '停机坪监控-可见光',
    online: true,
    campId: 'camp_drilling_a',
    campName: '钻井营地A',
    deviceGroup: '停机坪监控',
    location: { latitude: 13.5150, longitude: 2.1120 },
  },
  {
    id: '2j7o81kn0l6m3n8jk1o4l7m0j2k4l5m6',
    name: '停机坪监控-热成像',
    online: true,
    campId: 'camp_drilling_a',
    campName: '钻井营地A',
    deviceGroup: '停机坪监控',
    location: { latitude: 13.5150, longitude: 2.1120 },
  },
  {
    id: '3k8p92lo1m7n4o9kl2p5m8n1k3l5m6n7',
    name: '物资仓库-可见光',
    online: true,
    campId: 'camp_drilling_a',
    campName: '钻井营地A',
    deviceGroup: '物资仓库',
    location: { latitude: 13.5132, longitude: 2.1115 },
  },
  {
    id: '4l9q03mp2n8o5p0lm3q6n9o2l4m6n7o8',
    name: '物资仓库-热成像',
    online: false,
    campId: 'camp_drilling_a',
    campName: '钻井营地A',
    deviceGroup: '物资仓库',
    location: { latitude: 13.5132, longitude: 2.1115 },
  },
]
