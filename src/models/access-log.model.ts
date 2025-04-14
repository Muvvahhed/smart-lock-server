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
export class AccessLog {
	@prop({ ref: () => User, required: true })
	user!: Ref<User>

	@prop({ required: true, enum: ['pin', 'biometric', 'mobile'] })
	accessMethod!: 'pin' | 'biometric' | 'mobile'

	@prop({ default: false })
	success!: boolean

	@prop({})
	notes?: string

	@prop({ default: new Date() })
	createdAt!: Date

	@prop({ default: new Date() })
	updatedAt!: Date
}
export const AccessLogModel = getModelForClass(AccessLog)
