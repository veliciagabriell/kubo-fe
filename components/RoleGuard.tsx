"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { homeForRole, resolveUserRole } from "@/lib/roles";
import type { UserRole } from "@/types/kubo";

export default function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const currentRole = resolveUserRole(user);

  useEffect(() => {
    if (!loading && user && currentRole !== role) router.replace(homeForRole(currentRole));
  }, [currentRole, loading, role, router, user]);

  if (loading || !user || currentRole !== role) {
    return <div className="route-loading" role="status">Memeriksa akses akun…</div>;
  }
  return <>{children}</>;
}
