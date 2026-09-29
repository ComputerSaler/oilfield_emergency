/**
 * 客户现场真实无人机数据（9架）
 * 基于真实序列号和营地，模拟状态覆盖 7种状态
 *
 * 数据来源：
 * - A类：src/mock/aUav.ts（现场真实数据）
 * - C类：src/mock/cUav.ts（现场真实数据）
 */

import type { UavDevice } from '@/types/drone'
import { UavStatus, UavClass, TaskType } from '@/types/drone'

/**
 * 营地坐标（真实GPS）
 */
const CAMP_COORDS: Record<string, { lat: number; lng: number }> = {
  Jaouro: { lat: 14.847312, lng: 13.124567 },
  Koulele: { lat: 15.254788, lng: 13.512345 },
  Dibeilla: { lat: 13.689012, lng: 14.023456 },
  Agadem: { lat: 15.890123, lng: 13.678901 },
  Sokor: { lat: 14.512345, lng: 12.678912 },
  Goumeri: { lat: 13.912456, lng: 13.234567 },
}

/**
 * A类无人机（4架）- 覆盖状态：escort, flying, available, charging
 */
const A_CLASS_DRONES: UavDevice[] = [
  {
    // 现场数据1：伴飞中
    id: 'REAL-A-001',
    name: 'UAV Jaouro',
    sn: 'YDUA25V0250105YCACAM',
    uavClass: UavClass.ClassA,
    status: UavStatus.Escort,
    camp: 'Jaouro',
    task: 'ESCORT-J-2026082301',
    taskType: TaskType.Escort,
    telemetry: {
      battery: 52,
      altitude: 1350,
      speed: 28.5,
      verticalSpeed: -0.8,
      flightTime: 125,
      remainingDistance: 180,
      position: { lat: 14.850123, lng: 13.127890, altitude: 1350 },
      gimbalPitch: -45,
      gimbalRoll: 2,
      gimbalYaw: 135,
      updateTime: '刚刚',
    },
  },
  {
    // 现场数据2：在飞中（巡逻）
    id: 'REAL-A-002',
    name: 'UAV1 Dibeilla',
    sn: 'YDUA25V0250102YCATEY',
    uavClass: UavClass.ClassA,
    status: UavStatus.Flying,
    camp: 'Dibeilla',
    task: 'PATROL-D-2026082302',
    taskType: TaskType.Patrol,
    telemetry: {
      battery: 68,
      altitude: 1820,
      speed: 32.1,
      verticalSpeed: 1.2,
      flightTime: 95,
      position: { lat: 13.691234, lng: 14.025678, altitude: 1820 },
      gimbalPitch: -30,
      gimbalRoll: -1,
      gimbalYaw: 220,
      updateTime: '1分钟前',
    },
  },
  {
    // 现场数据3：可用（已充满，待命）
    id: 'REAL-A-003',
    name: 'UAV2 Koulele',
    sn: 'YDUA25V0250202YCAYTV',
    uavClass: UavClass.ClassA,
    status: UavStatus.Available,
    camp: 'Koulele',
    telemetry: {
      battery: 98,
      position: { ...CAMP_COORDS.Koulele, altitude: 425 },
      gimbalPitch: 0,
      gimbalRoll: 0,
      gimbalYaw: 0,
      updateTime: '8分钟前',
    },
  },
  {
    // 现场数据4：充电中
    id: 'REAL-A-004',
    name: 'UAV3 Jaouro',
    sn: 'YDUA25V0250302YCADZB',
    uavClass: UavClass.ClassA,
    status: UavStatus.Charging,
    camp: 'Jaouro',
    telemetry: {
      battery: 35,
      position: { ...CAMP_COORDS.Jaouro, altitude: 312 },
      gimbalPitch: 0,
      gimbalRoll: 0,
      gimbalYaw: 0,
      updateTime: '12分钟前',
    },
  },
]

/**
 * C类无人机（5架）- 覆盖状态：alert_response, flying, available, fault, offline
 */
const C_CLASS_DRONES: UavDevice[] = [
  {
    // 现场数据1：告警响应中
    id: 'REAL-C-001',
    name: 'Koulele NestDrone',
    sn: '1748FEV3HMG925021496',
    uavClass: UavClass.ClassC,
    status: UavStatus.AlertResponse,
    camp: 'Koulele',
    nest: 'NEST-K-01',
    task: 'ALERT-K-71',
    taskType: TaskType.AlertResponse,
    telemetry: {
      battery: 78,
      altitude: 685,
      speed: 22.3,
      verticalSpeed: -1.5,
      flightTime: 28,
      remainingDistance: 42,
      position: { lat: 15.257890, lng: 13.515678, altitude: 685 },
      gimbalPitch: -60,
      gimbalRoll: 3,
      gimbalYaw: 88,
      updateTime: '2分钟前',
    },
  },
  {
    // 现场数据2：在飞中（巡逻）
    id: 'REAL-C-002',
    name: 'Dibeilla Drone',
    sn: '1748FEV3HMF924521095',
    uavClass: UavClass.ClassC,
    status: UavStatus.Flying,
    camp: 'Dibeilla',
    nest: 'NEST-D-01',
    task: 'PATROL-D-92',
    taskType: TaskType.Patrol,
    telemetry: {
      battery: 61,
      altitude: 520,
      speed: 16.8,
      verticalSpeed: 0.3,
      flightTime: 118,
      position: { lat: 13.690567, lng: 14.025123, altitude: 520 },
      gimbalPitch: -25,
      gimbalRoll: -2,
      gimbalYaw: 310,
      updateTime: '1分钟前',
    },
  },
  {
    // 现场数据3：可用（已充满，待命）
    id: 'REAL-C-003',
    name: 'Jaouro Nest Drone3',
    sn: '1748FEV3HMF925081044',
    uavClass: UavClass.ClassC,
    status: UavStatus.Available,
    camp: 'Jaouro',
    nest: 'NEST-J-02',
    telemetry: {
      battery: 100,
      position: { ...CAMP_COORDS.Jaouro, altitude: 312 },
      gimbalPitch: 0,
      gimbalRoll: 0,
      gimbalYaw: 0,
      updateTime: '5分钟前',
    },
  },
  {
    // 现场数据4：故障（低电量+传感器异常）
    id: 'REAL-C-004',
    name: 'Sokor Nest Drone',
    sn: '1748FEV3HMG925021052',
    uavClass: UavClass.ClassC,
    status: UavStatus.Fault,
    camp: 'Sokor',
    nest: 'NEST-S-01',
    telemetry: {
      battery: 12,
      position: { ...CAMP_COORDS.Sokor, altitude: 398 },
      gimbalPitch: 0,
      gimbalRoll: 0,
      gimbalYaw: 0,
      updateTime: '32分钟前',
    },
  },
  {
    // 现场数据5：离线（通信中断）
    id: 'REAL-C-005',
    name: 'Goumeri Nest Drone',
    sn: '1748FEV3HMF924521098',
    uavClass: UavClass.ClassC,
    status: UavStatus.Offline,
    camp: 'Goumeri',
    nest: 'NEST-G-01',
    telemetry: {
      battery: 0,
      position: { ...CAMP_COORDS.Goumeri, altitude: 402 },
      gimbalPitch: 0,
      gimbalRoll: 0,
      gimbalYaw: 0,
      updateTime: '3小时前',
    },
  },
]

/**
 * 全部真实无人机（9架）
 * - A类 4架：伴飞、在飞、可用、充电
 * - C类 5架：告警响应、在飞、可用、故障、离线
 * - 覆盖 7种状态：flying, available, charging, alert_response, escort, fault, offline
 */
export const REAL_DRONES: UavDevice[] = [...A_CLASS_DRONES, ...C_CLASS_DRONES]

/**
 * 按状态分组（用于统计）
 */
export function getDronesByStatus() {
  const grouped: Record<UavStatus, UavDevice[]> = {
    [UavStatus.Flying]: [],
    [UavStatus.Available]: [],
    [UavStatus.Charging]: [],
    [UavStatus.AlertResponse]: [],
    [UavStatus.Escort]: [],
    [UavStatus.Fault]: [],
    [UavStatus.Offline]: [],
  }

  REAL_DRONES.forEach((drone) => {
    grouped[drone.status].push(drone)
  })

  return grouped
}

/**
 * 状态统计
 */
export function getDroneStats() {
  const byStatus = getDronesByStatus()
  return {
    flying: byStatus[UavStatus.Flying].length,
    available: byStatus[UavStatus.Available].length,
    charging: byStatus[UavStatus.Charging].length,
    alertResponse: byStatus[UavStatus.AlertResponse].length,
    escort: byStatus[UavStatus.Escort].length,
    fault: byStatus[UavStatus.Fault].length,
    offline: byStatus[UavStatus.Offline].length,
    total: REAL_DRONES.length,
  }
}
