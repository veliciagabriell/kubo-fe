"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData(e.currentTarget);
      await register(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="landing" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav className="landing-nav" aria-label="Navigasi registrasi">
        <Brand />
      </nav>
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <form className="card" onSubmit={onSubmit} style={{ maxWidth: 560, width: "100%" }} noValidate>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Daftarkan UMKM Anda</h1>
          <p className="page-subtitle" style={{ marginBottom: 22 }}>
            Satu akun untuk matching container, dokumen ekspor, dan pembayaran.
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Nama pemilik</label>
              <input id="name" name="name" required placeholder="Raka Pradana" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="raka@rekakayu.id" />
            </div>
            <div className="field">
              <label htmlFor="password">Kata sandi</label>
              <input id="password" name="password" type="password" required minLength={6} placeholder="Minimal 6 karakter" />
            </div>
            <div className="field">
              <label htmlFor="businessName">Nama usaha</label>
              <input id="businessName" name="businessName" required placeholder="CV Jepara Reka Kayu" />
            </div>
            <div className="field">
              <label htmlFor="businessType">Jenis usaha</label>
              <input id="businessType" name="businessType" required placeholder="Furniture kayu" />
            </div>
            <div className="field">
              <label htmlFor="nib">NIB (opsional)</label>
              <input id="nib" name="nib" placeholder="1234567890123456" />
            </div>
            <div className="field span-2">
              <label htmlFor="ownerAddress">Alamat pemilik</label>
              <input id="ownerAddress" name="ownerAddress" required placeholder="Jl. Merdeka No. 10, Jakarta" />
            </div>
            <div className="field span-2">
              <label htmlFor="businessAddress">Alamat usaha</label>
              <input id="businessAddress" name="businessAddress" required placeholder="Jl. Raya Tahunan 18, Jepara, Jawa Tengah" />
            </div>
          </div>
          {error && <p className="field-error" style={{ marginTop: 12 }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 20 }}>
            {submitting ? "Memproses..." : "Daftar"} <ArrowRight size={16} />
          </button>
          <p className="page-subtitle" style={{ marginTop: 18, textAlign: "center" }}>
            Sudah punya akun? <Link href="/login">Masuk</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
