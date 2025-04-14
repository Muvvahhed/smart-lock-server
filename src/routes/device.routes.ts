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

// Run device diagnostics
router.post('/diagnostics', async (req: Request, res: Response) => {
	try {
		const device = await DeviceModel.findOne({
			deviceId: process.env.DEVICE_ID,
		})

		if (!device) {
			return res.status(404).json({ message: 'Device not found' })
		}

		// Simulate running diagnostics
		logger.info('Running device diagnostics')

		// Generate random values for demonstration
		const wifiStrength = Math.floor(Math.random() * 30) + 70 // 70-100
		const batteryLevel = Math.floor(Math.random() * 20) + 70 // 70-90
		const status = Math.random() > 0.05 ? 'online' : 'offline' // 95% chance of online

		// Update device with "diagnostics" results
		await DeviceModel.findOneAndUpdate(
			{ deviceId: process.env.DEVICE_ID },
			{
				wifiStrength,
				batteryLevel,
				status,
				lastCheckIn: new Date(),
				lastUpdated: new Date(),
			},
			{ new: true }
		)

		return res.status(200).json({
			success: true,
			message: 'Diagnostics completed successfully',
		})
	} catch (error: unknown) {
		const err = error as Error
		logger.error(err.message)
		return res
			.status(500)
			.json({ message: 'Something went wrong during diagnostics' })
	}
})

export default router
