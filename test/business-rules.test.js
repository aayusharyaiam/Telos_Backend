import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSheetGoals } from '../src/services/goalValidation.service.js'
import { computeScore, computeOverallScore } from '../src/services/score.service.js'
import { buildAchievementSheetWhere, buildCompletionSummary } from '../src/services/reportFilters.service.js'

test('goal validation requires at least one goal, minimum weights, and exactly 100 total weightage', () => {
  assert.throws(() => validateSheetGoals([]), /at least one goal/)
  assert.throws(() => validateSheetGoals([{ weightage: 5 }, { weightage: 95 }]), /Minimum weightage/)
  assert.throws(() => validateSheetGoals([{ weightage: 40 }, { weightage: 40 }]), /exactly 100/)
  assert.throws(() => validateSheetGoals(Array.from({ length: 9 }, (_, i) => ({ weightage: i < 8 ? 12 : 4 }))), /Maximum 8/)
  assert.doesNotThrow(() => validateSheetGoals([{ weightage: 40 }, { weightage: 60 }]))
})

test('goal validation boundary: exactly 8 goals with total 100 passes', () => {
  const goals = Array.from({ length: 8 }, (_, i) => ({ weightage: i < 7 ? 12 : 16 }))
  assert.doesNotThrow(() => validateSheetGoals(goals))
})

test('goal validation: single goal must be exactly 100', () => {
  assert.doesNotThrow(() => validateSheetGoals([{ weightage: 100 }]))
  assert.throws(() => validateSheetGoals([{ weightage: 90 }]), /exactly 100/)
})

test('check-in score computation handles all uom types with direction, caps, and guards', () => {
  assert.equal(computeScore({ uomType: 'NUMERIC_MIN', target: 100, actual: 125 }), 100)
  assert.equal(computeScore({ uomType: 'NUMERIC_MIN', target: 100, actual: 50 }), 50)
  assert.equal(computeScore({ uomType: 'NUMERIC_MAX', target: 10, actual: 5 }), 100)
  assert.equal(computeScore({ uomType: 'NUMERIC_MAX', target: 10, actual: 20 }), 50)
  assert.equal(computeScore({ uomType: 'PERCENTAGE_MIN', target: 80, actual: 90 }), 100)
  assert.equal(computeScore({ uomType: 'PERCENTAGE_MIN', target: 80, actual: 40 }), 50)
  assert.equal(computeScore({ uomType: 'PERCENTAGE_MAX', target: 5, actual: 3 }), 100)
  assert.equal(computeScore({ uomType: 'PERCENTAGE_MAX', target: 5, actual: 10 }), 50)
  assert.equal(computeScore({ uomType: 'TIMELINE', targetDate: '2026-03-31', actualDate: '2026-03-30' }), 100)
  assert.equal(computeScore({ uomType: 'TIMELINE', targetDate: '2026-03-31', actualDate: '2026-04-01' }), 0)
  assert.equal(computeScore({ uomType: 'ZERO', actual: 0 }), 100)
  assert.equal(computeScore({ uomType: 'ZERO', actual: 1 }), 0)
})

test('score computation edge cases: null actuals, division by zero, zero target/actual', () => {
  assert.equal(computeScore({ uomType: 'NUMERIC_MIN', target: 0, actual: 10 }), null)
  assert.equal(computeScore({ uomType: 'NUMERIC_MAX', target: 0, actual: 10 }), null)
  assert.equal(computeScore({ uomType: 'NUMERIC_MAX', target: 10, actual: 0 }), 100)
  assert.equal(computeScore({ uomType: 'NUMERIC_MIN', target: null, actual: null }), null)
  assert.equal(computeScore({ uomType: 'NUMERIC_MAX', target: null, actual: null }), null)
  assert.equal(computeScore({ uomType: 'PERCENTAGE_MIN', target: 0, actual: 10 }), null)
  assert.equal(computeScore({ uomType: 'ZERO', target: null, actual: null }), null)
  assert.equal(computeScore({ uomType: 'TIMELINE', targetDate: null, actualDate: null }), null)
  assert.equal(computeScore({ uomType: 'NUMERIC_MIN' }), null)
  assert.equal(computeScore({ uomType: 'NUMERIC_MAX' }), null)
  assert.equal(computeScore({ uomType: 'ZERO' }), null)
  assert.equal(computeScore({ uomType: 'TIMELINE' }), null)
})

test('computeOverallScore handles weighted average across scored goals', () => {
  const goals = [
    { latestScore: 80, weightage: 50 },
    { latestScore: 60, weightage: 50 },
  ]
  assert.equal(computeOverallScore(goals), 70)
})

test('computeOverallScore returns null when no goals have scores', () => {
  assert.equal(computeOverallScore([{ latestScore: null, weightage: 100 }]), null)
  assert.equal(computeOverallScore([]), null)
})

test('computeOverallScore correctly weights by goal weightage', () => {
  const goals = [
    { latestScore: 100, weightage: 25 },
    { latestScore: 50, weightage: 75 },
  ]
  const expected = (100 * 0.25 + 50 * 0.75) / 100 * 100
  assert.equal(computeOverallScore(goals), expected)
})

test('computeOverallScore only considers goals that have a score', () => {
  const goals = [
    { latestScore: 90, weightage: 30 },
    { latestScore: null, weightage: 30 },
    { latestScore: 70, weightage: 40 },
  ]
  const expected = (90 * 0.30 + 70 * 0.40) / 70 * 100
  assert.equal(computeOverallScore(goals), expected)
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

test('achievement report filters allow admin to see all without manager scoping', () => {
  const where = buildAchievementSheetWhere({
    cycleId: 'cycle-1',
    user: { id: 'admin-1', role: 'ADMIN' },
  })
  assert.equal(where.user, undefined)
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

test('completion summary handles empty input and all-missed scenarios', () => {
  const empty = buildCompletionSummary([], 'Q1')
  assert.equal(empty.total, 0)
  assert.equal(empty.selectedComplete, 0)
  assert.equal(empty.selectedPercent, 0)

  const allMissed = [
    { Q1: 'missed', Q2: 'missed', Q3: 'closed', Q4: 'closed' },
  ]
  const missed = buildCompletionSummary(allMissed, 'Q1')
  assert.equal(missed.selectedComplete, 0)
  assert.equal(missed.selectedPercent, 0)
})

test('completion summary computes correct percentage rounding', () => {
  const rows = [
    { Q1: 'complete', Q2: 'pending', Q3: 'closed', Q4: 'closed' },
    { Q1: 'pending', Q2: 'complete', Q3: 'closed', Q4: 'closed' },
    { Q1: 'pending', Q2: 'pending', Q3: 'closed', Q4: 'closed' },
  ]
  const summary = buildCompletionSummary(rows, 'Q1')
  assert.equal(summary.total, 3)
  assert.equal(summary.selectedComplete, 1)
  assert.equal(summary.selectedPercent, 33)
})
