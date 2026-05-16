export const REPORT_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export function buildAchievementSheetWhere({ cycleId, statusFilter, managerId, employeeId, department, employeeSearch, user }) {
  const sheetWhere = { ...(cycleId ? { cycleId } : {}) }
  if (statusFilter) sheetWhere.status = statusFilter
  if (employeeId) sheetWhere.userId = employeeId

  const userWhere = {}
  if (user.role === 'MANAGER') {
    userWhere.reportingManagerId = user.id
  } else if (managerId) {
    userWhere.reportingManagerId = managerId
  }
  if (department) {
    userWhere.department = { contains: department, mode: 'insensitive' }
  }
  if (employeeSearch) {
    userWhere.OR = [
      { name: { contains: employeeSearch, mode: 'insensitive' } },
      { email: { contains: employeeSearch, mode: 'insensitive' } },
    ]
  }
  if (Object.keys(userWhere).length) sheetWhere.user = userWhere

  return sheetWhere
}

export function buildCompletionSummary(rows, selectedQuarter = 'Q2') {
  const quarters = Object.fromEntries(
    REPORT_QUARTERS.map((quarter) => {
      const complete = rows.filter((row) => row[quarter] === 'complete').length
      return [
        quarter,
        {
          complete,
          pending: rows.filter((row) => row[quarter] === 'pending').length,
          closed: rows.filter((row) => row[quarter] === 'closed').length,
          missed: rows.filter((row) => row[quarter] === 'missed').length,
          percent: rows.length ? Math.round((complete / rows.length) * 100) : 0,
        },
      ]
    })
  )
  const selected = quarters[selectedQuarter] || quarters.Q2

  return {
    total: rows.length,
    selectedQuarter: quarters[selectedQuarter] ? selectedQuarter : 'Q2',
    selectedComplete: selected.complete,
    selectedPercent: selected.percent,
    quarters,
    q2Complete: quarters.Q2.complete,
    q2Percent: quarters.Q2.percent,
  }
}
