import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { DashboardSummaryResponse } from "../../../shared/types/domain";

export function getDashboardSummary(from: string, to: string) {
  const search = new URLSearchParams({ from, to });
  return apiRequest<DashboardSummaryResponse>(`${endpoints.dashboardSummary}?${search}`);
}
