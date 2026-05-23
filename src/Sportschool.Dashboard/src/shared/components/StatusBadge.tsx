type StatusBadgeProps = {
  value: string | boolean;
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const label = typeof value === "boolean" ? (value ? "Aktif" : "Pasif") : value;
  const normalized = label.toLowerCase();
  const tone =
    normalized.includes("active") ||
    normalized.includes("aktif") ||
    normalized.includes("paid") ||
    normalized.includes("present") ||
    normalized.includes("approved")
      ? "success"
      : normalized.includes("pending") || normalized.includes("late") || normalized.includes("unpaid")
        ? "warning"
        : normalized.includes("passive") ||
            normalized.includes("pasif") ||
            normalized.includes("rejected") ||
            normalized.includes("absent")
          ? "danger"
          : "neutral";

  return <span className={`status-badge status-${tone}`}>{label}</span>;
}
