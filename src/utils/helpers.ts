import { CourseModel } from '../models/course.model'
import { StudentModel } from '../models/student.model'
import {
	AttendanceSheetModel,
	AttendanceModel,
} from '../models/attendanceRecord.model'
import { UserModel } from '../models/user.model'
import logger from './logger'

export async function cleanUpDatabase() {
	try {
		logger.info('Starting database cleanup...')

		// Remove courses with deleted lecturers
		const validLecturers = await UserModel.find({ role: 'lecturer' }).select(
			'_id'
		)
		const validLecturerIds = validLecturers.map((lecturer) =>
			lecturer._id.toString()
		)
		const deletedCourses = await CourseModel.deleteMany({
			lecturer: { $nin: validLecturerIds },
		})
		logger.info(
			`Removed ${deletedCourses.deletedCount} courses with deleted lecturers.`
		)

		// Remove references to deleted courses from students' enrolledCourses
		const validCourses = await CourseModel.find().select('_id')
		const validCourseIds = validCourses.map((course) => course._id.toString())
		await StudentModel.updateMany(
			{},
			{ $pull: { enrolledCourses: { $nin: validCourseIds } } }
		)
		logger.info(`Updated students to remove references to deleted courses.`)

		// Remove attendance sheets with deleted courses
		const deletedAttendanceSheets = await AttendanceSheetModel.deleteMany({
			course: { $nin: validCourseIds },
		})
		logger.info(
			`Removed ${deletedAttendanceSheets.deletedCount} attendance sheets with deleted courses.`
		)

		// Remove attendance records with deleted attendance sheets
		const validAttendanceSheets = await AttendanceSheetModel.find().select(
			'_id'
		)
		const validAttendanceSheetIds = validAttendanceSheets.map((sheet) =>
			sheet._id.toString()
		)
		const deletedAttendanceRecords = await AttendanceModel.deleteMany({
			attendanceSheet: { $nin: validAttendanceSheetIds },
		})
		logger.info(
			`Removed ${deletedAttendanceRecords.deletedCount} attendance records with deleted attendance sheets.`
		)

		logger.info('Database cleanup completed successfully.')
	} catch (error) {
		logger.error(
			`Error during database cleanup: ${
				error instanceof Error ? error.message : error
			}`
		)
	}
}
