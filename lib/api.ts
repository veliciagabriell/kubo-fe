import { localizeApiMessage } from "@/lib/ui-copy";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(localizeApiMessage(message));
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("kubo_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("kubo_token", token);
  else localStorage.removeItem("kubo_token");
}

export function fileUrl(path?: string | null): string | null {
  if (!path) return null;
  return `${API_ORIGIN}${path}`;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const isFormData = body instanceof FormData;
  const finalHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || `Request failed with status ${res.status}`;
    throw new ApiError(
      Array.isArray(message) ? message.join(", ") : message,
      res.status,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
};
