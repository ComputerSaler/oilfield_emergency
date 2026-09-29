<script setup lang="ts">
/**
 * C 类机巢管理 —— 详情页
 * PRD V1.0 IS-02/IS-03/IS-04/IS-05、5.5 全部联动规则
 *
 * 单页滚动，无 Tab 切换。基本信息（9 个字段，只读）+ 6 组遥测卡片。
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useCNestDemoStore } from '@/stores/cNestDemo'
import {
  ACCESS_STATUS_LABEL, fmtDt, fmtHms, fmtCoord, fmtNum, fmtStorage, fmtZoom,
  campName, enumLabel, DASH, type AccessStatus,
  COVER_STATE_MAP, PUTTER_STATE_MAP, DRONE_IN_DOCK_MAP, CHARGE_STATE_MAP,
  RAINFALL_MAP, SWITCH_MAP, AI_MAP, DRONE_ONLINE_MAP,
} from '@/mock/cNest'

const route = useRoute()
const router = useRouter()
const demo = useCNestDemoStore()

const nestId = computed(() => String(route.params.id ?? ''))
const device = computed(() => demo.devices.find(d => d.nest_id === nestId.value))
const raw = computed(() => demo.telemetryById[nestId.value])
const accSt = computed<AccessStatus>(() => demo.accessStatusById[nestId.value] ?? 'OFFLINE')
const isLive = computed(() => accSt.value === 'ONLINE')

/**
 * liveT：在线时返回真实遥测，离线时返回 null。
 * 所有 fmtXxx(liveT?.field) 调用，值为 null 时统一返回 DASH，无需额外判断。
 */
const liveT = computed(() => isLive.value ? raw.value : null)

// ========================= 页头操作 =========================

const loading = ref(false)

function onRefresh() {
  loading.value = true
  setTimeout(() => { loading.value = false; message.success('数据已更新') }, 500)
}

function goMonitor() {
  router.push({
    name: 'Placeholder',
    params: { name: '实时监控中心 → 机巢监控' },
    query: { nest_id: nestId.value },
  })
}

// ========================= GIS Modal =========================

const gisVisible = ref(false)
const gisData = ref<{ title: string; name: string; lng: number; lat: number } | null>(null)

function showAlternateLandPoint() {
  if (!device.value || !liveT.value?.alternate_land_point_configured) return
  if (liveT.value.alternate_land_point_longitude == null) return
  gisData.value = {
    title: `备降点位置 — ${device.value.name}`,
    name: device.value.name,
    lng: liveT.value.alternate_land_point_longitude,
    lat: liveT.value.alternate_land_point_latitude!,
  }
  gisVisible.value = true
}

function closeGisModal() {
  gisVisible.value = false
  gisData.value = null
}

// ========================= 状态颜色映射 =========================

const accTone = computed<'ok' | 'danger'>(() =>
  accSt.value === 'ONLINE' ? 'ok' : 'danger',
)

function coverTone(val: number | null): 'ok' | 'info' | 'pending' | 'danger' {
  if (val == null) return 'mute' as any
  const map: Record<number, 'ok' | 'info' | 'pending' | 'danger'> = { 0: 'ok', 1: 'info', 2: 'pending', 3: 'danger' }
  return map[val] ?? 'mute' as any
}

function putterTone(val: number | null): 'ok' | 'info' | 'pending' | 'danger' {
  if (val == null) return 'mute' as any
  const map: Record<number, 'ok' | 'info' | 'pending' | 'danger'> = { 0: 'ok', 1: 'info', 2: 'pending', 3: 'danger' }
  return map[val] ?? 'mute' as any
}

function droneInDockTone(val: number | null): 'ok' | 'pending' {
  if (val == null) return 'mute' as any
  return val === 1 ? 'ok' : 'pending'
}

function chargeTone(val: number | null): 'info' | 'mute' {
  if (val == null) return 'mute'
  return val === 1 ? 'info' : 'mute'
}

function switchTone(val: number | null): 'info' | 'mute' {
  if (val == null) return 'mute'
  return val === 1 ? 'info' : 'mute'
}

function aiTone(val: number | null): 'info' | 'mute' {
  if (val == null) return 'mute'
  return val === 1 ? 'info' : 'mute'
}

function droneOnlineTone(val: number | null): 'ok' | 'danger' {
  if (val == null) return 'mute' as any
  return val === 1 ? 'ok' : 'danger'
}
</script>

<template>
  <PageContainer :title="`装备管理 / C 类机巢管理 / ${device?.name ?? nestId}`">

    <!-- 页头卡片 -->
    <PanelCard class="of-head">
      <div class="of-head__row">
        <div class="of-head__main">
          <span class="of-head__name">{{ device?.name ?? '--' }}</span>
          <StatusTag :tone="accTone">
            {{ ACCESS_STATUS_LABEL[accSt] }}
          </StatusTag>
        </div>
        <div class="of-head__tools">
          <a-button type="primary" @click="goMonitor">进入实时监控</a-button>
          <a-button :loading="loading" @click="onRefresh">
            <template #icon><ReloadOutlined /></template>
            手动刷新
          </a-button>
          <a-button @click="router.push({ name: 'CNestList' })">返回列表</a-button>
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
        <span class="of-block__title">基本信息</span>
        <StatusTag tone="info">AIRIOT 中台 · 只读</StatusTag>
      </div>
      <dl class="of-kv">
        <dt>名称</dt>
        <dd>{{ device?.name ?? DASH }}</dd>
        <dt>序列号</dt>
        <dd><code>{{ device?.serial_number ?? DASH }}</code></dd>
        <dt>所属营地</dt>
        <dd>{{ device ? campName(device.camp) : DASH }}</dd>
        <dt>固件版本</dt>
        <dd><code>{{ device?.firmware_version || DASH }}</code></dd>
        <dt>机巢位置</dt>
        <dd>{{ device ? `${fmtCoord(device.longitude)}, ${fmtCoord(device.latitude)}` : DASH }}</dd>
        <dt>在线状态</dt>
        <dd>
          <StatusTag :tone="accTone">{{ ACCESS_STATUS_LABEL[accSt] }}</StatusTag>
        </dd>
        <dt>报警状态</dt>
        <dd>{{ liveT?.alarm_state ?? DASH }}</dd>
        <dt>无人机在线</dt>
        <dd>
          <StatusTag v-if="liveT?.drone_online_state != null" :tone="droneOnlineTone(liveT.drone_online_state)">
            {{ enumLabel(liveT.drone_online_state, DRONE_ONLINE_MAP) }}
          </StatusTag>
          <span v-else>{{ DASH }}</span>
        </dd>
        <dt>最后更新</dt>
        <dd>{{ fmtDt(demo.lastUpdatedById[nestId]) }}</dd>
      </dl>
    </PanelCard>

    <!-- 遥测数据区：在线实时更新；离线保留卡片结构、数据点显示 -- -->
    <!-- 离线提示条 -->
    <PanelCard v-if="accSt === 'OFFLINE'" class="of-alert of-alert--warn" padding="10px 16px">
      <WarningOutlined class="of-alert__icon" />
      <span>机巢已离线，数据停止更新</span>
    </PanelCard>

    <!-- 数据最后更新时间 + 实时 dot -->
    <div class="of-freshness">
      <span class="of-freshness__label">数据最后更新：</span>
      <span class="of-freshness__time">{{ fmtHms(demo.lastUpdatedById[nestId]) }}</span>
      <span v-if="accSt === 'ONLINE'" class="of-freshness__live">
        <span class="of-live-dot" />
        实时
      </span>
    </div>

    <!-- 遥测卡片网格 -->
    <div class="of-tele-grid">

      <!-- G01 机巢状态 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">机巢状态</span></div>
        <dl class="of-kv">
          <dt>舱盖状态</dt>
          <dd>
            <StatusTag v-if="liveT?.cover_state != null" :tone="coverTone(liveT.cover_state)">
              {{ enumLabel(liveT.cover_state, COVER_STATE_MAP) }}
            </StatusTag>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>归中杆</dt>
          <dd>
            <StatusTag v-if="liveT?.putter_state != null" :tone="putterTone(liveT.putter_state)">
              {{ enumLabel(liveT.putter_state, PUTTER_STATE_MAP) }}
            </StatusTag>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>无人机在舱</dt>
          <dd>
            <StatusTag v-if="liveT?.drone_in_dock != null" :tone="droneInDockTone(liveT.drone_in_dock)">
              {{ enumLabel(liveT.drone_in_dock, DRONE_IN_DOCK_MAP) }}
            </StatusTag>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>充电状态</dt>
          <dd>
            <StatusTag v-if="liveT?.drone_charge_state != null" :tone="chargeTone(liveT.drone_charge_state)">
              {{ enumLabel(liveT.drone_charge_state, CHARGE_STATE_MAP) }}
            </StatusTag>
            <span v-else>{{ DASH }}</span>
          </dd>
        </dl>
      </PanelCard>

      <!-- G02 环境监测 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">环境监测</span></div>
        <dl class="of-kv">
          <dt>环境温度</dt><dd>{{ fmtNum(liveT?.environment_temperature, 0) }} <span v-if="liveT?.environment_temperature != null" class="of-unit">℃</span></dd>
          <dt>环境湿度</dt><dd>{{ fmtNum(liveT?.environment_humidity, 0) }} <span v-if="liveT?.environment_humidity != null" class="of-unit">%RH</span></dd>
          <dt>舱内温度</dt><dd>{{ fmtNum(liveT?.temperature, 0) }} <span v-if="liveT?.temperature != null" class="of-unit">℃</span></dd>
          <dt>舱内湿度</dt><dd>{{ fmtNum(liveT?.humidity, 0) }} <span v-if="liveT?.humidity != null" class="of-unit">%RH</span></dd>
          <dt>风速</dt><dd>{{ fmtNum(liveT?.wind_speed, 1) }} <span v-if="liveT?.wind_speed != null" class="of-unit">m/s</span></dd>
          <dt>降雨量</dt><dd>{{ enumLabel(liveT?.rainfall, RAINFALL_MAP) }}</dd>
        </dl>
      </PanelCard>

      <!-- G03 电池信息 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">电池信息</span></div>
        <dl class="of-kv">
          <dt>无人机电池</dt><dd>{{ fmtNum(liveT?.drone_capacity_percent, 0) }} <span v-if="liveT?.drone_capacity_percent != null" class="of-unit">%</span></dd>
          <dt>备用电池</dt><dd>{{ fmtNum(liveT?.backup_battery_remain_cap, 0) }} <span v-if="liveT?.backup_battery_remain_cap != null" class="of-unit">%</span></dd>
          <dt>备用电池温度</dt><dd>{{ fmtNum(liveT?.backup_battery_temperature, 1) }} <span v-if="liveT?.backup_battery_temperature != null" class="of-unit">℃</span></dd>
          <dt>备用电池电压</dt><dd>{{ fmtNum(liveT?.backup_battery_voltage, 2) }} <span v-if="liveT?.backup_battery_voltage != null" class="of-unit">v</span></dd>
          <dt>备用电池开关</dt>
          <dd>
            <StatusTag v-if="liveT?.backup_battery_switch != null" :tone="switchTone(liveT.backup_battery_switch)">
              {{ enumLabel(liveT.backup_battery_switch, SWITCH_MAP) }}
            </StatusTag>
            <span v-else>{{ DASH }}</span>
          </dd>
        </dl>
      </PanelCard>

      <!-- G04 备降点配置 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">备降点配置</span></div>
        <dl class="of-kv">
          <dt>配置状态</dt><dd>{{ liveT?.alternate_land_point_configured ? '已配置' : '未配置' }}</dd>
          <dt>备降点经度</dt><dd>{{ fmtCoord(liveT?.alternate_land_point_longitude) }}</dd>
          <dt>备降点纬度</dt><dd>{{ fmtCoord(liveT?.alternate_land_point_latitude) }}</dd>
          <dt>安全高度</dt><dd>{{ fmtNum(liveT?.alternate_land_point_safe_land_height, 0) }} <span v-if="liveT?.alternate_land_point_safe_land_height != null" class="of-unit">m</span></dd>
          <template v-if="liveT?.alternate_land_point_configured && liveT?.alternate_land_point_longitude != null">
            <dt></dt>
            <dd><a @click="showAlternateLandPoint">📍 查看</a></dd>
          </template>
        </dl>
      </PanelCard>

      <!-- G05 存储信息 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">存储信息</span></div>
        <dl class="of-kv">
          <dt>存储总容量</dt><dd>{{ fmtStorage(liveT?.storage_total) }}</dd>
          <dt>已使用</dt><dd>{{ fmtStorage(liveT?.storage_used) }}</dd>
        </dl>
      </PanelCard>

      <!-- G06 摄像头功能 -->
      <PanelCard class="of-block">
        <div class="of-block__head"><span class="of-block__title">摄像头功能</span></div>
        <dl class="of-kv">
          <dt>AI 识别</dt>
          <dd>
            <StatusTag v-if="liveT?.ai_enable_func != null" :tone="aiTone(liveT.ai_enable_func)">
              {{ enumLabel(liveT.ai_enable_func, AI_MAP) }}
            </StatusTag>
            <span v-else>{{ DASH }}</span>
          </dd>
          <dt>变焦倍数</dt><dd>{{ fmtZoom(liveT?.zoom_factor) }}</dd>
          <dt>红外变焦</dt><dd>{{ fmtZoom(liveT?.infrared_camera_zoom_factor) }}</dd>
        </dl>
      </PanelCard>

    </div><!-- /.of-tele-grid -->

    <!-- GIS Modal -->
    <a-modal
      v-model:open="gisVisible"
      :title="gisData?.title"
      :width="'80%'"
      :footer="null"
      :closable="false"
      wrap-class-name="of-gis-modal"
    >
      <div class="of-gis-container">
        <div class="of-gis-map">
          <div class="of-gis-placeholder">
            [ 地图组件待集成 ]<br>
            显示{{ gisData?.title?.includes('备降点') ? '备降点' : '机巢' }}位置标记点
          </div>
        </div>
        <div class="of-gis-footer">
          <div class="of-gis-info">
            <span class="of-gis-info__name">{{ gisData?.name }}</span>
            <span class="of-gis-info__coord">
              经度: {{ fmtCoord(gisData?.lng) }}, 纬度: {{ fmtCoord(gisData?.lat) }}
            </span>
          </div>
          <a-button @click="closeGisModal">关闭</a-button>
        </div>
      </div>
    </a-modal>

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
  }
  &__title { flex: 1; font-size: var(--of-font-size-base); font-weight: var(--of-font-weight-medium); }
}

// KV 展示
.of-kv {
  display: grid; grid-template-columns: 140px 1fr; gap: 10px 16px; margin: 0;
  dt { color: var(--of-text-secondary); font-size: var(--of-font-size-xs); }
  dd { margin: 0; font-size: var(--of-font-size-base); display: flex; gap: 4px; align-items: center; flex-wrap: wrap;
    code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px; }
  }
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

// 遥测卡片三栏自适应网格
.of-tele-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--of-spacing-4);
  align-items: start;
}

.of-unit { color: var(--of-text-quaternary); font-size: var(--of-font-size-xs); }

// GIS Modal 样式
.of-gis-container {
  display: flex;
  flex-direction: column;
  height: 80vh;
}

.of-gis-map {
  flex: 1;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--of-radius-base);
  margin-bottom: var(--of-spacing-3);
}

.of-gis-placeholder {
  color: #666;
  text-align: center;
  font-size: var(--of-font-size-base);
  line-height: 1.8;
}

.of-gis-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--of-spacing-3);
  background: #1f1f1f;
  border: 1px solid #303030;
  border-radius: var(--of-radius-base);
}

.of-gis-info {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-1);

  &__name {
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-primary);
  }

  &__coord {
    font-size: var(--of-font-size-sm);
    color: var(--of-text-secondary);
    font-family: 'SFMono-Regular', Consolas, monospace;
  }
}
</style>
