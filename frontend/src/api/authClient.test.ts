import axios, { type AxiosAdapter } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  bootstrapPatientSession,
  configurePatientAuth,
  isAuthSessionHandledError,
  resetPatientAuthClientForTests,
  resetSessionExpiredNotification
} from "./authClient";

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    isActive: vi.fn(() => false)
  }
}));

const backendUrl = "http://localhost:4000";

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    })
  };
};

const axiosResponse = (data: unknown) => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config: {}
});

const axiosError = (config: Record<string, unknown>, status = 401, message = "Not Authorized Login Again") => {
  const error = new Error(message) as Error & {
    config: Record<string, unknown>;
    response: { status: number; data: { message: string } };
  };
  error.config = config;
  error.response = { status, data: { message } };
  return error;
};

describe("patient auth client", () => {
  let storage: ReturnType<typeof createStorage>;
  let setToken: ReturnType<typeof vi.fn>;
  let onAuthCleared: ReturnType<typeof vi.fn>;
  let adapter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = createStorage();
    setToken = vi.fn();
    onAuthCleared = vi.fn();
    adapter = vi.fn();
    vi.stubGlobal("window", { localStorage: storage });
    axios.defaults.adapter = adapter as unknown as AxiosAdapter;
    resetPatientAuthClientForTests();
    configurePatientAuth({ backendUrl, setToken, onAuthCleared });
  });

  afterEach(() => {
    resetPatientAuthClientForTests();
    resetSessionExpiredNotification();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("treats guest bootstrap 401 as unauthenticated without a toast", async () => {
    const { toast } = await import("react-toastify");
    adapter.mockRejectedValueOnce(
      axiosError({
        url: `${backendUrl}/api/v1/auth/refresh`,
        skipAuthRefresh: true,
        optionalAuthRequest: true
      })
    );

    await expect(bootstrapPatientSession(backendUrl)).resolves.toEqual({
      status: "unauthenticated",
      token: ""
    });

    expect(storage.removeItem).toHaveBeenCalledWith("token");
    expect(setToken).toHaveBeenCalledWith("");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("deduplicates Strict Mode bootstrap by reusing the same refresh promise", async () => {
    adapter.mockResolvedValueOnce(
      axiosResponse({ success: true, data: { accessToken: "fresh-token" } })
    );

    const results = await Promise.all([
      bootstrapPatientSession(backendUrl),
      bootstrapPatientSession(backendUrl)
    ]);

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      { status: "authenticated", token: "fresh-token" },
      { status: "authenticated", token: "fresh-token" }
    ]);
  });

  it("refreshes once and retries concurrent protected 401s behind one refresh call", async () => {
    storage.getItem.mockReturnValue("expired-token");
    adapter.mockImplementation(async (config) => {
      if (config.url === `${backendUrl}/api/user/get-profile` && !config._retry) {
        throw axiosError(config);
      }

      if (config.url === `${backendUrl}/api/user/appointments` && !config._retry) {
        throw axiosError(config);
      }

      if (config.url === `${backendUrl}/api/v1/auth/refresh`) {
        return axiosResponse({ success: true, data: { accessToken: "fresh-token" } });
      }

      return axiosResponse({ success: true, retriedWith: config.headers?.token });
    });

    const [profile, appointments] = await Promise.all([
      axios.get(`${backendUrl}/api/user/get-profile`),
      axios.get(`${backendUrl}/api/user/appointments`)
    ]);

    expect(profile.data.retriedWith).toBe("fresh-token");
    expect(appointments.data.retriedWith).toBe("fresh-token");
    expect(adapter.mock.calls.filter(([config]) => config.url === `${backendUrl}/api/v1/auth/refresh`)).toHaveLength(1);
  });

  it("clears stale auth and marks the original error when refresh recovery fails", async () => {
    const { toast } = await import("react-toastify");
    storage.getItem.mockReturnValue("expired-token");
    adapter.mockImplementation(async (config) => {
      if (config.url === `${backendUrl}/api/v1/auth/refresh`) {
        throw axiosError(config, 401, "Invalid refresh token");
      }

      throw axiosError(config);
    });

    let handledError: unknown;
    try {
      await axios.get(`${backendUrl}/api/user/get-profile`);
    } catch (error) {
      handledError = error;
    }

    expect(isAuthSessionHandledError(handledError)).toBe(true);

    expect(storage.removeItem).toHaveBeenCalledWith("token");
    expect(onAuthCleared).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Your session has expired. Please log in again.", {
      toastId: "patient-session-expired"
    });
  });

  it("does not recursively retry refresh endpoint 401s", async () => {
    adapter.mockRejectedValueOnce(
      axiosError({ url: `${backendUrl}/api/v1/auth/refresh`, skipAuthRefresh: true })
    );

    await expect(
      axios.post(`${backendUrl}/api/v1/auth/refresh`, {}, { skipAuthRefresh: true })
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("does not refresh public auth endpoint 401s", async () => {
    adapter.mockRejectedValueOnce(axiosError({ url: `${backendUrl}/api/user/login` }));

    await expect(axios.post(`${backendUrl}/api/user/login`, {})).rejects.toMatchObject({
      response: { status: 401 }
    });

    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
