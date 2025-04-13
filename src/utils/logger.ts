import { pino } from 'pino'

const logger = pino({
	transport: {
		target: process.env.NODE_ENV === 'production' ? 'pino/file' : 'pino-pretty',
	},
})

export default logger
