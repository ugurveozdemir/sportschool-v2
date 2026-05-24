import { Redirect } from "expo-router";

import { LoadingState } from "@/shared/components/LoadingState";
import { useSession } from "@/app/sessionProvider";

export default function IndexRoute() {
  const { isReady, session } = useSession();

  if (!isReady) {
    return <LoadingState label="Oturum kontrol ediliyor" />;
  }

  return <Redirect href={session ? "/(app)/home" : "/(auth)/role"} />;
}
