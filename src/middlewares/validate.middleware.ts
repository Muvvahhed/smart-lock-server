import { Request, Response, NextFunction } from 'express'
import { AnyZodObject } from 'zod'
import logger from '../utils/logger'

/**
 * Validates incoming requests (body, query & params) against a schema.
 * @param schema ZodObject used for validation.
 * @returns An error as response if validation fails or else, proceeds to next middleware.
 */
const validate =
	(schema: AnyZodObject) =>
	(req: Request, res: Response, next: NextFunction) => {
		try {
			schema.parse(req.body)
			next() // proceed to next middleware
		} catch (err: any) {
			// logger.error(err)
			return res.status(400).send(err.errors) // send error message provided by schemaObj
		}
	}
export default validate
