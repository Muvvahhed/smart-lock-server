import { Router } from 'express'
import userRoutes from './user.routes'
import accessLogsRoutes from './access-logs.routes'
import notificationRoutes from './notification.routes'
import deviceRoutes from './device.routes'

const router = Router()

router.use('/user', userRoutes)
router.use('/access-logs', accessLogsRoutes)
router.use('/notifications', notificationRoutes)
router.use('/device', deviceRoutes)
export default router
