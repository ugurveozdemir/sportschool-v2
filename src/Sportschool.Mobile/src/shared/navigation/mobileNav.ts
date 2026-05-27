import type { NavItem } from "@/shared/components/MobileUi";
import type { Session } from "@/shared/types/session";

const coachNav: NavItem[] = [
  { label: "Dashboard", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Takvim", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Gruplar", icon: "account-group-outline", href: "/development", match: "/development" },
  { label: "Sporcular", icon: "account-multiple-outline", href: "/attendance", match: "/attendance" },
  { label: "Ödemeler", icon: "cash-multiple", href: "/payments", match: "/payments" }
];

const athleteNav: NavItem[] = [
  { label: "Panel", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Antrenman", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Gelişim", icon: "chart-line", href: "/development", match: "/development" },
  { label: "Ödemeler", icon: "cash-multiple", href: "/payments", match: "/payments" }
];

const parentNav: NavItem[] = [
  { label: "Panel", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Takvim", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Ödemeler", icon: "cash-multiple", href: "/payments", match: "/payments" }
];

export function getMobileNav(session: Session | null) {
  if (session?.roles.includes("Coach")) {
    return coachNav;
  }
  if (session?.roles.includes("Parent")) {
    return parentNav;
  }
  return athleteNav;
}

export function getShellTitle(session: Session | null) {
  if (session?.roles.includes("Coach")) {
    return "Akademi Pro";
  }
  if (session?.roles.includes("Parent")) {
    return "Akademi Takibi";
  }
  return "Elite Academy";
}
