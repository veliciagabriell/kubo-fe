import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  FileCheck2,
  Handshake,
  Ship,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/layout/AppShell";

const features = [
  [
    Handshake,
    "Practical Matching",
    "Matching considers port routes, final CBM, weight, packaging, document readiness, and handling requirements.",
  ],
  [
    FileCheck2,
    "Assisted Document Drafts",
    "Reuse the same shipment data to prepare Packing List, Commercial Invoice, PEB, and Certificate of Origin drafts.",
  ],
  [
    CheckCircle2,
    "Transparent Costs",
    "Review freight, KUBO platform fees, document assistance, handling, insurance, and taxes separately.",
  ],
] as const;

const workflow = [
  "Create a shipment and enter the Cargo Ready Date.",
  "Find a compatible Consolidated LCL slot.",
  "Review costs and confirm capacity.",
  "Complete document drafts and track the shipment.",
];

export default function LandingPage() {
  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Landing page navigation">
        <Brand />
        <div className="landing-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#solutions">Solutions</a>
          <a href="#corridor">Corridor</a>
          <Link className="btn btn-secondary" href="/login">
            Sign In
          </Link>
        </div>
      </nav>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">Indonesia–Japan Furniture Exports</div>
            <h1>Fill unused capacity. Reach a wider market.</h1>
            <p>
              KUBO helps Indonesian furniture Exporters / MSMEs consolidate
              cargo through LCL shipments, prepare export document drafts, and
              track shipments from Jepara to Japan.
            </p>
            <div className="page-actions">
              <Link href="/dashboard" className="btn btn-primary">
                View Pilot Dashboard <ArrowRight size={17} />
              </Link>
              <Link href="/matching" className="btn btn-secondary">
                Find Container Matches
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
                marginTop: 26,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--muted)",
              }}
            >
              <span>✓ Transparent costs</span>
              <span>✓ Document assistance</span>
              <span>✓ Consolidated cargo</span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="KUBO cargo consolidation illustration"
          >
            <div className="eyebrow" style={{ color: "#ffb266" }}>
              Consolidated LCL
            </div>
            <h2
              style={{
                fontSize: 30,
                fontWeight: 800,
                position: "relative",
                marginTop: 10,
              }}
            >
              Jepara → Tokyo
            </h2>
            <div className="cargo-box two">
              <Boxes size={28} />
              <strong style={{ display: "block", fontSize: 28, marginTop: 14 }}>
                78%
              </strong>
              <small>Capacity Used</small>
            </div>
            <div className="cargo-box one">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Ship size={32} />
                <span className="badge warning">7.4 CBM Remaining</span>
              </div>
              <p style={{ color: "white", fontSize: 14, margin: "42px 0 8px" }}>
                6 Exporters / MSMEs sharing one departure
              </p>
              <div className="progress">
                <span style={{ width: "78%" }} />
              </div>
            </div>
          </div>
        </section>
        <section
          id="solutions"
          className="landing-section"
          style={{ background: "#f4f1ec" }}
        >
          <div className="landing-section-inner">
            <div className="eyebrow">Built for Furniture Exporters / MSMEs</div>
            <h2>One export workflow that is easier to understand</h2>
            <div className="grid three-col" style={{ marginTop: 38 }}>
              {features.map(([Icon, title, copy]) => (
                <article className="card feature" key={title}>
                  <Icon size={30} />
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="how-it-works" className="landing-section">
          <div className="landing-section-inner">
            <div className="grid two-col">
              <div>
                <div className="eyebrow">How It Works</div>
                <h2>From a Java workshop to buyers in Japan</h2>
              </div>
              <ol
                style={{
                  display: "grid",
                  gap: 18,
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {workflow.map((item, index) => (
                  <li
                    key={item}
                    className="card"
                    style={{ display: "flex", gap: 16, alignItems: "center" }}
                  >
                    <span
                      className="brand-mark"
                      style={{
                        width: 36,
                        height: 36,
                        fontSize: 12,
                        flex: "0 0 auto",
                      }}
                    >
                      {index + 1}
                    </span>
                    <strong style={{ fontSize: 13 }}>{item}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section
          id="corridor"
          className="landing-section"
          style={{ background: "var(--navy-950)", color: "white" }}
        >
          <div
            className="landing-section-inner"
            style={{ textAlign: "center" }}
          >
            <Sparkles color="#fa8615" />
            <h2 style={{ color: "white", margin: "16px auto" }}>
              Starting with the Indonesia–Japan furniture corridor
            </h2>
            <p
              style={{
                maxWidth: 620,
                margin: "0 auto 26px",
                color: "#c8cdea",
                lineHeight: 1.7,
              }}
            >
              The initial pilot focuses on Jepara and Java clusters shipping to
              Tokyo, Yokohama, Osaka, and Nagoya. Other categories will be
              considered during <strong>Future Expansion</strong>.
            </p>
            <Link href="/dashboard" className="btn btn-primary">
              Join the Pilot Program <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
