import { apiClient } from "../apiClient";

export async function login(identifier: string, password: string): Promise<unknown> {
  return apiClient("auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export async function register(email: string, username: string, password: string): Promise<unknown> {
  return apiClient("auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
}

export async function logout(): Promise<unknown> {
  return apiClient("auth/logout", {
    method: "POST",
  });
}

export async function forgotPassword(email: string): Promise<unknown> {
  return apiClient("auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<unknown> {
  return apiClient("auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}