import { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../utils/jwt'
import { UserModel } from '../models/user.model'

const authenticateUser = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// checks only for bearer authorization
		const bearer = req.headers.authorization
		if (!bearer) {
			res.status(401).json({ message: 'Unauthorized' })
			return
		}

		// checks if the token is empty
		const [, accessToken] = bearer.split(' ')
		if (!accessToken) {
			res.status(401).json({ message: 'Unauthorized' })
			return
		}

		// checks for valid token
		const decoded: {
			id: string
			iat: number
			exp: number
		} | null = verifyJwt(accessToken)

		if (!decoded) {
			return res.status(401).json({ message: 'Invalid token' })
		}
		const user = await UserModel.findById(decoded.id)
		if (!user) {
			return res.status(404).json({ message: 'user not found' })
		}

		res.locals.user = user
		return next()
	} catch (err) {
		console.log(err)
		return res.status(500).json({ message: 'internal server error' })
	}
}

export default authenticateUser
