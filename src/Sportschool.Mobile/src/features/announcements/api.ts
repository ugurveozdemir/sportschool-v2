import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/core/queryClient";
import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type { AnnouncementResponse, SaveAnnouncementRequest, UnreadCountResponse } from "@/features/announcements/types";

export function useMemberAnnouncements(enabled = true, currentOnly = false) {
  return useQuery({
    enabled,
    queryKey: ["me", "announcements", currentOnly],
    queryFn: () => apiRequest<AnnouncementResponse[]>(withCurrentOnly(endpoints.meAnnouncements, currentOnly))
  });
}

export function useSchoolAnnouncements(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["school", "announcements"],
    queryFn: () => apiRequest<AnnouncementResponse[]>(endpoints.schoolAnnouncements)
  });
}

export function useCreateAnnouncement() {
  return useMutation({
    mutationFn: (request: SaveAnnouncementRequest) => apiRequest<AnnouncementResponse>(endpoints.schoolAnnouncements, {
      method: "POST",
      body: request
    }),
    onSuccess: invalidateAnnouncements
  });
}

export function useUpdateAnnouncement(announcementId?: string) {
  return useMutation({
    mutationFn: (request: SaveAnnouncementRequest) => {
      if (!announcementId) {
        throw new Error("Announcement is required.");
      }

      return apiRequest<AnnouncementResponse>(endpoints.schoolAnnouncement(announcementId), {
        method: "PUT",
        body: request
      });
    },
    onSuccess: invalidateAnnouncements
  });
}

export function useDeleteAnnouncement() {
  return useMutation({
    mutationFn: (announcementId: string) => apiRequest(endpoints.schoolAnnouncement(announcementId), { method: "DELETE" }),
    onSuccess: invalidateAnnouncements
  });
}

function withCurrentOnly(path: string, currentOnly: boolean) {
  if (!currentOnly) {
    return path;
  }

  const params = new URLSearchParams({ currentOnly: "true" });
  return `${path}?${params.toString()}`;
}

export function useUnreadAnnouncementCount(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["me", "announcements", "unread-count"],
    queryFn: () => apiRequest<UnreadCountResponse>(endpoints.meAnnouncementsUnreadCount)
  });
}

export function useMarkAnnouncementsRead() {
  return useMutation({
    mutationFn: () => apiRequest<void>(endpoints.meAnnouncementsRead, { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me", "announcements", "unread-count"] });
    }
  });
}

async function invalidateAnnouncements() {
  await queryClient.invalidateQueries({ queryKey: ["school", "announcements"] });
  await queryClient.invalidateQueries({ queryKey: ["me", "announcements"] });
}
