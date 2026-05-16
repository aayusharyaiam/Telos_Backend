import prisma from '../config/prisma.js'

export async function getCurrentWindowStatus(phase) {
  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } })
  if (!cycle) return { isOpen: false, window: null, cycle: null }

  const window = await prisma.cycleWindow.findUnique({
    where: { cycleId_phase: { cycleId: cycle.id, phase } },
  })

  if (!window) return { isOpen: false, window: null, cycle }

  if (window.status === 'FORCE_OPEN') return { isOpen: true, window, cycle }
  if (window.status === 'FORCE_CLOSED') return { isOpen: false, window, cycle }

  const now = new Date()
  const isOpen = now >= window.opensAt && now <= window.closesAt
  return { isOpen, window, cycle }
}

export async function getActiveCycle() {
  return prisma.cycle.findFirst({ where: { isActive: true }, include: { windows: true } })
}

export async function getWindow(cycleId, phase) {
  return prisma.cycleWindow.findUnique({
    where: { cycleId_phase: { cycleId, phase } },
  })
}
