import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { createGoal, deleteGoal, listGoals, updateGoal } from '../controllers/goals.controller.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), listGoals)

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), createGoal)

router.patch('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), updateGoal)

router.delete('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), deleteGoal)

export default router
