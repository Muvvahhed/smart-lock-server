import { Request, Response, Router } from 'express'
import { TypeOf, z } from 'zod'
import validate from '../middlewares/validate.middleware'
import { DeviceModel } from '../models/device-status.model'
import logger from '../utils/logger'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
	try {
		const device = await DeviceModel.findOne({
			deviceId: process.env.DEVICE_ID,
		})

		if (!device) {
			return res.status(404).json({ message: 'Device not found' })
		}

		return res.status(200).json({
			message: 'Device status fetched successfully',
			data: device,
		})
	} catch (error: any) {
		logger.error(error)
		return res.status(500).json({ message: 'Something went wrong' })
	}
})

// Update device status
const updateDeviceSchema = z.object({
	lockState: z.enum(['locked', 'unlocked']).optional(),
	batteryLevel: z.number().min(0).max(100).optional(),
	wifiStatus: z.boolean().optional(),
})

router.put(
	'/',
	validate(updateDeviceSchema),
	async (req: Request, res: Response) => {
		try {
			const { lockState, batteryLevel, wifiStatus } = req.body as TypeOf<
				typeof updateDeviceSchema
			>

			const updateData: any = {}
			if (lockState !== undefined) updateData.lockState = lockState
			if (batteryLevel !== undefined) updateData.batteryLevel = batteryLevel
			if (wifiStatus !== undefined) updateData.wifiStatus = wifiStatus

			// Only update if there's something to update
			if (Object.keys(updateData).length === 0) {
				return res
					.status(400)
					.json({ message: 'No valid update fields provided' })
			}

			const device = await DeviceModel.findOneAndUpdate(
				{ deviceId: process.env.DEVICE_ID },
				updateData,
				{ new: true }
			)

			if (!device) {
				return res.status(404).json({ message: 'Device not found' })
			}

			return res.status(200).json({
				message: 'Device updated successfully',
				data: device,
			})
		} catch (error: any) {
			logger.error(error)
			return res.status(500).json({ message: 'Something went wrong' })
		}
	}
)

export default router
