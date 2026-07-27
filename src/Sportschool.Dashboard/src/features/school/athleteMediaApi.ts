import { apiRequest } from "../../app/api/apiClient";

export type AthleteVideo = {
  id: string;
  athleteProfileId: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteProfileImageUrl: string | null;
  videoUrl: string;
  caption: string | null;
  status: "Processing" | "Ready" | "Failed";
  isPublished: boolean;
  createdAt: string;
  publishedAt: string | null;
};

export function uploadProfileImage(athleteId: string, image: File): Promise<{ athleteProfileId: string; url: string }> {
  const body = new FormData();
  body.append("image", image);
  return apiRequest<{ athleteProfileId: string; url: string }>(`/api/school/athletes/${athleteId}/profile-image`, { method: "PUT", body });
}

export function deleteProfileImage(athleteId: string): Promise<void> {
  return apiRequest<void>(`/api/school/athletes/${athleteId}/profile-image`, { method: "DELETE" });
}

export function listAthleteVideos(athleteId: string): Promise<AthleteVideo[]> {
  return apiRequest<AthleteVideo[]>(`/api/school/athletes/${athleteId}/videos`);
}

export function uploadAthleteVideo(athleteId: string, video: File, caption?: string): Promise<AthleteVideo> {
  const body = new FormData();
  body.append("video", video);
  const query = new URLSearchParams({ athleteProfileId: athleteId });
  if (caption?.trim()) query.set("caption", caption.trim());
  return apiRequest<AthleteVideo>(`/api/school/athlete-videos?${query}`, { method: "POST", body });
}

export function setVideoPublication(videoId: string, isPublished: boolean): Promise<AthleteVideo> {
  return apiRequest<AthleteVideo>(`/api/school/athlete-videos/${videoId}/publication`, { method: "PATCH", body: { isPublished } });
}

export function deleteAthleteVideo(videoId: string): Promise<void> {
  return apiRequest<void>(`/api/school/athlete-videos/${videoId}`, { method: "DELETE" });
}
