export function computeScore({ uomType, target, actual, targetDate, actualDate }) {
  if (actual === null && actualDate === null) return null

  switch (uomType) {
    case 'NUMERIC_MIN':
    case 'PERCENTAGE_MIN': {
      if (target === 0) return null
      return Math.min(100, (actual / target) * 100)
    }
    case 'NUMERIC_MAX':
    case 'PERCENTAGE_MAX': {
      if (actual === 0) return 100
      if (target === 0) return null
      return Math.min(100, (target / actual) * 100)
    }
    case 'TIMELINE': {
      if (!actualDate || !targetDate) return null
      return new Date(actualDate) <= new Date(targetDate) ? 100 : 0
    }
    case 'ZERO': {
      return actual === 0 ? 100 : 0
    }
    default:
      return null
  }
}

export function computeOverallScore(goalsWithCheckins) {
  const scoredGoals = goalsWithCheckins.filter((g) => g.latestScore !== null)
  if (scoredGoals.length === 0) return null

  const weightedSum = scoredGoals.reduce(
    (sum, g) => sum + (g.latestScore * g.weightage) / 100,
    0
  )

  const totalWeightage = scoredGoals.reduce((sum, g) => sum + g.weightage, 0)
  return (weightedSum / totalWeightage) * 100
}
