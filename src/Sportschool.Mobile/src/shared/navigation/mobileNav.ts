import type { NavItem } from "@/shared/components/MobileUi";
import type { Session } from "@/shared/types/session";

const coachNav: NavItem[] = [
  { label: "Home", icon: "home-outline", href: "/home", match: "/home" },
  { label: "Groups", icon: "account-group-outline", href: "/development", match: "/development" },
  { label: "Profile", icon: "account-outline", href: "/profile", match: "/profile" }
];

const athleteNav: NavItem[] = [
  { label: "Ana Sayfa", icon: "home-outline", href: "/home", match: "/home" },
  { label: "Gelişimim", icon: "chart-line", href: "/development", match: "/development" },
  { label: "Profilim", icon: "account-outline", href: "/profile", match: "/profile" }
];

const parentNav: NavItem[] = [
  { label: "Panel", icon: "view-dashboard-outline", href: "/home", match: "/home" },
  { label: "Takvim", icon: "calendar-month-outline", href: "/calendar", match: "/calendar" },
  { label: "Videolar", icon: "play-box-multiple-outline", href: "/feed", match: "/feed" },
  { label: "Ödemeler", icon: "cash-multiple", href: "/payments", match: "/payments" }
];

export function getMobileNav(session: Session | null) {
  if (session?.loginRole === "SchoolAdmin" || session?.loginRole === "Coach") {
    return coachNav;
  }
  if (session?.loginRole === "Parent") {
    return parentNav;
  }
  return athleteNav;
}

export function getShellTitle(session: Session | null) {
  if (session?.loginRole === "SchoolAdmin" || session?.loginRole === "Coach") {
    return "TÜRK OCAĞI ELİT AKADEMİ";
  }
  if (session?.loginRole === "Parent") {
    return "Akademi Takibi";
  }
  return "TÜRK OCAĞI ELİT AKADEMİ";
}
