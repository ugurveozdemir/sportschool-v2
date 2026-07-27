export type AthleteFeedVideo = {
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

export type AthleteFeedResponse = {
  items: AthleteFeedVideo[];
  nextBefore: string | null;
  nextBeforeId: string | null;
};
