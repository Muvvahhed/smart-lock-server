import jwt from 'jsonwebtoken'

/**
 * Signs a JWT token using a private key loaded from config.
 * @param payload - The payload object to be included in the JWT.
 * @param options - Optional signing options.
 * @returns The signed JWT token.
 */

export const signJwt = (payload: Object, options?: jwt.SignOptions) => {
	const jwtSecret = process.env.JWT_SECRET || 'secret'

	return jwt.sign(payload, jwtSecret, {
		...(options && options),
	})
}

/**
 * Verify a JWT token using a public key.
 * @param token - The JWT token to verify.
 * @returns The decoded payload of the token, or null if the token is invalid.
 * @throws If the public key is not properly encoded or the token is not valid.
 */
export const verifyJwt = <T>(token: string): T | null => {
	try {
		const jwtSecret = process.env.JWT_SECRET || 'secret'

		const decoded = jwt.verify(token, jwtSecret) as T

		return decoded
	} catch (error) {
		return null
	}
}
