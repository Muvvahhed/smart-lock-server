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
	username!: string

	@prop({ required: true })
	password!: string

	@prop({ required: true })
	firstName!: string

	@prop({ required: true })
	lastName!: string

	@prop({
		default: 'lecturer',
		enum: ['admin', 'student', 'lecturer'],
	})
	role!: 'admin' | 'student' | 'lecturer'

	@prop({ default: new Date() })
	createdAt!: Date

	async verifyPassword(password: string) {
		return argon2.verify(this.password, password)
	}
}
export const UserModel = getModelForClass(User)
export type TUser = DocumentType<User>
export type ResponseWithUser = Response<{}, { user: TUser }>
