"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/kubo";
import styles from "../login/login.module.css";

export default function RegisterPage() {
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<UserRole>("umkm");
  const isForwarder = role === "freight_forwarder";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData(e.currentTarget);
      await register(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="landing"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <nav className="landing-nav" aria-label="Registration navigation">
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
          className="card"
          onSubmit={onSubmit}
          style={{ maxWidth: 560, width: "100%" }}
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
              aria-selected={!isForwarder}
              className={!isForwarder ? styles.activeRole : undefined}
              onClick={() => setRole("umkm")}
            >
              Exporter / MSME
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isForwarder}
              className={isForwarder ? styles.activeRole : undefined}
              onClick={() => setRole("freight_forwarder")}
            >
              Freight Forwarder
            </button>
          </div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {isForwarder
              ? "Register as a Freight Forwarder"
              : "Register as an Exporter"}
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 22 }}>
            {isForwarder
              ? "Manage customers, capacity, shipment documents, and export leads."
              : "One account for container matching, export documents, and payments."}
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">
                {isForwarder ? "Contact Name" : "Owner Name"}
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="Raka Pradana"
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="raka@rekakayu.id"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="field">
              <label htmlFor="businessName">Business Name</label>
              <input
                id="businessName"
                name="businessName"
                required
                placeholder={
                  isForwarder ? "Nusantara Forwarding" : "CV Jepara Reka Kayu"
                }
              />
            </div>
            <div className="field">
              <label htmlFor="businessType">Business Type</label>
              <input
                key={role}
                id="businessType"
                name="businessType"
                required
                readOnly={isForwarder}
                defaultValue={isForwarder ? "Freight Forwarder" : ""}
                placeholder="Wood Furniture"
              />
            </div>
            <div className="field">
              <label htmlFor="nib">NIB (Optional)</label>
              <input id="nib" name="nib" placeholder="1234567890123456" />
            </div>
            <div className="field span-2">
              <label htmlFor="ownerAddress">
                {isForwarder ? "Contact Address" : "Owner Address"}
              </label>
              <input
                id="ownerAddress"
                name="ownerAddress"
                required
                placeholder="10 Merdeka Street, Jakarta"
              />
            </div>
            <div className="field span-2">
              <label htmlFor="businessAddress">Business Address</label>
              <input
                id="businessAddress"
                name="businessAddress"
                required
                placeholder="18 Raya Tahunan Street, Jepara, Central Java"
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
            {submitting ? "Processing..." : "Register"} <ArrowRight size={16} />
          </button>
          <p
            className="page-subtitle"
            style={{ marginTop: 18, textAlign: "center" }}
          >
            Already have an account? <Link href="/login">Sign In</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
