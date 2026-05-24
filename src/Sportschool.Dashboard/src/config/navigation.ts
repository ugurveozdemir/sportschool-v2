import {
  Dumbbell,
  Network
} from "lucide-react";
import { routes } from "./routes";

export const platformNavigationItems = [
  { label: "Platform", href: routes.platform, icon: Network },
  { label: "Hesap", href: routes.account, icon: Dumbbell }
] as const;
