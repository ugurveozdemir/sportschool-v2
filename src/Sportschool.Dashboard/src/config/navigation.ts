import {
  Activity,
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileText,
  Home,
  Network,
  UserCircle,
  Users
} from "lucide-react";
import { routes } from "./routes";

export const navigationItems = [
  { label: "Ana Sayfa", href: routes.dashboard, icon: Home },
  { label: "Antrenmanlar", href: routes.trainings, icon: CalendarDays },
  { label: "Yoklama", href: routes.attendance, icon: Activity },
  { label: "Sporcular", href: routes.athletes, icon: UserCircle },
  { label: "Gruplar", href: routes.groups, icon: Users },
  { label: "Ödemeler", href: routes.payments, icon: CreditCard },
  { label: "Raporlar", href: routes.reports, icon: FileText },
  { label: "Hesap", href: routes.account, icon: Dumbbell }
] as const;

export const platformNavigationItems = [
  { label: "Platform", href: routes.platform, icon: Network },
  { label: "Hesap", href: routes.account, icon: Dumbbell }
] as const;
