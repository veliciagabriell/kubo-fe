"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/kubo";
import styles from "./login.module.css";

const roleContent: Record<
  UserRole,
  {
    heading: string;
    description: string;
    emailPlaceholder: string;
    registrationLabel: string;
    registrationAction: string;
    registrationHref: string;
  }
> = {
  umkm: {
    heading: "Sign in to KUBO",
    description: "Manage your export shipments, documents, and payments.",
    emailPlaceholder: "yovie@ukiran.id",
    registrationLabel: "Don't have an account?",
    registrationAction: "Register as an Exporter",
    registrationHref: "/register",
  },
  freight_forwarder: {
    heading: "Sign in as a Freight Forwarder",
    description:
      "Manage customers, shipment documents, capacity, and export leads.",
    emailPlaceholder: "operations@forwarder.co.id",
    registrationLabel: "Don't have an account?",
    registrationAction: "Register as a Freight Forwarder",
    registrationHref: "/register",
  },
};

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<UserRole>("umkm");
  const content = roleContent[role];

  function selectRole(nextRole: UserRole) {
    setRole(nextRole);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="landing"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <nav className="landing-nav" aria-label="Login navigation">
        <Brand />
      </nav>
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <form
          className={`card ${styles.loginCard}`}
          onSubmit={onSubmit}
          noValidate
        >
          <div
            className={styles.roleSelector}
            role="tablist"
            aria-label="Select account type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={role === "umkm"}
              className={role === "umkm" ? styles.activeRole : undefined}
              onClick={() => selectRole("umkm")}
            >
              Exporter / MSME
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === "freight_forwarder"}
              className={
                role === "freight_forwarder" ? styles.activeRole : undefined
              }
              onClick={() => selectRole("freight_forwarder")}
            >
              Freight Forwarder
            </button>
          </div>
          <div
            id="login-form-panel"
            role="tabpanel"
            className={styles.loginContext}
          >
            <h1 className="page-title" style={{ marginBottom: 4 }}>
              {content.heading}
            </h1>
            <p className="page-subtitle" style={{ marginBottom: 22 }}>
              {content.description}
            </p>
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={content.emailPlaceholder}
                />
              </div>
              <div className="field span-2">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            {error && (
              <p className="field-error" style={{ marginTop: 12 }}>
                {error}
              </p>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
              style={{ width: "100%", marginTop: 20 }}
            >
              {submitting ? "Signing In..." : "Sign In"}{" "}
              <ArrowRight size={16} />
            </button>
            <p
              className="page-subtitle"
              style={{ marginTop: 18, textAlign: "center" }}
            >
              {content.registrationLabel}{" "}
              <Link href={content.registrationHref}>
                {content.registrationAction}
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
