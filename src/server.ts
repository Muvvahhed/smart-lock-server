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
import { UserModel } from './models/user.model'

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

app.route('/api/enroll-fingerprint').put(async (req, res) => {
	try {
		const { studentId } = req.body
		if (!studentId) {
			return res.status(400).json({ message: 'Student ID is required' })
		}
		const student = await StudentModel.findById(studentId)
		if (!student) {
			return res.status(404).json({ message: 'Student not found' })
		}

		const fingerPrint = student.fingerprintId

		console.log('enroll mode')
		wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				console.log('enroll mode active')
				client.send(`scan:${fingerPrint}`)
			}
		})

		pendingEnrollments.set(fingerPrint, async (success: boolean) => {
			if (success) {
				logger.info('Enrollment successful')
				// Update the student's fingerprint registration status
				student.isFingerprintRegistered = true
				await student.save()
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

				case 'verifyAck':
					logger.info({ verifyAck: data })
					if (attendanceActive) {
						sendMessageToClient('web', JSON.stringify(data))
						sendMessageToClient('esp32', 'verify')
					} else {
						logger.info('Attendance mode not enabled')
					}
					break

				case 'takeAttendance':
					logger.info('Attendance mode started')
					attendanceActive = true
					sendMessageToClient('esp32', 'verify')
					break

				case 'stopAttendance':
					logger.info('Attendance mode stopped')
					// sendMessageToClient('react', 'stopAttendance')
					attendanceActive = false

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

// server.on('upgrade', (request, socket, head) => {
// 	wss.handleUpgrade(request, socket, head, (ws) => {
// 		wss.emit('connection', ws, request)
// 	})
// })

server.listen(PORT, async () => {
	logger.info(`Server running on port ${PORT}`)
	await connectDataSource()
})
