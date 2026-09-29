/**
 * 调度卡片生成测试脚本
 * 运行: node test-dispatch-card.js
 */

// 模拟Alert数据
const mockAlert = {
  id: 'alert-001',
  type: 'alert',
  level: 'high',
  title: 'Koulele营地东围界人员入侵',
  description: '东围界检测到2名不明人员翻越围栏，正在向营地方向移动。',
  time: '3分钟前',
  status: 'tracking',
  source: '高点摄像头HC-K02 AI识别',
  sourceType: 'ai',
  location: 'Koulele营地-东围界',
  coords: { lat: 15.257123, lng: 13.515678 },
  createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
}

// 模拟无人机数据
const mockDrones = [
  {
    id: 'REAL-A-003',
    name: 'UAV2 Koulele',
    sn: 'YDUA25V0250202YCAYTV',
    uavClass: 'A',
    status: 'available',
    camp: 'KOULELE',
    telemetry: {
      battery: 98,
      position: { lat: 15.254788, lng: 13.512345, altitude: 425 },
    },
  },
  {
    id: 'REAL-C-001',
    name: 'Koulele NestDrone',
    sn: '1748FEV3HMG925021496',
    uavClass: 'C',
    status: 'alert_response',
    camp: 'KOULELE',
    nest: 'NEST-K-01',
    telemetry: {
      battery: 78,
      position: { lat: 15.256123, lng: 13.514567, altitude: 685 },
    },
  },
  {
    id: 'REAL-C-004',
    name: 'Sokor Nest Drone',
    sn: '1748FEV3HMG925021499',
    uavClass: 'C',
    status: 'fault',
    camp: 'SOKOR',
    nest: 'NEST-S-01',
    telemetry: {
      battery: 12,
      position: { lat: 14.512345, lng: 12.678912, altitude: 580 },
    },
  },
]

// 模拟指挥员数据
const mockCommander = {
  name: '张三',
  phone: '+86 13812345678',
}

// 简化的距离计算
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
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

// 生成调度卡片
function generateDispatchCard() {
  const lines = []

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`🚨 紧急调度任务 ${mockAlert.id}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('')
  lines.push(`📍 位置：${mockAlert.location}`)
  lines.push(`   坐标：${mockAlert.coords.lat.toFixed(6)}°N, ${mockAlert.coords.lng.toFixed(6)}°E`)
  lines.push(`⏰ 时间：${new Date(mockAlert.createdAt).toLocaleString('zh-CN')}`)
  lines.push(`🔴 等级：高危`)
  lines.push(`📡 来源：${mockAlert.source}`)
  lines.push('')
  lines.push('━━━ 现场情况 ━━━')
  lines.push(mockAlert.description)
  lines.push('')
  lines.push('━━━ 任务要求 ━━━')
  lines.push('立即派遣无人机前往现场确认，重点关注：')
  lines.push('• 入侵人员数量、装备、移动方向')
  lines.push('• 是否携带工具/武器')
  lines.push('• 车辆信息（如有）')
  lines.push('• 入侵路径与可能目标')
  lines.push('')
  lines.push('━━━ 推荐无人机 ━━━')

  // 推荐无人机
  mockDrones.forEach((drone) => {
    const distance = calculateDistance(
      mockAlert.coords.lat,
      mockAlert.coords.lng,
      drone.telemetry.position.lat,
      drone.telemetry.position.lng
    )
    const arrivalTime = Math.ceil((distance * 1000) / (drone.uavClass === 'A' ? 35 : 25) / 60)

    if (drone.status === 'available') {
      lines.push(`✅ ${drone.name} (${drone.uavClass}类)`)
      lines.push(`   距离: ${distance.toFixed(1)}km | 预计${arrivalTime}分钟到达`)
      lines.push(`   电量: ${drone.telemetry.battery}% | 状态: 待命中`)
      lines.push(`   所属营地: ${drone.camp}`)
      lines.push('')
    } else if (drone.status === 'alert_response') {
      lines.push(`❌ ${drone.name} (${drone.uavClass}类) - 不推荐`)
      lines.push(`   原因: 正在响应其他告警`)
      lines.push('')
    } else if (drone.status === 'fault') {
      lines.push(`❌ ${drone.name} (${drone.uavClass}类) - 不推荐`)
      lines.push(`   原因: 设备故障中`)
      lines.push('')
    }
  })

  lines.push('━━━ 注意事项 ━━━')
  lines.push('⚠️ 预警点周边2km内存在禁飞区，注意避让')
  lines.push('')
  lines.push('━━━ 飞手操作流程 ━━━')
  lines.push('1. 接收任务后立即响应确认')
  lines.push('2. 检查无人机电量与设备状态')
  lines.push('3. 按推荐航线前往预警点')
  lines.push('4. 到达后开启视频回传')
  lines.push('5. 按任务要求重点观察并实时汇报')
  lines.push('6. 等待指挥员指令（持续跟踪/返航）')
  lines.push('')
  lines.push('━━━ 联系方式 ━━━')
  lines.push(`指挥员: ${mockCommander.name}`)
  lines.push(`联系方式: ${mockCommander.phone}`)
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`卡片生成时间: ${new Date().toLocaleString('zh-CN')}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return lines.join('\n')
}

// 执行测试
console.log('========== 调度卡片生成测试 ==========\n')
const card = generateDispatchCard()
console.log(card)
console.log('\n========== 测试完成 ==========')
console.log(`\n卡片总字数: ${card.length} 字符`)
console.log(`卡片总行数: ${card.split('\n').length} 行`)
