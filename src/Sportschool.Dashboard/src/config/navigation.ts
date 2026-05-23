import {
  Activity,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  GraduationCap,
  HeartPulse,
  LandPlot,
  Lock,
  Network,
  School,
  UserCircle,
  Users
} from "lucide-react";
import { routes } from "./routes";

export const navigationItems = [
  { label: "Sağlık", href: routes.dashboard, icon: HeartPulse },
  { label: "Kimlik", href: routes.auth, icon: Lock },
  { label: "Platform", href: routes.platform, icon: Network },
  { label: "Okul", href: routes.school, icon: School },
  { label: "Başvurular", href: routes.applications, icon: ClipboardList },
  { label: "Sporcular", href: routes.athletes, icon: UserCircle },
  { label: "Gruplar", href: routes.groups, icon: Users },
  { label: "Antrenmanlar", href: routes.trainings, icon: Dumbbell },
  { label: "Yoklama", href: routes.attendance, icon: Activity },
  { label: "Ödemeler", href: routes.payments, icon: CreditCard },
  { label: "Raporlar", href: routes.reports, icon: FileText },
  { label: "Ben", href: routes.me, icon: GraduationCap }
] as const;

export const secondaryNavigationItems = [
  { label: "Dokümantasyon", href: "https://localhost", icon: FileText },
  { label: "Destek", href: "mailto:support@sportschool.local", icon: LandPlot }
] as const;
