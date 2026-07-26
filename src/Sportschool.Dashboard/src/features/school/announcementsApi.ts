import { apiRequest } from "../../app/api/apiClient";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  createdByUserId: string | null;
  createdByName: string | null;
  publishedAt: string;
  expiresAt: string | null;
  isNew: boolean;
  isExpired: boolean;
};

export type AnnouncementInput = {
  title: string;
  content: string;
  expiresAt: string | null;
};

export function listAnnouncements(): Promise<Announcement[]> {
  return apiRequest<Announcement[]>("/api/school/announcements");
}

export function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  return apiRequest<Announcement>("/api/school/announcements", { method: "POST", body: input });
}

export function updateAnnouncement(announcementId: string, input: AnnouncementInput): Promise<Announcement> {
  return apiRequest<Announcement>(`/api/school/announcements/${announcementId}`, { method: "PUT", body: input });
}

export function deactivateAnnouncement(announcementId: string): Promise<void> {
  return apiRequest<void>(`/api/school/announcements/${announcementId}`, { method: "DELETE" });
}
