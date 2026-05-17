import prisma from '../config/prisma.js'
import xlsx from 'xlsx'
import { computeScore } from '../services/score.service.js'
import { buildAchievementSheetWhere, buildCompletionSummary } from '../services/reportFilters.service.js'
import { sendSuccess } from '../utils/response.js'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const CHECKIN_PHASE_TO_QUARTER = {
  Q1_CHECKIN: 'Q1',
  Q2_CHECKIN: 'Q2',
  Q3_CHECKIN: 'Q3',
  Q4_CHECKIN: 'Q4',
}

async function getActiveCycleId() {
  const cycle = await prisma.cycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  return cycle?.id
}

function quarterStatus(sheet, quarter) {
  if (sheet.status !== 'APPROVED') return 'closed'
  const goals = sheet.goals || []
  if (!goals.length) return 'pending'
  const checkins = goals.map((goal) => goal.checkins.find((checkin) => checkin.quarter === quarter)).filter(Boolean)
  if (!checkins.length) return 'pending'
  return checkins.every((checkin) => checkin.checkinCompleted) ? 'complete' : 'pending'
}

function formatTarget(goal) {
  if (goal.target !== null && goal.target !== undefined) return goal.target
  if (goal.targetDate) return new Date(goal.targetDate).toISOString().slice(0, 10)
  return null
}

function resolveActualValue(goal, quarter) {
  const checkin = goal.checkins.find((c) => c.quarter === quarter)
  if (checkin) {
    return goal.uomType === 'TIMELINE' ? checkin.actualDate : checkin.actualAchievement
  }

  return null
}

function formatActualValue(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value
}

function isWindowOpen(window, now = new Date()) {
  if (window.status === 'FORCE_OPEN') return true
  if (window.status === 'FORCE_CLOSED') return false
  return window.status === 'OPEN' && now >= window.opensAt && now <= window.closesAt
}

function resolveDashboardQuarter(activeCycle) {
  const checkinWindows = activeCycle?.windows
    ?.filter((window) => CHECKIN_PHASE_TO_QUARTER[window.phase])
    .sort((a, b) => new Date(a.opensAt) - new Date(b.opensAt)) || []

  const openWindow = checkinWindows.find((window) => isWindowOpen(window))
  if (openWindow) return CHECKIN_PHASE_TO_QUARTER[openWindow.phase]

  const now = new Date()
  const latestStarted = [...checkinWindows]
    .reverse()
    .find((window) => new Date(window.opensAt) <= now)
  return CHECKIN_PHASE_TO_QUARTER[latestStarted?.phase] || 'Q1'
}

function resolveLatestProgressScore(goal) {
  const scored = goal.checkins.filter((c) => c.progressScore !== null)
  if (scored.length) return scored[scored.length - 1].progressScore

  if (goal.isShared && goal.parentSharedGoal) {
    return computeScore({
      uomType: goal.uomType,
      target: goal.target,
      actual: goal.parentSharedGoal.actualAchievement,
      targetDate: goal.targetDate,
      actualDate: goal.parentSharedGoal.actualDate,
    })
  }

  return null
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

export async function getCompletionReport(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const selectedQuarter = req.query.quarter && QUARTERS.includes(String(req.query.quarter).toUpperCase())
      ? String(req.query.quarter).toUpperCase()
      : 'Q2'
    const where =
      req.user.role === 'ADMIN'
        ? { ...(cycleId ? { cycleId } : {}) }
        : { ...(cycleId ? { cycleId } : {}), user: { reportingManagerId: req.user.id } }

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, reportingManagerId: true } },
        goals: { include: { checkins: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const rows = sheets.map((sheet) => ({
      userId: sheet.userId,
      name: sheet.user.name,
      status: sheet.status,
      goals: sheet.goals.length,
      Q1: quarterStatus(sheet, 'Q1'),
      Q2: quarterStatus(sheet, 'Q2'),
      Q3: quarterStatus(sheet, 'Q3'),
      Q4: quarterStatus(sheet, 'Q4'),
    }))

    return sendSuccess(res, {
      rows,
      summary: buildCompletionSummary(rows, selectedQuarter),
    })
  } catch (err) {
    return next(err)
  }
}

export async function getAuditReport(req, res, next) {
  try {
    const where = {}
    if (req.query.startDate) {
      where.createdAt = { ...(where.createdAt || {}), gte: new Date(req.query.startDate) }
    }
    if (req.query.endDate) {
      where.createdAt = { ...(where.createdAt || {}), lte: new Date(req.query.endDate) }
    }
    if (req.query.action) {
      where.action = req.query.action
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return sendSuccess(res, logs)
  } catch (err) {
    return next(err)
  }
}

// ─── Achievement Report (CSV/JSON) ──────────────────────────

export async function getAchievementReport(req, res, next) {
  try {
    const format = String(req.query.format || 'json').toLowerCase()
    const requestedCycleId = req.query.cycleId ? String(req.query.cycleId) : null
    const cycleId = requestedCycleId || (await getActiveCycleId())
    const quarterFilter = req.query.quarter ? String(req.query.quarter).toUpperCase() : null
    const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : null
    const managerId = req.query.managerId ? String(req.query.managerId) : null
    const employeeId = req.query.employeeId ? String(req.query.employeeId) : null
    const department = req.query.department ? String(req.query.department).trim() : ''
    const employeeSearch = req.query.employeeSearch ? String(req.query.employeeSearch).trim() : ''

    const sheetWhere = buildAchievementSheetWhere({
      cycleId,
      statusFilter,
      managerId,
      employeeId,
      department,
      employeeSearch,
      user: req.user,
    })

    const checkinInclude = {
      orderBy: { quarter: 'asc' },
      ...(quarterFilter ? { where: { quarter: quarterFilter } } : {}),
    }

    const sheets = await prisma.goalSheet.findMany({
      where: sheetWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            reportingManager: { select: { name: true } },
          },
        },
        goals: {
          include: {
            parentSharedGoal: true,
            checkins: checkinInclude,
          },
        },
      },
    })

    const rows = sheets.flatMap((sheet) =>
      sheet.goals.map((goal) => {
        const getQuarterActual = (quarter) =>
          quarterFilter && quarterFilter !== quarter
            ? null
            : formatActualValue(resolveActualValue(goal, quarter))

        const latestProgressScore = resolveLatestProgressScore(goal)
        const weightedScore =
          latestProgressScore === null || latestProgressScore === undefined
            ? null
            : (latestProgressScore * goal.weightage) / 100

        return {
          employeeName: sheet.user.name,
          employeeEmail: sheet.user.email,
          manager: sheet.user.reportingManager?.name || '-',
          department: sheet.user.department || '-',
          goalTitle: goal.title,
          thrustArea: goal.thrustArea,
          uom: goal.uomType,
          target: formatTarget(goal),
          weightage: goal.weightage,
          q1Actual: getQuarterActual('Q1'),
          q2Actual: getQuarterActual('Q2'),
          q3Actual: getQuarterActual('Q3'),
          q4Actual: getQuarterActual('Q4'),
          latestProgressScore,
          weightedScore,
          goalSheetStatus: sheet.status,
        }
      })
    )

    const headers = [
      'Employee Name',
      'Employee Email',
      'Manager',
      'Department',
      'Goal Title',
      'Thrust Area',
      'UoM',
      'Target',
      'Weightage',
      'Q1 Actual',
      'Q2 Actual',
      'Q3 Actual',
      'Q4 Actual',
      'Latest Progress Score',
      'Weighted Score',
      'Goal Sheet Status',
    ]

    if (format === 'csv') {
      const csvLines = [headers.join(',')]
      for (const row of rows) {
        csvLines.push(
          [
            escapeCsvValue(row.employeeName),
            escapeCsvValue(row.employeeEmail),
            escapeCsvValue(row.manager),
            escapeCsvValue(row.department),
            escapeCsvValue(row.goalTitle),
            escapeCsvValue(row.thrustArea),
            escapeCsvValue(row.uom),
            escapeCsvValue(row.target),
            escapeCsvValue(row.weightage),
            escapeCsvValue(row.q1Actual),
            escapeCsvValue(row.q2Actual),
            escapeCsvValue(row.q3Actual),
            escapeCsvValue(row.q4Actual),
            escapeCsvValue(row.latestProgressScore),
            escapeCsvValue(row.weightedScore),
            escapeCsvValue(row.goalSheetStatus),
          ].join(',')
        )
      }

      const csv = csvLines.join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="achievement-report.csv"')
      return res.send(csv)
    }

    if (format === 'xlsx') {
      const worksheet = xlsx.utils.aoa_to_sheet([
        headers,
        ...rows.map((row) => [
          row.employeeName,
          row.employeeEmail,
          row.manager,
          row.department,
          row.goalTitle,
          row.thrustArea,
          row.uom,
          row.target,
          row.weightage,
          row.q1Actual,
          row.q2Actual,
          row.q3Actual,
          row.q4Actual,
          row.latestProgressScore,
          row.weightedScore,
          row.goalSheetStatus,
        ]),
      ])
      const workbook = xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Achievement')

      const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="achievement-report.xlsx"')
      return res.send(buffer)
    }

    return sendSuccess(res, rows)
  } catch (err) {
    return next(err)
  }
}

// ─── Admin Summary ───────────────────────────────────────────

export async function getAdminSummary(req, res, next) {
  try {
    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
      include: { windows: true },
      orderBy: { createdAt: 'desc' },
    })
    const cycleId = activeCycle?.id
    const dashboardQuarter = resolveDashboardQuarter(activeCycle)

    const [
      totalActiveUsers,
      totalGoalSheets,
      submittedCount,
      approvedCount,
      pendingEscalations,
      recentAuditCount,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.goalSheet.count({ where: cycleId ? { cycleId } : {} }),
      prisma.goalSheet.count({ where: { ...(cycleId ? { cycleId } : {}), status: 'SUBMITTED' } }),
      prisma.goalSheet.count({ where: { ...(cycleId ? { cycleId } : {}), status: 'APPROVED' } }),
      prisma.escalation.count({ where: { status: { not: 'RESOLVED' } } }),
      prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ])

    let selectedCompletedCount = 0
    let selectedTotal = 0
    if (cycleId) {
      const approvedSheets = await prisma.goalSheet.findMany({
        where: { cycleId, status: 'APPROVED' },
        include: { goals: { include: { checkins: { where: { quarter: dashboardQuarter } } } } },
      })
      selectedTotal = approvedSheets?.length || 0
      selectedCompletedCount = approvedSheets?.filter((s) =>
        s.goals?.length > 0 &&
        s.goals?.every((g) => g.checkins?.some((c) => c.checkinCompleted))
      )?.length || 0
    }

    return sendSuccess(res, {
      activeCycleName: activeCycle?.name || 'No active cycle',
      totalActiveUsers,
      totalGoalSheets,
      submittedCount,
      approvedCount,
      dashboardQuarter,
      selectedCompletedCount,
      selectedCompletionRate: selectedTotal ? Math.round((selectedCompletedCount / selectedTotal) * 100) : 0,
      pendingEscalations,
      recentAuditCount,
    })
  } catch (err) {
    return next(err)
  }
}

// ─── Analytics ───────────────────────────────────────────────

export async function getAnalyticsOverview(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const [users, sheets, submitted, approved, returned, draft] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.goalSheet.count({ where: cycleId ? { cycleId } : {} }),
      prisma.goalSheet.count({ where: { ...(cycleId ? { cycleId } : {}), status: 'SUBMITTED' } }),
      prisma.goalSheet.count({ where: { ...(cycleId ? { cycleId } : {}), status: 'APPROVED' } }),
      prisma.goalSheet.count({ where: { ...(cycleId ? { cycleId } : {}), status: 'RETURNED' } }),
      prisma.goalSheet.count({ where: { ...(cycleId ? { cycleId } : {}), status: 'DRAFT' } }),
    ])
    return sendSuccess(res, {
      users,
      sheets,
      submitted,
      approved,
      returned,
      draft,
      submittedPercent: sheets ? Math.round(((submitted + approved) / sheets) * 100) : 0,
      approvedPercent: sheets ? Math.round((approved / sheets) * 100) : 0,
    })
  } catch (err) {
    return next(err)
  }
}

export async function getAnalyticsTrends(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const results = []

    for (const quarter of QUARTERS) {
      const checkins = await prisma.checkinRecord.findMany({
        where: {
          quarter,
          progressScore: { not: null },
          ...(cycleId
            ? { goal: { goalSheet: { cycleId } } }
            : {}),
        },
        select: { progressScore: true },
      })

      const avg = checkins.length
        ? Math.round(checkins.reduce((sum, c) => sum + c.progressScore, 0) / checkins.length)
        : 0

      results.push({ quarter, score: avg, count: checkins.length })
    }

    return sendSuccess(res, results)
  } catch (err) {
    return next(err)
  }
}

export async function getAnalyticsDistribution(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const goals = await prisma.goal.findMany({
      where: cycleId ? { goalSheet: { cycleId } } : {},
      select: { thrustArea: true, uomType: true },
    })

    // By thrust area
    const byThrustArea = {}
    const byUom = {}
    for (const g of goals) {
      byThrustArea[g.thrustArea] = (byThrustArea[g.thrustArea] || 0) + 1
      byUom[g.uomType] = (byUom[g.uomType] || 0) + 1
    }

    return sendSuccess(res, {
      byThrustArea: Object.entries(byThrustArea)
        .map(([area, goals]) => ({ area, goals }))
        .sort((a, b) => b.goals - a.goals),
      byUom: Object.entries(byUom)
        .map(([uom, goals]) => ({ uom, goals }))
        .sort((a, b) => b.goals - a.goals),
    })
  } catch (err) {
    return next(err)
  }
}

export async function getManagerEffectiveness(req, res, next) {
  try {
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        directReports: {
          select: {
            id: true,
            goalSheets: {
              include: {
                goals: { include: { checkins: true } },
              },
            },
          },
        },
      },
    })

    const rows = managers.map((m) => {
      const reports = m.directReports?.length || 0
      let totalCheckins = 0
      let completedCheckins = 0
      let totalScore = 0
      let scoreCount = 0

      for (const report of m.directReports || []) {
        for (const sheet of report.goalSheets || []) {
          for (const goal of sheet.goals || []) {
            for (const checkin of goal.checkins || []) {
              totalCheckins++
              if (checkin.checkinCompleted) completedCheckins++
              if (checkin.progressScore !== null) {
                totalScore += checkin.progressScore
                scoreCount++
              }
            }
          }
        }
      }

      return {
        managerId: m.id,
        managerName: m.name,
        managerEmail: m.email,
        directReports: reports,
        checkinCompletionRate: totalCheckins ? Math.round((completedCheckins / totalCheckins) * 100) : 0,
        avgTeamScore: scoreCount ? Math.round(totalScore / scoreCount) : 0,
      }
    })

    return sendSuccess(res, rows)
  } catch (err) {
    return next(err)
  }
}

// ─── Heatmap Analytics ──────────────────────────────────────────

export async function getAnalyticsHeatmap(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const where = cycleId ? { cycleId } : {}

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        user: { select: { id: true, department: true } },
        goals: { include: { checkins: true } },
      },
    })

    if (!sheets || sheets.length === 0) {
      return sendSuccess(res, { departments: [], quarters: QUARTERS, data: {} })
    }

    const departments = [...new Set(sheets.map((s) => s.user?.department).filter(Boolean))]
    const heatmapData = {}

    for (const dept of departments) {
      heatmapData[dept] = {}
      for (const quarter of QUARTERS) {
        const deptSheets = sheets.filter((s) => s.user?.department === dept)
        let totalGoals = 0
        let completedGoals = 0
        let totalScore = 0
        let scoreCount = 0

        for (const sheet of deptSheets) {
          for (const goal of sheet.goals || []) {
            totalGoals++
            const checkin = (goal.checkins || []).find((c) => c.quarter === quarter)
            if (checkin?.checkinCompleted) {
              completedGoals++
            }
            if (checkin?.progressScore !== null) {
              totalScore += checkin.progressScore
              scoreCount++
            }
          }
        }

        heatmapData[dept][quarter] = {
          total: totalGoals,
          completed: completedGoals,
          completionRate: totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0,
          avgScore: scoreCount ? Math.round(totalScore / scoreCount) : 0,
        }
      }
    }

    return sendSuccess(res, { departments, quarters: QUARTERS, data: heatmapData })
  } catch (err) {
    return next(err)
  }
}

// ─── Department Performance ─────────────────────────────────────

export async function getDepartmentPerformance(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const where = cycleId ? { cycleId } : {}

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        user: { select: { id: true, department: true, reportingManager: { select: { name: true } } } },
        goals: { include: { checkins: true } },
      },
    })

    if (!sheets || sheets.length === 0) {
      return sendSuccess(res, [])
    }

    const deptData = {}

    for (const sheet of sheets) {
      const dept = sheet.user?.department || 'Unassigned'
      if (!deptData[dept]) {
        deptData[dept] = {
          department: dept,
          employees: new Set(),
          totalGoals: 0,
          completedGoals: 0,
          totalScore: 0,
          scoreCount: 0,
          sheetStatus: { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, RETURNED: 0 },
        }
      }

      deptData[dept].employees.add(sheet.userId)
      deptData[dept].totalGoals += sheet.goals?.length || 0
      deptData[dept].sheetStatus[sheet.status] = (deptData[dept].sheetStatus[sheet.status] || 0) + 1

      for (const goal of sheet.goals || []) {
        for (const checkin of goal.checkins || []) {
          if (checkin.checkinCompleted) {
            deptData[dept].completedGoals++
          }
          if (checkin.progressScore !== null) {
            deptData[dept].totalScore += checkin.progressScore
            deptData[dept].scoreCount++
          }
        }
      }
    }

    const results = Object.values(deptData).map((d) => ({
      department: d.department,
      employeeCount: d.employees.size,
      totalGoals: d.totalGoals,
      completedGoals: d.completedGoals,
      completionRate: d.totalGoals ? Math.round((d.completedGoals / d.totalGoals) * 100) : 0,
      avgScore: d.scoreCount ? Math.round(d.totalScore / d.scoreCount) : 0,
      sheets: d.sheetStatus,
    }))

    return sendSuccess(res, results)
  } catch (err) {
    return next(err)
  }
}

// ─── Employee Drill-down ─────────────────────────────────────────

export async function getEmployeeDrilldown(req, res, next) {
  try {
    const employeeId = req.query.employeeId
    if (!employeeId) {
      return sendSuccess(res, [])
    }

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        reportingManager: { select: { name: true } },
        goalSheets: {
          include: {
            cycle: { select: { name: true } },
            goals: {
              include: {
                checkins: { orderBy: { quarter: 'asc' } },
                parentSharedGoal: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!employee) {
      return sendSuccess(res, null)
    }

    const drilldown = {
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        manager: employee.reportingManager?.name || '-',
      },
      goalSheets: employee.goalSheets.map((sheet) => ({
        cycle: sheet.cycle?.name,
        status: sheet.status,
        createdAt: sheet.createdAt,
        goals: sheet.goals.map((goal) => ({
          title: goal.title,
          thrustArea: goal.thrustArea,
          weightage: goal.weightage,
          target: goal.target,
          uomType: goal.uomType,
          checkins: goal.checkins.map((c) => ({
            quarter: c.quarter,
            actualAchievement: c.actualAchievement,
            progressScore: c.progressScore,
            checkinCompleted: c.checkinCompleted,
            managerComment: c.managerComment,
          })),
        })),
      })),
    }

    return sendSuccess(res, drilldown)
  } catch (err) {
    return next(err)
  }
}

// ─── Goal Timeline Analysis ─────────────────────────────────────

export async function getGoalTimeline(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const where = cycleId ? { goalSheet: { cycleId } } : {}

    const goals = await prisma.goal.findMany({
      where,
      include: {
        goalSheet: { include: { user: { select: { name: true } } } },
        checkins: { orderBy: { quarter: 'asc' } },
      },
    })

    const timelineData = {
      Q1: { onTime: 0, late: 0, pending: 0 },
      Q2: { onTime: 0, late: 0, pending: 0 },
      Q3: { onTime: 0, late: 0, pending: 0 },
      Q4: { onTime: 0, late: 0, pending: 0 },
    }

    for (const goal of goals) {
      for (const checkin of goal.checkins) {
        if (!checkin.actualDate || !goal.targetDate) continue

        const actual = new Date(checkin.actualDate)
        const target = new Date(goal.targetDate)
        const quarter = checkin.quarter

        if (checkin.checkinCompleted) {
          if (actual <= target) {
            timelineData[quarter].onTime++
          } else {
            timelineData[quarter].late++
          }
        } else {
          timelineData[quarter].pending++
        }
      }
    }

    const results = Object.entries(timelineData).map(([quarter, data]) => ({
      quarter,
      ...data,
      total: data.onTime + data.late + data.pending,
    }))

    return sendSuccess(res, results)
  } catch (err) {
    return next(err)
  }
}
