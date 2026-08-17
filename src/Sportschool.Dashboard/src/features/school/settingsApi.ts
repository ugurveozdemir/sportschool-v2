import { apiRequest } from "../../app/api/apiClient";

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiRequest<void>("/api/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword }
  });
}
