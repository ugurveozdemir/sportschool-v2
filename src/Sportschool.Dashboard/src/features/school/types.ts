export type Athlete = {
  id: string;
  schoolId: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentFullName: string;
  parentPhone: string;
  profileImageUrl: string | null;
};

export type AthleteVideoStatus = "Processing" | "Ready" | "Failed";

export type AthleteVideo = {
  id: string;
  athleteProfileId: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteProfileImageUrl: string | null;
  videoUrl: string;
  caption: string | null;
  status: AthleteVideoStatus;
  isPublished: boolean;
  createdAt: string;
  publishedAt: string | null;
};

export type ProfileImageResponse = {
  athleteProfileId: string;
  url: string;
};
