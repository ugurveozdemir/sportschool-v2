import type { NavItem } from "@/shared/components/MobileUi";
import type { Session } from "@/shared/types/session";

const coachNav: NavItem[] = [
  { label: "Home", icon: "home-outline", href: "/home", match: "/home" },
  { label: "Groups", icon: "account-group-outline", href: "/development", match: "/development" },
  { label: "Profile", icon: "account-outline", href: "/profile", match: "/profile" }
];

const athleteNav: NavItem[] = [
  { label: "Panel", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Antrenman", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Gelişim", icon: "chart-line", href: "/development", match: "/development" },
  { label: "Videolar", icon: "play-box-multiple-outline", href: "/feed", match: "/feed" },
  { label: "Ödemeler", icon: "cash-multiple", href: "/payments", match: "/payments" }
];

const parentNav: NavItem[] = [
  { label: "Panel", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Takvim", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Videolar", icon: "play-box-multiple-outline", href: "/feed", match: "/feed" },
  { label: "Ödemeler", icon: "cash-multiple", href: "/payments", match: "/payments" }
];

export function getMobileNav(session: Session | null) {
  if (session?.loginRole === "SchoolAdmin") {
    return coachNav;
  }
  if (session?.roles.includes("Coach")) {
    return coachNav;
  }
  if (session?.roles.includes("Parent")) {
    return parentNav;
  }
  return athleteNav;
}

export function getShellTitle(session: Session | null) {
  if (session?.loginRole === "SchoolAdmin") {
    return "TÜRK OCAĞI ELİT AKADEMİ";
  }
  if (session?.roles.includes("Coach")) {
    return "TÜRK OCAĞI ELİT AKADEMİ";
  }
  if (session?.roles.includes("Parent")) {
    return "Akademi Takibi";
  }
  return "Elite Academy";
}
