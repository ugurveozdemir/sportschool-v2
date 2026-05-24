import {
  Dumbbell,
  School
} from "lucide-react";
import { routes } from "./routes";

export const platformNavigationItems = [
  { label: "Okullar", href: routes.platform, icon: School },
  { label: "Hesap", href: routes.account, icon: Dumbbell }
] as const;
