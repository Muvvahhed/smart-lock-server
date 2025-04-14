import { Request, Response, Router } from 'express'
import { AccessLogModel } from '../models/access-log.model'
import logger from '../utils/logger'

const router = Router()
router.get('/fetch', async (req: Request, res: Response) => {
	try {
		const accessLogs = await AccessLogModel.find({})
			.populate({
				path: 'user',
				select: 'fullName email',
			})
			.sort({ createdAt: -1 })

		return res.status(200).json({
			message: 'Access logs fetched successfully',
			data: accessLogs,
		})
	} catch (error: any) {
		logger.error(error)
		return res.status(500).json({ message: 'Something went wrong' })
	}
})

export default router
