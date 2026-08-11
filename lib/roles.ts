import type { ApiUser } from "@/lib/api-types";
import type { UserRole } from "@/types/kubo";

export function resolveUserRole(user: ApiUser | null | undefined): UserRole {
  const previewRole = process.env.NEXT_PUBLIC_DEFAULT_USER_ROLE;
  if (previewRole === "freight_forwarder" || previewRole === "umkm") return previewRole;
  if (user?.role === "freight_forwarder" || user?.role === "umkm") return user.role;
  return /freight|forwarder|logistic|shipping/i.test(user?.businessType ?? "")
    ? "freight_forwarder"
    : "umkm";
}

export function homeForRole(role: UserRole) {
  return role === "freight_forwarder" ? "/forwarder/dashboard" : "/dashboard";
}

export const rolePermissions = {
  umkm: ["upload", "edit", "resolve_conflict", "generate", "submit"],
  freight_forwarder: ["read", "review", "request_revision", "mark_reviewed"],
} as const;

export function can(role: UserRole, permission: string) {
  return (rolePermissions[role] as readonly string[]).includes(permission);
}
