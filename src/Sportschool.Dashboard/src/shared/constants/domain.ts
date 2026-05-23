export const paymentStatuses = ["Pending", "Paid", "Unpaid"] as const;
export const attendanceStatuses = ["Present", "Absent", "Excused", "Late"] as const;
export const trainingRecurrences = ["None", "Weekly"] as const;
export const applicationStatuses = ["Pending", "Approved", "Rejected"] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];
export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type TrainingRecurrence = (typeof trainingRecurrences)[number];
export type AthleteApplicationStatus = (typeof applicationStatuses)[number];
