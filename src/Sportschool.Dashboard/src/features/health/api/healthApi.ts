import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { HealthResponse } from "../../../shared/types/domain";

export function getHealth() {
  return apiRequest<HealthResponse>(endpoints.health, { auth: false });
}
