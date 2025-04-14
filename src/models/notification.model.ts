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
import { User } from './user.model'

@modelOptions({
	schemaOptions: { timestamps: true },
	options: { allowMixed: Severity.ALLOW },
})
export class Notification {
	@prop({ ref: () => User, required: true })
	user!: Ref<User>

	@prop({ required: true, enum: ['security', 'system', 'info'] })
	type!: 'security' | 'system' | 'info'

	@prop({ required: true })
	message!: string

	@prop({ default: false, type: Boolean })
	read!: boolean

	@prop({ default: new Date() })
	createdAt!: Date

	@prop({ default: new Date() })
	updatedAt!: Date
}
export const NotificationModel = getModelForClass(Notification)
