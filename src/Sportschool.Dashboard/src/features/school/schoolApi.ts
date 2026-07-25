import { apiFormRequest, apiRequest } from "../../shared/api/apiClient";
import { endpoints } from "../../shared/constants/endpoints";
import type { Athlete, AthleteVideo, ProfileImageResponse } from "./types";

export function listAthletes(search?: string): Promise<Athlete[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<Athlete[]>(`${endpoints.schoolAthletes}${query}`);
}

export function uploadProfileImage(athleteProfileId: string, image: File): Promise<ProfileImageResponse> {
  const formData = new FormData();
  formData.append("image", image);
  return apiFormRequest(endpoints.schoolAthleteProfileImage(athleteProfileId), "PUT", formData);
}

export function deleteProfileImage(athleteProfileId: string): Promise<void> {
  return apiRequest<void>(endpoints.schoolAthleteProfileImage(athleteProfileId), { method: "DELETE" });
}

export function listAthleteVideos(athleteProfileId: string): Promise<AthleteVideo[]> {
  return apiRequest<AthleteVideo[]>(endpoints.schoolAthleteVideos(athleteProfileId));
}

export function uploadAthleteVideo(athleteProfileId: string, video: File, caption: string): Promise<AthleteVideo> {
  const formData = new FormData();
  formData.append("video", video);
  return apiFormRequest(
    `${endpoints.schoolVideos}?athleteProfileId=${encodeURIComponent(athleteProfileId)}&caption=${encodeURIComponent(caption)}`,
    "POST",
    formData
  );
}

export function setVideoPublication(videoId: string, isPublished: boolean): Promise<AthleteVideo> {
  return apiRequest<AthleteVideo>(endpoints.schoolVideoPublication(videoId), {
    method: "PATCH",
    body: { isPublished }
  });
}

export function deleteVideo(videoId: string): Promise<void> {
  return apiRequest<void>(endpoints.schoolVideo(videoId), { method: "DELETE" });
}
