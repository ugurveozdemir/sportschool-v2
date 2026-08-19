import { apiRequest } from "../../app/api/apiClient";

export type AthleteVideo = {
  id: string;
  athleteProfileId: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteProfileImageUrl: string | null;
  videoUrl: string | null;
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

export async function uploadAthleteVideo(
  athleteId: string,
  video: File,
  caption?: string,
  onProgress?: (percentage: number) => void
): Promise<AthleteVideo> {
  const query = new URLSearchParams({ athleteProfileId: athleteId });
  const result = await apiRequest<{ video: AthleteVideo; uploadUrl: string }>(`/api/school/athlete-videos?${query}`, {
    method: "POST",
    body: {
      fileName: video.name,
      fileSize: video.size,
      caption: caption?.trim() || null
    }
  });

  try {
    await uploadFileToMux(result.uploadUrl, video, onProgress);
    return result.video;
  } catch (error) {
    await deleteAthleteVideo(result.video.id).catch(() => undefined);
    throw error;
  }
}

export function setVideoPublication(videoId: string, isPublished: boolean): Promise<AthleteVideo> {
  return apiRequest<AthleteVideo>(`/api/school/athlete-videos/${videoId}/publication`, { method: "PATCH", body: { isPublished } });
}

export function deleteAthleteVideo(videoId: string): Promise<void> {
  return apiRequest<void>(`/api/school/athlete-videos/${videoId}`, { method: "DELETE" });
}

function uploadFileToMux(uploadUrl: string, video: File, onProgress?: (percentage: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", video.type || "application/octet-stream");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error("Video Mux'a yüklenemedi."));
      }
    });
    request.addEventListener("error", () => reject(new Error("Video Mux'a yüklenemedi.")));
    request.send(video);
  });
}
