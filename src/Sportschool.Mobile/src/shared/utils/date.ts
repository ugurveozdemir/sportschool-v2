export function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatMonth(year: number, month: number) {
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isSameDay(value: string, reference: Date = new Date()) {
  return startOfDay(new Date(value)) === startOfDay(reference);
}

export function formatRelativeDay(value: string) {
  const diffDays = Math.round((startOfDay(new Date(value)) - startOfDay(new Date())) / 86_400_000);
  if (diffDays === 0) {
    return "Bugün";
  }
  if (diffDays === 1) {
    return "Yarın";
  }
  return formatDate(value);
}
