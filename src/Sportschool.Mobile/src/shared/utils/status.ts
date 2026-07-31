import type { AttendanceStatus, PaymentStatus } from "@/shared/constants/domain";

export function getAttendanceLabel(status: AttendanceStatus) {
  return {
    Present: "Geldi",
    Absent: "Gelmedi"
  }[status];
}

export function getPaymentLabel(status: PaymentStatus) {
  return {
    Pending: "Bekliyor",
    Paid: "Ödendi",
    Unpaid: "Ödenmedi"
  }[status];
}
