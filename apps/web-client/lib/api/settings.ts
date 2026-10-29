import { apiClient } from '../apiClient';

export async function settings_test(): Promise<unknown> {
  return apiClient("settings/me", {
    method: "GET",
  });
}
