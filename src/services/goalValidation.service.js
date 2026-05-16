import { ValidationError } from '../utils/errors.js'

export function validateSheetGoals(goals) {
  if (!goals.length) {
    throw new ValidationError('Please add at least one goal before submitting')
  }

  if (goals.length > 8) {
    throw new ValidationError('Maximum 8 goals allowed per cycle')
  }

  const invalidWeight = goals.find((goal) => Number(goal.weightage) < 10)
  if (invalidWeight) {
    throw new ValidationError('Minimum weightage per goal is 10')
  }

  const total = goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0)
  if (Math.round(total * 100) / 100 !== 100) {
    throw new ValidationError(`Total weightage must be exactly 100%. Currently: ${total}%`)
  }
}
