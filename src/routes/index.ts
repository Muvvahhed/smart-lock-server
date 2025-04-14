import { Router } from 'express'
import userRoutes from './user.routes'
import accessLogsRoutes from './access-logs.routes'
import notificationRoutes from './notification.routes'
import deviceRoutes from './device.routes'
import dashboardRoutes from './dashboard.routes'

const router = Router()

router.use('/user', userRoutes)
router.use('/access-logs', accessLogsRoutes)
router.use('/notifications', notificationRoutes)
router.use('/device', deviceRoutes)
router.use('/dashboard', dashboardRoutes)

export default router
