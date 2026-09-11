import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { login, register } from "../lib/api/auth";

describe("auth endpoint integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("login calls the auth/login endpoint with the provided credentials", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch as typeof fetch;

    await login("alice@example.com", "secret123");

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const expectedOrigin = new URL(
      process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:3000/",
    ).origin;

    expect(new URL(url).origin).toBe(expectedOrigin);
    expect(new URL(url).pathname).toBe("/auth/login");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options.body as string)).toEqual({
      identifier: "alice@example.com",
      password: "secret123",
    });
  });

  it("register calls the auth/register endpoint with the provided profile data", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch as typeof fetch;

    await register("alice@example.com", "alice", "secret123");

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const expectedOrigin = new URL(
      process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:3000/",
    ).origin;

    expect(new URL(url).origin).toBe(expectedOrigin);
    expect(new URL(url).pathname).toBe("/auth/register");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options.body as string)).toEqual({
      email: "alice@example.com",
      username: "alice",
      password: "secret123",
    });
  });
});
