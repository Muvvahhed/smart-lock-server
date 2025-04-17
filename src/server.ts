import 'dotenv/config'
import express, { Application } from 'express'
import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import http from 'http'
import { WebSocketServer } from 'ws'
import logger from './utils/logger'
import connectDataSource from './config/database'
import morgan from 'morgan'
import routes from './routes'
import { TUser, UserModel } from './models/user.model'
import { DeviceModel } from './models/device-status.model'
import { AccessLogModel } from './models/access-log.model'
import { Types } from 'mongoose'

const PORT = process.env.PORT || 8080
const app: Application = express()
const corsOptions: CorsOptions = {
	origin: true,
	credentials: true,
}

app.use(helmet())

app.use(cors(corsOptions))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(routes)

const pendingEnrollments = new Map()

const server = http.createServer(app)
const wss = new WebSocketServer({ server })
const clients = new Map()
let hardwareActive = false
let attendanceActive = false
let attendanceId = null

wss.on('connection', (ws, req) => {
	logger.info('New WebSocket connection')
	const url = new URL(req.url || '', `http://${req.headers.host}`)
	// const clientType = url.searchParams.get('clientType') || 'unknown';
	const clientType =
		url.searchParams.get('clientType') === 'hardware-web' ? 'web' : 'esp32'

	if (clientType === 'esp32') {
		hardwareActive = true
	}

	clients.set(ws, clientType)

	logger.info(`New client connected: ${clientType}`)

	ws.on('message', async (message) => {
		if (Buffer.isBuffer(message)) {
			const messageString = message.toString('utf8')
			const data = JSON.parse(messageString)
			switch (data.action) {
				case 'checkHardwareStatus':
					ws.send(JSON.stringify({ action: 'hardwareStatus', hardwareActive }))
					break

				case 'enrollAck':
					const enrollmentCallback = pendingEnrollments.get(data.fingerprintId)
					if (enrollmentCallback) {
						enrollmentCallback(data.success)
						pendingEnrollments.delete(data.fingerprintId)
					}
					break

				case 'unlocked':
					await DeviceModel.findOneAndUpdate(
						{
							deviceId: process.env.DEVICE_ID,
						},
						{
							lockState: 'unlocked',
						},
						{
							new: true,
						}
					)

					logger.info('Device unlocked')
					sendMessageToClient('web', 'unlocked')
					let user: TUser | null = null
					if (data.source !== 'mobile' && data.id) {
						user = await UserModel.findOne({
							biometricId: data.id,
						})
					}
					await AccessLogModel.create({
						success: true,
						accessMethod: data.source,
						action: 'door unlocked',
						user:
							data.source === 'mobile'
								? new Types.ObjectId('67fbd731656de6e6cec336cd')
								: user?._id,
					})
					break
				case 'locked':
					await DeviceModel.findOneAndUpdate(
						{
							deviceId: process.env.DEVICE_ID,
						},
						{
							lockState: 'locked',
						},
						{
							new: true,
						}
					)

					logger.info('Device locked')
					sendMessageToClient('web', 'locked')
					break

				case 'failed':
					await AccessLogModel.create({
						success: false,
						accessMethod: data.source,
						action: 'failed attempt',
					})
					logger.info('Failed access attempt')
					break

				default:
					console.log(data)
					break
			}
		} else {
			console.log('Received message from ESP32:', message)
		}
	})

	ws.on('close', () => {
		const disconnectedClientType = clients.get(ws)
		if (disconnectedClientType === 'esp32') {
			hardwareActive = false
		}
		clients.delete(ws)
		logger.info(
			`Client disconnected: ${clientType}, Remaining Clients: ${clients.size}`
		)
	})

	ws.on('error', (error) => {
		logger.error(`WebSocket error: ${error}`)
	})
})

function sendMessageToClient(clientType: string, message: string) {
	for (const [ws, type] of clients.entries()) {
		if (type === clientType && ws.readyState === WebSocket.OPEN) {
			ws.send(message)
			return // Exit after sending the message to the first matching client
		}
	}
	console.error(`Client of type ${clientType} not found`)
}

app.route('/enroll').put(async (req, res) => {
	try {
		const { userId } = req.body
		if (!userId) {
			return res.status(400).json({ message: 'user ID is required' })
		}
		const user = await UserModel.findById(userId)
		if (!user) {
			return res.status(404).json({ message: 'Student not found' })
		}

		const fingerPrint = user.biometricId

		wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				console.log('enroll mode active')
				client.send(`scan:${fingerPrint}`)
			}
		})

		pendingEnrollments.set(fingerPrint, async (success: boolean) => {
			if (success) {
				logger.info('Enrollment successful')
				user.biometricEnrolled = true
				await user.save()
				res
					.status(200)
					.json({ success: true, message: 'Enrollment successful' })
			} else {
				res.status(500).json({ success: false, message: 'Enrollment failed' })
			}
		})
	} catch (err) {
		console.log(err)
		return res.status(500).json({ message: 'Enrollment failed' })
	}
})

app.route('/door-control').put(async (req, res) => {
	try {
		const { action } = req.body
		if (!action) {
			return res.status(400).json({ message: 'Action is required' })
		}

		// Find the device in the database
		const device = await DeviceModel.findOne({
			deviceId: process.env.DEVICE_ID,
		})

		if (!device) {
			return res.status(404).json({ message: 'Device not found' })
		}

		if (action === 'unlock') {
			// Update device lock state in database
			device.lockState = 'unlocked'
			await device.save()

			// Send message to hardware clients
			wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send('unlock')
				}
			})

			logger.info('Door unlocked and database updated')
			res.status(200).json({ success: true, message: 'Door unlocked' })
		} else if (action === 'lock') {
			// Update device lock state in database
			device.lockState = 'locked'
			await device.save()

			// Send message to hardware clients
			wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send('lock')
				}
			})

			logger.info('Door locked and database updated')
			res.status(200).json({ success: true, message: 'Door locked' })
		} else {
			res.status(400).json({ success: false, message: 'Invalid action' })
		}
	} catch (err) {
		logger.error(err)
		return res.status(500).json({ message: 'Door control failed' })
	}
})

server.listen(PORT, async () => {
	logger.info(`Server running on port ${PORT}`)
	await connectDataSource()
	try {
		const admin = await UserModel.findOne({
			role: 'admin',
		})

		if (!admin) {
			await UserModel.create({
				email: process.env.ADMIN_EMAIL,
				deviceId: process.env.DEVICE_ID,
				password: process.env.ADMIN_PASSWORD,
				fullName: 'Khadijah Ahmed',
				role: 'admin',
				pin: '1234',
			})
			logger.info('Admin user created')
		} else {
			logger.info('Admin user already exists')
		}

		const device = await DeviceModel.findOne({
			deviceId: process.env.DEVICE_ID,
		})

		if (!device) {
			await DeviceModel.create({
				deviceId: process.env.DEVICE_ID,
				lockState: 'locked',
				batteryLevel: 100,
			})
			logger.info('Device created')
		} else {
			logger.info('Device already exists')
		}
	} catch (err) {
		logger.error(err)
	}
})
