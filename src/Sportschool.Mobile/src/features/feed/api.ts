import { useInfiniteQuery } from "@tanstack/react-query";

import type { AthleteFeedResponse } from "@/features/feed/types";
import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";

export function useFeed(enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: ["feed"],
    initialPageParam: null as FeedCursor | null,
    queryFn: ({ pageParam }) => apiRequest<AthleteFeedResponse>(feedPath(pageParam)),
    getNextPageParam: (page) => page.nextBefore && page.nextBeforeId
      ? { before: page.nextBefore, beforeId: page.nextBeforeId }
      : undefined
  });
}

type FeedCursor = {
  before: string;
  beforeId: string;
};

function feedPath(cursor: FeedCursor | null) {
  const params = new URLSearchParams({ pageSize: "6" });
  if (cursor) {
    params.set("before", cursor.before);
    params.set("beforeId", cursor.beforeId);
  }

  return `${endpoints.feed}?${params.toString()}`;
}
