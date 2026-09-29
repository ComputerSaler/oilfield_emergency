<script setup lang="ts">
/**
 * A 类无人机演示控制台 —— 路由 #/debug/a-uav
 *
 * 只存在于原型，正式实现中不存在。
 * 用途：PRD 有 6 种接入状态、60 条异常规则、6 种角色权限，
 * 其中「同步中断 / WS 断开 / 心跳超时 / 视频断流」等链路态无法靠 mock 数据静态呈现，
 * 本页提供开关让评审时现场触发，然后切回业务页观察效果。
 */
import { useRouter } from 'vue-router'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { normalize } from '@/mock/aUavNormalize'
import {
  ROLES,
  useAUavDemoStore,
  type VideoState,
  type WsState,
} from '@/stores/aUavDemo'
import { fmtDateTime } from '@/utils/aUavFormat'

const router = useRouter()
const demo = useAUavDemoStore()

// 当前数据转换结果（用于显示状态快照）
const allDrones = () =>
  normalize(undefined, {
    listLoadState: demo.listLoadState,
    managementStatusBySn: demo.managementStatusBySn,
    disableInfoBySn: demo.disableInfoBySn,
    archiveInfoBySn: demo.archiveInfoBySn,
    onlineOverrideBySn: demo.onlineOverrideBySn,
    extOverrideBySn: demo.extOverrideBySn,
  })

// ======================== WS 状态操作 ========================

function setWsState(s: WsState) {
  if (s === 'CONNECTED') demo.wsReconnect()
  else demo.wsState = s
}

// ======================== 视频态操作 ========================

const VIDEO_STATES: { value: VideoState; label: string }[] = [
  { value: 'AVAILABLE', label: '可播放' },
  { value: 'PREPARING', label: '流准备中（E-47）' },
  { value: 'INTERRUPTED', label: '断流（E-48）' },
  { value: 'UNAVAILABLE', label: '流不可用（E-49）' },
  { value: 'PROTOCOL_UNSUPPORTED', label: '协议不支持（E-51）' },
]
</script>

<template>
  <PageContainer title="A 类无人机 · 演示控制台">
    <PanelCard class="of-debug-banner">
      <ExclamationCircleOutlined class="of-debug-banner__icon" />
      本页面仅用于原型评审演示，正式实现中不存在。
      切换各开关后请点击按钮前往业务页观察效果。
      <a-button type="primary" size="small" @click="router.push({ name: 'AUavList' })">
        前往列表页
      </a-button>
      <a-button size="small" @click="demo.resetDemo()">恢复全部默认</a-button>
    </PanelCard>

    <div class="of-debug-cols">
      <!-- 左栏：角色 + 接入链路 + WS + 视频 -->
      <div class="of-debug-col">
        <!-- 角色切换 -->
        <PanelCard class="of-section">
          <div class="of-section__title">当前角色（PRD 7.8 权限矩阵）</div>
          <a-radio-group v-model:value="demo.roleKey" size="small">
            <a-radio-button v-for="r in ROLES" :key="r.key" :value="r.key">
              {{ r.label }}
            </a-radio-button>
          </a-radio-group>
          <div class="of-section__meta">
            <div class="of-perm-grid">
              <span v-for="[k, v] in Object.entries(demo.perms)" :key="k">
                <span :class="v ? 'of-perm--ok' : 'of-perm--no'">{{ v ? '✓' : '✗' }}</span>
                {{ {list:'查询',detail:'详情',editExt:'编辑扩展',disable:'停用/启用',archive:'归档/恢复',video:'视频',monitorCenter:'监控中心',accessAdmin:'接入管理',equipAdmin:'装备管理员+'}[k] }}
              </span>
            </div>
          </div>
        </PanelCard>

        <!-- 接入链路 -->
        <PanelCard class="of-section">
          <div class="of-section__title">数据源接口可达性（E-21 / E-31）</div>
          <div class="of-debug-row">
            <a-radio-group v-model:value="demo.listLoadState" size="small">
              <a-radio-button :value="false">可达</a-radio-button>
              <a-radio-button :value="true">不可达</a-radio-button>
            </a-radio-group>
          </div>
          <div class="of-section__note">
            铁律（E-21）：接口不可达时一律判「同步中断」，禁止判为「源端已删除」
          </div>

          <div class="of-section__title" style="margin-top:12px">列表加载态（E-34 / E-38 / E-40）</div>
          <a-radio-group v-model:value="demo.listLoadState" size="small">
            <a-radio-button value="OK">正常</a-radio-button>
            <a-radio-button value="FAILED">加载失败（E-38）</a-radio-button>
            <a-radio-button value="EMPTY_SOURCE">源返回空列表/200（E-34）</a-radio-button>
          </a-radio-group>
        </PanelCard>

        <!-- WS 状态 -->
        <PanelCard class="of-section">
          <div class="of-section__title">WebSocket 链路（IS-07 / PRD 3.3）</div>
          <div class="of-debug-row">
            <a-button
              v-for="ws in [{v:'CONNECTED',l:'已连接'},{v:'CONNECT_FAILED',l:'建连失败（E-33）'},{v:'DISCONNECTED',l:'中途断开（E-34）'}] as const"
              :key="ws.v"
              :type="demo.wsState === ws.v ? 'primary' : 'default'"
              size="small"
              @click="setWsState(ws.v)"
            >
              {{ ws.l }}
            </a-button>
          </div>
          <div class="of-debug-row">
            <a-checkbox v-model:checked="demo.wsSimEnabled">
              启用实时推送模拟（每 4s 随机翻转一台在线状态并高亮，列表页可见）
            </a-checkbox>
          </div>
          <div class="of-section__note">
            PRD 验收 A-11：首屏 REST 快照，不等 WS 首帧。
            A-12：断开后提示；重连成功后服务端全量重推，前端整体覆盖，禁止增量合并。
            A-13：连续 {{ 3 }} 个通信周期（合计 {{ 90 }}s）未上数判离线，可区分平台超时判定与源系统推送。
          </div>
        </PanelCard>
      </div>

      <!-- 右栏：飞机状态 + 视频 + 位置 + 审计 -->
      <div class="of-debug-col">
        <!-- 按飞机覆盖接入状态 -->
        <PanelCard class="of-section">
          <div class="of-section__title">飞机接入状态（3.2 状态机）</div>
          <div v-for="d in allDrones()" :key="d.drone_sn" class="of-debug-drone">
            <code class="of-debug-drone__sn">{{ d.drone_sn }}</code>
            <span class="of-debug-drone__name">{{ d.aircraft_name ?? '--' }}</span>
            <StatusTag
              :tone="d.management_status==='NORMAL'?'ok':d.management_status==='DISABLED'?'mute':'mute'"
            >
              {{ {NORMAL:'正常',DISABLED:'已停用',ARCHIVED:'已归档'}[d.management_status as string] }}
            </StatusTag>
            <a-button
              type="link"
              size="small"
              @click="router.push({ name: 'AUavDetail', params: { sn: d.drone_sn } })"
            >
              详情
            </a-button>
          </div>
          <div class="of-section__note">
            A-000 源端已删除（所有站返回记录不存在）；A-005 人工停用；A-009 已归档
          </div>
        </PanelCard>

        <!-- 视频 + 位置 -->
        <PanelCard class="of-section">
          <div class="of-section__title">详情页 · 视频态（A-004 飞行中）</div>
          <a-radio-group v-model:value="demo.videoState" size="small">
            <a-radio-button v-for="vs in VIDEO_STATES" :key="vs.value" :value="vs.value">
              {{ vs.label }}
            </a-radio-button>
          </a-radio-group>

          <div class="of-section__title" style="margin-top:12px">详情页 · 位置预览（A-004）</div>
          <a-radio-group v-model:value="demo.positionFault" size="small">
            <a-radio-button value="NONE">正常</a-radio-button>
            <a-radio-button value="NO_COORD">无坐标（E-14，验收 A-19）</a-radio-button>
            <a-radio-button value="UNKNOWN_CRS">坐标系未知（E-15）</a-radio-button>
          </a-radio-group>
        </PanelCard>

        <!-- 操作审计 -->
        <PanelCard class="of-section">
          <div class="of-section__title">操作审计日志（E-58）</div>
          <div class="of-audit">
            <div v-if="demo.audits.length === 0" class="of-audit__empty">暂无操作记录</div>
            <div v-for="(a, i) in demo.audits.slice(0, 15)" :key="i" class="of-audit__item">
              <span class="of-audit__time">{{ fmtDateTime(a.at) }}</span>
              <span class="of-audit__actor">{{ a.actor }}</span>
              <span class="of-audit__action">{{ a.action }}</span>
              <code class="of-audit__target">{{ a.target }}</code>
              <span class="of-audit__detail">{{ a.detail }}</span>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  </PageContainer>
</template>

<style scoped lang="scss">
.of-debug-banner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--of-spacing-2) var(--of-spacing-3);
  align-items: center;
  color: var(--of-color-warning);
  border-left: 3px solid var(--of-color-warning);
  background: rgba(250, 173, 20, 0.07);

  &__icon { font-size: 16px; flex-shrink: 0; }
}

.of-debug-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--of-spacing-4);
  align-items: start;
}

.of-debug-col {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-4);
}

.of-section {
  &__title {
    font-size: var(--of-font-size-xs);
    font-weight: var(--of-font-weight-medium);
    color: var(--of-text-secondary);
    margin-bottom: var(--of-spacing-2);
  }

  &__note {
    margin-top: var(--of-spacing-2);
    font-size: var(--of-font-size-xs);
    line-height: 18px;
    color: var(--of-text-quaternary);
  }

  &__meta {
    margin-top: var(--of-spacing-2);
  }
}

.of-perm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 12px;
  font-size: var(--of-font-size-xs);
  color: var(--of-text-secondary);
}

.of-perm--ok { color: var(--of-color-success); }
.of-perm--no { color: var(--of-color-error); }

.of-debug-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--of-spacing-2);
  align-items: center;
  margin-bottom: var(--of-spacing-2);
}

.of-debug-drone {
  display: flex;
  flex-wrap: wrap;
  gap: var(--of-spacing-2);
  align-items: center;
  padding: 4px 0;
  border-bottom: var(--of-border-width) solid var(--of-border-table);

  &__sn {
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 12px;
    color: var(--of-color-accent-ice);
  }

  &__name {
    flex: 1;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-secondary);
  }
}

.of-audit {
  max-height: 260px;
  overflow-y: auto;

  &__empty {
    padding: 16px 0;
    text-align: center;
    font-size: var(--of-font-size-xs);
    color: var(--of-text-quaternary);
  }

  &__item {
    display: grid;
    grid-template-columns: 140px 80px 70px 70px 1fr;
    gap: 4px;
    padding: 4px 0;
    font-size: var(--of-font-size-xs);
    border-bottom: var(--of-border-width) solid var(--of-border-table);
  }

  &__time, &__detail { color: var(--of-text-quaternary); }
  &__actor { color: var(--of-text-secondary); }
  &__action { color: var(--of-color-link); }
  &__target {
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 11px;
    color: var(--of-color-accent-ice);
  }
}
</style>
