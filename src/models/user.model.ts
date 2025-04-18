import {
	getModelForClass,
	prop,
	pre,
	modelOptions,
	Severity,
	index,
	DocumentType,
	Ref,
} from '@typegoose/typegoose'
import argon2 from 'argon2'
import { Response } from 'express'
import { number } from 'zod'

@modelOptions({
	schemaOptions: { timestamps: true },
	options: { allowMixed: Severity.ALLOW },
})
@pre<User>('save', async function (next) {
	if (this.isModified('password')) {
		this.password = await argon2.hash(this.password)
	}

	next()
})
export class User {
	@prop({ required: true, unique: true })
	email!: string

	@prop({ required: true })
	deviceId!: string

	@prop({})
	password!: string

	@prop({})
	pin!: string

	@prop({ required: true })
	fullName!: string

	@prop({
		default: 'user',
		enum: ['admin', 'user'],
	})
	role!: 'admin' | 'user'

	@prop({ default: false })
	biometricEnrolled!: boolean

	@prop({ type: Number })
	biometricId!: number

	@prop({ default: true })
	isActive!: boolean

	@prop({})
	lastLogin!: Date

	@prop({ default: new Date() })
	createdAt!: Date

	async verifyPassword(password: string) {
		return argon2.verify(this.password, password)
	}
}
export const UserModel = getModelForClass(User)
export type TUser = DocumentType<User>
export type ResponseWithUser = Response<{}, { user: TUser }>
