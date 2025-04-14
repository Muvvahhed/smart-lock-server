import {
	getModelForClass,
	prop,
	modelOptions,
	Severity,
} from '@typegoose/typegoose'

@modelOptions({
	schemaOptions: { timestamps: true },
	options: { allowMixed: Severity.ALLOW },
})
export class Device {
	@prop({ unique: true, required: true })
	deviceId!: string

	@prop({
		default: 'locked',
		enum: ['locked', 'unlocked'],
	})
	lockState!: 'locked' | 'unlocked'

	@prop({ default: 100 })
	batteryLevel!: number

	@prop({
		default: true,
	})
	wifiStatus?: boolean

	@prop({ default: new Date() })
	createdAt!: Date

	@prop({ default: new Date() })
	updatedAt!: Date
}
export const DeviceModel = getModelForClass(Device)
