import type { NavItem } from "@/shared/components/MobileUi";
import type { Session } from "@/shared/types/session";

const coachNav: NavItem[] = [
  { label: "Dashboard", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Takvim", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Takımlar", icon: "account-group-outline", href: "/development", match: "/development" },
  { label: "Ödemeler", icon: "cash-multiple", href: "/payments", match: "/payments" },
  { label: "Profil", icon: "account-outline", href: "/profile", match: "/profile" }
];

const athleteNav: NavItem[] = [
  { label: "Panel", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Antrenman", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Gelişim", icon: "chart-line", href: "/development", match: "/development" },
  { label: "Profil", icon: "cash-multiple", href: "/profile", match: "/profile" }
];

const parentNav: NavItem[] = [
  { label: "Panel", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Takvim", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Ödemeler", icon: "cash-multiple", href: "/payments", match: "/payments" },
  { label: "Profil", icon: "account-outline", href: "/profile", match: "/profile" }
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
