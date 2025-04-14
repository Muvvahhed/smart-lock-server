import { Request, Response, Router } from 'express'
import { TypeOf, z } from 'zod'
import validate from '../middlewares/validate.middleware'
import { NotificationModel } from '../models/notification.model'
import logger from '../utils/logger'

const router = Router()

router.get('/fetch', async (req: Request, res: Response) => {
	try {
		const notifications = await NotificationModel.find({}).sort({
			createdAt: -1,
		})

		return res.status(200).json({
			message: 'Notifications fetched successfully',
			data: notifications,
		})
	} catch (error: any) {
		logger.error(error)
		return res.status(500).json({ message: 'Something went wrong' })
	}
})

// Mark notification as read
const updateNotificationSchema = z.object({
	notificationId: z.string(),
	read: z.boolean(),
})

router.put(
	'/update',
	validate(updateNotificationSchema),
	async (req: Request, res: Response) => {
		try {
			const { notificationId, read } = req.body as TypeOf<
				typeof updateNotificationSchema
			>

			const notification = await NotificationModel.findByIdAndUpdate(
				notificationId,
				{ read },
				{ new: true }
			)

			if (!notification) {
				return res.status(404).json({ message: 'Notification not found' })
			}

			return res.status(200).json({
				message: 'Notification updated successfully',
				data: notification,
			})
		} catch (error: any) {
			logger.error(error)
			return res.status(500).json({ message: 'Something went wrong' })
		}
	}
)

export default router
