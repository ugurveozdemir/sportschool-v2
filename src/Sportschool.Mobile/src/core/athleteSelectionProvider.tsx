import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { useSession } from "@/core/sessionProvider";
import { useMyAthletes } from "@/features/me/api";
import type { MobileAthleteResponse } from "@/features/me/types";

type AthleteSelectionContextValue = {
  athletes: MobileAthleteResponse[];
  isLoading: boolean;
  selectedAthlete: MobileAthleteResponse | null;
  selectedAthleteProfileId: string | null;
  setSelectedAthleteProfileId: (athleteProfileId: string) => void;
};

const AthleteSelectionContext = createContext<AthleteSelectionContextValue | null>(null);

export function AthleteSelectionProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const isMember = session?.loginRole === "Athlete" || session?.loginRole === "Parent";
  const athletesQuery = useMyAthletes(isMember);
  const athletes = useMemo(() => athletesQuery.data ?? [], [athletesQuery.data]);
  const [selectedAthleteProfileId, setSelectedAthleteProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!isMember) {
      setSelectedAthleteProfileId(null);
      return;
    }

    if (athletes.length === 0) {
      return;
    }

    const selectedStillExists = athletes.some((athlete) => athlete.id === selectedAthleteProfileId);
    if (!selectedStillExists) {
      setSelectedAthleteProfileId(athletes[0].id);
    }
  }, [athletes, isMember, selectedAthleteProfileId]);

  const selectedAthlete = athletes.find((athlete) => athlete.id === selectedAthleteProfileId) ?? null;
  const value = useMemo(
    () => ({
      athletes,
      isLoading: athletesQuery.isLoading,
      selectedAthlete,
      selectedAthleteProfileId,
      setSelectedAthleteProfileId
    }),
    [athletes, athletesQuery.isLoading, selectedAthlete, selectedAthleteProfileId]
  );

  return <AthleteSelectionContext.Provider value={value}>{children}</AthleteSelectionContext.Provider>;
}

export function useAthleteSelection() {
  const context = useContext(AthleteSelectionContext);
  if (!context) {
    throw new Error("useAthleteSelection must be used inside AthleteSelectionProvider.");
  }

  return context;
}
