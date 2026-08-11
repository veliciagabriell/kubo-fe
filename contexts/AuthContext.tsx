"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, getToken, setToken } from "@/lib/api";
import type { ApiUser } from "@/lib/api-types";
import { homeForRole, resolveUserRole } from "@/lib/roles";

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (form: FormData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    await Promise.resolve();
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<{ data: ApiUser }>("/users/me");
      setUser(res.data);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => refreshUser());
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const res = await api.post<{ user: ApiUser; access_token: string }>(
          "/auth/login",
          { email, password },
          { auth: false },
        );
        setToken(res.access_token);
        setUser(res.user);
        router.push(homeForRole(resolveUserRole(res.user)));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Gagal masuk. Coba lagi.");
        throw e;
      }
    },
    [router],
  );

  const register = useCallback(
    async (form: FormData) => {
      setError(null);
      try {
        const res = await api.post<{ user: ApiUser; access_token: string }>(
          "/auth/register",
          form,
          { auth: false },
        );
        setToken(res.access_token);
        setUser(res.user);
        router.push(homeForRole(resolveUserRole(res.user)));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Gagal mendaftar. Coba lagi.");
        throw e;
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
