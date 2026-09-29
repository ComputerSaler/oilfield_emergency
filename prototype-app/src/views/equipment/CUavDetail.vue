<script setup lang="ts">
/**
 * C 类无人机管理 —— 详情页
 * PRD V1.2 IS-02/IS-03/IS-04/IS-05、5.2 全部联动规则
 *
 * 单页滚动，无 Tab 切换。基本信息（4 个静态字段，只读）+ 13 组遥测卡片。
 * G13 红外相机仅具备红外能力的机型显示。
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { InfoCircleOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useCUavDemoStore } from '@/stores/cUavDemo'
import {
  ACCESS_STATUS_LABEL, fmtDt, fmtHms, fmtTotalFlight, fmtRemain, fmtStorage,
  fmtCoord, fmtNum, fmtZoom, modeCodeLabel, modeCodeGroup, modelHasIr,
  campName, modelName, nestName, DASH, type AccessStatus,
} from '@/mock/cUav'

const route = useRoute()
const router = useRouter()
const demo = useCUavDemoStore()

const deviceId = computed(() => String(route.params.id ?? ''))
const device   = computed(() => demo.devices.find(d => d.device_id === deviceId.value))
const raw      = computed(() => demo.telemetryById[deviceId.value])
const accSt    = computed<AccessStatus>(() => demo.accessStatusById[deviceId.value] ?? 'OFFLINE')
const isLive   = computed(() => accSt.value === 'ONLINE')
const hasIr    = computed(() => device.value ? modelHasIr(device.value.model_code) : false)

/**
 * liveT：在线时返回真实遥测，离线时返回 null。
 * 所有 fmtXxx(liveT?.field) 调用，值为 null 时统一返回 DASH，无需额外判断。
 */
const liveT = computed(() => isLive.value ? raw.value : null)

// ========================= 页头操作 =========================

const loading = ref(false)

function onRefresh() {
  loading.value = true
  setTimeout(() => { loading.value = false; message.success('已刷新') }, 500)
}

function goMonitor() {
  router.push({
    name: 'Placeholder',
    params: { name: '实时监控中心' },
    query: { device_id: deviceId.value },
  })
}

// ========================= 状态颜色映射 =========================

const accTone = computed<'ok' | 'mute'>(() =>
  accSt.value === 'ONLINE' ? 'ok' : 'mute',
)

const flightGroupTone = computed<'ok' | 'info' | 'danger' | 'mute'>(() => {
  const g = modeCodeGroup(liveT.value?.mode_code)
  return g ? (({ ground: 'mute', flying: 'ok', return: 'info', special: 'danger' }[g] ?? 'mute') as 'ok' | 'info' | 'danger' | 'mute') : 'mute'
})

// ========================= G01 核心状态 =========================
const hasAlarm = computed(() => liveT.value?.alarm_status === 1)

// ========================= G03 电量 =========================
const battPct = computed(() => liveT.value?.battery_capacity_percent ?? null)
const battDanger = computed(() => battPct.value != null && battPct.value <= 10)
const battWarn   = computed(() => battPct.value != null && battPct.value <= 20 && !battDanger.value)

// ========================= G05 RTK =========================
const rtkConvergeFailed = computed(() => liveT.value?.position_state_is_fixed === 3)

// ========================= G07 飞行限制 =========================
const nearDist   = computed(() => liveT.value?.is_near_distance_limit === 1)
const nearArea   = computed(() => (liveT.value?.is_near_area_limit ?? 0) !== 0)
const nearHeight = computed(() => (liveT.value?.is_near_height_limit ?? 0) !== 0)

// ========================= G08 存储 =========================
const storageUsePct = computed(() => {
  const t = liveT.value?.storage_total, u = liveT.value?.storage_used
  if (!t || u == null) return null
  return Math.round((u / t) * 100)
})
const storageDanger = computed(() => storageUsePct.value != null && storageUsePct.value >= 90)

// ========================= G09 信号 =========================
const signal4gBars = computed(() => {
  const q = liveT.value?.wireless_link_4g_uav_quality
  if (q == null) return null
  return Math.min(5, Math.max(0, Math.round(q / 20)))
})

// ========================= G12 激光测距 =========================
const laserOn   = computed(() => liveT.value?.measure_target_error_state === 1)
const laserDash = '--（激光测距已关闭）'

// ========================= 枚举标签辅助 =========================

function enumLabel(val: number | null | undefined, map: Record<number, string>): string {
  if (val == null) return DASH
  return map[val] ?? `未知（${val}）`
}

const COORD_SYS_MAP   = { 0: 'WGS84', 1: 'RTK 移动站' }
const FIX_STA_MAP     = { 0: '未 fix', 1: 'fix' }
const QUALITY_MAP     = { 1: '1 档', 2: '2 档', 3: '3 档', 4: '4 档', 5: '5 档' }
const INPOS_MAP       = { 0: '没有在位置', 1: '在位置' }
const RTK_USED_MAP    = { 0: '没有使用', 1: '在使用' }
const IS_FIXED_MAP    = { 0: '未开始', 1: '收敛中', 2: '收敛成功', 3: '收敛失败' }
const DIST_ST_MAP     = { 0: '未设置', 1: '已设置' }
const ALARM_MAP       = { 0: '未告警', 1: '有告警' }
const NIGHT_MAP       = { 0: '关闭', 1: '打开' }
const RID_WORK_MAP    = { 0: '关闭', 1: '开启', 3: '自检异常' }
const OBST_MAP        = { 0: '关闭', 1: '打开' }
const AI_MAP          = { 0: '关闭', 1: '开启' }
const LASER_SW_MAP    = { 0: '关闭', 1: '开启' }
</script>

<template>
  <PageContainer :title="`装备管理 / C 类无人机管理 / ${device?.name ?? deviceId}`">

    <!-- 页头卡片 -->
    <PanelCard class="of-head">
      <div class="of-head__row">
        <div class="of-head__main">
          <span class="of-head__name">{{ device?.name ?? '--' }}</span>
          <StatusTag :tone="accTone">
            {{ ACCESS_STATUS_LABEL[accSt] }}
          </StatusTag>
          <template v-if="isLive">
            <StatusTag :tone="flightGroupTone">
              {{ modeCodeLabel(liveT?.mode_code) }}
            </StatusTag>
          </template>
        </div>
        <div class="of-head__tools">
          <a-tooltip :title="isLive ? undefined : '设备离线，无法进入全屏监控'">
            <a-button :disabled="!isLive" @click="goMonitor">进入全屏监控</a-button>
          </a-tooltip>
          <a-button :loading="loading" @click="onRefresh">
            <template #icon><ReloadOutlined /></template>
            手动刷新
          </a-button>
          <a-button @click="router.push({ name: 'CUavList' })">返回列表</a-button>
        </div>
      </div>

      <!-- 中台连接异常 -->
      <div v-if="!demo.midPlatformOk" class="of-head__note of-head__note--warn">
        <WarningOutlined /> 中台连接异常，数据可能不是最新
      </div>
    </PanelCard>

    <!-- 设备基本信息（只读，来自中台同步） -->
    <PanelCard class="of-block">
      <div class="of-block__head">
        <span class="of-block__title">设备基本信息</span>
        <StatusTag tone="info">AIRIOT 中台 · 只读</StatusTag>
      </div>
      <dl class="of-kv">
        <dt>序列号</dt>
        <dd><code>{{ device?.serial_no ?? DASH }}</code></dd>
        <dt>所属营地</dt>
        <dd>{{ device ? campName(device.camp_code) : DASH }}</dd>
        <dt>机巢</dt>
        <dd>{{ nestName(device?.nest_id) }}</dd>
        <dt>机型</dt>
        <dd>{{ device ? modelName(device.model_code) : DASH }}</dd>
        <dt>固件版本</dt>
        <dd><code>{{ device?.firmware_version || DASH }}</code></dd>
        <dt>最后同步时间</dt>
        <dd>{{ fmtDt(device?.last_sync_at) }}</dd>
      </dl>
    </PanelCard>

    <!-- 遥测数据区：在线实时更新；离线保留卡片结构、数据点显示 -- -->
    <!-- 离线提示条 -->
    <PanelCard v-if="accSt === 'OFFLINE'" class="of-alert of-alert--warn" padding="10px 16px">
      <WarningOutlined class="of-alert__icon" />
      <span>设备已离线，数据停止更新</span>
    </PanelCard>

    <!-- 数据最后更新时间 + 实时 dot -->
    <div class="of-freshness">
      <span class="of-freshness__label">数据最后更新：</span>
      <span class="of-freshness__time">{{ fmtHms(demo.lastUpdatedById[deviceId]) }}</span>
      <span v-if="accSt === 'ONLINE'" class="of-freshness__live">
        <span class="of-live-dot" />
        实时
      </span>
    </div>

    <!-- 遥测卡片网格 -->
    <div class="of-tele-grid">

      <!-- G01 核心状态 -->
      <PanelCard class="of-block" :class="{ 'of-block--alarm': hasAlarm }">
        <div class="of-block__head" :class="{ 'of-block__head--alarm': hasAlarm }">
          <span class="of-block__title">G01 核心状态</span>
        </div>
        <dl class="of-kv">
          <dt>无人机状态</dt>
          <dd>
            <StatusTag v-if="liveT" :tone="flightGroupTone">{{ modeCodeLabel(liveT.mode_code) }}</StatusTag>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>告警状态</dt>
          <dd>
            <StatusTag v-if="liveT" :tone="liveT.alarm_status === 1 ? 'danger' : 'ok'">
              {{ enumLabel(liveT.alarm_status, ALARM_MAP) }}
            </StatusTag>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>激活时间</dt>
          <dd>{{ fmtDt(liveT?.activation_time) }}</dd>
          <dt>
            累计飞行时长
            <a-tooltip :title="`原始值：${liveT?.total_flight_time ?? DASH} 秒`">
              <InfoCircleOutlined class="of-kv__info" />
            </a-tooltip>
          </dt>
          <dd>{{ fmtTotalFlight(liveT?.total_flight_time) }}</dd>
        </dl>
      </PanelCard>

      <!-- G02 飞行数据 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G02 飞行数据</span></div>
        <dl class="of-kv">
          <dt>相对起飞点高度</dt><dd>{{ fmtNum(liveT?.elevation, 1) }} <span v-if="liveT?.elevation != null" class="of-unit">m</span></dd>
          <dt>海拔高度</dt><dd>{{ fmtNum(liveT?.height, 1) }} <span v-if="liveT?.height != null" class="of-unit">m</span></dd>
          <dt>
            椭球高
            <a-tooltip title="WGS-84 椭球高，与海拔高度有差异"><InfoCircleOutlined class="of-kv__info" /></a-tooltip>
          </dt>
          <dd>{{ fmtNum(liveT?.hae, 2) }} <span v-if="liveT?.hae != null" class="of-unit">m</span></dd>
          <dt>水平速度</dt><dd>{{ fmtNum(liveT?.horizontal_speed, 1) }} <span v-if="liveT?.horizontal_speed != null" class="of-unit">m/s</span></dd>
          <dt>垂直速度</dt><dd>{{ fmtNum(liveT?.vertical_speed, 1) }} <span v-if="liveT?.vertical_speed != null" class="of-unit">m/s</span></dd>
          <dt>距离 Home 点</dt><dd>{{ fmtNum(liveT?.home_distance, 0) }} <span v-if="liveT?.home_distance != null" class="of-unit">m</span></dd>
        </dl>
      </PanelCard>

      <!-- G03 电量续航 -->
      <PanelCard class="of-block" :class="{ 'of-block--alarm': battDanger }">
        <div class="of-block__head" :class="{ 'of-block__head--alarm': battDanger }">
          <span class="of-block__title">G03 电量续航</span>
        </div>
        <dl class="of-kv">
          <dt>剩余电量</dt>
          <dd class="of-battery-cell">
            <template v-if="battPct != null">
              <div class="of-battery-bar">
                <div class="of-battery-bar__fill"
                  :class="{ 'of-battery-bar__fill--danger': battDanger, 'of-battery-bar__fill--warn': battWarn }"
                  :style="{ width: battPct + '%' }"
                />
              </div>
              <span :class="{ 'of-text--danger': battDanger, 'of-text--warn': battWarn }">{{ battPct }}%</span>
            </template>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>剩余飞行时间</dt>
          <dd>{{ fmtRemain(liveT?.battery_remain_flight_time) }}</dd>
        </dl>
      </PanelCard>

      <!-- G04 主位置 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G04 主位置</span></div>
        <dl class="of-kv">
          <dt>纬度</dt><dd>{{ fmtCoord(liveT?.latitude) }}</dd>
          <dt>经度</dt><dd>{{ fmtCoord(liveT?.longitude) }}</dd>
        </dl>
      </PanelCard>

      <!-- G05 RTK 精准定位 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G05 RTK 精准定位</span></div>
        <dl class="of-kv">
          <dt>坐标系</dt><dd>{{ enumLabel(liveT?.position_state_coordinate_sys, COORD_SYS_MAP) }}</dd>
          <dt>校准状态</dt><dd>{{ liveT?.position_state_calibration ?? DASH }}</dd>
          <dt>RTK fix 状态</dt><dd>{{ enumLabel(liveT?.position_state_fix_sta, FIX_STA_MAP) }}</dd>
          <dt>GPS 搜星数量</dt><dd>{{ liveT?.position_state_gps_number ?? DASH }}</dd>
          <dt>搜星档位</dt><dd>{{ enumLabel(liveT?.position_state_quality, QUALITY_MAP) }}</dd>
          <dt>RTK 搜星数量</dt><dd>{{ liveT?.position_state_rtk_number ?? DASH }}</dd>
          <dt>RTK 高度</dt><dd>{{ fmtNum(liveT?.position_state_rtk_hgt, 2) }} <span v-if="liveT?.position_state_rtk_hgt != null" class="of-unit">m</span></dd>
          <dt>RTK 纬度</dt><dd>{{ fmtCoord(liveT?.position_state_rtk_lat) }}</dd>
          <dt>RTK 经度</dt><dd>{{ fmtCoord(liveT?.position_state_rtk_lon) }}</dd>
          <dt>RTK 模块是否在位置</dt><dd>{{ enumLabel(liveT?.position_state_rtk_inpos, INPOS_MAP) }}</dd>
          <dt>RTK 使用状态</dt><dd>{{ enumLabel(liveT?.position_state_rtk_used, RTK_USED_MAP) }}</dd>
          <dt>是否收敛</dt>
          <dd :class="{ 'of-text--danger': rtkConvergeFailed }">
            {{ enumLabel(liveT?.position_state_is_fixed, IS_FIXED_MAP) }}
          </dd>
        </dl>
      </PanelCard>

      <!-- G06 姿态/云台 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G06 姿态 / 云台</span></div>
        <dl class="of-kv">
          <dt>偏航轴角度（机身）</dt><dd>{{ fmtNum(liveT?.attitude_head, 1) }} <span v-if="liveT?.attitude_head != null" class="of-unit">°</span></dd>
          <dt>俯仰轴角度（机身）</dt><dd>{{ fmtNum(liveT?.attitude_pitch, 1) }} <span v-if="liveT?.attitude_pitch != null" class="of-unit">°</span></dd>
          <dt>横滚轴角度（机身）</dt><dd>{{ fmtNum(liveT?.attitude_roll, 1) }} <span v-if="liveT?.attitude_roll != null" class="of-unit">°</span></dd>
          <dt>云台俯仰角度</dt><dd>{{ fmtNum(liveT?.gimbal_pitch, 1) }} <span v-if="liveT?.gimbal_pitch != null" class="of-unit">°</span></dd>
          <dt>云台横滚角度</dt><dd>{{ fmtNum(liveT?.gimbal_roll, 1) }} <span v-if="liveT?.gimbal_roll != null" class="of-unit">°</span></dd>
          <dt>云台偏航角度</dt><dd>{{ fmtNum(liveT?.gimbal_yaw, 1) }} <span v-if="liveT?.gimbal_yaw != null" class="of-unit">°</span></dd>
        </dl>
      </PanelCard>

      <!-- G07 飞行限制 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G07 飞行限制</span></div>
        <dl class="of-kv">
          <dt>无人机限高</dt><dd>{{ fmtNum(liveT?.height_limit, 0) }} <span v-if="liveT?.height_limit != null" class="of-unit">m</span></dd>
          <dt>限远距离</dt><dd>{{ fmtNum(liveT?.distance_limit, 0) }} <span v-if="liveT?.distance_limit != null" class="of-unit">m</span></dd>
          <dt>限远是否开启</dt><dd>{{ enumLabel(liveT?.distance_limit_state, DIST_ST_MAP) }}</dd>
          <dt>是否接近限制距离</dt>
          <dd :class="{ 'of-text--warn': nearDist }">{{ liveT?.is_near_distance_limit ?? DASH }}</dd>
          <dt>是否接近区域限制</dt>
          <dd :class="{ 'of-text--warn': nearArea }">{{ liveT?.is_near_area_limit ?? DASH }}</dd>
          <dt>是否接近高度限制</dt>
          <dd :class="{ 'of-text--warn': nearHeight }">{{ liveT?.is_near_height_limit ?? DASH }}</dd>
        </dl>
      </PanelCard>

      <!-- G08 存储 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G08 存储</span></div>
        <dl class="of-kv">
          <dt>存储类型</dt><dd>{{ liveT?.storage_type ?? DASH }}</dd>
          <dt>存储总容量</dt><dd>{{ fmtStorage(liveT?.storage_total) }}</dd>
          <dt>已使用容量</dt>
          <dd class="of-storage-cell">
            <template v-if="storageUsePct != null">
              <div class="of-battery-bar">
                <div class="of-battery-bar__fill"
                  :class="{ 'of-battery-bar__fill--danger': storageDanger }"
                  :style="{ width: storageUsePct + '%' }"
                />
              </div>
              <span :class="{ 'of-text--danger': storageDanger }">
                {{ fmtStorage(liveT?.storage_used) }}（{{ storageUsePct }}%）
              </span>
            </template>
            <span v-else>{{ DASH }}</span>
          </dd>
        </dl>
      </PanelCard>

      <!-- G09 信号/通信 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G09 信号 / 通信</span></div>
        <dl class="of-kv">
          <dt>无人机 4G 信号质量</dt>
          <dd>
            <span v-if="signal4gBars != null" class="of-signal">
              <span v-for="i in 5" :key="i" class="of-signal__bar" :class="{ 'of-signal__bar--on': i <= signal4gBars }" />
            </span>
            <span v-else>{{ DASH }}</span>
            <span v-if="liveT?.wireless_link_4g_uav_quality != null" class="of-unit">{{ liveT.wireless_link_4g_uav_quality }}</span>
          </dd>
          <dt>图传信号强度</dt><dd>{{ liveT?.air_link_signal_strength ?? DASH }}</dd>
          <dt>夜航灯状态</dt><dd>{{ enumLabel(liveT?.night_lights_state, NIGHT_MAP) }}</dd>
          <dt>
            RID 状态
            <a-tooltip title="无人机广播身份标识状态，具体枚举由中台补充配置">
              <InfoCircleOutlined class="of-kv__info" />
            </a-tooltip>
          </dt>
          <dd>{{ liveT?.rid_state ?? DASH }}</dd>
          <dt>RemoteId 工作状态</dt>
          <dd :class="{ 'of-text--danger': liveT?.remote_id_status === 3 }">
            {{ enumLabel(liveT?.remote_id_status, RID_WORK_MAP) }}
          </dd>
        </dl>
      </PanelCard>

      <!-- G10 避障 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G10 避障</span></div>
        <dl class="of-kv">
          <dt>下方避障</dt><dd>{{ enumLabel(liveT?.obstacle_avoidance_downside, OBST_MAP) }}</dd>
          <dt>水平避障</dt><dd>{{ enumLabel(liveT?.obstacle_avoidance_horizon, OBST_MAP) }}</dd>
          <dt>上方避障</dt><dd>{{ enumLabel(liveT?.obstacle_avoidance_upside, OBST_MAP) }}</dd>
        </dl>
      </PanelCard>

      <!-- G11 光学相机 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G11 光学相机</span></div>
        <dl class="of-kv">
          <dt>可见光变焦倍数</dt><dd>{{ fmtZoom(liveT?.zoom_factor) }}</dd>
          <dt>AI 识别启用状态</dt><dd>{{ enumLabel(liveT?.ai_enable_func, AI_MAP) }}</dd>
        </dl>
      </PanelCard>

      <!-- G12 激光测距 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">G12 激光测距</span></div>
        <dl class="of-kv">
          <dt>激光测距开关</dt><dd>{{ enumLabel(liveT?.measure_target_error_state, LASER_SW_MAP) }}</dd>
          <dt>测距目标距离</dt><dd>{{ laserOn ? fmtNum(liveT?.measure_target_distance, 1) + (liveT?.measure_target_distance != null ? ' m' : '') : laserDash }}</dd>
          <dt>测距目标经度</dt><dd>{{ laserOn ? fmtCoord(liveT?.measure_target_longitude) : laserDash }}</dd>
          <dt>测距目标纬度</dt><dd>{{ laserOn ? fmtCoord(liveT?.measure_target_latitude) : laserDash }}</dd>
          <dt>测距目标高度</dt><dd>{{ laserOn ? fmtNum(liveT?.measure_target_altitude, 1) + (liveT?.measure_target_altitude != null ? ' m' : '') : laserDash }}</dd>
        </dl>
      </PanelCard>

      <!-- G13 红外相机（仅具备红外能力的机型） -->
      <PanelCard v-if="hasIr" class="of-block of-block--wide">
        <div class="of-block__head">
          <span class="of-block__title">G13 红外相机</span>
          <StatusTag tone="info">⚠️ 仅红外机型</StatusTag>
        </div>
        <!-- 未挂载红外负载但机型有 IR 能力（E-10） -->
        <template v-if="liveT && liveT.infrared_camera_average_temp == null">
          <div class="of-ir-empty">
            <a-tooltip title="暂无数据，请确认设备是否挂载红外相机">
              <span>-- <InfoCircleOutlined style="margin-left:4px; cursor: help;" /></span>
            </a-tooltip>
          </div>
        </template>
        <dl v-else class="of-kv of-kv--wide">
          <dt>平均温度</dt><dd>{{ fmtNum(liveT?.infrared_camera_average_temp, 1) }} <span v-if="liveT?.infrared_camera_average_temp != null" class="of-unit">°C</span></dd>
          <dt>中心温度</dt><dd>{{ fmtNum(liveT?.infrared_camera_center_temp, 1) }} <span v-if="liveT?.infrared_camera_center_temp != null" class="of-unit">°C</span></dd>
          <dt>最低温度</dt>
          <dd class="of-text--cold">{{ fmtNum(liveT?.infrared_camera_cold_temp, 1) }} <span v-if="liveT?.infrared_camera_cold_temp != null" class="of-unit">°C</span></dd>
          <dt>最高温度</dt>
          <dd class="of-text--hot">{{ fmtNum(liveT?.infrared_camera_hot_temp, 1) }} <span v-if="liveT?.infrared_camera_hot_temp != null" class="of-unit">°C</span></dd>
          <dt>表面温度</dt><dd>{{ fmtNum(liveT?.infrared_camera_touch_temp, 1) }} <span v-if="liveT?.infrared_camera_touch_temp != null" class="of-unit">°C</span></dd>
          <dt>最低温点坐标</dt>
          <dd>
            <template v-if="liveT?.infrared_camera_cold_x != null">({{ liveT.infrared_camera_cold_x }}, {{ liveT.infrared_camera_cold_y }}) px</template>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>最高温点坐标</dt>
          <dd>
            <template v-if="liveT?.infrared_camera_hot_x != null">({{ liveT.infrared_camera_hot_x }}, {{ liveT.infrared_camera_hot_y }}) px</template>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>红外变焦倍数</dt><dd>{{ fmtZoom(liveT?.infrared_camera_zoom_factor) }}</dd>
        </dl>
      </PanelCard>

      <!-- G13 机型无红外能力提示（E-04） -->
      <PanelCard v-if="!hasIr && device" class="of-block">
        <div class="of-block__head"><span class="of-block__title">G13 红外相机</span></div>
        <div class="of-ir-unavailable">
          当前机型（{{ modelName(device.model_code) }}）的红外能力未知或不具备，红外数据不展示
        </div>
      </PanelCard>

    </div><!-- /.of-tele-grid -->

  </PageContainer>
</template>

<style scoped lang="scss">
// 页头
.of-head {
  display: flex; flex-direction: column; gap: var(--of-spacing-2);

  &__row { display: flex; flex-wrap: wrap; gap: var(--of-spacing-3); align-items: center; justify-content: space-between; }
  &__main { display: flex; flex-wrap: wrap; gap: var(--of-spacing-2); align-items: center; }
  &__name { font-size: var(--of-font-size-lg); font-weight: var(--of-font-weight-medium); }
  &__tools { display: flex; flex-shrink: 0; gap: var(--of-spacing-2); align-items: center; }
  &__note {
    padding: 6px 10px; font-size: var(--of-font-size-xs);
    border-left: 3px solid transparent; border-radius: var(--of-radius-sm);
    &--warn { color: var(--of-color-warning); background: rgba(250,173,20,.08); border-left-color: var(--of-color-warning); }
  }
}

// 告警条
.of-alert { display: flex; gap: var(--of-spacing-2); align-items: center; border-left: 3px solid transparent;
  &__icon { flex-shrink: 0; font-size: 16px; }
  &--warn { border-left-color: var(--of-color-warning); .of-alert__icon { color: var(--of-color-warning); } }
}

// 区块通用
.of-block {
  &__head {
    display: flex; flex-wrap: wrap; gap: var(--of-spacing-2); align-items: center;
    padding: var(--of-spacing-3); margin: calc(var(--of-spacing-4) * -1) calc(var(--of-spacing-4) * -1) var(--of-spacing-3);
    background: rgba(255,255,255,.03); border-bottom: var(--of-border-width) solid var(--of-border-table);
    &--alarm { background: rgba(255,102,102,.08); border-bottom-color: var(--of-color-error); }
  }
  &__title { flex: 1; font-size: var(--of-font-size-base); font-weight: var(--of-font-weight-medium); }
  &--alarm { box-shadow: 0 0 0 1px var(--of-color-error) inset; }
  &--wide { grid-column: 1 / -1; }
}

// KV 展示
.of-kv {
  display: grid; grid-template-columns: 140px 1fr; gap: 10px 16px; margin: 0;
  dt { color: var(--of-text-secondary); font-size: var(--of-font-size-xs); display: flex; gap: 4px; align-items: center; }
  dd { margin: 0; font-size: var(--of-font-size-base); display: flex; gap: 4px; align-items: center; flex-wrap: wrap;
    code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px; }
  }
  &--wide { grid-template-columns: 160px 1fr 160px 1fr; }
  &__info { color: var(--of-text-quaternary); cursor: help; }
}

// 数据新鲜度条
.of-freshness {
  display: flex; gap: var(--of-spacing-2); align-items: center;
  padding: var(--of-spacing-2) var(--of-spacing-4);
  font-size: var(--of-font-size-xs); color: var(--of-text-quaternary);
  &__time { color: var(--of-text-secondary); }
  &__live { display: flex; gap: 6px; align-items: center; color: var(--of-color-success); }
}

.of-live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--of-color-success);
  box-shadow: 0 0 6px var(--of-color-success);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

// 遥测卡片三栏自适应网格，G13 独占整行
.of-tele-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--of-spacing-4);
  align-items: start;
}

// 电量/存储进度条
.of-battery-cell, .of-storage-cell { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.of-battery-bar {
  width: 80px; height: 10px; background: rgba(255,255,255,.12);
  border-radius: 5px; overflow: hidden; flex-shrink: 0;
  &__fill { height: 100%; background: var(--of-color-success); border-radius: 5px; transition: width .5s;
    &--warn   { background: var(--of-color-warning); }
    &--danger { background: var(--of-color-error); }
  }
}

// 4G 信号格图标
.of-signal { display: inline-flex; align-items: flex-end; gap: 2px; height: 16px; margin-right: 6px;
  &__bar {
    width: 4px; background: rgba(255,255,255,.25); border-radius: 1px;
    &:nth-child(1) { height: 4px; }
    &:nth-child(2) { height: 7px; }
    &:nth-child(3) { height: 10px; }
    &:nth-child(4) { height: 13px; }
    &:nth-child(5) { height: 16px; }
    &--on { background: var(--of-color-success); }
  }
}

// 颜色辅助
.of-text--danger { color: var(--of-color-error); }
.of-text--warn   { color: var(--of-color-warning); }
.of-text--cold   { color: #6ecff6; }
.of-text--hot    { color: #ff8c42; }
.of-unit         { color: var(--of-text-quaternary); font-size: var(--of-font-size-xs); }

// 红外组辅助
.of-ir-empty       { padding: var(--of-spacing-2) 0; color: var(--of-text-quaternary); font-size: var(--of-font-size-xs); }
.of-ir-unavailable { padding: var(--of-spacing-2) 0; color: var(--of-text-quaternary); font-size: var(--of-font-size-xs); font-style: italic; }
</style>
