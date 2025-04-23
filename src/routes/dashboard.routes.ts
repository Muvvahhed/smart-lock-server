import { Request, Response, Router } from 'express'
import { DeviceModel } from '../models/device-status.model'
import { AccessLogModel } from '../models/access-log.model'
import { UserModel } from '../models/user.model'
import logger from '../utils/logger'

const router = Router()

// Get dashboard summary data
router.get('/summary', async (req: Request, res: Response) => {
	try {
		// Get device status
		const device = await DeviceModel.findOne({
			deviceId: process.env.DEVICE_ID,
		})
		if (!device) {
			return res.status(404).json({ message: 'Device not found' })
		}

		// Get recent logs (limit to 5)
		const recentLogs = await AccessLogModel.find()
			.sort({ createdAt: -1 })
			.populate('user', 'fullName email')

		// Get user count
		const userCount = await UserModel.countDocuments()

		// Get total access counts and success rate
		const totalAccesses = await AccessLogModel.countDocuments()
		const successfulAccesses = await AccessLogModel.countDocuments({
			success: true,
		})
		const successRate =
			totalAccesses > 0
				? Math.round((successfulAccesses / totalAccesses) * 100)
				: 0

		return res.status(200).json({
			data: {
				device,
				recentLogs,
				userCount,
				totalAccesses,
				successRate,
			},
		})
	} catch (error: unknown) {
		const err = error as Error
		logger.error(err.message)
		return res.status(500).json({ message: 'Something went wrong' })
	}
})

export default router
