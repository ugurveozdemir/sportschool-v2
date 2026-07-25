import { useQuery } from "@tanstack/react-query";

import type { AthleteFeedResponse } from "@/features/feed/types";
import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";

export function useFeed(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["feed"],
    queryFn: () => apiRequest<AthleteFeedResponse>(endpoints.feed)
  });
}
