import type { AttendanceStatus, PaymentStatus } from "@/shared/constants/domain";

export function getAttendanceLabel(status: AttendanceStatus) {
  return {
    Present: "Katıldı",
    Absent: "Katılmadı",
    Excused: "Mazeretli",
    Late: "Geç kaldı"
  }[status];
}

export function getPaymentLabel(status: PaymentStatus) {
  return {
    Pending: "Bekliyor",
    Paid: "Ödendi",
    Unpaid: "Ödenmedi"
  }[status];
}
