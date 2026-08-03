"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="landing" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav className="landing-nav" aria-label="Navigasi login">
        <Brand />
      </nav>
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <form className="card" onSubmit={onSubmit} style={{ maxWidth: 400, width: "100%" }} noValidate>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Masuk ke KUBO</h1>
          <p className="page-subtitle" style={{ marginBottom: 22 }}>
            Kelola pengiriman, dokumen, dan pembayaran ekspor Anda.
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
                placeholder="raka@rekakayu.id"
              />
            </div>
            <div className="field span-2">
              <label htmlFor="password">Kata sandi</label>
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
          {error && <p className="field-error" style={{ marginTop: 12 }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 20 }}>
            {submitting ? "Memproses..." : "Masuk"} <ArrowRight size={16} />
          </button>
          <p className="page-subtitle" style={{ marginTop: 18, textAlign: "center" }}>
            Belum punya akun? <Link href="/register">Daftar UMKM baru</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
