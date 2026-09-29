/**
 * 调度卡片生成工具
 * 支持三种格式：纯文本 / 图片 / 系统任务
 */

import type { Alert } from '@/types/alert'
import type { UavDevice } from '@/types/drone'
import { AlertLevel } from '@/types/alert'
import { UavStatus, UavClass } from '@/types/drone'

/**
 * 预警类型对应的任务要求模板
 */
const TASK_REQUIREMENTS: Record<string, string[]> = {
  intrusion: [
    '立即派遣无人机前往现场确认，重点关注：',
    '• 入侵人员数量、装备、移动方向',
    '• 是否携带工具/武器',
    '• 车辆信息（如有）',
    '• 入侵路径与可能目标',
  ],
  theft: [
    '立即派遣无人机前往现场确认，重点关注：',
    '• 盗窃人员数量与特征',
    '• 被盗物资种类与数量',
    '• 逃离方向与交通工具',
    '• 现场遗留痕迹',
  ],
  equipment_damage: [
    '立即派遣无人机前往现场勘察，重点关注：',
    '• 设备损坏程度与范围',
    '• 是否存在次生危险（泄漏/火灾）',
    '• 周边设施受影响情况',
    '• 维修通道可达性',
  ],
  sos: [
    '立即派遣无人机前往现场支援，重点关注：',
    '• 求助人员位置与状态',
    '• 周边环境危险因素',
    '• 最佳救援路径',
    '• 是否需要地面力量协同',
  ],
  vehicle: [
    '立即派遣无人机追踪目标车辆，重点关注：',
    '• 车辆型号、颜色、车牌',
    '• 行驶方向与速度',
    '• 车内人员数量',
    '• 是否偏离预定路线',
  ],
  default: [
    '立即派遣无人机前往现场确认，重点关注：',
    '• 现场人员与车辆情况',
    '• 异常活动与安全隐患',
    '• 周边环境变化',
    '• 需要重点观察的目标',
  ],
}

/**
 * 根据预警描述智能推断预警类型
 */
function inferAlertType(alert: Alert): string {
  const desc = (alert.description || '').toLowerCase()
  const title = (alert.title || '').toLowerCase()
  const text = `${title} ${desc}`

  if (text.includes('入侵') || text.includes('翻越') || text.includes('闯入')) {
    return 'intrusion'
  }
  if (text.includes('盗窃') || text.includes('偷') || text.includes('失窃')) {
    return 'theft'
  }
  if (text.includes('损坏') || text.includes('破坏') || text.includes('泄漏')) {
    return 'equipment_damage'
  }
  if (text.includes('sos') || text.includes('求助') || text.includes('救援')) {
    return 'sos'
  }
  if (text.includes('车辆') || text.includes('车') || text.includes('追踪')) {
    return 'vehicle'
  }
  return 'default'
}

/**
 * 计算两点之间的直线距离（km）
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // 地球半径（km）
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 计算预计到达时间（分钟）
 */
function calculateArrivalTime(distance: number, uavClass: UavClass): number {
  // A类平均速度 35m/s，C类平均速度 25m/s
  const speed = uavClass === UavClass.ClassA ? 35 : 25
  const timeInSeconds = (distance * 1000) / speed
  return Math.ceil(timeInSeconds / 60)
}

/**
 * 推荐无人机数据结构
 */
interface RecommendedDrone {
  drone: UavDevice
  distance: number
  arrivalTime: number
  recommended: boolean
  reason?: string
}

/**
 * 推荐无人机算法
 */
export function recommendDrones(
  alert: Alert,
  allDrones: UavDevice[]
): RecommendedDrone[] {
  if (!alert.coords) return []

  const results: RecommendedDrone[] = []

  for (const drone of allDrones) {
    if (!drone.telemetry?.position) continue

    // 计算距离
    const distance = calculateDistance(
      alert.coords.lat,
      alert.coords.lng,
      drone.telemetry.position.lat,
      drone.telemetry.position.lng
    )

    // 计算预计到达时间
    const arrivalTime = calculateArrivalTime(distance, drone.uavClass)

    // 判断是否推荐
    let recommended = true
    let reason: string | undefined

    // 状态检查
    if (drone.status === UavStatus.Fault) {
      recommended = false
      reason = '设备故障中'
    } else if (drone.status === UavStatus.Offline) {
      recommended = false
      reason = '设备离线'
    } else if (drone.status === UavStatus.AlertResponse) {
      recommended = false
      reason = '正在响应其他告警'
    } else if (drone.telemetry.battery < 20) {
      recommended = false
      reason = `电量仅${drone.telemetry.battery}%，无法支撑往返`
    } else if (drone.status === UavStatus.Charging && drone.telemetry.battery < 50) {
      recommended = false
      reason = `充电中，电量${drone.telemetry.battery}%`
    }

    results.push({
      drone,
      distance,
      arrivalTime,
      recommended,
      reason,
    })
  }

  // 排序：推荐的在前，按距离升序
  results.sort((a, b) => {
    if (a.recommended !== b.recommended) {
      return a.recommended ? -1 : 1
    }
    return a.distance - b.distance
  })

  return results
}

/**
 * 获取等级emoji和文本
 */
function getAlertLevelDisplay(level: AlertLevel): { emoji: string; text: string } {
  switch (level) {
    case AlertLevel.High:
      return { emoji: '🔴', text: '高危' }
    case AlertLevel.Medium:
      return { emoji: '🟠', text: '中危' }
    case AlertLevel.Low:
      return { emoji: '🟡', text: '低危' }
    default:
      return { emoji: '⚪', text: '未知' }
  }
}

/**
 * 判断是否为夜间（18:00-6:00）
 */
function isNightTime(): boolean {
  const hour = new Date().getHours()
  return hour >= 18 || hour < 6
}

/**
 * 检查预警点周边是否有禁飞区/敏感区域
 * TODO: Phase 6 对接真实GIS数据
 */
function checkNearbyRestrictedAreas(alert: Alert): string[] {
  const warnings: string[] = []

  // Mock逻辑：根据营地名称模拟
  if (alert.location.includes('围界')) {
    warnings.push('预警点周边2km内存在禁飞区，注意避让')
  }

  if (isNightTime()) {
    warnings.push('当前时段: 夜间作业，注意开启夜航灯')
  }

  return warnings
}

/**
 * 查询历史预警（简化版）
 * TODO: Phase 6 对接真实历史数据
 */
function getHistoricalAlerts(_alert: Alert): string | null {
  // Mock逻辑：随机返回
  const random = Math.random()
  if (random > 0.5) {
    const count = Math.floor(Math.random() * 5) + 1
    return `该区域近30天内发生过${count}次类似预警`
  }
  return null
}

/**
 * 生成纯文本格式调度卡片
 */
export function generateTextCard(
  alert: Alert,
  drones: UavDevice[],
  commander?: { name: string; phone: string }
): string {
  const levelDisplay = getAlertLevelDisplay(alert.level)
  const alertType = inferAlertType(alert)
  const taskRequirements = TASK_REQUIREMENTS[alertType] || TASK_REQUIREMENTS.default
  const recommendedDrones = recommendDrones(alert, drones)
  const safetyWarnings = checkNearbyRestrictedAreas(alert)
  const historicalInfo = getHistoricalAlerts(alert)

  const lines: string[] = []

  // 顶部分隔线
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`🚨 紧急调度任务 ${alert.id}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('')

  // 一、基本信息区
  lines.push(`📍 位置：${alert.location}`)
  if (alert.coords) {
    lines.push(`   坐标：${alert.coords.lat.toFixed(6)}°N, ${alert.coords.lng.toFixed(6)}°E`)
  }
  lines.push(`⏰ 时间：${alert.createdAt ? new Date(alert.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) : alert.time}`)
  lines.push(`${levelDisplay.emoji} 等级：${levelDisplay.text}`)
  lines.push(`📡 来源：${alert.source}`)
  lines.push('')

  // 二、现场情况区
  if (alert.description) {
    lines.push('━━━ 现场情况 ━━━')
    lines.push(alert.description)
    lines.push('')
  }

  // 三、任务要求区
  lines.push('━━━ 任务要求 ━━━')
  taskRequirements.forEach(line => lines.push(line))
  lines.push('')

  // 四、推荐资源区
  lines.push('━━━ 推荐无人机 ━━━')

  const recommendedList = recommendedDrones.filter(r => r.recommended).slice(0, 3)
  const notRecommendedList = recommendedDrones.filter(r => !r.recommended).slice(0, 2)

  if (recommendedList.length > 0) {
    recommendedList.forEach((item, index) => {
      const { drone, distance, arrivalTime } = item
      const battery = drone.telemetry.battery
      const statusText = drone.status === UavStatus.Available ? '待命中' :
                         drone.status === UavStatus.Charging ? '充电中' :
                         drone.status === UavStatus.Flying ? '在飞中' : '可用'

      lines.push(`✅ ${drone.name} (${drone.uavClass === UavClass.ClassA ? 'A类' : 'C类'})`)
      lines.push(`   距离: ${distance.toFixed(1)}km | 预计${arrivalTime}分钟到达`)
      lines.push(`   电量: ${battery}% | 状态: ${statusText}`)
      if (drone.camp) {
        lines.push(`   所属营地: ${drone.camp}`)
      }
      if (index < recommendedList.length - 1) {
        lines.push('')
      }
    })
  } else {
    lines.push('⚠️ 当前无可用无人机')
  }

  // 不推荐的无人机
  if (notRecommendedList.length > 0) {
    lines.push('')
    notRecommendedList.forEach(item => {
      const { drone, reason } = item
      lines.push(`❌ ${drone.name} (${drone.uavClass === UavClass.ClassA ? 'A类' : 'C类'}) - 不推荐`)
      lines.push(`   原因: ${reason}`)
    })
  }
  lines.push('')

  // 五、飞行安全提示区
  if (safetyWarnings.length > 0) {
    lines.push('━━━ 注意事项 ━━━')
    safetyWarnings.forEach(warning => lines.push(`⚠️ ${warning}`))
    lines.push('')
  }

  // 六、操作指引区
  lines.push('━━━ 飞手操作流程 ━━━')
  lines.push('1. 接收任务后立即响应确认')
  lines.push('2. 检查无人机电量与设备状态')
  lines.push('3. 按推荐航线前往预警点')
  lines.push('4. 到达后开启视频回传')
  lines.push('5. 按任务要求重点观察并实时汇报')
  lines.push('6. 等待指挥员指令（持续跟踪/返航）')
  lines.push('')

  // 七、联系信息区（可选）
  if (commander) {
    lines.push('━━━ 联系方式 ━━━')
    lines.push(`指挥员: ${commander.name}`)
    lines.push(`联系方式: ${commander.phone}`)
    lines.push('')
  }

  // 九、历史参考（可选）
  if (historicalInfo) {
    lines.push(`📊 ${historicalInfo}`)
    lines.push('')
  }

  // 八、底部元信息
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`卡片生成时间: ${new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return lines.join('\n')
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

/**
 * 生成图片格式调度卡片
 * 尺寸: 750x1200px (竖版，适合手机查看)
 */
export async function generateImageCard(
  alert: Alert,
  drones: UavDevice[],
  commander?: { name: string; phone: string }
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 750
  canvas.height = 1600  // 增加高度以容纳截图
  const ctx = canvas.getContext('2d')!

  // 背景渐变（深色科技感）
  const bgGradient = ctx.createLinearGradient(0, 0, 0, 1600)
  bgGradient.addColorStop(0, '#0a1929')
  bgGradient.addColorStop(1, '#1a2332')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, 750, 1600)

  // 顶部告警条（根据等级显示不同颜色）
  const levelDisplay = getAlertLevelDisplay(alert.level)
  let headerColor = '#ff4757' // 高危红色
  if (alert.level === AlertLevel.Medium) {
    headerColor = '#ff6b35' // 中危橙色
  } else if (alert.level === AlertLevel.Low) {
    headerColor = '#ffc107' // 低危黄色
  }

  const headerGradient = ctx.createLinearGradient(0, 0, 750, 0)
  headerGradient.addColorStop(0, headerColor)
  headerGradient.addColorStop(1, shadeColor(headerColor, -20))
  ctx.fillStyle = headerGradient
  ctx.fillRect(0, 0, 750, 100)

  // 顶部文字
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('🚨 紧急调度任务', 375, 55)

  // 任务ID
  ctx.font = '18px "Consolas", monospace'
  ctx.fillText(alert.id, 375, 85)

  // 当前Y坐标
  let yPos = 130

  // 绘制卡片容器
  const cardPadding = 30
  const cardWidth = 750 - cardPadding * 2

  // ==================== 基本信息区 ====================
  yPos = drawSectionTitle(ctx, '基本信息', yPos, cardPadding)

  // 等级标签（大字号、彩色背景）
  ctx.fillStyle = headerColor
  roundRect(ctx, cardPadding, yPos, 120, 50, 8)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(levelDisplay.emoji + ' ' + levelDisplay.text, cardPadding + 60, yPos + 33)

  // 位置信息（右侧）
  ctx.textAlign = 'left'
  ctx.fillStyle = '#e0e6f0'
  ctx.font = 'bold 20px "Microsoft YaHei", sans-serif'
  ctx.fillText('位置：' + alert.location, cardPadding + 140, yPos + 25)

  // 坐标（小字号）
  ctx.font = '14px "Consolas", monospace'
  ctx.fillStyle = '#8a95a8'
  if (alert.coords) {
    ctx.fillText(
      `${alert.coords.lat.toFixed(6)}°N, ${alert.coords.lng.toFixed(6)}°E`,
      cardPadding + 140,
      yPos + 45
    )
  }

  yPos += 70

  // 时间和来源（两列布局）
  const infoItems = [
    { label: '时间', value: formatDateTime(alert.createdAt || alert.time) },
    { label: '来源', value: alert.source },
  ]

  infoItems.forEach((item, index) => {
    const xOffset = index === 0 ? cardPadding : cardPadding + cardWidth / 2
    const itemWidth = cardWidth / 2 - 10

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
    roundRect(ctx, xOffset, yPos, itemWidth, 60, 6)

    ctx.fillStyle = '#8a95a8'
    ctx.font = '14px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(item.label, xOffset + 15, yPos + 25)

    ctx.fillStyle = '#e0e6f0'
    ctx.font = '16px "Microsoft YaHei", sans-serif'
    wrapText(ctx, item.value, xOffset + 15, yPos + 45, itemWidth - 30, 18)
  })

  yPos += 80

  // ==================== 现场情况区 ====================
  if (alert.description) {
    yPos = drawSectionTitle(ctx, '现场情况', yPos, cardPadding)

    ctx.fillStyle = 'rgba(255, 107, 53, 0.1)'
    const descHeight = Math.max(60, Math.ceil(alert.description.length / 30) * 22 + 30)
    roundRect(ctx, cardPadding, yPos, cardWidth, descHeight, 8)

    ctx.fillStyle = '#ffc107'
    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    wrapText(ctx, alert.description, cardPadding + 15, yPos + 30, cardWidth - 30, 22)

    yPos += descHeight + 20
  }

  // ==================== 现场截图区 ====================
  if (alert.imageUrl) {
    yPos = drawSectionTitle(ctx, '现场截图', yPos, cardPadding)

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject()
        img.src = alert.imageUrl!
      })

      // 计算图片显示尺寸（保持16:9比例）
      const imageWidth = cardWidth
      const imageHeight = (cardWidth * 9) / 16

      // 绘制图片背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      roundRect(ctx, cardPadding, yPos, imageWidth, imageHeight, 8)

      // 绘制图片
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(cardPadding, yPos, imageWidth, imageHeight, 8)
      ctx.clip()
      ctx.drawImage(img, cardPadding, yPos, imageWidth, imageHeight)
      ctx.restore()

      yPos += imageHeight + 20
    } catch (error) {
      console.warn('Failed to load alert image:', error)
      // 图片加载失败，跳过
    }
  }

  // ==================== 推荐无人机区 ====================
  yPos = drawSectionTitle(ctx, '推荐无人机', yPos, cardPadding)

  const recommendedDrones = recommendDrones(alert, drones)
  const recommendedList = recommendedDrones.filter(r => r.recommended).slice(0, 3)

  if (recommendedList.length > 0) {
    recommendedList.forEach((item, index) => {
      const { drone, distance, arrivalTime } = item
      const droneCardHeight = 90

      // 无人机卡片背景
      ctx.fillStyle = 'rgba(0, 217, 126, 0.1)'
      roundRect(ctx, cardPadding, yPos, cardWidth, droneCardHeight, 8)

      // 左侧：序号圆圈
      ctx.fillStyle = '#00d97e'
      ctx.beginPath()
      ctx.arc(cardPadding + 30, yPos + droneCardHeight / 2, 20, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(String(index + 1), cardPadding + 30, yPos + droneCardHeight / 2 + 7)

      // 右侧：无人机信息
      const textX = cardPadding + 70
      ctx.textAlign = 'left'

      // 名称 + 类型
      ctx.fillStyle = '#e0e6f0'
      ctx.font = 'bold 20px "Microsoft YaHei", sans-serif'
      ctx.fillText(
        `${drone.name} (${drone.uavClass === UavClass.ClassA ? 'A类' : 'C类'})`,
        textX,
        yPos + 30
      )

      // 距离 + 到达时间（高亮显示）
      ctx.fillStyle = '#00d97e'
      ctx.font = 'bold 18px "Microsoft YaHei", sans-serif'
      ctx.fillText(
        `${distance.toFixed(1)}km | 预计${arrivalTime}分钟到达`,
        textX,
        yPos + 55
      )

      // 电量 + 状态
      ctx.fillStyle = '#8a95a8'
      ctx.font = '14px "Microsoft YaHei", sans-serif'
      const statusText = drone.status === UavStatus.Available ? '待命中' :
                         drone.status === UavStatus.Charging ? '充电中' :
                         drone.status === UavStatus.Flying ? '在飞中' : '可用'
      ctx.fillText(
        `电量 ${drone.telemetry.battery}% | 状态 ${statusText} | ${drone.camp}`,
        textX,
        yPos + 75
      )

      yPos += droneCardHeight + 10
    })
  } else {
    ctx.fillStyle = '#ff4757'
    ctx.font = '18px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚠️ 当前无可用无人机', 375, yPos + 30)
    yPos += 60
  }

  // 不推荐的无人机（最多显示1个）
  const notRecommended = recommendedDrones.filter(r => !r.recommended).slice(0, 1)
  if (notRecommended.length > 0) {
    const item = notRecommended[0]
    ctx.fillStyle = 'rgba(255, 71, 87, 0.1)'
    roundRect(ctx, cardPadding, yPos, cardWidth, 70, 8)

    ctx.fillStyle = '#ff4757'
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`❌ ${item.drone.name} - 不推荐`, cardPadding + 15, yPos + 28)

    ctx.fillStyle = '#8a95a8'
    ctx.font = '14px "Microsoft YaHei", sans-serif'
    ctx.fillText(`原因: ${item.reason}`, cardPadding + 15, yPos + 50)

    yPos += 80
  }

  // ==================== 联系信息区 ====================
  if (commander) {
    yPos = drawSectionTitle(ctx, '联系方式', yPos, cardPadding)

    ctx.fillStyle = 'rgba(0, 149, 255, 0.1)'
    roundRect(ctx, cardPadding, yPos, cardWidth, 70, 8)

    ctx.fillStyle = '#0095ff'
    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`指挥员: ${commander.name}`, cardPadding + 15, yPos + 30)

    ctx.fillStyle = '#e0e6f0'
    ctx.font = '16px "Consolas", monospace'
    ctx.fillText(commander.phone, cardPadding + 15, yPos + 55)

    yPos += 85
  }

  // ==================== 底部时间戳 ====================
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.fillRect(0, 1150, 750, 50)

  ctx.fillStyle = '#8a95a8'
  ctx.font = '14px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(
    `生成时间: ${new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })}`,
    375,
    1180
  )

  // 转换为Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Canvas转换为Blob失败'))
      }
    }, 'image/png')
  })
}

/**
 * 下载图片到本地
 */
export function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ==================== Canvas辅助函数 ====================

/**
 * 绘制圆角矩形
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fill()
}

/**
 * 绘制章节标题
 */
function drawSectionTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  yPos: number,
  padding: number
): number {
  // 左侧装饰条
  ctx.fillStyle = '#1481a6'
  ctx.fillRect(padding, yPos, 4, 24)

  // 标题文字
  ctx.fillStyle = '#e0e6f0'
  ctx.font = 'bold 20px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(title, padding + 15, yPos + 18)

  return yPos + 40
}

/**
 * 文字自动换行
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split('')
  let line = ''
  let testLine = ''
  let currentY = y

  for (let i = 0; i < words.length; i++) {
    testLine += words[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY)
      line = words[i]
      testLine = words[i]
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, currentY)
}

/**
 * 颜色加深/变浅
 */
function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = ((num >> 8) & 0x00ff) + amt
  const B = (num & 0x0000ff) + amt
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  )
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return dateStr
  }
}
