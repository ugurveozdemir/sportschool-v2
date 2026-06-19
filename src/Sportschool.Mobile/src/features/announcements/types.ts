export type AnnouncementResponse = {
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

export type SaveAnnouncementRequest = {
  title: string;
  content: string;
  expiresAt: string | null;
};

export type UnreadCountResponse = {
  count: number;
};
