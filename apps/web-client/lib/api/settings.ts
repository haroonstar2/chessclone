import { apiClient } from '../apiClient';

export async function settings_test(): Promise<any> {
  return apiClient("settings/me", {
    method: "GET",
  });
}

