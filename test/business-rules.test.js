import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSheetGoals } from '../src/services/goalValidation.service.js'
import { computeScore } from '../src/services/score.service.js'
import { buildAchievementSheetWhere, buildCompletionSummary } from '../src/services/reportFilters.service.js'

test('goal validation requires at least one goal, minimum weights, and exactly 100 total weightage', () => {
  assert.throws(() => validateSheetGoals([]), /at least one goal/)
  assert.throws(() => validateSheetGoals([{ weightage: 5 }, { weightage: 95 }]), /Minimum weightage/)
  assert.throws(() => validateSheetGoals([{ weightage: 40 }, { weightage: 40 }]), /exactly 100/)
  assert.doesNotThrow(() => validateSheetGoals([{ weightage: 40 }, { weightage: 60 }]))
})

test('check-in score computation handles direction, caps, timeline, zero, and division guards', () => {
  assert.equal(computeScore({ uomType: 'NUMERIC_MIN', target: 100, actual: 125 }), 100)
  assert.equal(computeScore({ uomType: 'NUMERIC_MAX', target: 10, actual: 5 }), 100)
  assert.equal(computeScore({ uomType: 'NUMERIC_MAX', target: 10, actual: 20 }), 50)
  assert.equal(computeScore({ uomType: 'TIMELINE', targetDate: '2026-03-31', actualDate: '2026-03-30' }), 100)
  assert.equal(computeScore({ uomType: 'ZERO', actual: 1 }), 0)
  assert.equal(computeScore({ uomType: 'NUMERIC_MIN', target: 0, actual: 10 }), null)
})

test('achievement report filters preserve manager scoping while adding department and employee search', () => {
  const where = buildAchievementSheetWhere({
    cycleId: 'cycle-1',
    statusFilter: 'APPROVED',
    managerId: 'ignored-admin-filter',
    department: 'sales',
    employeeSearch: 'asha',
    user: { id: 'manager-1', role: 'MANAGER' },
  })

  assert.equal(where.cycleId, 'cycle-1')
  assert.equal(where.status, 'APPROVED')
  assert.equal(where.user.reportingManagerId, 'manager-1')
  assert.deepEqual(where.user.department, { contains: 'sales', mode: 'insensitive' })
  assert.deepEqual(where.user.OR, [
    { name: { contains: 'asha', mode: 'insensitive' } },
    { email: { contains: 'asha', mode: 'insensitive' } },
  ])
})

test('completion summary returns selected-quarter and all-quarter rollups', () => {
  const rows = [
    { Q1: 'complete', Q2: 'pending', Q3: 'closed', Q4: 'closed' },
    { Q1: 'complete', Q2: 'complete', Q3: 'pending', Q4: 'closed' },
    { Q1: 'pending', Q2: 'complete', Q3: 'pending', Q4: 'closed' },
  ]
  const summary = buildCompletionSummary(rows, 'Q2')

  assert.equal(summary.total, 3)
  assert.equal(summary.selectedQuarter, 'Q2')
  assert.equal(summary.selectedComplete, 2)
  assert.equal(summary.selectedPercent, 67)
  assert.equal(summary.quarters.Q1.complete, 2)
  assert.equal(summary.quarters.Q3.pending, 2)
})
