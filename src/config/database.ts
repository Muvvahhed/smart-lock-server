import mongoose from 'mongoose'
import logger from '../utils/logger'

const dbUri =
	process.env.DB_URI ||
	'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
const MAX_RETRIES = 3
let retryCount = 0

async function connectDataSource(): Promise<void> {
	try {
		const conn = await mongoose.connect(dbUri, {
			dbName: 'smartlock',
			maxPoolSize: 10,
			serverSelectionTimeoutMS: 20000,
			socketTimeoutMS: 40000,
		})

		if (conn.connection.db) {
			logger.info(
				`Connected to ${conn.connection.db.databaseName} @ ${conn.connection.host}`
			)
			retryCount = 0
		}
	} catch (err) {
		logger.error(
			`Data-source error: ${
				err instanceof Error ? err.message : 'Unknown error'
			}`
		)

		if (retryCount < MAX_RETRIES) {
			retryCount++
			logger.info(`Retrying connection attempt ${retryCount} of ${MAX_RETRIES}`)
			setTimeout(connectDataSource, 5000)
		} else {
			logger.error('Max retry attempts reached. Exiting...')
			process.exit(1)
		}
	}

	mongoose.connection.on('disconnected', () => {
		logger.warn('Disconnected from data-source')
		if (retryCount < MAX_RETRIES) {
			retryCount++
			logger.info(`Attempting to reconnect... (${retryCount}/${MAX_RETRIES})`)
			setTimeout(connectDataSource, 5000)
		}
	})
}

export default connectDataSource
