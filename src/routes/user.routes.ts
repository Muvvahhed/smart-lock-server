import { Request, Response, Router } from 'express'
import { TypeOf, z } from 'zod'
import validate from '../middlewares/validate.middleware'
import { UserModel } from '../models'
import { signJwt } from '../utils/jwt'
import logger from '../utils/logger'
import { wss } from '../server'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
	try {
		const users = await UserModel.find({}).select('-__v')
		return res.status(200).json({
			message: 'Users fetched successfully',
			data: users,
		})
	} catch (error: any) {
		logger.error(error)
		return res.status(500).json({ message: 'Something went wrong' })
	}
})

const registerSchema = z.object({
	email: z.string(),
	pincode: z.string(),
	fullName: z.string(),
})

router.post(
	'/register',
	validate(registerSchema),
	async (req: Request, res: Response) => {
		try {
			const { email, fullName, pincode } = req.body as TypeOf<
				typeof registerSchema
			>

			const existingUser = await UserModel.findOne({
				email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
			})

			if (existingUser) {
				return res.status(409).json({ message: 'User already exists' })
			}

			const user = await UserModel.create({
				email,
				fullName,
				pin: pincode,
				deviceId: process.env.DEVICE_ID,
				biometricId: (await UserModel.countDocuments()) + 1,
			})

			const token = signJwt({
				id: user._id,
				email: user.email,
				role: user.role,
			})

			wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(`addUser:${user.biometricId}:${user.pin}`)
				}
			})

			return res.status(201).json({
				message: 'User created successfully',
				data: {
					token,
					user: user,
				},
			})
		} catch (error: any) {
			logger.error(error)
			return res.status(500).json({ message: 'Something went wrong' })
		}
	}
)

const loginSchema = z.object({
	email: z.string(),
	deviceId: z.string(),
	password: z.string(),
})

router.post(
	'/login',
	validate(loginSchema),
	async (req: Request, res: Response) => {
		try {
			const { email, password, deviceId } = req.body as TypeOf<
				typeof loginSchema
			>

			const user = await UserModel.findOne({
				role: 'admin',
				email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
				deviceId: { $regex: new RegExp(`^${deviceId.trim()}$`, 'i') },
			})

			if (!user) {
				return res.status(404).json({ message: 'User not found' })
			}

			const isPasswordValid = await user.verifyPassword(password)
			if (!isPasswordValid) {
				return res.status(401).json({ message: 'Invalid credentials' })
			}

			const token = signJwt({
				id: user._id,
				email: user.email,
				role: user.role,
			})

			return res.status(200).json({
				message: 'Login successful',
				data: {
					token,
					user: user,
				},
			})
		} catch (error: any) {
			logger.error(error)
			return res.status(500).json({ message: 'Something went wrong' })
		}
	}
)

router.delete('/:userId', async (req: Request, res: Response) => {
	try {
		const { userId } = req.params
		logger.info(userId)

		const user = await UserModel.findByIdAndDelete(userId)

		if (!user) {
			return res.status(404).json({ message: 'User not found' })
		}

		return res.status(200).json({
			message: 'User deleted successfully',
		})
	} catch (error: any) {
		logger.error(error)
		return res.status(500).json({ message: 'Something went wrong' })
	}
})

router.put('/change-password', async (req: Request, res: Response) => {
	try {
		const { currentPassword, newPassword } = req.body

		const user = await UserModel.findOne({
			role: 'admin',
		})

		if (!user) {
			return res.status(404).json({ message: 'User not found' })
		}

		const isPasswordValid = await user.verifyPassword(currentPassword)
		if (!isPasswordValid) {
			return res.status(401).json({ message: 'Invalid credentials' })
		}
		if (currentPassword === newPassword) {
			return res.status(400).json({
				message: 'New password cannot be the same as the current password',
			})
		}
		if (newPassword.length < 6) {
			return res.status(400).json({
				message: 'New password must be at least 6 characters long',
			})
		}
		user.password = newPassword
		await user.save()

		return res.status(200).json({
			message: 'Password changed successfully',
			success: true,
		})
	} catch (error: any) {
		logger.error(error)
		return res.status(500).json({ message: 'Something went wrong' })
	}
})

export default router
